const db = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const totalProjectsResult = await db.query('SELECT COUNT(DISTINCT project_name) FROM analysis');
        const totalResult = await db.query('SELECT COUNT(*) FROM analysis');
        const completedResult = await db.query(
            "SELECT COUNT(*) FROM analysis WHERE status = 'COMPLETED' OR validation_result->>'status' = 'PASSED'"
        );
        const failedResult = await db.query(
            "SELECT COUNT(*) FROM analysis WHERE (status = 'FAILED' OR validation_result->>'status' = 'FAILED') AND NOT (status = 'COMPLETED' OR validation_result->>'status' = 'PASSED')"
        );
        
        const totalProjects = parseInt(totalProjectsResult.rows[0].count, 10);
        const total = parseInt(totalResult.rows[0].count, 10);
        const completed = parseInt(completedResult.rows[0].count, 10);
        const failed = parseInt(failedResult.rows[0].count, 10);
        const inProgress = Math.max(0, total - completed - failed);

        res.json({
            totalProjects,
            total,
            completed,
            inProgress,
            failed
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to load dashboard stats' });
    }
};

exports.getRecentAnalyses = async (req, res) => {
    try {
        const result = await db.query('SELECT id, identifier, project_name, status, workflow_step, created_at, updated_at FROM analysis ORDER BY updated_at DESC LIMIT 10');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching recent analyses:', err);
        res.status(500).json({ error: 'Failed to load recent analyses' });
    }
};

exports.getRecentProjects = async (req, res) => {
    try {
        // Get the latest analysis per project to represent the "Project"
        const result = await db.query(`
            SELECT DISTINCT ON (project_name) 
                project_name, 
                id,
                identifier,
                status,
                scan_data,
                updated_at 
            FROM analysis 
            WHERE project_name IS NOT NULL
            ORDER BY project_name, updated_at DESC
        `);
        
        // Then sort the distinct projects by updated_at globally
        const projects = result.rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3);
        
        res.json(projects);
    } catch (err) {
        console.error('Error fetching recent projects:', err);
        res.status(500).json({ error: 'Failed to load recent projects' });
    }
};
