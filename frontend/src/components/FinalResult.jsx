import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getValidationResult, getAnalysis, getDownloadUrl } from '../services/api';
import { CheckCircle2, Check, FileCode, CheckSquare, Settings, AlertTriangle, Download, FileText, ArrowRight } from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function FinalResult() {
    const { id } = useParams();
    const [result, setResult] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            const valData = await getValidationResult(id);
            const anaData = await getAnalysis(id);
            setResult(valData);
            setAnalysis(anaData);
        } catch (e) {
            setError("Could not load final result.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading) return (
        <div className="flex-1 bg-slate-50 flex items-center justify-center h-screen">
            <div className="animate-spin text-indigo-500 w-10 h-10 border-4 border-current border-t-transparent rounded-full" />
        </div>
    );

    if (error || !result || result.status !== 'PASSED') {
        return (
            <div className="flex-1 p-8 bg-slate-50 min-h-screen">
                <div className="max-w-4xl mx-auto mt-8">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
                        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Final Result Unavailable</h2>
                        <p className="text-slate-500 mb-6">The project has not successfully completed validation.</p>
                        <Link 
                            to={`/analysis/${id}/validation`}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors inline-block"
                        >
                            Go to Validation
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Extract metrics
    let testsPassed = 0;
    let testsTotal = 0;
    const unitMatch = result.stages?.unitTests?.details?.match(/(\d+) passed, (\d+) total/);
    if (unitMatch) {
        testsPassed += parseInt(unitMatch[1], 10);
        testsTotal += parseInt(unitMatch[2], 10);
    }
    const intMatch = result.stages?.integration?.details?.match(/(\d+) passed, (\d+) total/);
    if (intMatch) {
        testsPassed += parseInt(intMatch[1], 10);
        testsTotal += parseInt(intMatch[2], 10);
    }

    const testDisplay = testsTotal > 0 ? `${testsPassed}/${testsTotal}` : 'N/A';
    
    // Attempt to parse modified files if available
    let filesChanged = 0;
    if (analysis?.ai_update_result?.modifiedFiles) {
        filesChanged = analysis.ai_update_result.modifiedFiles.length;
    } else {
        // Fallback or exact value if provided by another endpoint
        filesChanged = 'N/A';
    }

    const buildStatus = result.stages?.build?.status === 'PASSED' ? 'Passed' : (result.stages?.build?.status === 'SKIPPED' ? 'Skipped' : 'Failed');
    const riskLevel = analysis?.developer_decision?.risk || 'N/A';

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto mt-4">
                
                <WorkflowStepper currentStep="result" analysis={{ ...analysis, validation_result: result }} />

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-emerald-600 mb-6 text-center">Project Successfully Updated!</h2>
                    
                    <div className="space-y-3 mb-10 max-w-sm mx-auto">
                        <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
                            <span className="text-slate-700 font-medium text-lg">Requirement analyzed</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
                            <span className="text-slate-700 font-medium text-lg">Impact analyzed</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
                            <span className="text-slate-700 font-medium text-lg">Changes implemented</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
                            <span className="text-slate-700 font-medium text-lg">Validation completed</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-10">
                        <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-xs font-bold text-slate-500 mb-2">Files Changed</span>
                            <span className="text-2xl font-bold text-indigo-900">{filesChanged}</span>
                        </div>
                        <div className="border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm bg-emerald-50/30">
                            <span className="text-xs font-bold text-slate-500 mb-2">Tests Passed</span>
                            <span className="text-2xl font-bold text-emerald-600">{testDisplay}</span>
                        </div>
                        <div className="border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm bg-emerald-50/30">
                            <span className="text-xs font-bold text-slate-500 mb-2">Build Status</span>
                            <span className="text-xl font-bold text-emerald-600">{buildStatus}</span>
                        </div>
                        {riskLevel !== 'N/A' && (
                            <div className={`border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm ${riskLevel.toLowerCase() === 'high' ? 'border-rose-100 bg-rose-50/50' : 'border-amber-100 bg-amber-50/50'}`}>
                                <span className="text-xs font-bold text-slate-500 mb-2">Risk</span>
                                <span className={`text-xl font-bold ${riskLevel.toLowerCase() === 'high' ? 'text-rose-600' : 'text-amber-600'}`}>{riskLevel}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <a 
                            href={getDownloadUrl(id)}
                            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center"
                        >
                            Download ZIP
                        </a>
                        <Link 
                            to={`/analysis/${id}/diff`}
                            className="px-6 py-3.5 bg-white border border-indigo-200 text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors"
                        >
                            View Changes
                        </Link>
                        <Link 
                            to={`/analysis/${id}/report`}
                            className="px-6 py-3.5 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center"
                        >
                            View Report <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
