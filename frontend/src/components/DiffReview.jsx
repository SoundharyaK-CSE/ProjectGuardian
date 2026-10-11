import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAnalysis, getAIUpdateStatus } from '../services/api';
import { Loader2, AlertTriangle, ArrowRight, ChevronDown, FileCode, CheckCircle2 } from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

function parseGitDiff(diffText) {
    if (!diffText || typeof diffText !== 'string') return [];
    
    const rawChunks = diffText.split(/^diff --git\s+/m);
    const files = [];

    for (const chunk of rawChunks) {
        if (!chunk.trim()) continue;
        
        const lines = chunk.split('\n');
        const headerLine = lines[0] || '';
        
        // Extract target file path (b/...)
        let filePath = '';
        const bMatch = headerLine.match(/"?b\/([^"\n]+)"?$/);
        if (bMatch) {
            filePath = bMatch[1];
        } else {
            const tokens = headerLine.trim().split(/\s+/);
            const lastToken = tokens[tokens.length - 1] || '';
            filePath = lastToken.replace(/^"?b\//, '').replace(/"?$/, '');
        }

        // Normalize separators
        const normalized = filePath.replace(/\\/g, '/');
        const projIdx = normalized.indexOf('/project/');
        const displayPath = projIdx !== -1 ? normalized.slice(projIdx + 9) : normalized;
        const fileName = displayPath.split('/').pop() || displayPath;

        let additions = 0;
        let deletions = 0;
        const diffLines = [];
        let inHunk = false;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('@@')) {
                inHunk = true;
                diffLines.push({ type: 'hunk-header', text: line });
                continue;
            }
            if (!inHunk) continue;

            if (line.startsWith('+') && !line.startsWith('+++')) {
                additions++;
                diffLines.push({ type: 'add', text: line.slice(1) });
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletions++;
                diffLines.push({ type: 'del', text: line.slice(1) });
            } else if (line.startsWith(' ')) {
                diffLines.push({ type: 'context', text: line.slice(1) });
            } else if (line === '') {
                diffLines.push({ type: 'context', text: '' });
            }
        }

        files.push({
            fileName,
            filePath: displayPath,
            additions,
            deletions,
            lines: diffLines
        });
    }

    return files;
}

