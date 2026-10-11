const db = require('../config/db');
const WorkspaceService = require('../services/workspaceService');
const ScannerService = require('../services/scannerService');

exports.createAnalysis = async (req, res) => {
    try {
        const { projectName, existingRequirement, newRequirement } = req.body;
        if (!projectName) {
            return res.status(400).json({ error: 'Project name is required' });
        }
        
        const identifier = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' + Date.now();
        const result = await db.query(
            `INSERT INTO analysis 
            (identifier, status, project_name, existing_requirement, new_requirement, workflow_step)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [identifier, 'CREATED', projectName, existingRequirement, newRequirement, 'UPLOAD']
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.uploadProject = async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'No zip file uploaded' });
        }
        
        // Verify analysis exists
        const analysis = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysis.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        const sourceDir = await WorkspaceService.setupAnalysisWorkspace(id, file.path, file.originalname);
        
        await db.query(`UPDATE analysis SET status = $1, workflow_step = $2, source_type = 'ZIP' WHERE id = $3`, ['UPLOADED', 'SCANNING', id]);
        
        res.json({
            analysisId: id,
            status: 'UPLOADED',
            extractedPath: sourceDir
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Server error during upload' });
    }
};

exports.importGitHub = async (req, res) => {
    try {
        const { id } = req.params;
        const { repositoryUrl, branch } = req.body;
        
        console.log(`[GitHub Import] Starting import for analysis ${id} from ${repositoryUrl} branch: ${branch || 'default'}`);

        if (!repositoryUrl || !repositoryUrl.startsWith('https://github.com/')) {
            console.error(`[GitHub Import] Invalid URL: ${repositoryUrl}`);
            return res.status(400).json({ error: 'Valid GitHub repository URL required' });
        }
        
        const analysis = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysis.rows.length === 0) {
            console.error(`[GitHub Import] Analysis not found: ${id}`);
            return res.status(404).json({ error: 'Analysis not found' });
        }

        const sourceDir = await WorkspaceService.setupGitHubWorkspace(id, repositoryUrl, branch);
        console.log(`[GitHub Import] Workspace setup complete at ${sourceDir}`);
        
        await db.query(`UPDATE analysis SET status = $1, workflow_step = $2, source_type = 'GITHUB', repository_url = $3, repository_branch = $4 WHERE id = $5`, 
            ['UPLOADED', 'SCANNING', repositoryUrl, branch || null, id]);
        console.log(`[GitHub Import] DB updated for ${id}`);
        
        res.json({
            analysisId: id,
            status: 'UPLOADED',
            sourcePath: sourceDir
        });
    } catch (err) {
        console.error(`[GitHub Import] Failed for analysis ${req.params.id}:`, err);
        if (err.type === 'CLONE_ERROR') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || 'Server error during GitHub import' });
    }
};

exports.scanProject = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ensure analysis and workspace exist
        const analysis = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysis.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const path = require('path');
        const sourceDir = path.join(__dirname, '../../workspace', id, 'source', 'project');
        
        // Verify source dir exists (basic check)
        const fs = require('fs');
        if (!fs.existsSync(sourceDir)) {
             return res.status(400).json({ error: 'Source project missing' });
        }

        const currentStatus = analysis.rows[0].status;
        if (currentStatus === 'SCANNING' || currentStatus === 'SCANNED') {
            return res.json({ analysisId: id, status: currentStatus });
        }

        // Set status to SCANNING
        await db.query('UPDATE analysis SET status = $1 WHERE id = $2', ['SCANNING', id]);
        
        // Kick off scan async
        ScannerService.runFullScan(id, sourceDir).catch(e => console.error(e));
        
        res.json({
            analysisId: id,
            status: 'SCANNING'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Server error during scan' });
    }
};

exports.getAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(id)) {
            const recovery = await db.query('SELECT id FROM analysis WHERE identifier = $1', [id]);
            if (recovery.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Invalid UUID format',
                    recoveredId: recovery.rows[0].id
                });
            }
            return res.status(400).json({ error: 'Invalid UUID format' });
        }

        const result = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

const { OpenRouterProvider, AIService } = require('../services/ai.service');

exports.analyzeRequirement = async (req, res) => {
    try {
        const { id } = req.params;
        
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const analysis = analysisQuery.rows[0];
        
        if (!analysis.existing_requirement || !analysis.new_requirement) {
            return res.status(400).json({ error: 'Both existing and new requirements are needed' });
        }
        
        const provider = new OpenRouterProvider();
        const aiService = new AIService(provider);
        
        const requirementAnalysisData = await aiService.analyzeRequirementChange(analysis.existing_requirement, analysis.new_requirement);
        
        const result = {
            ...requirementAnalysisData,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        
        await db.query('UPDATE analysis SET requirement_analysis = $1, workflow_step = $2 WHERE id = $3', [result, 'REQUIREMENT_ANALYSIS', id]);
        
        res.json(result);
    } catch (err) {
        console.error("Error analyzing requirement:", err);
        res.status(500).json({ error: err.message || 'Server error during requirement analysis' });
    }
};

exports.getRequirementAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const analysis = analysisQuery.rows[0];
        if (analysis.requirement_analysis) {
            return res.json(analysis.requirement_analysis);
        } else {
            return res.status(404).json({ error: 'Requirement analysis not found for this project' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.analyzeImpact = async (req, res) => {
    try {
        const { id } = req.params;
        
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const analysis = analysisQuery.rows[0];
        
        if (!analysis.scan_data) {
            return res.status(400).json({ error: 'Project scan data is required for impact analysis' });
        }
        if (!analysis.requirement_analysis) {
             return res.status(400).json({ error: 'Requirement analysis must be completed first' });
        }
        
        const scanData = typeof analysis.scan_data === 'string' ? JSON.parse(analysis.scan_data) : analysis.scan_data;
        
        // Prepare context
        const context = JSON.stringify({
            allFiles: scanData.allFiles || [],
            dependencies: scanData.dependencies || {},
            technologies: scanData.technologies || [],
            relationships: scanData.relationships ? scanData.relationships.slice(0, 150) : [], // limit to prevent huge prompts
            components: scanData.components || []
        });

        const provider = new OpenRouterProvider();
        const aiService = new AIService(provider);
        
        const impactAnalysisData = await aiService.analyzeImpact(
            analysis.existing_requirement, 
            analysis.new_requirement, 
            analysis.requirement_analysis,
            context
        );
        
        // Validate against actual files
        const actualFiles = scanData.allFiles || [];
        if (impactAnalysisData.affectedFiles) {
            impactAnalysisData.affectedFiles = impactAnalysisData.affectedFiles.filter(f => {
                // simple substring check since paths might be partial
                return actualFiles.some(af => af.includes(f.path));
            });
        }
        
        const summary = {
            affectedFiles: impactAnalysisData.affectedFiles?.length || 0,
            components: impactAnalysisData.components?.length || 0,
            apis: impactAnalysisData.apis?.length || 0,
            database: impactAnalysisData.database?.length || 0,
            tests: impactAnalysisData.tests?.length || 0,
        };

        const result = {
            ...impactAnalysisData,
            summary,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        
        await db.query('UPDATE analysis SET impact_analysis = $1, workflow_step = $2 WHERE id = $3', [result, 'IMPACT_ANALYSIS', id]);
        
        res.json(result);
    } catch (err) {
        console.error("Error analyzing impact:", err);
        res.status(500).json({ error: err.message || 'Server error during impact analysis' });
    }
};

exports.getImpactAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const analysis = analysisQuery.rows[0];
        if (analysis.impact_analysis) {
            return res.json(analysis.impact_analysis);
        } else {
            return res.status(404).json({ error: 'Impact analysis not found for this project' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.generateImplementationPlan = async (req, res) => {
    try {
        const { id } = req.params;
        
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const analysis = analysisQuery.rows[0];
        
        if (!analysis.impact_analysis) {
             return res.status(400).json({ error: 'Impact analysis must be completed first' });
        }

        const provider = new OpenRouterProvider();
        const aiService = new AIService(provider);
        
        const planData = await aiService.generateImplementationPlan(
            analysis.existing_requirement, 
            analysis.new_requirement, 
            analysis.impact_analysis
        );

        const result = {
            ...planData,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        
        await db.query('UPDATE analysis SET implementation_plan = $1, workflow_step = $2 WHERE id = $3', [result, 'IMPLEMENTATION_PLAN', id]);
        
        res.json(result);
    } catch (err) {
        console.error("Error generating implementation plan:", err);
        res.status(500).json({ error: err.message || 'Server error during implementation plan generation' });
    }
};

exports.getImplementationPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const analysis = analysisQuery.rows[0];
        if (analysis.implementation_plan) {
            return res.json(analysis.implementation_plan);
        } else {
            return res.status(404).json({ error: 'Implementation plan not found for this project' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.saveDeveloperDecision = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision } = req.body;
        
        if (decision !== 'AI_UPDATE' && decision !== 'GUIDE_ME') {
            return res.status(400).json({ error: 'Invalid decision' });
        }
        
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const decisionData = {
            decision: decision,
            status: 'selected',
            selectedAt: new Date().toISOString()
        };
        
        await db.query('UPDATE analysis SET developer_decision = $1, workflow_step = $2 WHERE id = $3', [decisionData, 'DECISION', id]);
        
        res.json(decisionData);
    } catch (err) {
        console.error("Error saving developer decision:", err);
        res.status(500).json({ error: err.message || 'Server error during developer decision save' });
    }
};

exports.getDeveloperDecision = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const analysis = analysisQuery.rows[0];
        if (analysis.developer_decision) {
            return res.json(analysis.developer_decision);
        } else {
            return res.status(404).json({ error: 'Developer decision not found for this project' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

const AIUpdateService = require('../services/aiUpdateService');

exports.startAIUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const service = new AIUpdateService(id);
        
        // Start asynchronously
        service.run().catch(err => console.error("Async AI update failed", err));
        
        res.json({ status: 'started' });
    } catch (err) {
        console.error("Error starting AI update:", err);
        res.status(500).json({ error: 'Server error starting update' });
    }
};

exports.resetAIUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const fs = require('fs-extra');
        const path = require('path');
        const updateDir = path.join(__dirname, '../../workspace', id, 'update', 'project');
        
        // Safety check to ensure we are only deleting the update dir
        if (updateDir.includes(id) && updateDir.endsWith('project')) {
            await fs.remove(updateDir);
        }
        
        await db.query('UPDATE analysis SET ai_update_result = NULL WHERE id = $1', [id]);
        res.json({ status: 'reset' });
    } catch (err) {
        console.error("Error resetting AI update:", err);
        res.status(500).json({ error: 'Server error resetting update' });
    }
};

exports.getAIUpdateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT ai_update_result FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        let result = analysisQuery.rows[0].ai_update_result;
        
        if (!result) {
            return res.json({ status: 'INITIAL' });
        }
        
        // Normalize inconsistent state
        if (result.status === 'COMPLETED') {
            const planned = result.plannedFiles || [];
            const modified = result.modifiedFiles || [];
            if (planned.length > 0 && planned.length !== modified.length) {
                result.status = 'FAILED';
                result.error = `Failed to modify all required files. ${modified.length}/${planned.length} files modified.`;
                // Update DB to fix it permanently
                await db.query('UPDATE analysis SET ai_update_result = $1 WHERE id = $2', [result, id]);
            }
        }
        
        res.json(result);
    } catch (err) {
        console.error("Error getting AI update status:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

const ValidationService = require('../services/validationService');

exports.runValidation = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT validation_result FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const vr = analysisQuery.rows[0].validation_result;
        if (vr && (vr.status === 'VALIDATING' || vr.status === 'RUNNING')) {
            return res.json({ status: 'already_running', current: vr });
        }

        const service = new ValidationService(id);
        service.run().catch(err => console.error("Async validation failed", err));
        res.json({ status: 'started' });
    } catch (err) {
        console.error("Error starting validation:", err);
        res.status(500).json({ error: 'Server error starting validation' });
    }
};

exports.getValidationResult = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT validation_result FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(analysisQuery.rows[0].validation_result || { status: 'INITIAL' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.downloadProject = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        const vr = analysisQuery.rows[0].validation_result;
        if (!vr || vr.status !== 'PASSED') {
            return res.status(400).json({ error: 'Validation must pass before downloading' });
        }
        
        const path = require('path');
        const fs = require('fs');
        const AdmZip = require('adm-zip');
        const updateDir = path.join(__dirname, '../../workspace', id, 'update', 'project');
        
        if (!fs.existsSync(updateDir)) {
            return res.status(404).json({ error: 'Updated project not found' });
        }
        
        const zip = new AdmZip();
        
        function addFolderToZip(folderPath, zipPath) {
            const items = fs.readdirSync(folderPath);
            for (const item of items) {
                if (['node_modules', '.git', 'build', 'dist', 'coverage'].includes(item)) continue;
                if (item.startsWith('.env')) continue;
                
                const fullPath = path.join(folderPath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    addFolderToZip(fullPath, zipPath ? `${zipPath}/${item}` : item);
                } else {
                    zip.addLocalFile(fullPath, zipPath);
                }
            }
        }
        
        addFolderToZip(updateDir, '');
        
        // Also bundle markdown report inside ZIP for convenience
        try {
            const reportText = generateReportMarkdown(analysisQuery.rows[0], id);
            zip.addFile('PROJECT_GUARDIAN_REPORT.md', Buffer.from(reportText, 'utf8'));
        } catch (repErr) {
            console.error('Could not bundle report in ZIP:', repErr);
        }

        const zipBuffer = zip.toBuffer();
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename="project-update-${id}.zip"`);
        res.set('Content-Length', zipBuffer.length);
        res.end(zipBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

function generateReportMarkdown(analysis, id) {
    const projName = analysis.project_name || 'Project';
    const sourceType = analysis.source_type || 'Unknown';
    const repoUrl = analysis.repository_url || 'N/A';
    const existingReq = analysis.existing_requirement || 'Not available';
    const newReq = analysis.new_requirement || 'Not available';
    const risk = analysis.developer_decision?.risk || 'N/A';
    const decision = analysis.developer_decision?.decision || 'N/A';
    
    const aiUpdate = analysis.ai_update_result || {};
    const modifiedFiles = aiUpdate.modifiedFiles || [];
    const plannedFiles = aiUpdate.plannedFiles || [];
    
    let addCount = 0;
    let delCount = 0;
    if (aiUpdate.diff) {
        const diffLines = aiUpdate.diff.split('\n');
        for (const line of diffLines) {
            if (line.startsWith('+') && !line.startsWith('+++')) addCount++;
            if (line.startsWith('-') && !line.startsWith('---')) delCount++;
        }
    }
    
    const vr = analysis.validation_result || {};
    const stages = vr.stages || {};
    const finalVal = vr.status || 'Not available';

    let md = `# Project Guardian — Update Report\n\n`;
    md += `**Generated Date/Time:** ${new Date().toISOString()}\n`;
    md += `**Analysis ID:** \`${id}\`\n\n`;

    md += `## 1. Project Overview\n\n`;
    md += `- **Project Name:** ${projName}\n`;
    md += `- **Source Type:** ${sourceType}\n`;
    if (sourceType === 'GITHUB') {
        md += `- **Repository URL:** ${repoUrl}\n`;
        if (analysis.repository_branch) {
            md += `- **Branch:** ${analysis.repository_branch}\n`;
        }
    }
    md += `- **Analysis Created At:** ${analysis.created_at ? new Date(analysis.created_at).toISOString() : 'N/A'}\n\n`;

    md += `## 2. Requirements Analysis\n\n`;
    md += `### Existing Requirement\n${existingReq}\n\n`;
    md += `### New Requirement\n${newReq}\n\n`;
    md += `### Execution Decision\n- **Mode:** ${decision}\n- **Risk Level:** ${risk}\n\n`;

    md += `## 3. Code Modifications\n\n`;
    md += `- **AI Update Status:** ${aiUpdate.status || 'Not available'}\n`;
    md += `- **Files Changed:** ${modifiedFiles.length} file(s)\n`;
    if (aiUpdate.diff) {
        md += `- **Lines Added:** +${addCount}\n`;
        md += `- **Lines Removed:** -${delCount}\n`;
    }
    md += `\n### Modified Files List\n`;
    if (modifiedFiles.length === 0) {
        md += `*None reported*\n\n`;
    } else {
        modifiedFiles.forEach(f => {
            md += `- \`${f}\`\n`;
        });
        md += `\n`;
    }

    md += `## 4. Validation Results\n\n`;
    md += `| Check | Status | Details |\n`;
    md += `|---|---|---|\n`;

    const stageLabels = [
        { key: 'changeIntegrity', label: 'Change Integrity' },
        { key: 'dependencies', label: 'Dependencies' },
        { key: 'syntax', label: 'Syntax' },
        { key: 'build', label: 'Build' },
        { key: 'unitTests', label: 'Unit Tests' },
        { key: 'integration', label: 'Integration Checks' },
        { key: 'finalValidation', label: 'Final Validation' }
    ];

    stageLabels.forEach(({ key, label }) => {
        const stg = stages[key];
        const status = stg ? stg.status : 'PENDING';
        const details = (stg && stg.details) ? stg.details.replace(/\|/g, '\\|').replace(/\n/g, ' ') : (status === 'SKIPPED' ? 'Skipped or not configured' : '-');
        md += `| **${label}** | **${status}** | ${details} |\n`;
    });

    md += `\n**Overall Validation Status:** **${finalVal}**\n\n`;

    md += `## 5. Notes & Limitations\n\n`;
    if (vr.failedChecks && vr.failedChecks.length > 0) {
        md += `- **Failed Checks:** ${vr.failedChecks.join(', ')}\n`;
    }
    if (vr.skippedChecks && vr.skippedChecks.length > 0) {
        md += `- **Skipped Checks:** ${vr.skippedChecks.join(', ')}\n`;
    }
    if (!vr.failedChecks?.length && !vr.skippedChecks?.length) {
        md += `No unexpected validation warnings or failed checks were reported.\n`;
    }

    return md;
}

exports.getReport = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        const analysis = analysisQuery.rows[0];

        // Compute addition / deletion summary
        let additions = 0;
        let deletions = 0;
        const aiUpdate = analysis.ai_update_result || {};
        if (aiUpdate.diff) {
            const lines = aiUpdate.diff.split('\n');
            for (const l of lines) {
                if (l.startsWith('+') && !l.startsWith('+++')) additions++;
                if (l.startsWith('-') && !l.startsWith('---')) deletions++;
            }
        }

        const reportData = {
            id: analysis.id,
            project_name: analysis.project_name || 'Project Guardian Update',
            source_type: analysis.source_type || 'Unknown',
            repository_url: analysis.repository_url || null,
            repository_branch: analysis.repository_branch || null,
            created_at: analysis.created_at,
            existing_requirement: analysis.existing_requirement || 'Not available',
            new_requirement: analysis.new_requirement || 'Not available',
            developer_decision: analysis.developer_decision || null,
            ai_update_result: {
                status: aiUpdate.status || 'Not available',
                modifiedFiles: aiUpdate.modifiedFiles || [],
                plannedFiles: aiUpdate.plannedFiles || [],
                additions,
                deletions,
                completedAt: aiUpdate.completedAt || null,
            },
            validation_result: analysis.validation_result || { status: 'INITIAL', stages: {} },
            generated_at: new Date().toISOString()
        };

        res.json(reportData);
    } catch (err) {
        console.error('Error fetching report:', err);
        res.status(500).json({ error: 'Server error retrieving report' });
    }
};

exports.downloadReport = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT * FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        const analysis = analysisQuery.rows[0];
        const markdown = generateReportMarkdown(analysis, id);

        res.set('Content-Type', 'text/markdown; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="guardian-report-${id}.md"`);
        res.send(markdown);
    } catch (err) {
        console.error('Error downloading report:', err);
        res.status(500).json({ error: 'Server error downloading report' });
    }
};

