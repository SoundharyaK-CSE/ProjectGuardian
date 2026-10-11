const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const { OpenRouterProvider } = require('./ai.service');
const db = require('../config/db');

class GuideMeService {
    constructor(analysisId) {
        this.analysisId = analysisId;
        this.workspaceRoot = path.join(__dirname, '../../workspace', analysisId);
        this.sourceDir = path.join(this.workspaceRoot, 'source', 'project');
        this.updateDir = path.join(this.workspaceRoot, 'update', 'project');
        this.provider = new OpenRouterProvider();
    }

    async getAnalysis() {
        const query = await db.query('SELECT * FROM analysis WHERE id = $1', [this.analysisId]);
        if (query.rows.length === 0) throw new Error("Analysis not found");
        return query.rows[0];
    }

    async initProgress() {
        const analysis = await this.getAnalysis();
        let progress = analysis.guide_me_progress;
        
        // If progress is already initialized, return it
        if (progress && progress.steps && progress.steps.length > 0) {
            return progress;
        }

        // Copy source to update dir if it doesn't exist
        if (!fs.existsSync(this.updateDir)) {
            await fse.copy(this.sourceDir, this.updateDir);
        }

        const affectedFiles = analysis.impact_analysis?.affectedFiles || [];
        
        // Normalize paths and remove duplicates
        const uniqueFilesMap = new Map();
        for (const fileObj of affectedFiles) {
            if (!fileObj.path) continue;
            // Normalize path (convert backslashes to forward slashes, remove leading slashes)
            let normPath = fileObj.path.replace(/\\/g, '/');
            if (normPath.startsWith('./')) normPath = normPath.substring(2);
            if (normPath.startsWith('/')) normPath = normPath.substring(1);
            
            if (!uniqueFilesMap.has(normPath)) {
                uniqueFilesMap.set(normPath, {
                    path: normPath,
                    recommendedChange: fileObj.recommendedChange || `Update ${path.basename(normPath)} as per requirements.`
                });
            }
        }
        
        const uniqueFiles = Array.from(uniqueFilesMap.values());
        
        const steps = uniqueFiles.map((file, index) => ({
            id: `step-${index + 1}`,
            title: `Update ${path.basename(file.path)}`,
            description: file.recommendedChange,
            file: file.path,
            status: 'PENDING',
            originalSnippet: null,
            proposedSnippet: null,
            explanation: null,
            codeLocation: null,
            hash: null
        }));

        progress = { steps, currentStepId: steps.length > 0 ? steps[0].id : null };
        await db.query('UPDATE analysis SET guide_me_progress = $1 WHERE id = $2', [progress, this.analysisId]);
        return progress;
    }

    async generateProposal(stepId) {
        const analysis = await this.getAnalysis();
        const progress = analysis.guide_me_progress;
        const stepIndex = progress.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) throw new Error("Step not found");
        const step = progress.steps[stepIndex];

        if (step.status === 'READY' || step.status === 'ACCEPTED' || step.status === 'APPLIED') {
            return step;
        }

        const targetPath = path.join(this.updateDir, step.file);
        if (!fs.existsSync(targetPath)) {
            step.status = 'FAILED';
            step.explanation = 'File not found in update workspace.';
            await this._saveProgress(progress);
            return step;
        }

        const content = fs.readFileSync(targetPath, 'utf8');
        
        const prompt = `
        You are assisting a developer in modifying a file for a new requirement.
        
        New Requirement: ${analysis.requirement_analysis?.refinedRequirement || 'See implementation plan'}
        Target File: ${step.file}
        Recommended Change: ${step.description}
        
        Current File Content:
        ${content}
        
        Analyze the file and generate a precise patch for the change.
        Return ONLY valid JSON with this exact structure (no markdown fences around it):
        {
            "codeLocation": "string (e.g., 'Function login()' or 'Lines 45-60')",
            "originalSnippet": "string (the exact original code that will be replaced, or a nearby anchor if adding new code. Ensure this exactly matches the existing file)",
            "proposedSnippet": "string (the syntax-highlighted replacement or addition)",
            "explanation": "string (Clear explanation of what changes, why it is needed, and how it satisfies the requirement. Add 'Verification: run unit tests' etc.)"
        }
        `;

        try {
            step.status = 'GENERATING';
            await this._saveProgress(progress);

            const response = await this.provider.generate(prompt, true);
            const data = JSON.parse(response);

            step.originalSnippet = data.originalSnippet;
            step.proposedSnippet = data.proposedSnippet;
            step.codeLocation = data.codeLocation;
            step.explanation = data.explanation;
            step.status = 'READY';
        } catch (err) {
            step.status = 'FAILED';
            step.explanation = 'Failed to generate code proposal: ' + err.message;
        }

        await this._saveProgress(progress);
        return step;
    }

    async submitDecision(stepId, decision) {
        const analysis = await this.getAnalysis();
        const progress = analysis.guide_me_progress;
        const step = progress.steps.find(s => s.id === stepId);
        if (!step) throw new Error("Step not found");

        if (decision === 'ACCEPT') {
            step.status = 'ACCEPTED';
        } else if (decision === 'REJECT') {
            step.status = 'REJECTED';
        }

        await this._saveProgress(progress);
        return step;
    }

    async applyAcceptedChanges() {
        const analysis = await this.getAnalysis();
        const progress = analysis.guide_me_progress;
        
        const acceptedSteps = progress.steps.filter(s => s.status === 'ACCEPTED');
        
        for (const step of acceptedSteps) {
            try {
                const targetPath = path.join(this.updateDir, step.file);
                if (!fs.existsSync(targetPath)) {
                    step.status = 'FAILED';
                    step.explanation = 'Target file not found in update workspace.';
                    break; // Stop on failure
                }
                
                let content = fs.readFileSync(targetPath, 'utf8');
                
                if (step.originalSnippet && content.includes(step.originalSnippet)) {
                    content = content.replace(step.originalSnippet, step.proposedSnippet);
                    fs.writeFileSync(targetPath, content, 'utf8');
                    step.status = 'APPLIED';
                } else if (!step.originalSnippet) {
                    fs.writeFileSync(targetPath, step.proposedSnippet, 'utf8');
                    step.status = 'APPLIED';
                } else {
                    step.status = 'FAILED';
                    step.explanation = 'Stale source file: The original code snippet could not be found in the target file. It may have been modified by another step or external change.';
                    break; // Stop on failure
                }
            } catch (err) {
                step.status = 'FAILED';
                step.explanation = 'Failed to apply change: ' + err.message;
                break; // Stop on failure
            }
        }
        
        await this._saveProgress(progress);
        return progress;
    }

    async _saveProgress(progress) {
        await db.query('UPDATE analysis SET guide_me_progress = $1 WHERE id = $2', [progress, this.analysisId]);
    }
}

module.exports = GuideMeService;
