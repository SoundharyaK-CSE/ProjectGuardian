import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis } from '../services/api';
import { 
    RefreshCw, AlertTriangle, Folder, File, ChevronRight, ChevronDown, Archive, Server, Globe, Database, Code2, Network
} from 'lucide-react';
import { SiJavascript, SiHtml5, SiCss, SiReact, SiExpress, SiMongodb, SiNodedotjs, SiTypescript, SiPython } from 'react-icons/si';

const getTechIcon = (tech) => {
    const t = tech.toLowerCase();
    if (t.includes('react')) return <SiReact className="w-5 h-5 text-[#61DAFB]" />;
    if (t.includes('node')) return <SiNodedotjs className="w-5 h-5 text-[#339933]" />;
    if (t.includes('express')) return <SiExpress className="w-5 h-5 text-slate-700" />;
    if (t.includes('mongo')) return <SiMongodb className="w-5 h-5 text-[#47A248]" />;
    if (t.includes('ts') || t.includes('typescript')) return <SiTypescript className="w-5 h-5 text-[#3178C6]" />;
    if (t.includes('js') || t.includes('javascript')) return <SiJavascript className="w-5 h-5 text-[#F7DF1E]" />;
    if (t.includes('html')) return <SiHtml5 className="w-5 h-5 text-[#E34F26]" />;
    if (t.includes('css')) return <SiCss className="w-5 h-5 text-[#1572B6]" />;
    if (t.includes('python')) return <SiPython className="w-5 h-5 text-[#3776AB]" />;
    return <Code2 className="w-5 h-5 text-slate-500" />;
};

import DependencyGraph from './DependencyGraph';
import WorkflowStepper from './WorkflowStepper';

const buildFileTree = (paths) => {
    const root = {};
    paths.forEach(path => {
        const parts = path.split('/');
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = i === parts.length - 1 ? null : {};
            }
            current = current[part];
        }
    });
    return root;
};

const FileTreeNode = ({ name, node, depth = 0 }) => {
    const [expanded, setExpanded] = useState(depth < 2);
    const isFile = node === null;

    return (
        <div className="text-sm">
            <div 
                className={`flex items-center py-1.5 px-2 hover:bg-slate-50 cursor-pointer ${depth === 0 ? 'font-medium text-slate-800' : 'text-slate-600'}`}
                style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                onClick={() => !isFile && setExpanded(!expanded)}
            >
                {!isFile ? (
                    <span className="mr-1 text-slate-400">
                        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                ) : <span className="w-4.5" />}
                
                {!isFile ? (
                    <Folder className="w-4 h-4 text-indigo-400 mr-2 shrink-0" />
                ) : (
                    <File className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                )}
                
                <span className="truncate text-sm">{name}</span>
            </div>
            {!isFile && expanded && (
                <div>
                    {Object.entries(node)
                        .sort(([aName, aNode], [bName, bNode]) => {
                            const aIsFile = aNode === null;
                            const bIsFile = bNode === null;
                            if (aIsFile === bIsFile) return aName.localeCompare(bName);
                            return aIsFile ? 1 : -1;
                        })
                        .map(([childName, childNode]) => (
                            <FileTreeNode key={childName} name={childName} node={childNode} depth={depth + 1} />
                        ))}
                </div>
            )}
        </div>
    );
};

