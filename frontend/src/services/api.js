import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
});

export const checkHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

export const checkDbHealth = async () => {
    const response = await api.get('/health/db');
    return response.data;
};

export const createAnalysis = async (data) => {
    const response = await api.post('/analysis', data);
    return response.data;
};

export const uploadProject = async (id, file) => {
    const formData = new FormData();
    formData.append('project', file);
    const response = await api.post(`/analysis/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const importGitHubRepository = async (id, repositoryUrl, branch) => {
    const response = await api.post(`/analysis/${id}/github`, { repositoryUrl, branch });
    return response.data;
};

export const scanProject = async (id) => {
    const response = await api.post(`/analysis/${id}/scan`);
    return response.data;
};

export const getAnalysis = async (id) => {
    const response = await api.get(`/analysis/${id}`);
    return response.data;
};

export const analyzeRequirement = async (id) => {
    const response = await api.post(`/analysis/${id}/requirement-analysis`);
    return response.data;
};

export const getRequirementAnalysis = async (id) => {
    const response = await api.get(`/analysis/${id}/requirement-analysis`);
    return response.data;
};

export const analyzeImpact = async (id) => {
    const response = await api.post(`/analysis/${id}/impact-analysis`);
    return response.data;
};

export const getImpactAnalysis = async (id) => {
    const response = await api.get(`/analysis/${id}/impact-analysis`);
    return response.data;
};

export const generateImplementationPlan = async (id) => {
    const response = await api.post(`/analysis/${id}/implementation-plan`);
    return response.data;
};

export const getImplementationPlan = async (id) => {
    const response = await api.get(`/analysis/${id}/implementation-plan`);
    return response.data;
};

export const saveDeveloperDecision = async (id, decision) => {
    const response = await api.post(`/analysis/${id}/decision`, { decision });
    return response.data;
};

export const getDeveloperDecision = async (id) => {
    const response = await api.get(`/analysis/${id}/decision`);
    return response.data;
};

export const startAIUpdate = async (id) => {
    const response = await api.post(`/analysis/${id}/ai-update`);
    return response.data;
};

export const resetAIUpdate = async (id) => {
    const response = await api.post(`/analysis/${id}/ai-update/reset`);
    return response.data;
};

export const getAIUpdateStatus = async (id) => {
    const response = await api.get(`/analysis/${id}/ai-update`);
    return response.data;
};

export const runValidation = async (id) => {
    const response = await api.post(`/analysis/${id}/validation`);
    return response.data;
};

export const getValidationResult = async (id) => {
    const response = await api.get(`/analysis/${id}/validation`);
    return response.data;
};

export const getReport = async (id) => {
    const response = await api.get(`/analysis/${id}/report`);
    return response.data;
};

export const getReportDownloadUrl = (id) => {
    return `${api.defaults.baseURL}/analysis/${id}/report/download`;
};

export const getDownloadUrl = (id) => {
    return `${api.defaults.baseURL}/analysis/${id}/download`;
};

export const getDashboardStats = async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};

export const getDashboardAnalyses = async () => {
    const response = await api.get('/dashboard/analyses');
    return response.data;
};

export const getDashboardProjects = async () => {
    const response = await api.get('/dashboard/projects');
    return response.data;
};

export default api;
