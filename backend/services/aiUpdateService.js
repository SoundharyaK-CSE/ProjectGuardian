const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const crypto = require('crypto');
const { exec } = require('child_process');
const { OpenRouterProvider } = require('./ai.service');
const db = require('../config/db');

class AIUpdateService {
    constructor(analysisId) {
        this.analysisId = analysisId;
        this.workspaceRoot = path.join(__dirname, '../../workspace', analysisId);
        this.sourceDir = path.join(this.workspaceRoot, 'source', 'project');
        this.updateDir = path.join(this.workspaceRoot, 'update', 'project');
        this.provider = new OpenRouterProvider();
        this.MAX_RUNTIME_MS = 120000;
        this.startTime = Date.now();
    }

    async getAnalysis() {
        const query = await db.query('SELECT * FROM analysis WHERE id = $1', [this.analysisId]);
        if (query.rows.length === 0) throw new Error("Analysis not found");
        return query.rows[0];
    }

    async updateStatus(statusUpdates) {
        const analysis = await this.getAnalysis();
        let result = analysis.ai_update_result || { status: 'INITIAL', durationMs: 0 };
        result = { ...result, ...statusUpdates };
        await db.query('UPDATE analysis SET ai_update_result = $1 WHERE id = $2', [result, this.analysisId]);
        return result;
    }

