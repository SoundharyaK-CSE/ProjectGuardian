import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, Code2, Check, X, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function GuideMe() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        const initGuideMe = async () => {
            try {
                const response = await api.post(`/analysis/${id}/guide-me/init`);
                setProgress(response.data);
                
                // Find first unreviewed step
                const firstPending = response.data.steps.findIndex(s => s.status === 'PENDING' || s.status === 'GENERATING');
                if (firstPending !== -1) {
                    setCurrentStepIndex(firstPending);
                }
            } catch (err) {
                setError('Failed to initialize Guide Me mode.');
            } finally {
                setLoading(false);
            }
        };
        initGuideMe();
    }, [id]);

    useEffect(() => {
        // Trigger generation if step is PENDING
        if (!progress || progress.steps.length === 0) return;
        const currentStep = progress.steps[currentStepIndex];
        
        if (currentStep && currentStep.status === 'PENDING') {
            generateProposal(currentStep.id);
        }
    }, [currentStepIndex, progress]);

    const generateProposal = async (stepId) => {
        setGenerating(true);
        try {
            const response = await api.post(`/analysis/${id}/guide-me/step/${stepId}/generate`);
            updateStepInState(response.data);
        } catch (err) {
            console.error("Failed to generate proposal", err);
        } finally {
            setGenerating(false);
        }
    };

    const updateStepInState = (updatedStep) => {
        setProgress(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === updatedStep.id ? updatedStep : s)
        }));
    };

    const handleDecision = async (stepId, decision) => {
        try {
            const response = await api.post(`/analysis/${id}/guide-me/step/${stepId}/decision`, { decision });
            updateStepInState(response.data);
            
            // Auto-advance if not the last step
            if (currentStepIndex < progress.steps.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            }
        } catch (err) {
            console.error("Failed to save decision", err);
        }
    };

    const handleApplyChanges = async () => {
        const hasAccepted = progress.steps.some(s => s.status === 'ACCEPTED');
        const hasApplied = progress.steps.some(s => s.status === 'APPLIED');
        
        if (!hasAccepted && !hasApplied) {
            setError("You must accept at least one proposed change before proceeding.");
            return;
        }
        
        if (!hasAccepted && hasApplied) {
            handleContinue();
            return;
        }

        setApplying(true);
        setError(null);
        try {
            const response = await api.post(`/analysis/${id}/guide-me/apply`);
            const updatedProgress = response.data;
            setProgress(updatedProgress);
            
            const hasFailures = updatedProgress.steps.some(s => s.status === 'FAILED');
            if (hasFailures) {
                // Do not navigate if there are failures
                setApplying(false);
                setError("Some changes failed to apply. Please review the failed steps.");
            } else {
                navigate(`/analysis/${id}/ai-update`); // Redirect to diff screen
            }
        } catch (err) {
            setError('Failed to apply changes. ' + err.message);
            setApplying(false);
        }
    };

    const handleContinue = () => {
        const hasApplied = progress.steps.some(s => s.status === 'APPLIED');
        if (!hasApplied) {
            setError("You must accept and apply at least one proposed change before proceeding.");
            return;
        }
        navigate(`/analysis/${id}/ai-update`);
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
    );

    if (error) return (
        <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen p-8">
            <div className="bg-red-50 text-red-600 p-6 rounded-xl flex-col shadow-sm max-w-lg">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="w-6 h-6 mr-3" />
                    <span className="font-medium text-lg">Error</span>
                </div>
                <p className="mb-4">{error}</p>
                <button 
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded text-red-700 font-medium"
                >
                    Dismiss and Review
                </button>
            </div>
        </div>
    );

    if (!progress || progress.steps.length === 0) return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto mt-8">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">No Target Files Identified</h2>
                    <p className="text-slate-500">There are no identified files to guide the developer through based on the previous analysis.</p>
                </div>
            </div>
        </div>
    );

    const steps = progress.steps;
    const currentStep = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;
    const allReviewed = steps.every(s => s.status !== 'PENDING' && s.status !== 'GENERATING' && s.status !== 'READY');
    const hasAccepted = steps.some(s => s.status === 'ACCEPTED');
    const hasApplied = steps.some(s => s.status === 'APPLIED');
    const hasFailed = steps.some(s => s.status === 'FAILED');
    
    // Determine button state
    let buttonAction = handleApplyChanges;
    let buttonText = 'Apply Accepted Changes';
    let buttonIcon = <Check className="w-4 h-4 mr-2" />;
    
    // Disable if not all steps are reviewed, or if there's a failure we haven't recovered from
    let buttonDisabled = applying || !allReviewed || (hasFailed && !hasAccepted); 

    if (allReviewed && !hasAccepted && hasApplied && !hasFailed) {
        buttonAction = handleContinue;
        buttonText = 'View Diff';
        buttonIcon = <ArrowRight className="w-4 h-4 mr-2" />;
        buttonDisabled = false;
    } else if (allReviewed && !hasAccepted && !hasApplied) {
        // If they rejected everything and try to proceed
        buttonAction = () => setError("You must accept at least one proposed change to view the diff.");
        buttonText = 'View Diff';
        buttonIcon = <ArrowRight className="w-4 h-4 mr-2" />;
        buttonDisabled = false; // enabled to show error when clicked
    }

    const renderStepStatus = (status) => {
        switch (status) {
            case 'ACCEPTED': return <div className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold">Accepted</div>;
            case 'REJECTED': return <div className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs font-bold">Rejected</div>;
            case 'APPLIED': return <div className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold">Applied</div>;
            case 'FAILED': return <div className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs font-bold">Failed</div>;
            case 'READY': return <div className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold">Review Required</div>;
            case 'GENERATING': return <div className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs font-bold flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</div>;
            default: return <div className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs font-bold">Pending</div>;
        }
    };

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto mt-8">
                <div className="mb-8 flex flex-col gap-1">
                    <span className="text-slate-500 font-medium text-sm">Project Guardian • Analysis {id}</span>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Developer Guidance
                        </h1>
                        <button 
                            onClick={buttonAction}
                            disabled={buttonDisabled}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors flex items-center shadow-sm"
                        >
                            {applying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : buttonIcon}
                            {applying ? 'Applying...' : buttonText}
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 relative">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
                        <div>
                            <span className="text-slate-500 font-medium text-sm block mb-1">
                                Step {currentStepIndex + 1} of {steps.length}
                            </span>
                            <h2 className="text-2xl font-bold text-indigo-900 mb-1">{currentStep.title}</h2>
                            <div className="text-sm font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded inline-block border border-slate-200">
                                {currentStep.file}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                <button 
                                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                                    disabled={currentStepIndex === 0}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded shadow-sm disabled:opacity-30 disabled:shadow-none transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))}
                                    disabled={isLastStep}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded shadow-sm disabled:opacity-30 disabled:shadow-none transition-all"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-700">Status:</span>
                            {renderStepStatus(currentStep.status)}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Requirement / Why */}
                        <div className="flex gap-6">
                            <div className="flex-1">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 h-full">
                                    <h4 className="font-bold text-slate-800 mb-2 flex items-center text-sm">
                                        Requirement
                                    </h4>
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        {currentStep.description}
                                    </p>
                                </div>
                            </div>
                            {currentStep.explanation && (
                                <div className="flex-1">
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 h-full">
                                        <h4 className="font-bold text-indigo-900 mb-2 flex items-center text-sm">
                                            Why?
                                        </h4>
                                        <p className="text-indigo-800 text-sm leading-relaxed">
                                            {currentStep.explanation}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {(currentStep.status === 'PENDING' || currentStep.status === 'GENERATING' || generating) ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-400" />
                                <p className="font-medium text-slate-600">Generating code proposal for {currentStep.file.split('/').pop()}...</p>
                                <p className="text-sm mt-2 text-center max-w-md">Analyzing existing source code and requirements. The original project remains untouched.</p>
                            </div>
                        ) : currentStep.status === 'FAILED' && !currentStep.proposedSnippet ? (
                            <div className="py-12 flex flex-col items-center justify-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                                <AlertTriangle className="w-10 h-10 mb-4 text-rose-500" />
                                <p className="font-bold">Failed to generate proposal</p>
                                <p className="text-sm mt-2 max-w-md text-center">{currentStep.explanation}</p>
                                <button onClick={() => generateProposal(currentStep.id)} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold transition-colors">Retry / Regenerate</button>
                            </div>
                        ) : (
                            <div className="space-y-6 mt-8">
                                {/* Code Diff Display */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                                        <span>Code Changes</span>
                                        {currentStep.codeLocation ? (
                                            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                Location: {currentStep.codeLocation}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-mono bg-amber-50 text-amber-600 px-2 py-1 rounded">
                                                Location: Relevant section (Exact line number unavailable)
                                            </span>
                                        )}
                                    </h3>
                                    
                                    <div className="bg-[#1E293B] rounded-xl overflow-hidden border border-slate-800 flex flex-col">
                                        {/* Unified view for simplicity, matching some IDE diffs */}
                                        <div className="p-4 overflow-x-auto space-y-4">
                                            {currentStep.originalSnippet && (
                                                <div className="relative">
                                                    <div className="absolute top-2 right-2 bg-rose-500/20 text-rose-400 text-xs px-2 py-0.5 rounded font-bold">Remove</div>
                                                    <pre className="text-sm text-rose-300/80 font-mono bg-rose-500/5 p-4 rounded-lg line-through decoration-rose-500/50">
                                                        <code>{currentStep.originalSnippet}</code>
                                                    </pre>
                                                </div>
                                            )}
                                            
                                            <div className="relative">
                                                <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-bold">Add</div>
                                                <pre className="text-sm text-emerald-400 font-mono bg-emerald-500/5 p-4 rounded-lg">
                                                    <code>{currentStep.proposedSnippet}</code>
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-6 border-t border-slate-100">
                                    {currentStep.status === 'FAILED' && (
                                        <button 
                                            onClick={() => generateProposal(currentStep.id)}
                                            className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors flex items-center shadow-sm"
                                        >
                                            <AlertTriangle className="w-5 h-5 mr-2" /> Retry / Regenerate
                                        </button>
                                    )}
                                    {(currentStep.status === 'READY' || currentStep.status === 'REJECTED') && (
                                        <button 
                                            onClick={() => handleDecision(currentStep.id, 'ACCEPT')}
                                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center shadow-sm"
                                        >
                                            <Check className="w-5 h-5 mr-2" /> Accept Proposal
                                        </button>
                                    )}
                                    
                                    {(currentStep.status === 'READY' || currentStep.status === 'ACCEPTED') && (
                                        <button 
                                            onClick={() => handleDecision(currentStep.id, 'REJECT')}
                                            className={`px-8 py-3 font-bold rounded-xl transition-colors flex items-center border-2 ${
                                                currentStep.status === 'ACCEPTED' 
                                                ? 'border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 bg-white' 
                                                : 'border-rose-100 hover:border-rose-200 text-rose-600 hover:bg-rose-50 bg-white'
                                            }`}
                                        >
                                            <X className="w-5 h-5 mr-2" /> 
                                            {currentStep.status === 'ACCEPTED' ? 'Revoke / Reject' : 'Reject Proposal'}
                                        </button>
                                    )}

                                    {currentStep.status === 'APPLIED' && (
                                        <div className="px-8 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-xl flex items-center">
                                            <Check className="w-5 h-5 mr-2" /> Change Applied
                                        </div>
                                    )}

                                    {/* Big CTA at the bottom for the final step */}
                                    {isLastStep && (
                                        <button 
                                            onClick={buttonAction}
                                            disabled={buttonDisabled}
                                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors flex items-center shadow-sm ml-auto"
                                        >
                                            {applying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : buttonIcon}
                                            {applying ? 'Applying...' : buttonText}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
