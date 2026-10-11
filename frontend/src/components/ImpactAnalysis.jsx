import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis, analyzeImpact } from '../services/api';
import { 
    RefreshCw, AlertTriangle, ChevronRight, CheckCircle2, 
    File as FileIcon, Box, Webhook, Database as DbIcon, TestTube2,
    X
} from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function ImpactAnalysis() {
    const { id } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAnalysis(id);
            if (data.impact_analysis) {
                setAnalysis({ ...data, impact_analysis: data.impact_analysis });
            } else {
                // Perform impact analysis if not present
                const result = await analyzeImpact(id);
                setAnalysis({ ...data, impact_analysis: result });
            }
        } catch (err) {
            setError("Impact analysis could not be completed. " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading) return (
        <div className="flex-1 bg-slate-50 flex items-center justify-center p-12 h-screen">
            <div className="flex flex-col items-center max-w-md w-full">
                <RefreshCw className="animate-spin text-indigo-500 w-12 h-12 mb-6" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Analyzing project impact...</h2>
                <div className="w-full space-y-3 mt-6 text-sm text-slate-600 font-medium">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        <span>Reading requirement change</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        <span>Mapping project relationships</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        <span>Identifying affected components</span>
                    </div>
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
                        <span>Evaluating files and APIs</span>
                    </div>
                </div>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="flex-1 bg-slate-50 p-8 h-screen">
            <div className="max-w-2xl mx-auto mt-12 bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center flex flex-col items-center">
                <AlertTriangle className="text-red-500 w-12 h-12 mb-4" /> 
                <h2 className="text-xl font-bold text-slate-900 mb-2">Impact analysis could not be completed.</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button 
                    onClick={loadData}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center shadow-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </button>
            </div>
        </div>
    );

    const impact = analysis?.impact_analysis;
    if (!impact) return null;

    const summary = impact.summary || {};
    const affectedFiles = impact.affectedFiles || [];

    const getImpactStyle = (level) => {
        const lower = (level || '').toLowerCase();
        if (lower === 'high') return 'bg-rose-100 text-rose-700';
        if (lower === 'medium') return 'bg-amber-100 text-amber-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
                
                <WorkflowStepper currentStep="impact" analysis={analysis} />

                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Impact & Risk Analysis <ChevronRight className="w-5 h-5 text-indigo-500" />
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Guardian mapped the requirement change to the project components, files, APIs, dependencies, and tests that may be affected.</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-5 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2"><FileIcon className="w-4 h-4"/> Affected Files</span>
                        <span className="text-3xl font-extrabold text-rose-500">{summary.affectedFiles}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2"><Box className="w-4 h-4"/> Components</span>
                        <span className="text-3xl font-extrabold text-rose-500">{summary.components}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2"><Webhook className="w-4 h-4"/> APIs Affected</span>
                        <span className="text-3xl font-extrabold text-rose-500">{summary.apis}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2"><DbIcon className="w-4 h-4"/> Database</span>
                        <span className="text-3xl font-extrabold text-rose-500">{summary.database}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2"><TestTube2 className="w-4 h-4"/> Tests</span>
                        <span className="text-3xl font-extrabold text-rose-500">{summary.tests}</span>
                    </div>
                </div>

                {/* Affected Files Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900">Affected Files</h3>
                    </div>
                    
                    {affectedFiles.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No affected files were identified from the current project model.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">File</th>
                                        <th className="px-6 py-4 font-bold">Type</th>
                                        <th className="px-6 py-4 font-bold">Impact</th>
                                        <th className="px-6 py-4 font-bold">Reason</th>
                                        <th className="px-6 py-4 font-bold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {affectedFiles.map((file, idx) => {
                                        const fileName = file.path.split('/').pop() || file.path;
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900 truncate max-w-[200px]" title={file.path}>
                                                    {fileName}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{file.type}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${getImpactStyle(file.impact)}`}>
                                                        {file.impact}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 truncate max-w-[300px]" title={file.reason}>
                                                    {file.reason}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setSelectedFile(file)}
                                                        className="px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 font-semibold rounded-lg transition-colors border border-indigo-100 text-xs"
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Bottom Navigation */}
                <div className="flex justify-end pt-4 pb-12">
                    <Link 
                        to={`/analysis/${id}/plan`}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold flex items-center shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                        Continue to Implementation Plan <ChevronRight className="w-5 h-5 ml-2" />
                    </Link>
                </div>
            </div>

            {/* View File Detail Modal */}
            {selectedFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 truncate max-w-[500px]" title={selectedFile.path}>
                                    {selectedFile.path.split('/').pop()}
                                </h3>
                                <p className="text-sm text-slate-500 font-mono mt-1 truncate max-w-[500px]">{selectedFile.path}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedFile(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Type</span>
                                    <span className="font-medium text-slate-900">{selectedFile.type}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Impact Level</span>
                                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${getImpactStyle(selectedFile.impact)}`}>
                                        {selectedFile.impact}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Direct Impact</span>
                                    <span className="font-medium text-slate-900">{selectedFile.direct ? 'Yes' : 'No'}</span>
                                </div>
                            </div>

                            <div>
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why this file is affected</span>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-slate-700 text-sm">
                                    {selectedFile.reason}
                                </div>
                            </div>
                            
                            {selectedFile.evidence && selectedFile.evidence.length > 0 && (
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Evidence</span>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                                        {selectedFile.evidence.map((ev, i) => <li key={i}>{ev}</li>)}
                                    </ul>
                                </div>
                            )}

                            {selectedFile.relatedFiles && selectedFile.relatedFiles.length > 0 && (
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Related Files</span>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFile.relatedFiles.map((rf, i) => (
                                            <span key={i} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-600">{rf}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedFile.recommendedChange && (
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Recommended Change</span>
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-indigo-900 text-sm">
                                        {selectedFile.recommendedChange}
                                    </div>
                                </div>
                            )}
                            
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