    hashFile(filePath) {
        try {
            const content = fs.readFileSync(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch (e) {
            return null;
        }
    }

    checkTimeout() {
        if (Date.now() - this.startTime > this.MAX_RUNTIME_MS) {
            throw new Error('TIMEOUT');
        }
    }

    async createWorkspace() {
        this.checkTimeout();
        await this.updateStatus({ status: 'PREPARING' });
        
        const sourceExists = fs.existsSync(this.sourceDir);
        const sourceIsDir = sourceExists ? fs.statSync(this.sourceDir).isDirectory() : false;
        
        console.log(`AI Update workspace:
analysisId: ${this.analysisId}
workspace: ${this.workspaceRoot}
source: ${this.sourceDir}
sourceExists: ${sourceExists}
sourceIsDir: ${sourceIsDir}
update: ${this.updateDir}`);

        if (!sourceExists) {
            throw new Error("Source project is unavailable. Please re-upload or re-import the project.");
        }
        if (fs.existsSync(this.updateDir)) {
            await fse.remove(this.updateDir);
        }
        await fse.copy(this.sourceDir, this.updateDir);
    }

    async processFileModification(file, implementationPlan, analysis) {
        let attempts = 0;
        const maxAttempts = 3;
        
        const srcPath = path.join(this.updateDir, file);
        if (!fs.existsSync(srcPath)) return false;
        
        const originalContent = fs.readFileSync(srcPath, 'utf-8');
        const originalHash = this.hashFile(srcPath);
        let failureReason = '';

        while (attempts < maxAttempts) {
            attempts++;
            this.checkTimeout();
            
            const prompt = `
            You are an expert developer modifying a specific file for a project.
            
            Implementation Plan: ${JSON.stringify(implementationPlan)}
            
            Target File: ${file}
            Current Content:
            ${originalContent}
            
            ${failureReason ? 'Previous attempt failed: ' + failureReason + '. Please correct the issue.' : ''}
            
            Return ONLY valid JSON with no markdown formatting. Do not truncate the code.
            {
              "file": "${file}",
              "updatedContent": "full new content",
              "action": "modify"
            }
            `;
            
            try {
                const responseText = await this.provider.generate(prompt, true);
                this.checkTimeout();
                
                const data = JSON.parse(responseText);
                
                if (data.action === 'modify' && data.updatedContent) {
                    const targetPath = path.join(this.updateDir, data.file);
                    
                    if (!targetPath.startsWith(this.updateDir)) {
                         failureReason = 'Security violation: path traversal detected';
                         continue;
                    }
                    
                    fs.writeFileSync(targetPath, data.updatedContent, 'utf-8');
                    const newHash = this.hashFile(targetPath);
                    
                    if (originalHash !== newHash) {
                        return true; // Successfully modified
                    } else {
                        failureReason = 'Generated content was identical to original. You MUST make meaningful changes based on the implementation plan.';
                    }
                } else {
                    failureReason = 'Invalid response format or missing updatedContent';
                }
            } catch (e) {
                if (e.message === 'TIMEOUT') throw e;
                failureReason = 'JSON parse error or AI generation failed: ' + e.message;
            }
        }
        
        console.error(`Failed to modify ${file} after 3 attempts. Last reason: ${failureReason}`);
        return false;
    }

    async generateAndApplyChanges(analysis) {
        this.checkTimeout();
        await this.updateStatus({ status: 'UPDATING' });

        const implementationPlan = analysis.implementation_plan?.plan || [];
        const impactAnalysis = analysis.impact_analysis || {};
        const affectedFiles = impactAnalysis.affectedFiles || [];

        const relevantPaths = [];
        for (const f of affectedFiles) {
            const srcPath = path.join(this.updateDir, f.path);
            if (fs.existsSync(srcPath)) {
                relevantPaths.push(f.path);
            }
        }

        let modifiedFiles = [];
        
        for (const file of relevantPaths) {
             const success = await this.processFileModification(file, implementationPlan, analysis);
             if (success) {
                 modifiedFiles.push(file);
             }
             
             await this.updateStatus({
                 modifiedFiles: modifiedFiles,
                 plannedFiles: relevantPaths
             });
        }
        
        if (modifiedFiles.length !== relevantPaths.length) {
            const failedFiles = relevantPaths.filter(f => !modifiedFiles.includes(f));
            throw new Error(`Failed to modify all required files. Failed files: ${failedFiles.join(', ')}`);
        }
        
        return modifiedFiles;
    }

    async generateDiff() {
        this.checkTimeout();
        await this.updateStatus({ status: 'DIFF_READY' });
        
        return new Promise((resolve, reject) => {
            const timeRemaining = this.MAX_RUNTIME_MS - (Date.now() - this.startTime);
            const child = exec(`git diff --no-index "${this.sourceDir}" "${this.updateDir}"`, { timeout: timeRemaining }, (error, stdout, stderr) => {
                const diffOutput = stdout || stderr || '';
                this.updateStatus({ diff: diffOutput }).then(() => resolve(diffOutput)).catch(reject);
            });
            
            child.on('error', (err) => {
                 reject(new Error("Failed to generate diff"));
            });
        });
    }

    async validateProject() {
        this.checkTimeout();
        await this.updateStatus({ status: 'VALIDATING' });
        
        return new Promise((resolve, reject) => {
            const packageJsonPath = path.join(this.updateDir, 'package.json');
            const buildGradlePath = path.join(this.updateDir, 'build.gradle');
            const pomXmlPath = path.join(this.updateDir, 'pom.xml');
            const requirementsTxtPath = path.join(this.updateDir, 'requirements.txt');
            const pyprojectTomlPath = path.join(this.updateDir, 'pyproject.toml');
            
            let cmd = null;
            let cmdName = '';
            
            if (fs.existsSync(packageJsonPath)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    if (pkg.scripts && pkg.scripts.test) {
                        cmd = 'npm.cmd run test';
                        cmdName = 'npm test';
                    } else if (pkg.scripts && pkg.scripts.build) {
                        cmd = 'npm.cmd run build';
                        cmdName = 'npm build';
                    }
                } catch (e) {
                    return this.updateStatus({
                        validation: { status: 'failed', commands: [], errors: ['Invalid package.json'], warnings: [] }
                    }).then(() => resolve(false));
                }
            } else if (fs.existsSync(buildGradlePath)) {
                cmd = process.platform === 'win32' ? 'gradlew.bat build' : './gradlew build';
                cmdName = 'gradle build';
            } else if (fs.existsSync(pomXmlPath)) {
                cmd = process.platform === 'win32' ? 'mvn.cmd test' : 'mvn test';
                cmdName = 'maven test';
            } else if (fs.existsSync(requirementsTxtPath) || fs.existsSync(pyprojectTomlPath)) {
                 cmd = 'pytest';
                 cmdName = 'pytest';
            }
            
            if (!cmd) {
                return this.updateStatus({
                    validation: { status: 'skipped', commands: [], errors: [], warnings: ['No meaningful validation command found for project type.'] }
                }).then(() => resolve(true));
            }
            
            const timeRemaining = this.MAX_RUNTIME_MS - (Date.now() - this.startTime);
            if (timeRemaining <= 0) return reject(new Error('TIMEOUT'));

            exec(cmd, { cwd: this.updateDir, timeout: timeRemaining }, (error, stdout, stderr) => {
                if (error) {
                    if (error.killed) {
                        reject(new Error('TIMEOUT'));
                    } else {
                        this.updateStatus({
                            validation: { status: 'failed', commands: [cmdName], errors: [stderr || stdout], warnings: [] }
                        }).then(() => resolve(false));
                    }
                } else {
                    this.updateStatus({
                        validation: { status: 'passed', commands: [cmdName], errors: [], warnings: [] }
                    }).then(() => resolve(true));
                }
            });
        });
    }

    async run() {
        try {
            const analysis = await this.getAnalysis();
            
            await this.updateStatus({ startedAt: new Date().toISOString(), status: 'PREPARING' });
            
            await this.createWorkspace();
            
            const modifiedFiles = await this.generateAndApplyChanges(analysis);
            
            if (modifiedFiles.length === 0) {
                 await this.updateStatus({ 
                    status: 'FAILED',
                    error: 'No file changes were produced.',
                    completedAt: new Date().toISOString(),
                    durationMs: Date.now() - this.startTime
                });
                return;
            }
            
            await this.generateDiff();
            
            this.checkTimeout();

            await this.updateStatus({ 
                status: 'COMPLETED',
                completedAt: new Date().toISOString(),
                durationMs: Date.now() - this.startTime
            });
            
        } catch (e) {
            const isTimeout = e.message === 'TIMEOUT' || (Date.now() - this.startTime >= this.MAX_RUNTIME_MS);
            
            await this.updateStatus({ 
                status: isTimeout ? 'TIMEOUT' : 'FAILED',
                error: isTimeout ? 'Update timed out before completion.' : e.message,
                completedAt: new Date().toISOString(),
                durationMs: Date.now() - this.startTime
            });
        }
    }
}

module.exports = AIUpdateService;
