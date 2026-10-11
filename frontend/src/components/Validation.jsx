import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getValidationResult, runValidation, getDownloadUrl, getAnalysis } from '../services/api';
import { CheckCircle2, Circle, Loader2, PlayCircle, AlertTriangle, Download, ChevronRight, RefreshCw, XCircle } from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function Validation() {
    const { id } = useParams();
    const [result, setResult] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            const [valData, anaData] = await Promise.all([
                getValidationResult(id),
                getAnalysis(id).catch(() => null)
            ]);
            if (valData && valData.status !== 'INITIAL') {
                setResult(valData);
            } else {
                setResult(null);
            }
            if (anaData) {
                setAnalysis(anaData);
            }
        } catch (e) {
            setError("Could not load validation state.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        let interval;
        if (result && result.status === 'VALIDATING') {
            interval = setInterval(async () => {
                try {
                    const data = await getValidationResult(id);
                    setResult(data);
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [result, id]);

    const handleRunValidation = async () => {
        if (result && (result.status === 'VALIDATING' || result.status === 'RUNNING')) return;
        try {
            const res = await runValidation(id);
            if (res.status === 'already_running') {
                setResult(res.current);
            } else {
                setResult({ status: 'VALIDATING', stages: {} });
            }
            setError(null);
        } catch (e) {
            setError("Failed to start validation.");
        }
    };

    if (loading) return (
        <div className="flex-1 bg-slate-50 flex items-center justify-center h-screen">
            <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
        </div>
    );

    const renderStageIcon = (stage) => {
        if (!stage) return <Circle className="w-5 h-5 text-slate-300 shrink-0" />;
        if (stage.status === 'PASSED') return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
        if (stage.status === 'FAILED') return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
        if (stage.status === 'SKIPPED') return <Circle className="w-5 h-5 text-slate-400 shrink-0" />;
        if (stage.status === 'RUNNING') return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />;
        return <Circle className="w-5 h-5 text-slate-300 shrink-0" />;
    };

    const getStageText = (stage, defaultText) => {
        if (!stage) return defaultText;
        if (stage.status === 'SKIPPED') return `${defaultText} — Skipped`;
        if (stage.status === 'RUNNING') return `${defaultText}...`;
        return defaultText;
    };

    const stagesList = [
        { key: 'changeIntegrity', label: 'Change Integrity' },
        { key: 'dependencies', label: 'Dependencies' },
        { key: 'syntax', label: 'Syntax' },
        { key: 'build', label: 'Build' },
        { key: 'unitTests', label: 'Unit Tests' },
        { key: 'integration', label: 'Integration Checks' },
        { key: 'finalValidation', label: 'Final Validation' }
    ];

    let completedStages = 0;
    let applicableStages = stagesList.length;
    
    if (result && result.stages) {
        completedStages = Object.values(result.stages).filter(s => s.status === 'PASSED' || s.status === 'SKIPPED').length;
    }

    const pct = result && result.status !== 'INITIAL' ? Math.floor((completedStages / applicableStages) * 100) : 0;
    
    const isFailed = result?.status === 'FAILED';
    const isPassed = result?.status === 'PASSED';

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto mt-4">
                
                <WorkflowStepper currentStep="validation" analysis={analysis} />

                <div className="mb-6">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        Validation
                    </h1>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 relative">
                    <h2 className="text-2xl font-bold text-indigo-900 mb-2">Validating Project</h2>
                    <p className="text-slate-500 mb-8">Project Guardian is checking your updated project.</p>
                    
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}

                    {!result ? (
                        <div className="text-center py-12">
                            <button 
                                onClick={handleRunValidation}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center shadow-md transition-colors mx-auto"
                            >
                                <PlayCircle className="w-6 h-6 mr-3" /> Run Validation
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-12 items-start">
                            <div className="flex-1 min-w-0 space-y-4">
                                {stagesList.map((stg) => {
                                    const stgData = result.stages ? result.stages[stg.key] : null;
                                    const hasError = stgData && stgData.status === 'FAILED';
                                    return (
                                        <div key={stg.key} className="flex flex-col">
                                            <div className="flex items-center justify-between gap-3 py-1">
                                                <div className="flex items-center gap-3">
                                                    {renderStageIcon(stgData)}
                                                    <span className={`text-sm font-semibold ${hasError ? 'text-rose-700' : (stgData?.status === 'SKIPPED' ? 'text-slate-500' : 'text-slate-800')}`}>
                                                        {stg.label}
                                                    </span>
                                                </div>
                                                {stgData && (
                                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                                        stgData.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' :
                                                        stgData.status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                                                        stgData.status === 'SKIPPED' ? 'bg-slate-100 text-slate-500' :
                                                        stgData.status === 'RUNNING' ? 'bg-indigo-100 text-indigo-700' :
                                                        'bg-slate-100 text-slate-400'
                                                    }`}>
                                                        {stgData.status}
                                                    </span>
                                                )}
                                            </div>
                                            {stgData?.details && (
                                                <div className={`ml-8 mt-1 text-xs p-2 rounded border ${
                                                    hasError ? 'text-rose-600 bg-rose-50 border-rose-100' :
                                                    stgData.status === 'SKIPPED' ? 'text-slate-500 bg-slate-50 border-slate-100' :
                                                    'text-slate-600 bg-slate-50/70 border-slate-100'
                                                }`}>
                                                    {stgData.details}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex flex-col items-center justify-center shrink-0 w-48">
                                <div className="relative w-32 h-32 mb-4">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" className="stroke-slate-100" strokeWidth="8" fill="none" />
                                        <circle 
                                            cx="50" cy="50" r="40" 
                                            className={`stroke-current ${isFailed ? 'text-rose-500' : (isPassed ? 'text-emerald-500' : 'text-indigo-500')} transition-all duration-1000 ease-out`} 
                                            strokeWidth="8" fill="none" 
                                            strokeDasharray="251.2" 
                                            strokeDashoffset={251.2 - (251.2 * pct) / 100}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className={`text-2xl font-bold ${isFailed ? 'text-rose-500' : 'text-slate-700'}`}>
                                            {pct}%
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-sm font-bold text-center ${isFailed ? 'text-rose-600' : (isPassed ? 'text-emerald-600' : 'text-slate-600')}`}>
                                    {isFailed ? 'Validation Failed' : (isPassed ? 'Passed' : 'Running tests...')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {isPassed && (
                    <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-xl p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-indigo-900 font-bold text-lg mb-1 flex items-center">
                                <CheckCircle2 className="w-5 h-5 mr-2 text-indigo-600" /> Validation Passed
                            </h3>
                            <p className="text-indigo-700 text-sm">Your updated project is structurally valid and ready.</p>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={handleRunValidation}
                                className="px-6 py-2.5 bg-white border border-indigo-200 text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition-colors text-sm"
                            >
                                <RefreshCw className="w-4 h-4 inline mr-2" /> Run Validation Again
                            </button>
                            <Link 
                                to={`/analysis/${id}/result`}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center text-sm"
                            >
                                View Final Result <ChevronRight className="w-4 h-4 ml-2" />
                            </Link>
                        </div>
                    </div>
                )}
                
                {isFailed && (
                    <div className="mt-8 bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-rose-800 font-bold text-lg mb-1 flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-2" /> Validation Failed
                            </h3>
                            <p className="text-rose-600 text-sm">{result.error || "One or more critical validation checks failed."}</p>
                        </div>
                        <div className="flex gap-4">
                            <Link 
                                to={`/analysis/${id}/diff`}
                                className="px-6 py-2.5 bg-white border border-rose-200 text-rose-700 font-bold rounded-lg hover:bg-rose-50 transition-colors text-sm"
                            >
                                Back to Review Changes
                            </Link>
                            <button 
                                onClick={handleRunValidation}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center text-sm"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" /> Run Validation Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