export default function ProjectOverview() {
    const { id } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewFullGraph, setViewFullGraph] = useState(false);

    const loadData = () => {
        setLoading(true);
        setError(null);
        getAnalysis(id)
            .then(data => setAnalysis(data))
            .catch(err => {
                if (err.response?.status === 400 && err.response?.data?.recoveredId) {
                    window.location.replace(`/analysis/${err.response.data.recoveredId}/overview`);
                    return;
                }
                setError("Unable to load project overview. " + (err.response?.data?.error || err.message))
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading) return (
        <div className="flex-1 bg-slate-50 flex items-center justify-center p-12 h-screen">
            <div className="flex flex-col items-center">
                <RefreshCw className="animate-spin text-indigo-500 w-10 h-10 mb-4" />
                <p className="text-slate-500 font-medium">Loading project overview...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="flex-1 bg-slate-50 p-8 h-screen">
            <div className="max-w-2xl mx-auto mt-12 bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center flex flex-col items-center">
                <AlertTriangle className="text-red-500 w-12 h-12 mb-4" /> 
                <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Overview</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button 
                    onClick={loadData}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center shadow-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </button>
            </div>
        </div>
    );

    if (!analysis || !analysis.scan_data) return (
        <div className="flex-1 bg-slate-50 p-8 h-screen">
            <div className="max-w-2xl mx-auto mt-12 bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center">
                <Archive className="text-slate-400 w-12 h-12 mb-4" /> 
                <h2 className="text-xl font-bold text-slate-900 mb-2">No Scan Data Available</h2>
                <p className="text-slate-500 mb-6">The scanning phase did not complete successfully or no data was saved.</p>
            </div>
        </div>
    );

    const scanData = typeof analysis.scan_data === 'string' ? JSON.parse(analysis.scan_data) : analysis.scan_data;
    const allFiles = scanData.allFiles || [];
    const fileTree = buildFileTree(allFiles);

    // Derived Architecture info
    const frameworks = scanData.frameworks || [];
    const langs = scanData.languages || [];
    
    const frontendTechs = frameworks.filter(f => f.toLowerCase().includes('react') || f.toLowerCase().includes('vue') || f.toLowerCase().includes('next'));
    const backendTechs = frameworks.filter(f => f.toLowerCase().includes('node') || f.toLowerCase().includes('express'));
    const dbTechs = frameworks.filter(f => f.toLowerCase().includes('mongo') || f.toLowerCase().includes('postgres') || f.toLowerCase().includes('sql'));
    
    const frontendText = frontendTechs.length > 0 ? frontendTechs.join(', ') : (langs.includes('HTML') ? 'HTML/CSS/JS' : 'Not detected');
    const backendText = backendTechs.length > 0 ? backendTechs.join(', ') : 'Not detected';
    const dbText = dbTechs.length > 0 ? dbTechs.join(', ') : 'Not detected';
    const langText = langs.length > 0 ? langs.join(', ') : 'Not detected';

    const dependencies = scanData.dependencies ? Object.entries(scanData.dependencies) : [];

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
                
                <WorkflowStepper currentStep="project" analysis={analysis} />

                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-900">Project Overview</h1>
                    <p className="text-slate-500 mt-1 text-sm">Here's what Guardian discovered about your project.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-5 space-y-8">
                        
                        {/* Project Details */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-8">Project Details</h3>
                            
                            <div className="mb-8">
                                <h2 className="text-3xl font-extrabold text-slate-900 truncate" title={analysis.project_name}>
                                    {analysis.project_name}
                                </h2>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-3 items-center">
                                    <p className="text-sm font-semibold text-slate-500">Frontend</p>
                                    <p className="text-sm font-bold text-slate-900 col-span-2">{frontendText}</p>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <p className="text-sm font-semibold text-slate-500">Backend</p>
                                    <p className="text-sm font-bold text-slate-900 col-span-2">{backendText}</p>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <p className="text-sm font-semibold text-slate-500">Database</p>
                                    <p className="text-sm font-bold text-slate-900 col-span-2">{dbText}</p>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <p className="text-sm font-semibold text-slate-500">Language</p>
                                    <p className="text-sm font-bold text-slate-900 col-span-2">{langText}</p>
                                </div>
                            </div>
                        </div>

                        {/* Technologies Detected */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">Technologies Detected</h3>
                            
                            {scanData.technologies && scanData.technologies.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {scanData.technologies.map((tech, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            {getTechIcon(tech)}
                                            <span className="text-sm font-semibold text-slate-800">{tech}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No specific frameworks detected.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column (Project Structure & Dependencies) */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* Project Structure */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Project Structure</h3>
                                <div className="flex gap-2">
                                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                        {allFiles.length} files
                                    </span>
                                    {scanData.components?.length > 0 && (
                                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                            {scanData.components.length} components
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50/50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {allFiles.length > 0 ? (
                                    <FileTreeNode name={analysis.project_name || "project"} node={fileTree} />
                                ) : (
                                    <p className="text-sm text-slate-500 p-4 text-center">No files detected in scan.</p>
                                )}
                            </div>
                        </div>

                        {/* Dependencies Visualization */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Dependencies</h3>
                                {dependencies.length > 0 && (
                                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                        {dependencies.length} packages
                                    </span>
                                )}
                            </div>
                            
                            {dependencies.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-2">
                                        {dependencies.slice(0, 20).map(([dep, ver]) => (
                                            <div key={dep} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-800">{dep}</span>
                                                <span className="text-[10px] text-slate-500 font-mono bg-slate-50 px-1 rounded">{ver.replace(/[\^~]/, '')}</span>
                                            </div>
                                        ))}
                                        {dependencies.length > 20 && (
                                            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md flex items-center">
                                                <span className="text-xs font-bold text-slate-500">+{dependencies.length - 20} more</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-center">
                                    <Network className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm text-slate-500 italic">No dependencies detected from package.json.</p>
                                </div>
                            )}
                        </div>

                        {/* Dependency & Relationship Graph */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Dependency & Relationship Graph</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {viewFullGraph ? 'Raw file-level imports and API calls.' : 'Conceptual overview of project components and relationships.'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setViewFullGraph(!viewFullGraph)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    {viewFullGraph ? "View Conceptual Graph" : "View Full Graph"}
                                </button>
                            </div>
                            
                            <div className="w-full">
                                <DependencyGraph relationships={scanData.relationships} viewFull={viewFullGraph} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="flex justify-end pt-8 pb-12">
                    <Link 
                        to={`/analysis/${id}/requirement-analysis`}
                        className={`px-6 py-3 rounded-lg font-bold flex items-center shadow-sm transition-colors ${
                            analysis && analysis.existing_requirement && analysis.new_requirement && analysis.scan_data
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
                        }`}
                    >
                        Continue Requirement <ChevronRight className="w-5 h-5 ml-2" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