export default function DiffReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFileIdx, setSelectedFileIdx] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [anaData, updateStatus] = await Promise.all([
                    getAnalysis(id),
                    getAIUpdateStatus(id)
                ]);
                setAnalysis(anaData);
                setStatus(updateStatus);
            } catch (err) {
                console.error("Failed to load review data", err);
                setError("Could not load changes for review.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="flex-1 bg-slate-50 flex items-center justify-center h-screen">
                <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="flex-1 p-8 bg-slate-50 min-h-screen">
                <div className="max-w-4xl mx-auto mt-8">
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Changes to Review</h2>
                        <p className="text-slate-500 mb-6">{error || "Please run AI Code Changes first."}</p>
                        <Link 
                            to={`/analysis/${id}/ai-update`}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors inline-block"
                        >
                            Back to AI Code Changes
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const parsedFiles = parseGitDiff(status.diff);
    const totalFiles = parsedFiles.length;
    const totalAdditions = parsedFiles.reduce((acc, f) => acc + f.additions, 0);
    const totalDeletions = parsedFiles.reduce((acc, f) => acc + f.deletions, 0);

    const activeFile = parsedFiles[selectedFileIdx] || parsedFiles[0];

    // Partition active file lines for side-by-side or clean unified display
    const deletionsList = activeFile ? activeFile.lines.filter(l => l.type === 'del') : [];
    const additionsList = activeFile ? activeFile.lines.filter(l => l.type === 'add') : [];

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-5xl mx-auto mt-4">
                
                <WorkflowStepper currentStep="implementation" analysis={analysis} />

                {/* Step header */}
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        Code Changes / Diff
                    </h1>
                </div>

                {/* Main Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Review Changes</h2>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            Update Workspace
                        </span>
                    </div>

                    {parsedFiles.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No code modifications found in the diff.
                        </div>
                    ) : (
                        <>
                            {/* File Selector Dropdown */}
                            <div className="relative mb-6">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-medium text-sm transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="font-semibold text-slate-800">{activeFile?.fileName}</span>
                                        <span className="text-xs text-slate-400 truncate">({activeFile?.filePath})</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-2">
                                        <span className="text-xs text-emerald-600 font-semibold">+{activeFile?.additions}</span>
                                        <span className="text-xs text-rose-500 font-semibold">-{activeFile?.deletions}</span>
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto py-1">
                                        {parsedFiles.map((file, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFileIdx(idx);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-indigo-50/50 transition-colors ${selectedFileIdx === idx ? 'bg-indigo-50 font-semibold text-indigo-900' : 'text-slate-700'}`}
                                            >
                                                <div className="flex items-center gap-2 truncate mr-3">
                                                    <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <span className="truncate">{file.fileName}</span>
                                                    <span className="text-xs text-slate-400 truncate">({file.filePath})</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-emerald-600 font-semibold">+{file.additions}</span>
                                                    <span className="text-xs text-rose-500 font-semibold">-{file.deletions}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Side-by-side / Visual Diff Box matching reference screenshot */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* Deletions panel (Red background) */}
                                <div className="bg-red-50/60 border border-red-100 rounded-xl p-4 min-h-[220px] max-h-[420px] overflow-y-auto">
                                    <div className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center justify-between pb-2 border-b border-red-100">
                                        <span>Original (Removed)</span>
                                        <span className="text-rose-500 font-mono">-{activeFile?.deletions} lines</span>
                                    </div>
                                    <div className="font-mono text-xs text-rose-900 space-y-1.5 leading-relaxed">
                                        {deletionsList.length === 0 ? (
                                            <span className="text-slate-400 italic font-sans text-xs">No lines removed</span>
                                        ) : (
                                            deletionsList.map((dl, i) => (
                                                <div key={i} className="flex gap-2 items-start py-0.5">
                                                    <span className="text-rose-500 select-none font-bold shrink-0">-</span>
                                                    <span className="break-all whitespace-pre-wrap">{dl.text}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Additions panel (Green background) */}
                                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 min-h-[220px] max-h-[420px] overflow-y-auto">
                                    <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center justify-between pb-2 border-b border-emerald-100">
                                        <span>Updated (Added)</span>
                                        <span className="text-emerald-600 font-mono">+{activeFile?.additions} lines</span>
                                    </div>
                                    <div className="font-mono text-xs text-emerald-900 space-y-1.5 leading-relaxed">
                                        {additionsList.length === 0 ? (
                                            <span className="text-slate-400 italic font-sans text-xs">No lines added</span>
                                        ) : (
                                            additionsList.map((al, i) => (
                                                <div key={i} className="flex gap-2 items-start py-0.5">
                                                    <span className="text-emerald-600 select-none font-bold shrink-0">+</span>
                                                    <span className="break-all whitespace-pre-wrap">{al.text}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Unified diff detailed view expandable */}
                            <details className="mb-6 bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800">
                                <summary className="px-4 py-3 cursor-pointer text-xs font-mono text-slate-300 hover:text-white select-none flex items-center justify-between">
                                    <span>Detailed Unified Diff ({activeFile?.fileName})</span>
                                    <span className="text-slate-500 text-[11px]">Click to toggle full hunk context</span>
                                </summary>
                                <div className="p-4 max-h-72 overflow-y-auto font-mono text-xs border-t border-slate-800">
                                    {activeFile?.lines.map((l, i) => (
                                        <div 
                                            key={i}
                                            className={`py-0.5 px-2 rounded ${
                                                l.type === 'add' ? 'bg-emerald-950/60 text-emerald-300' :
                                                l.type === 'del' ? 'bg-rose-950/60 text-rose-300' :
                                                l.type === 'hunk-header' ? 'text-indigo-400 bg-slate-800/60 my-1 font-bold' :
                                                'text-slate-400'
                                            }`}
                                        >
                                            {l.type === 'add' ? `+ ${l.text}` : l.type === 'del' ? `- ${l.text}` : l.text}
                                        </div>
                                    ))}
                                </div>
                            </details>

                            {/* Footer Metrics & Navigation Button */}
                            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
                                <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
                                    <span>{totalFiles} files changed</span>
                                    <span className="text-emerald-600 font-mono">+{totalAdditions}</span>
                                    <span className="text-rose-500 font-mono">-{totalDeletions}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link 
                                        to={`/analysis/${id}/ai-update`}
                                        className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-semibold transition-colors"
                                    >
                                        Back to Update
                                    </Link>
                                    <Link 
                                        to={`/analysis/${id}/validation`}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
                                    >
                                        Continue to Validation
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
