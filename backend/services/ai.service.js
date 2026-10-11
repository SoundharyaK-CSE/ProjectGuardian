class OpenRouterProvider {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }
    async generate(prompt, isJson = false) {
        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY is not set');
        }
        
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                response_format: isJson ? { type: "json_object" } : undefined,
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });
        
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenRouter error: ${err}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
}

class AIService {
    constructor(provider) {
        this.provider = provider;
    }
    
    async analyzeRequirementChange(existingRequirement, newRequirement) {
        const prompt = `
        You are a requirement analysis expert.
        Compare the existing requirement with the new requirement.
        
        Existing Requirement: "${existingRequirement}"
        New Requirement: "${newRequirement}"
        
        Output MUST be in valid JSON format with the following structure:
        {
          "changeDetected": true/false,
          "changeType": "Short summary of change (e.g. Authentication Method)",
          "explanation": "1-2 sentences explaining what changed.",
          "categories": [
            "Category1", "Category2"
          ],
          "confidence": <integer from 0 to 100>
        }
        
        For categories, use ones that make sense, such as: Authentication, User Input, API, User Data, Verification, Testing, UI, Database.
        Make sure the explanation is written in third person like "Guardian understands that...".
        `;
        
        const responseText = await this.provider.generate(prompt, true);
        try {
            return JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse AI response:", responseText);
            throw new Error("Invalid response format from AI");
        }
    }

    async analyzeImpact(existingReq, newReq, reqAnalysis, scanDataContext) {
        const prompt = `
        You are a senior technical architect analyzing the impact of a requirement change on a project.
        
        Existing Requirement: "${existingReq}"
        New Requirement: "${newReq}"
        Requirement Analysis summary: ${JSON.stringify(reqAnalysis)}
        
        Project Context (Files, APIs, Dependencies):
        ${scanDataContext}
        
        Identify the real affected files, components, APIs, database tables, and tests based on the project context.
        Provide your reasoning relying ONLY on the provided project context evidence.
        
        Output MUST be in valid JSON format with the following structure:
        {
          "affectedFiles": [
            {
              "path": "path/to/file.ext",
              "type": "Frontend|Backend|API|Service|Database|Test|Config|Component|Utility|Other",
              "impact": "High|Medium|Low",
              "reason": "Why this file is affected.",
              "direct": true|false,
              "evidence": ["evidence 1", "evidence 2"],
              "relatedFiles": ["path/to/other.js"],
              "relatedApis": ["/api/route"],
              "recommendedChange": "What needs to be changed here"
            }
          ],
          "components": ["List of affected abstract components e.g. LoginFlow, AuthService"],
          "apis": ["List of affected API routes e.g. POST /login"],
          "database": ["List of affected DB schemas/tables e.g. users table"],
          "tests": ["List of affected test files e.g. auth.test.js"]
        }
        `;
        
        const responseText = await this.provider.generate(prompt, true);
        try {
            return JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse AI response for impact analysis:", responseText);
            throw new Error("Invalid response format from AI for impact analysis");
        }
    }

    async generateImplementationPlan(existingReq, newReq, impactAnalysis) {
        const prompt = `
        You are a senior technical architect generating an implementation plan based on the requirement change and impact analysis.
        
        Existing Requirement: "${existingReq}"
        New Requirement: "${newReq}"
        Impact Analysis summary: ${JSON.stringify(impactAnalysis)}
        
        Create a numbered implementation plan.
        
        Output MUST be in valid JSON format with the following structure:
        {
          "plan": [
            {
              "title": "Update Login.jsx",
              "description": "Replace username/password with mobile input."
            }
          ]
        }
        `;
        
        const responseText = await this.provider.generate(prompt, true);
        try {
            return JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse AI response for implementation plan:", responseText);
            throw new Error("Invalid response format from AI for implementation plan");
        }
    }
}

module.exports = { OpenRouterProvider, AIService };
