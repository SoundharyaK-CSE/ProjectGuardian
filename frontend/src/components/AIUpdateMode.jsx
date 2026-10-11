import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis, startAIUpdate, getAIUpdateStatus, resetAIUpdate } from '../services/api';
import { CheckCircle2, Circle, Loader2, PlayCircle, AlertTriangle, ChevronRight, Download, Code2, X } from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function AIUpdateMode() {
    const { id } = useParams();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [showDiff, setShowDiff] = useState(false);

    const loadInitialState = async () => {
        try {
            const data = await getAnalysis(id);
            setAnalysis(data);
            
            const updateStatus = await getAIUpdateStatus(id);
            if (updateStatus && updateStatus.status !== 'INITIAL') {
                setStatus(updateStatus);
            }
        } catch (err) {
            setError("Could not load analysis state.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialState();
    }, [id]);

    useEffect(() => {
        let interval;
        if (status && !['COMPLETED', 'FAILED', 'TIMEOUT', 'INITIAL'].includes(status.status)) {
            interval = setInterval(async () => {
                try {
                    const updateStatus = await getAIUpdateStatus(id);
                    setStatus(updateStatus);
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [status, id]);

    const handleStartUpdate = async () => {
        try {
            await startAIUpdate(id);
            setStatus({ status: 'PREPARING' }); // Optimistic UI
        } catch (e) {
            setError("Failed to start AI Update.");
        }
    };

    const handleReset = async () => {
        if (!window.confirm("Reset the current AI update and start again?")) {
            return;
        }
        try {
            await resetAIUpdate(id);
            setStatus(null);
            setError(null);
        } catch (e) {
            setError("Failed to reset update.");
        }
    };

    if (loading) return (
        <div className="flex-1 bg-slate-50 flex items-center justify-center h-screen">
            <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
        </div>
    );

    const getProgressInfo = (currentState) => {
        let pct = 0;
        const total = status?.plannedFiles?.length || 1;
        const mod = status?.modifiedFiles?.length || 0;
        
        switch (currentState) {
            case 'PREPARING': pct = 10; break;
            case 'UPDATING': pct = Math.floor(20 + (mod / total) * 60); break; // 20% to 80% based on actual file progress
            case 'DIFF_READY': pct = 90; break;
            case 'COMPLETED': pct = 100; break;
            case 'FAILED': pct = Math.floor((mod / total) * 100); break;
            case 'TIMEOUT': pct = Math.floor((mod / total) * 100); break;
            default: pct = 0;
        }

        switch (currentState) {
            case 'PREPARING': return { pct, text: "Preparing update workspace..." };
            case 'UPDATING': return { pct, text: `Updating files... (${mod}/${total})` };
            case 'DIFF_READY': return { pct, text: "Generating diff..." };
            case 'COMPLETED': return { pct, text: "Update completed successfully" };
            case 'FAILED': return { pct, text: `Update failed (${mod}/${total})`, error: true };
            case 'TIMEOUT': return { pct, text: `Update timed out (${mod}/${total})`, error: true };
            default: return { pct, text: "Waiting to start..." };
        }
    };

    const progressInfo = status ? getProgressInfo(status.status) : { pct: 0, text: "Ready to start" };

    const renderFileStatus = () => {
        if (!status) return null;
        
        const plannedFiles = status.plannedFiles || [];
        const modifiedFiles = status.modifiedFiles || [];
        
        // Show up to 5 items to mimic the reference image
        const itemsToShow = [...modifiedFiles];
        const pendingFiles = plannedFiles.filter(f => !modifiedFiles.includes(f));
        itemsToShow.push(...pendingFiles);
        
        return itemsToShow.slice(0, 5).map((file, idx) => {
            const isModified = modifiedFiles.includes(file);
            const isPending = !isModified && !['COMPLETED', 'FAILED', 'TIMEOUT'].includes(status.status);
            
            return (
                <div key={idx} className="flex items-center gap-3 mb-3">
                    {isModified ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                        <Circle className={`w-5 h-5 shrink-0 ${isPending ? 'text-indigo-500' : 'text-slate-300'}`} />
                    )}
                    <span className={`text-sm truncate ${isModified ? 'text-slate-700 font-medium' : isPending ? 'text-indigo-900 font-bold' : 'text-slate-400'}`}>
                        {isPending && status.status === 'UPDATING' ? `Updating ${file}` : `${file} ${isModified ? 'updated' : 'pending'}`}
                    </span>
                </div>
            );
        });
    };

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto mt-4">
                
                <WorkflowStepper currentStep="implementation" analysis={analysis} />

                <div className="mb-6">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        AI Code Changes
                    </h1>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-indigo-900">AI Implementation</h2>
                        <button 
                            onClick={handleReset}
                            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                        >
                            Reset and Try Again
                        </button>
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}

                    {!status || status.status === 'INITIAL' ? (
                        <div className="text-center py-12">
                            <button 
                                onClick={handleStartUpdate}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center shadow-md transition-colors mx-auto"
                            >
                                <PlayCircle className="w-6 h-6 mr-3" /> Start AI Update
                            </button>
                            <p className="text-slate-500 text-sm mt-4">Guardian will safely clone the project and apply changes in an isolated workspace.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-12 items-start">
                            <div className="flex-1 min-w-0">
                                <div className="space-y-1 mb-8">
                                    {renderFileStatus()}
                                </div>
                                
                                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                    <span className="text-sm font-bold text-slate-700">
                                        {status.plannedFiles ? `${status.plannedFiles.length} files planned for modification` : "Scanning files..."}
                                    </span>
                                    <Link 
                                        to={`/analysis/${id}/diff`}
                                        className={`px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm flex items-center ${status.status !== 'COMPLETED' ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        Review Changes <ChevronRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center shrink-0 w-48">
                                <div className="relative w-32 h-32 mb-4">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" className="stroke-slate-100" strokeWidth="8" fill="none" />
                                        <circle 
                                            cx="50" cy="50" r="40" 
                                            className={`stroke-current ${progressInfo.error ? 'text-rose-500' : 'text-indigo-500'} transition-all duration-1000 ease-out`} 
                                            strokeWidth="8" fill="none" 
                                            strokeDasharray="251.2" 
                                            strokeDashoffset={251.2 - (251.2 * progressInfo.pct) / 100}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className={`text-2xl font-bold ${progressInfo.error ? 'text-rose-500' : 'text-slate-700'}`}>
                                            {progressInfo.pct}%
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-sm font-bold text-center ${progressInfo.error ? 'text-rose-600' : 'text-slate-600'}`}>
                                    {progressInfo.text}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {status?.status === 'COMPLETED' && (
                    <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-xl p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-indigo-900 font-bold text-lg mb-1 flex items-center">
                                <CheckCircle2 className="w-5 h-5 mr-2 text-indigo-600" /> AI Update Completed
                            </h3>
                            <p className="text-indigo-700 text-sm">{status.modifiedFiles?.length || 0} files modified safely.</p>
                        </div>
                        <div className="flex gap-4">
                            <Link 
                                to={`/analysis/${id}/diff`}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center text-sm"
                            >
                                Review Changes <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                        </div>
                    </div>
                )}
                
                {status?.status === 'FAILED' && (
                    <div className="mt-8 bg-rose-50 border border-rose-200 rounded-xl p-6">
                        <h3 className="text-rose-800 font-bold text-lg mb-1 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" /> Update Failed
                        </h3>
                        <p className="text-rose-600 text-sm">{status.error || "An unknown error occurred during update."}</p>
                    </div>
                )}

                {showDiff && status?.diff && (
                    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-slate-200 font-mono text-sm flex items-center">
                                <Code2 className="w-4 h-4 mr-2 text-indigo-400" /> workspace.diff
                            </h3>
                            <button onClick={() => setShowDiff(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
                            <pre className="text-sm font-mono text-slate-300">
                                {status.diff}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
