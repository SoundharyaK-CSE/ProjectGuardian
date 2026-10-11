import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createAnalysis, uploadProject, scanProject, importGitHubRepository } from '../services/api';
import { ArrowLeft, Upload, Loader2, AlertCircle } from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

const GithubIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
);

export default function NewAnalysis() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        projectName: '',
        existingRequirement: '',
        newRequirement: ''
    });
    
    const [sourceType, setSourceType] = useState(null); // null, 'ZIP' or 'GitBranch'
    const [file, setFile] = useState(null);
    const [githubForm, setGithubForm] = useState({ repositoryUrl: '', branch: '' });
    
    const [errors, setErrors] = useState({});
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressStep, setProgressStep] = useState(0); 
    const [globalError, setGlobalError] = useState(null);

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        
        if (!selected.name.endsWith('.zip') && selected.type !== 'application/zip' && selected.type !== 'application/x-zip-compressed') {
            setErrors(prev => ({ ...prev, source: 'Only ZIP files are supported.' }));
            return;
        }
        
        if (selected.size > 50 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, source: 'File must be under 50MB.' }));
            return;
        }

        setErrors(prev => ({ ...prev, source: null }));
        setFile(selected);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!sourceType) {
            newErrors.sourceType = 'Please select a project source first';
            setErrors(newErrors);
            return false;
        }
        
        if (!form.projectName.trim()) newErrors.projectName = 'Project name is required';
        if (!form.existingRequirement.trim()) newErrors.existingRequirement = 'Existing requirement is required';
        if (!form.newRequirement.trim()) newErrors.newRequirement = 'New requirement is required';
        
        if (sourceType === 'ZIP') {
            if (!file) newErrors.source = 'Project ZIP file is required';
        } else if (sourceType === 'GitBranch') {
            const url = githubForm.repositoryUrl.trim();
            if (!url) {
                newErrors.source = 'GitHub repository URL is required';
            } else if (!url.startsWith('https://github.com/')) {
                newErrors.source = 'Must be a valid https://github.com/... URL';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsProcessing(true);
        setGlobalError(null);
        let currentId = null;

        try {
            setProgressStep(1); 
            const created = await createAnalysis(form);
            currentId = created.id;

            setProgressStep(2); 
            if (sourceType === 'ZIP') {
                await uploadProject(currentId, file);
            } else {
                await importGitHubRepository(currentId, githubForm.repositoryUrl.trim(), githubForm.branch.trim());
            }

            setProgressStep(3); 
            setTimeout(() => {
                navigate(`/analysis/${currentId}/scan`);
            }, 500);

        } catch (err) {
            console.error(err);
            setGlobalError(err.message || 'An unexpected error occurred during analysis setup.');
            setProgressStep(0);
        } finally {
            if (progressStep === 3) return;
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Top Header */}
            <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
                <h1 className="text-xl font-bold text-slate-900">Start New Analysis</h1>
            </header>

            <main className="flex-1 overflow-y-auto px-8 py-10">
                <div className="max-w-5xl mx-auto">
                    
                    {/* 9-Step Workflow Indicator */}
                    <WorkflowStepper currentStep="project" className="mb-14" />

                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-slate-900">Choose Project Source</h2>
                        <p className="text-slate-500 mt-2 text-sm">Import your project from GitHub or upload a ZIP file.</p>
                    </div>

                    {globalError && (
                        <div className="mb-8 max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-bold text-red-800">Processing Failed</h3>
                                <p className="text-sm text-red-700 mt-1">{globalError}</p>
                            </div>
                        </div>
                    )}

                    {errors.sourceType && (
                        <div className="mb-4 text-center text-sm text-red-600 font-medium">
                            {errors.sourceType}
                        </div>
                    )}

                    {/* Source Selection Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
                        {/* GitHub Card */}
                        <div 
                            className={`border rounded-xl p-8 flex flex-col items-center text-center cursor-pointer transition-all ${sourceType === 'GitBranch' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-300'}`}
                            onClick={() => { setSourceType('GitBranch'); setErrors(prev => ({...prev, source: null, sourceType: null})); }}
                        >
                            <GithubIcon className="w-10 h-10 text-slate-800 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 mb-2">GitHub Repository</h3>
                            <p className="text-sm text-slate-500 mb-6 flex-1">Import your project directly from GitHub.</p>
                            <button 
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium w-full transition-colors ${sourceType === 'GitBranch' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                Connect Repository
                            </button>
                        </div>

                        {/* ZIP Upload Card */}
                        <div 
                            className={`border rounded-xl p-8 flex flex-col items-center text-center cursor-pointer transition-all ${sourceType === 'ZIP' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-300'}`}
                            onClick={() => { setSourceType('ZIP'); setErrors(prev => ({...prev, source: null, sourceType: null})); }}
                        >
                            <Upload className="w-10 h-10 text-indigo-500 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Upload ZIP File</h3>
                            <p className="text-sm text-slate-500 mb-6 flex-1">Upload your complete source code.</p>
                            <button 
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium w-full transition-colors border ${sourceType === 'ZIP' ? 'border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                Upload Project
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Form Content Based on Selection */}
                    {sourceType && (
                        <div className="max-w-3xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
                            
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">
                                {sourceType === 'ZIP' ? '1. Upload File' : '1. Repository Details'}
                            </h3>

                            {sourceType === 'ZIP' ? (
                                <div className="mb-8">
                                    <input 
                                        type="file" 
                                        accept=".zip,application/zip,application/x-zip-compressed"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        disabled={isProcessing}
                                    />
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => !isProcessing && fileInputRef.current?.click()}
                                            className="px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            Choose File...
                                        </button>
                                        <span className="text-sm text-slate-500">
                                            {file ? file.name : 'No file chosen (Max 50MB)'}
                                        </span>
                                    </div>
                                    {errors.source && <p className="text-red-500 text-xs mt-2 font-medium">{errors.source}</p>}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Repository URL <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text"
                                            disabled={isProcessing}
                                            placeholder="https://github.com/owner/repository"
                                            className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow ${errors.source ? 'border-red-500' : 'border-slate-300'}`}
                                            value={githubForm.repositoryUrl}
                                            onChange={e => setGithubForm(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                                        />
                                        {errors.source && <p className="text-red-500 text-xs mt-1 font-medium">{errors.source}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch <span className="text-slate-400 font-normal">(Optional)</span></label>
                                        <input 
                                            type="text"
                                            disabled={isProcessing}
                                            placeholder="e.g. main or develop"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
                                            value={githubForm.branch}
                                            onChange={e => setGithubForm(prev => ({ ...prev, branch: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            <hr className="border-slate-200 mb-6" />
                            
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">2. Analysis Details</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text"
                                        disabled={isProcessing}
                                        placeholder="e.g. E-Commerce Platform"
                                        className={`w-full md:w-1/2 px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow ${errors.projectName ? 'border-red-500' : 'border-slate-300'}`}
                                        value={form.projectName}
                                        onChange={e => setForm(prev => ({ ...prev, projectName: e.target.value }))}
                                    />
                                    {errors.projectName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.projectName}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Existing Requirement <span className="text-red-500">*</span></label>
                                        <textarea 
                                            disabled={isProcessing}
                                            placeholder="Describe the current behavior..."
                                            className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow h-24 resize-none ${errors.existingRequirement ? 'border-red-500' : 'border-slate-300'}`}
                                            value={form.existingRequirement}
                                            onChange={e => setForm(prev => ({ ...prev, existingRequirement: e.target.value }))}
                                        />
                                        {errors.existingRequirement && <p className="text-red-500 text-xs mt-1 font-medium">{errors.existingRequirement}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">New Requirement <span className="text-red-500">*</span></label>
                                        <textarea 
                                            disabled={isProcessing}
                                            placeholder="Describe the new desired behavior..."
                                            className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow h-24 resize-none ${errors.newRequirement ? 'border-red-500' : 'border-slate-300'}`}
                                            value={form.newRequirement}
                                            onChange={e => setForm(prev => ({ ...prev, newRequirement: e.target.value }))}
                                        />
                                        {errors.newRequirement && <p className="text-red-500 text-xs mt-1 font-medium">{errors.newRequirement}</p>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isProcessing}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 min-w-[160px]
                                        ${isProcessing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'}`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {progressStep === 1 && 'Creating...'}
                                            {progressStep === 2 && 'Uploading...'}
                                            {progressStep === 3 && 'Redirecting...'}
                                        </>
                                    ) : 'Start Analysis'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
