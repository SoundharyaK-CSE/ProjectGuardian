const fs = require('fs').promises;
const path = require('path');
const db = require('../config/db');

class ScannerService {
    static async runFullScan(analysisId, projectPath) {
        try {
            let scanData = {
                progress: { stage: 0, error: null },
                technologies: [],
                allFiles: [],
                packageJsons: [],
                languages: [],
                frameworks: [],
                dependencies: {},
                components: [],
                apis: [],
                relationships: []
            };

            const updateProgress = async (stage) => {
                scanData.progress.stage = stage;
                await db.query(
                    'UPDATE analysis SET scan_data = $1 WHERE id = $2',
                    [JSON.stringify(scanData), analysisId]
                );
                // yield event loop to allow concurrent API polls
                await new Promise(r => setImmediate(r));
            };

            // Stage 1: Repository loaded
            await updateProgress(1);
            try {
                await fs.access(projectPath);
            } catch {
                throw new Error('Project path does not exist');
            }

            // Stage 2 & 4 combined into one filesystem walk, but we report stages sequentially
            // Stage 2: Detecting programming languages (we'll just list common ones based on files)
            await updateProgress(2);
            await this.walkAsync(projectPath, projectPath, scanData);
            
            const extToLang = {
                '.js': 'JavaScript',
                '.jsx': 'React',
                '.ts': 'TypeScript',
                '.tsx': 'React (TS)',
                '.py': 'Python',
                '.java': 'Java',
                '.go': 'Go',
                '.html': 'HTML',
                '.css': 'CSS'
            };
            const foundExts = new Set();
            for (const f of scanData.allFiles) {
                const ext = path.extname(f).toLowerCase();
                if (extToLang[ext]) foundExts.add(extToLang[ext]);
            }
            scanData.languages = Array.from(foundExts);
            scanData.technologies.push(...scanData.languages);

            // Stage 3: Detecting frameworks
            await updateProgress(3);
            scanData.frameworks = [];
            if (scanData.packageJsons.length > 0) {
                for (const pkgPath of scanData.packageJsons) {
                    try {
                        const content = await fs.readFile(path.join(projectPath, pkgPath), 'utf-8');
                        const pkg = JSON.parse(content);
                        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                        Object.keys(deps).forEach(dep => scanData.dependencies[dep] = deps[dep]);
                        
                        if (deps['react']) scanData.frameworks.push('React.js');
                        if (deps['express']) scanData.frameworks.push('Express.js');
                        if (deps['next']) scanData.frameworks.push('Next.js');
                        if (deps['vue']) scanData.frameworks.push('Vue.js');
                        if (deps['mongoose'] || deps['mongodb']) scanData.frameworks.push('MongoDB');
                    } catch(e) {}
                }
            }
            scanData.technologies.push(...Array.from(new Set(scanData.frameworks)));
            // Ensure Node.js is detected if package.json exists
            if (scanData.packageJsons.length > 0 && !scanData.technologies.includes('Node.js')) {
                scanData.technologies.push('Node.js');
            }

            // Stage 4: Scanning project structure
            await updateProgress(4);
            // Already walked in stage 2 physically, just reporting it here logically

            // Stage 5: Detecting dependencies
            await updateProgress(5);
            // Done alongside Stage 3 physically

            // Stage 6: Analyzing components
            await updateProgress(6);
            for (const f of scanData.allFiles) {
                const lower = f.toLowerCase();
                if (lower.includes('components/') || lower.includes('controllers/')) {
                    scanData.components.push(f);
                }
            }

            // Stage 7: Detecting APIs
            await updateProgress(7);
            for (const f of scanData.allFiles) {
                const lower = f.toLowerCase();
                if (lower.includes('routes/') || lower.includes('api/')) {
                    scanData.apis.push(f);
                }
            }

            // Stage 8: Building dependency map
            await updateProgress(8);
            scanData.relationships = [];
            for (const relPath of scanData.allFiles) {
                if (!relPath.match(/\.(js|jsx|ts|tsx)$/i)) continue;
                try {
                    const content = await fs.readFile(path.join(projectPath, relPath), 'utf-8');
                    
                    const importRegex = /import\s+(?:.*?\s+from\s+)?['"](.*?)['"]/g;
                    const requireRegex = /require\(['"](.*?)['"]\)/g;
                    
                    let match;
                    while ((match = importRegex.exec(content)) !== null) {
                        if (match[1].startsWith('.')) {
                            scanData.relationships.push({ source: relPath, target: match[1], type: 'import' });
                        }
                    }
                    while ((match = requireRegex.exec(content)) !== null) {
                        if (match[1].startsWith('.')) {
                            scanData.relationships.push({ source: relPath, target: match[1], type: 'import' });
                        }
                    }

                    const fetchRegex = /(?:fetch|axios\.(?:get|post|put|delete))\(['"](.*?)['"]/g;
                    while ((match = fetchRegex.exec(content)) !== null) {
                        if (match[1].startsWith('/api')) {
                            scanData.relationships.push({ source: relPath, target: match[1], type: 'api_call' });
                        }
                    }

                    const routeRegex = /(?:router|app)\.(?:get|post|put|delete)\(['"](.*?)['"]/g;
                    while ((match = routeRegex.exec(content)) !== null) {
                        scanData.relationships.push({ source: relPath, target: match[1], type: 'api_route' });
                    }
                } catch (e) {
                    console.error('Error parsing file for relationships', relPath, e);
                }
            }
            
            const fileSet = new Set(scanData.allFiles);
            scanData.relationships = scanData.relationships.map(rel => {
                if (rel.type === 'import') {
                    const sourceDir = path.dirname(rel.source);
                    let resolved = path.join(sourceDir, rel.target).replace(/\\/g, '/');
                    if (!path.extname(resolved)) {
                        for (const ext of ['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts', '/index.jsx', '/index.tsx']) {
                            if (fileSet.has(resolved + ext)) {
                                resolved = resolved + ext;
                                break;
                            }
                        }
                    }
                    return { ...rel, target: resolved };
                }
                return rel;
            }).filter(rel => {
                if (rel.type === 'import') return fileSet.has(rel.target);
                return true;
            });

            // Stage 9: Preparing project model
            await updateProgress(9);
            
            // Mark complete in DB
            scanData.technologies = Array.from(new Set(scanData.technologies));
            await db.query(
                'UPDATE analysis SET status = $1, workflow_step = $2, scan_data = $3 WHERE id = $4',
                ['SCANNED', 'OVERVIEW', JSON.stringify(scanData), analysisId]
            );
            
        } catch (err) {
            console.error('Scan Error:', err);
            await db.query(
                'UPDATE analysis SET status = $1, scan_data = $2 WHERE id = $3',
                ['FAILED', JSON.stringify({ progress: { stage: -1, error: err.message } }), analysisId]
            );
        }
    }

    static async walkAsync(dir, baseDir, scanData) {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const relPath = path.relative(baseDir, filePath).replace(/\\/g, '/');
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                if (['node_modules', '.git', 'build', 'dist', '.next'].includes(file)) continue;
                await this.walkAsync(filePath, baseDir, scanData);
            } else {
                scanData.allFiles.push(relPath);
                if (file === 'package.json') scanData.packageJsons.push(relPath);
            }
        }
    }
}

module.exports = ScannerService;