const GuideMeService = require('../services/guideMeService');

exports.getGuideMeProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const analysisQuery = await db.query('SELECT guide_me_progress FROM analysis WHERE id = $1', [id]);
        if (analysisQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(analysisQuery.rows[0].guide_me_progress || { steps: [] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.initGuideMe = async (req, res) => {
    try {
        const { id } = req.params;
        const service = new GuideMeService(id);
        const progress = await service.initProgress();
        res.json(progress);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.generateGuideMeProposal = async (req, res) => {
    try {
        const { id, stepId } = req.params;
        const service = new GuideMeService(id);
        const step = await service.generateProposal(stepId);
        res.json(step);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.submitGuideMeDecision = async (req, res) => {
    try {
        const { id, stepId } = req.params;
        const { decision } = req.body;
        const service = new GuideMeService(id);
        const step = await service.submitDecision(stepId, decision);
        res.json(step);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.applyGuideMeChanges = async (req, res) => {
    try {
        const { id } = req.params;
        const service = new GuideMeService(id);
        const progress = await service.applyAcceptedChanges();
        
        const hasFailures = progress.steps.some(s => s.status === 'FAILED');
        if (hasFailures) {
            return res.json(progress);
        }
        
        // After applying, we want to transition to validation/diff step
        // We will generate the diff.
        const aiService = require('../services/aiUpdateService');
        const updater = new aiService(id);
        
        // Reset startTime to now so diff generation doesn't time out based on an old startTime
        updater.startTime = Date.now();
        
        // Generate diff
        await updater.generateDiff();
        
        const acceptedSteps = progress.steps.filter(s => s.status === 'ACCEPTED' || s.status === 'APPLIED');
        const modifiedFiles = acceptedSteps.map(s => s.file);

        // Mark as completed so AI Update Mode UI picks it up
        await updater.updateStatus({ 
            status: 'COMPLETED',
            modifiedFiles: modifiedFiles,
            plannedFiles: modifiedFiles,
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - updater.startTime
        });
        
        res.json(progress);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
