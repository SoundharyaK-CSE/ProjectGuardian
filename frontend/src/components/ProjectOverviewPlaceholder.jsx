import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAnalysis } from '../services/api';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Clock, CheckCircle } from 'lucide-react';

export default function ProjectOverviewPlaceholder() {
    const { id } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getAnalysis(id)
            .then(data => setAnalysis(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <RefreshCw className="animate-spin text-indigo-500 w-8 h-8" />
        </div>
    );
    
    if (error) return (
        <div className="p-8 text-center flex flex-col items-center">
            <AlertTriangle className="text-red-500 w-12 h-12 mb-4" /> 
            <p className="text-lg font-semibold text-slate-900">Error Loading Project</p>
            <p className="text-slate-500">{error}</p>
        </div>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-500 mb-6 hover:text-indigo-600 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>

            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Project Overview</h1>
                <p className="text-slate-500">Here's what Guardian discovered about your project.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Project Details</h2>
                    <h3 className="text-2xl font-bold text-indigo-600 mb-6">{analysis.project_name}</h3>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 text-sm font-medium">Status</span>
                            <span className="text-emerald-600 text-sm font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {analysis.status}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 text-sm font-medium">Workflow Step</span>
                            <span className="text-slate-900 text-sm font-bold">{analysis.workflow_step}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 text-sm font-medium">Source</span>
                            <span className="text-slate-900 text-sm font-bold">{analysis.source_type || 'ZIP'}</span>
                        </div>
                        {analysis.source_type === 'GITHUB' && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500 text-sm font-medium">Repository</span>
                                <a href={analysis.repository_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm font-bold truncate max-w-[200px]" title={analysis.repository_url}>
                                    {analysis.repository_url.replace('https://github.com/', '')}
                                </a>
                            </div>
                        )}
                        {analysis.source_type === 'GITHUB' && analysis.repository_branch && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500 text-sm font-medium">Branch</span>
                                <span className="text-slate-900 text-sm font-bold">{analysis.repository_branch}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 text-sm font-medium">Last Scanned</span>
                            <span className="text-slate-900 text-sm font-bold">{new Date(analysis.updated_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Requirement Change</h2>
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Existing Requirement</h4>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap">{analysis.existing_requirement}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                            <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">New Requirement</h4>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap">{analysis.new_requirement}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Project Structure Metrics</h2>
                </div>
                
                {analysis.scan_data ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <MetricBox label="Total Files" value={analysis.scan_data.totalFiles} />
                        <MetricBox label="Total Directories" value={analysis.scan_data.totalDirectories} />
                        <MetricBox label="Frontend Files" value={analysis.scan_data.frontendFiles?.length || 0} />
                        <MetricBox label="Backend Files" value={analysis.scan_data.backendFiles?.length || 0} />
                        <MetricBox label="Routes" value={analysis.scan_data.routes?.length || 0} />
                        <MetricBox label="Controllers" value={analysis.scan_data.controllers?.length || 0} />
                        <MetricBox label="Services" value={analysis.scan_data.services?.length || 0} />
                        <MetricBox label="Models" value={analysis.scan_data.models?.length || 0} />
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm">No scan data available.</p>
                )}
            </div>
        </div>
    );
}

function MetricBox({ label, value }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-indigo-600 mb-1">{value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
        </div>
    );
}
