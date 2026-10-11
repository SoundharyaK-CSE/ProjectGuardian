import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReport, getReportDownloadUrl, getAnalysis, getDownloadUrl } from '../services/api';
import { 
    ArrowLeft, FileText, CheckCircle2, XCircle, Circle, Download, 
    Calendar, Layers, ShieldCheck, GitBranch, AlertCircle, Clock, Archive
} from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function Report() {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [rep, ana] = await Promise.all([
                    getReport(id),
                    getAnalysis(id).catch(() => null)
                ]);
                setReport(rep);
                if (ana) {
                    setAnalysis(ana);
                } else if (rep) {
                    setAnalysis({
                        id: rep.id,
                        project_name: rep.project_name,
                        status: 'SCANNED',
                        scan_data: true,
                        requirement_analysis: true,
                        impact_analysis: true,
                        developer_decision: rep.developer_decision,
                        ai_update_result: rep.ai_update_result,
                        validation_result: rep.validation_result || { status: rep.validation_status }
                    });
                }
            } catch (e) {
                console.error("Failed to load report", e);
                setError("Could not load project report.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="flex-1 bg-slate-50 flex items-center justify-center h-screen">
                <div className="animate-spin text-indigo-500 w-10 h-10 border-4 border-current border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex-1 p-8 bg-slate-50 min-h-screen">
                <div className="max-w-4xl mx-auto mt-8">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
                        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Report Not Available</h2>
                        <p className="text-slate-500 mb-6">{error || "The requested analysis report could not be found."}</p>
                        <div className="flex items-center justify-center gap-3">
                            <Link 
                                to="/dashboard"
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-colors inline-block"
                            >
                                Return to Dashboard
                            </Link>
                            <Link 
                                to={`/analysis/${id}/result`}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors inline-block"
                            >
                                Back to Final Result
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const modifiedFiles = report.ai_update_result?.modifiedFiles || [];
    const validation = report.validation_result || {};
    const stages = validation.stages || {};
    const finalVal = validation.status || 'Not available';

    const renderIcon = (status) => {
        if (status === 'PASSED') return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
        if (status === 'FAILED') return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
        if (status === 'SKIPPED') return <Circle className="w-5 h-5 text-slate-400 shrink-0" />;
        return <Circle className="w-5 h-5 text-slate-300 shrink-0" />;
    };

    const stageLabels = [
        { key: 'changeIntegrity', label: 'Change Integrity' },
        { key: 'dependencies', label: 'Dependencies' },
        { key: 'syntax', label: 'Syntax' },
        { key: 'build', label: 'Build' },
        { key: 'unitTests', label: 'Unit Tests' },
        { key: 'integration', label: 'Integration Checks' },
        { key: 'finalValidation', label: 'Final Validation' }
    ];

    const canDownloadZip = report.validation_result?.status === 'PASSED';

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <WorkflowStepper currentStep="result" analysis={analysis} className="mb-8" />

                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link 
                            to={`/analysis/${id}/result`} 
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Final Result
                        </Link>
                        <span className="text-slate-300">|</span>
                        <Link 
                            to="/dashboard"
                            className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                        >
                            Dashboard
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        {canDownloadZip && (
                            <a
                                href={getDownloadUrl(id)}
                                download={`project-update-${id}.zip`}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm transition-all text-sm"
                            >
                                <Archive className="w-4 h-4 text-slate-500" /> Download ZIP (with Report)
                            </a>
                        )}
                        <a
                            href={getReportDownloadUrl(id)}
                            download={`guardian-report-${id}.md`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all text-sm"
                        >
                            <Download className="w-4 h-4" /> Download Report (.md)
                        </a>
                    </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10 space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Project Update Report</h1>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">Analysis ID: {report.id}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {report.generated_at ? new Date(report.generated_at).toLocaleString() : 'Not available'}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5">Project Guardian Automation</span>
                        </div>
                    </div>

                    {/* Section 1: Project Overview */}
                    <section>
                        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600" /> 1. Project Overview
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-100 text-sm">
                            <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Project Name</span>
                                <span className="font-semibold text-slate-800">{report.project_name || 'Not available'}</span>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Source Type</span>
                                <span className="font-semibold text-slate-800 uppercase px-2 py-0.5 bg-slate-200/70 rounded text-xs inline-block">
                                    {report.source_type || 'Unknown'}
                                </span>
                            </div>
                            {report.repository_url && (
                                <div className="sm:col-span-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Repository URL</span>
                                    <a 
                                        href={report.repository_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-indigo-600 hover:underline font-mono text-xs break-all"
                                    >
                                        {report.repository_url}
                                    </a>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Section 2: Requirements */}
                    <section>
                        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" /> 2. Requirements & Decision
                        </h2>
                        <div className="space-y-3">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Original Requirement</span>
                                <p className="text-sm text-slate-700 leading-relaxed">{report.existing_requirement || 'Not available'}</p>
                            </div>
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">New Target Requirement</span>
                                <p className="text-sm text-indigo-950 font-medium leading-relaxed">{report.new_requirement || 'Not available'}</p>
                            </div>
                            <div className="flex gap-4 text-xs font-medium text-slate-600 px-1">
                                <span>Execution Mode: <strong className="text-slate-800">{report.developer_decision?.decision || 'AI Update'}</strong></span>
                                <span>Risk Level: <strong className="text-slate-800">{report.developer_decision?.risk || 'N/A'}</strong></span>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Code Modifications */}
                    <section>
                        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-indigo-600" /> 3. Code Modifications
                        </h2>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                            <div className="flex items-center gap-6 text-sm font-semibold">
                                <span className="text-slate-700">{modifiedFiles.length} file(s) modified</span>
                                <span className="text-emerald-600 font-mono">+{report.ai_update_result?.additions || 0} additions</span>
                                <span className="text-rose-500 font-mono">-{report.ai_update_result?.deletions || 0} deletions</span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Changed Files</span>
                                {modifiedFiles.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No files modified</p>
                                ) : (
                                    <ul className="space-y-1.5 font-mono text-xs text-slate-700">
                                        {modifiedFiles.map((file, idx) => (
                                            <li key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                                <span className="truncate">{file}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Section 4: Validation Results */}
                    <section>
                        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" /> 4. Validation Results
                        </h2>
                        <div className="space-y-2">
                            {stageLabels.map(({ key, label }) => {
                                const stg = stages[key];
                                const status = stg ? stg.status : 'PENDING';
                                return (
                                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 gap-2">
                                        <div className="flex items-center gap-3">
                                            {renderIcon(status)}
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{label}</p>
                                                {stg?.details && (
                                                    <p className="text-xs text-slate-500 mt-0.5">{stg.details}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto shrink-0 ${
                                            status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' :
                                            status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                                            status === 'SKIPPED' ? 'bg-slate-200 text-slate-600' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-indigo-950">Overall Validation Status</span>
                            <span className={`text-sm font-extrabold px-3 py-1 rounded-lg uppercase ${
                                finalVal === 'PASSED' ? 'bg-emerald-600 text-white' :
                                finalVal === 'FAILED' ? 'bg-rose-600 text-white' :
                                'bg-slate-600 text-white'
                            }`}>
                                {finalVal}
                            </span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
