require('dotenv').config();
const db = require('./config/db');
const { OpenRouterProvider } = require('./services/ai.service');

async function migrateSteps() {
    try {
        const analysisId = '586333e2-dd57-42c1-9893-641f723bf551';
        const res = await db.query('SELECT * FROM analysis WHERE id = $1', [analysisId]);
        const analysis = res.rows[0];
        const oldProgress = analysis.guide_me_progress;
        
        // Preserve old decisions
        const oldStepsByFile = {};
        if (oldProgress && oldProgress.steps) {
            oldProgress.steps.forEach(step => {
                if (step.status !== 'PENDING' && step.status !== 'GENERATING') {
                    oldStepsByFile[step.file] = step;
                }
            });
        }
        
        console.log('Old preserved files:', Object.keys(oldStepsByFile));
        
        const provider = new OpenRouterProvider();
        const prompt = `
        You are a senior technical architect creating a detailed, step-by-step implementation plan.
        Requirement: ${analysis.requirement_analysis?.refinedRequirement || 'Implement the requested change.'}
        Affected Files Context: ${JSON.stringify(analysis.impact_analysis?.affectedFiles || [])}
        
        Analyze the requirement and the context. Determine the exact necessary implementation tasks.
        Create as many steps as are genuinely needed. Do not limit yourself to the number of affected files, and do not create unnecessary steps.
        Each step MUST have a specific target file where the code change will happen.
        
        Output MUST be in valid JSON format:
        {
           "steps": [
             {
               "title": "Update Login UI",
               "description": "Add OTP input fields and buttons to support mobile login.",
               "file": "frontend/src/pages/LoginPage.jsx"
             }
           ]
        }
        `;
        
        console.log('Asking AI for new implementation plan...');
        const aiResponse = await provider.generate(prompt, true);
        const data = JSON.parse(aiResponse);
        
        console.log('AI generated steps:', data.steps.length);
        
        const newSteps = data.steps.map((s, index) => {
            const oldStep = oldStepsByFile[s.file];
            if (oldStep) {
                // preserve everything from the old step to keep decisions intact
                return {
                    ...oldStep,
                    id: `step-${index + 1}` // re-number it just in case
                };
            }
            
            return {
                id: `step-${index + 1}`,
                title: s.title,
                description: s.description,
                file: s.file,
                status: 'PENDING',
                originalSnippet: null,
                proposedSnippet: null,
                explanation: null,
                codeLocation: null,
                hash: null
            };
        });
        
        const newProgress = { steps: newSteps, currentStepId: newSteps[0].id };
        
        await db.query('UPDATE analysis SET guide_me_progress = $1 WHERE id = $2', [newProgress, analysisId]);
        console.log('Successfully updated Guide Me progress in DB with dynamic steps while preserving decisions!');
        console.log(JSON.stringify(newSteps.map(s => ({ title: s.title, file: s.file, status: s.status })), null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

migrateSteps();
