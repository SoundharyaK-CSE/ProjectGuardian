const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const db = require('../config/db');
const archiver = require('archiver');

class ValidationService {
    constructor(analysisId) {
        this.analysisId = analysisId;
        this.workspaceRoot = path.join(__dirname, '../../workspace', analysisId);
        this.sourceDir = path.join(this.workspaceRoot, 'source', 'project');
        this.updateDir = path.join(this.workspaceRoot, 'update', 'project');
    }

    hashFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch (e) {
            return null;
        }
    }

    async execCommand(command, cwd, env = process.env, timeoutMs = 180000) {
        return new Promise((resolve) => {
            let isResolved = false;
            const child = exec(command, { cwd, env }, (error, stdout, stderr) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timer);
                resolve({
                    code: error ? error.code || 1 : 0,
                    stdout: stdout || '',
                    stderr: stderr || '',
                    error: error ? error.message : null
                });
            });
            
            const timer = setTimeout(() => {
                if (isResolved) return;
                isResolved = true;
                try {
                    // Try to kill the whole tree on Windows using taskkill
                    if (process.platform === 'win32') {
                        exec(`taskkill /pid ${child.pid} /T /F`);
                    } else {
                        process.kill(-child.pid, 'SIGKILL');
                    }
                } catch (e) {}
                resolve({
                    code: 124,
                    stdout: '',
                    stderr: `Command timed out after ${timeoutMs / 1000}s`,
                    error: `Command timed out: ${command}`
                });
            }, timeoutMs);
        });
    }

    async updateStatus(update) {
        const query = await db.query('SELECT validation_result FROM analysis WHERE id = $1', [this.analysisId]);
        const current = query.rows[0]?.validation_result || {
            status: 'VALIDATING',
            stages: {
                changeIntegrity: { status: 'RUNNING' },
                dependencies: { status: 'PENDING' },
                syntax: { status: 'PENDING' },
                build: { status: 'PENDING' },
                unitTests: { status: 'PENDING' },
                integration: { status: 'PENDING' },
                finalValidation: { status: 'PENDING' }
            },
            modifiedFilesChecked: [],
            failedChecks: [],
            skippedChecks: []
        };

        const merged = { ...current, ...update };
        await db.query('UPDATE analysis SET validation_result = $1 WHERE id = $2', [merged, this.analysisId]);
        return merged;
    }

    async run() {
        try {
            await this.updateStatus({ status: 'VALIDATING' });

            const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [this.analysisId]);
            const analysis = analysisQuery.rows[0];
            
            const aiUpdateResult = analysis.ai_update_result;
            if (!aiUpdateResult || aiUpdateResult.status !== 'COMPLETED') {
                throw new Error("AI Update is not fully completed.");
            }

            const plannedFiles = aiUpdateResult.plannedFiles || [];
            const modifiedFiles = aiUpdateResult.modifiedFiles || [];

            let result = await this.updateStatus({});

            // 1. Change Integrity
            let integrityPassed = true;
            let integrityDetails = [];
            for (const file of plannedFiles) {
                const src = path.join(this.sourceDir, file);
                const upd = path.join(this.updateDir, file);
                
                if (!fs.existsSync(upd)) {
                    integrityPassed = false;
                    integrityDetails.push(`${file} is missing from update project.`);
                    break;
                }
                
                const srcHash = fs.existsSync(src) ? this.hashFile(src) : null;
                const updHash = this.hashFile(upd);
                
                if (srcHash === updHash) {
                    integrityPassed = false;
                    integrityDetails.push(`${file} hash did not change.`);
                    break;
                }
            }
            
            if (plannedFiles.length !== modifiedFiles.length) {
                integrityPassed = false;
                integrityDetails.push(`Modified files count (${modifiedFiles.length}) does not match planned (${plannedFiles.length}).`);
            }

            result.stages.changeIntegrity = {
                status: integrityPassed ? 'PASSED' : 'FAILED',
                details: integrityDetails.join(' ')
            };
            await this.updateStatus({ stages: result.stages });

            if (!integrityPassed) {
                throw new Error("Change Integrity failed: " + integrityDetails.join(' '));
            }

            // 2. Syntax (Basic check using Node if JS)
            result.stages.syntax = { status: 'RUNNING' };
            await this.updateStatus({ stages: result.stages });
            
            let syntaxPassed = true;
            let syntaxErrors = [];
            for (const file of modifiedFiles) {
                if (file.endsWith('.jsx') || file.endsWith('.tsx')) continue;
                if (file.endsWith('.js')) {
                    const filePath = path.join(this.updateDir, file);
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (/<[a-z][\s\S]*>/i.test(content) || /import React/i.test(content)) {
                            continue;
                        }
                        const check = await this.execCommand(`node -c "${filePath}"`, this.updateDir);
                        if (check.code !== 0) {
                            syntaxPassed = false;
                            syntaxErrors.push(`${file} syntax error.`);
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
            result.stages.syntax = {
                status: syntaxPassed ? 'PASSED' : 'FAILED',
                details: syntaxPassed ? `Checked eligible JS files.` : syntaxErrors.join(' ')
            };
            await this.updateStatus({ stages: result.stages });

            // Find directories dynamically up to depth 2
            const findProjectRoots = (dir, depth = 0) => {
                let results = [];
                if (depth > 2 || !fs.existsSync(dir)) return results;
                try {
                    const files = fs.readdirSync(dir, { withFileTypes: true });
                    for (const file of files) {
                        if (file.name === 'node_modules' || file.name === '.git') continue;
                        if (file.name === 'package.json') {
                            results.push(dir);
                        } else if (file.isDirectory()) {
                            results = results.concat(findProjectRoots(path.join(dir, file.name), depth + 1));
                        }
                    }
                } catch (e) {}
                return results;
            };
            
            const dirsToCheck = [...new Set(findProjectRoots(this.updateDir))];

            const getPackageManager = (dir) => {
                if (fs.existsSync(path.join(dir, 'yarn.lock'))) return { name: 'yarn', install: 'yarn install --prefer-offline', run: 'yarn run' };
                if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return { name: 'pnpm', install: 'pnpm install --prefer-offline', run: 'pnpm run' };
                return { name: 'npm', install: 'npm install --no-audit --no-fund --prefer-offline', run: 'npm run' };
            };

            // 3. Dependencies
            result.stages.dependencies = { status: 'RUNNING' };
            await this.updateStatus({ stages: result.stages });
            let depsPassed = true;
            let depDetails = '';
            if (dirsToCheck.length > 0) {
                 for (const dir of dirsToCheck) {
                      const relDir = path.relative(this.updateDir, dir) || '.';
                      const pkgModified = modifiedFiles.some(f => f.startsWith(relDir !== '.' ? relDir : '') && f.endsWith('package.json'));
                      const hasNodeModules = fs.existsSync(path.join(dir, 'node_modules'));
                      
                      const pm = getPackageManager(dir);

                      if (!hasNodeModules || pkgModified) {
                          const depCheck = await this.execCommand(pm.install, dir, process.env, 180000); // 3 minutes timeout
                          if (depCheck.code !== 0) {
                              depsPassed = false;
                              const errSnippet = (depCheck.stderr || depCheck.stdout || '').substring(0, 200).replace(/\n/g, ' ');
                              depDetails += `Failed in ${path.basename(dir)}: ${errSnippet || 'install error'}. `;
                          }
                      } else {
                          depDetails += `Reused node_modules in ${path.basename(dir)}. `;
                      }
                 }
                 result.stages.dependencies = { status: depsPassed ? 'PASSED' : 'FAILED', details: depDetails.trim() || 'Dependencies checked.' };
            } else {
                 result.stages.dependencies = { status: 'SKIPPED' };
            }
            await this.updateStatus({ stages: result.stages });

            // 4. Build
            result.stages.build = { status: 'RUNNING' };
            await this.updateStatus({ stages: result.stages });
            let buildPassed = true;
            let hasBuildScript = false;
            let buildDetails = '';
            for (const dir of dirsToCheck) {
                 const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
                 const pm = getPackageManager(dir);
                 if (pkg.scripts && pkg.scripts.build) {
                     hasBuildScript = true;
                     const buildCheck = await this.execCommand(`${pm.run} build`, dir);
                     if (buildCheck.code !== 0) {
                         buildPassed = false;
                         buildDetails += `Failed in ${path.basename(dir)}: ${(buildCheck.stderr || buildCheck.stdout || '').substring(0, 100)} `;
                     }
                 }
            }
            if (hasBuildScript) {
                 result.stages.build = { status: buildPassed ? 'PASSED' : 'FAILED', details: buildDetails };
            } else {
                 result.stages.build = { status: 'SKIPPED' };
            }
            await this.updateStatus({ stages: result.stages });

            // 5. Unit Tests
            result.stages.unitTests = { status: 'RUNNING' };
            await this.updateStatus({ stages: result.stages });
            
            let ranTests = false;
            let genuineFailure = false;
            let testDetails = '';

            for (const dir of dirsToCheck) {
                 const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
                 const pm = getPackageManager(dir);
                 if (pkg.scripts && pkg.scripts.test && !pkg.scripts.test.includes("no test specified")) {
                     const testCheck = await this.execCommand(`${pm.run} test`, dir, { ...process.env, CI: 'true' });
                     
                     const output = (testCheck.stdout || '') + ' ' + (testCheck.stderr || '');
                     
                     let statsStr = '';
                     const match = output.match(/Tests:\s*([^\n]+total)/);
                     if (match) {
                         statsStr = ` [${path.basename(dir)}: ${match[1]}]`;
                     }

                     if (testCheck.code === 0) {
                         if (output.includes('No tests found') && !output.includes('PASS')) {
                             // No tests were found, do nothing
                         } else {
                             ranTests = true;
                             testDetails += statsStr;
                         }
                     } else {
                         if (output.includes('No tests found')) {
                             // No tests found, not a real failure
                         } else {
                             ranTests = true;
                             genuineFailure = true;
                             testDetails += `Failed in ${path.basename(dir)}${statsStr} `;
                         }
                     }
                 }
            }

            if (genuineFailure) {
                 result.stages.unitTests = { status: 'FAILED', details: testDetails.trim() };
            } else if (ranTests) {
                 result.stages.unitTests = { status: 'PASSED', details: `All tests passed.${testDetails}` };
            } else {
                 result.stages.unitTests = { status: 'SKIPPED', details: 'No test suite configured; tests were not run.' };
            }
            await this.updateStatus({ stages: result.stages });

            // 6. Integration Checks
            result.stages.integration = { status: 'RUNNING' };
            await this.updateStatus({ stages: result.stages });

            let ranIntegration = false;
            let integrationFailed = false;
            let intDetails = '';

            for (const dir of dirsToCheck) {
                 const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
                 const pm = getPackageManager(dir);
                 if (pkg.scripts && pkg.scripts['test:integration']) {
                     const intCheck = await this.execCommand(`${pm.run} test:integration`, dir, { ...process.env, CI: 'true' });
                     const output = (intCheck.stdout || '') + ' ' + (intCheck.stderr || '');
                     
                     let statsStr = '';
                     const match = output.match(/Tests:\s*([^\n]+total)/);
                     if (match) {
                         statsStr = ` [${path.basename(dir)}: ${match[1]}]`;
                     }

                     if (intCheck.code === 0) {
                         if (output.includes('No tests found') && !output.includes('PASS')) {
                             // do nothing
                         } else {
                             ranIntegration = true;
                             intDetails += statsStr;
                         }
                     } else {
                         if (output.includes('No tests found')) {
                             // do nothing
                         } else {
                             ranIntegration = true;
                             integrationFailed = true;
                             intDetails += `Failed in ${path.basename(dir)}${statsStr} `;
                         }
                     }
                 }
            }

            if (integrationFailed) {
                 result.stages.integration = { status: 'FAILED', details: intDetails.trim() };
            } else if (ranIntegration) {
                 result.stages.integration = { status: 'PASSED', details: `Integration tests passed.${intDetails}` };
            } else {
                 result.stages.integration = { status: 'SKIPPED', details: 'No integration suite configured; tests were not run.' };
            }
            await this.updateStatus({ stages: result.stages });

            // 7. Final Validation
            const stgs = result.stages;
            const criticalPassed = stgs.changeIntegrity.status === 'PASSED' && 
                                   stgs.syntax.status === 'PASSED' && 
                                   (stgs.dependencies.status === 'PASSED' || stgs.dependencies.status === 'SKIPPED') &&
                                   (stgs.build.status === 'PASSED' || stgs.build.status === 'SKIPPED') &&
                                   stgs.unitTests.status !== 'FAILED' &&
                                   stgs.integration.status !== 'FAILED';
                                   
            result.stages.finalValidation = {
                status: criticalPassed ? 'PASSED' : 'FAILED'
            };
            
            await this.updateStatus({ 
                status: criticalPassed ? 'PASSED' : 'FAILED',
                stages: result.stages
            });

        } catch (e) {
            console.error("Validation failed:", e);
            const query = await db.query('SELECT validation_result FROM analysis WHERE id = $1', [this.analysisId]);
            const current = query.rows[0]?.validation_result || {};
            await this.updateStatus({ 
                status: 'FAILED',
                error: e.message,
                stages: current.stages
            });
        }
    }
}

module.exports = ValidationService;
