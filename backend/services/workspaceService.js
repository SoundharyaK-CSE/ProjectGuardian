const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const { v4: uuidv4 } = require('uuid'); // Need to install uuid

const WORKSPACE_BASE = path.join(__dirname, '../../workspace');

class WorkspaceService {
    static async setupAnalysisWorkspace(analysisId, zipFilePath, originalFilename) {
        const analysisDir = path.join(WORKSPACE_BASE, analysisId);
        const sourceDir = path.join(analysisDir, 'source', 'project');
        const updateDir = path.join(analysisDir, 'update', 'project');

        if (!analysisDir.startsWith(WORKSPACE_BASE)) {
            throw new Error('Unsafe workspace path');
        }

        fs.mkdirSync(sourceDir, { recursive: true });
        fs.mkdirSync(updateDir, { recursive: true });

        await this.extractZipSafe(zipFilePath, sourceDir);
        this.copyRecursiveSync(sourceDir, updateDir);
        
        return sourceDir;
    }

    static async setupGitHubWorkspace(analysisId, repositoryUrl, branch) {
        const { simpleGit } = require('simple-git');
        const analysisDir = path.join(WORKSPACE_BASE, analysisId);
        const sourceDir = path.join(analysisDir, 'source', 'project');
        const updateDir = path.join(analysisDir, 'update', 'project');

        if (!analysisDir.startsWith(WORKSPACE_BASE)) {
            throw new Error('Unsafe workspace path');
        }

        fs.mkdirSync(sourceDir, { recursive: true });
        fs.mkdirSync(updateDir, { recursive: true });

        const git = simpleGit();
        
        const cloneOptions = ['--depth', '1', '-c', 'core.longpaths=true'];
        if (branch && branch.trim() !== '') {
            cloneOptions.push('--branch', branch.trim());
        }

        try {
            await git.clone(repositoryUrl, sourceDir, cloneOptions);
        } catch (err) {
            const error = new Error(`Failed to clone repository. Make sure it is public and accessible. Details: ${err.message}`);
            error.type = 'CLONE_ERROR';
            throw error;
        }

        // Remove .git folder from source to avoid accidental commits during processing
        fs.rmSync(path.join(sourceDir, '.git'), { recursive: true, force: true });
        
        this.copyRecursiveSync(sourceDir, updateDir);
        
        return sourceDir;
    }

    static async extractZipSafe(zipFilePath, targetDir) {
        return new Promise((resolve, reject) => {
            fs.createReadStream(zipFilePath)
                .pipe(unzipper.Parse())
                .on('entry', function (entry) {
                    const fileName = entry.path;
                    const type = entry.type; 
                    const fullPath = path.resolve(targetDir, fileName);

                    // Zip Slip protection
                    if (fullPath.indexOf(path.resolve(targetDir)) !== 0) {
                        entry.autodrain();
                        return;
                    }

                    if (type === 'Directory') {
                        fs.mkdirSync(fullPath, { recursive: true });
                        entry.autodrain();
                    } else {
                        // Ensure parent directory exists
                        const parent = path.dirname(fullPath);
                        fs.mkdirSync(parent, { recursive: true });
                        entry.pipe(fs.createWriteStream(fullPath));
                    }
                })
                .on('close', resolve)
                .on('error', reject);
        });
    }

    static copyRecursiveSync(src, dest) {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();
        if (isDirectory) {
            fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach(function(childItemName) {
                WorkspaceService.copyRecursiveSync(path.join(src, childItemName),
                                                   path.join(dest, childItemName));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }
}

module.exports = WorkspaceService;
