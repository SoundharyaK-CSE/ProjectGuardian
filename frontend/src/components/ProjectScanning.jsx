import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnalysis, scanProject } from '../services/api';
import { CheckCircle2, Circle, Loader2, AlertCircle, Box, Code2, Database, LayoutTemplate, Braces, ArrowRight, Server, Globe } from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

const STAGES = [
    'Repository loaded',
    'Detecting programming languages',
    'Detecting frameworks',
    'Scanning project structure',
    'Detecting dependencies',
    'Analyzing components',
    'Detecting APIs',
    'Building dependency map',
    'Preparing project model'
];

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
    
    // Fallback to a generic code icon if not matched
    return <Code2 className="w-5 h-5 text-slate-500" />;
};

export default function ProjectScanning() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const [scanStarted, setScanStarted] = useState(false);
    
    const pollInterval = useRef(null);

    const fetchAnalysis = async () => {
        try {
            const data = await getAnalysis(id);
            setAnalysis(data);
            return data;
        } catch (err) {
            console.error('Error fetching analysis:', err);
            if (err.response?.status === 400 && err.response?.data?.recoveredId) {
                navigate(`/analysis/${err.response.data.recoveredId}/scan`, { replace: true });
                return null;
            }
            setError('Failed to fetch analysis details.');
            return null;
        }
    };

    const startScan = async () => {
        if (scanStarted) return;
        setScanStarted(true);
        try {
            await scanProject(id);
        } catch (err) {
            console.error('Error starting scan:', err);
            setError(err.response?.data?.error || err.message || 'Failed to start scan.');
        }
    };

    useEffect(() => {
        let mounted = true;

        const checkState = async () => {
            const data = await fetchAnalysis();
            if (!mounted || !data) return;

            const isCompleted = data.status === 'SCANNED';
            const isFailed = data.status === 'FAILED';
            
            if (isCompleted || isFailed) {
                if (pollInterval.current) {
                    clearInterval(pollInterval.current);
                    pollInterval.current = null;
                }
            } else if (data.status !== 'SCANNING' && !scanStarted) {
                startScan();
            }
        };

        checkState();
        pollInterval.current = setInterval(checkState, 1000);

        return () => {
            mounted = false;
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, [id, scanStarted]);

    if (error) {
        return (
            <div className="flex-1 p-8 bg-slate-50 min-h-screen">
                <div className="max-w-4xl mx-auto mt-12 bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to analyze project</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button 
                        onClick={() => { setError(null); setScanStarted(false); }}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Retry Scan
                    </button>
                </div>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="flex-1 p-8 bg-slate-50 min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const scanData = typeof analysis.scan_data === 'string' ? JSON.parse(analysis.scan_data) : analysis.scan_data;
    const progressStage = scanData?.progress?.stage ?? 0;
    const isCompleted = analysis.status === 'SCANNED';
    
    // Derived stage for UI representation (1-9). If completed, it's 9.
    const currentStage = isCompleted ? 9 : (progressStage > 0 ? progressStage : 1);
    const progressPercent = Math.round((currentStage / 9) * 100);

    const technologies = isCompleted && scanData?.technologies ? scanData.technologies : [];

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
                
                <WorkflowStepper currentStep="scan" analysis={analysis} />

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">Analyzing Project</h2>
                        
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-slate-800">{analysis.project_name}</span>
                            <span className="text-sm font-medium text-slate-500">{progressPercent}%</span>
                        </div>
                        
                        <div className="w-full bg-slate-100 rounded-full h-3 mb-8 overflow-hidden">
                            <div 
                                className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            
                            {/* Checklist */}
                            <div className="lg:col-span-2 space-y-4">
                                {STAGES.map((stageName, index) => {
                                    const stageNumber = index + 1;
                                    const isPast = isCompleted || currentStage > stageNumber;
                                    const isActive = !isCompleted && currentStage === stageNumber;
                                    const isPending = !isCompleted && currentStage < stageNumber;

                                    return (
                                        <div key={index} className={`flex items-center gap-4 ${isPending ? 'opacity-40' : 'opacity-100'} transition-opacity duration-300`}>
                                            {isPast ? (
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                                            ) : isActive ? (
                                                <div className="relative flex-shrink-0">
                                                    <Circle className="w-6 h-6 text-indigo-600" />
                                                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                </div>
                                            ) : (
                                                <Circle className="w-6 h-6 text-slate-300 flex-shrink-0" />
                                            )}
                                            <span className={`text-base font-medium ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {stageName}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Technologies Detected */}
                            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 self-start">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">Technologies Detected</h3>
                                
                                {isCompleted && technologies.length > 0 ? (
                                    <div className="space-y-4">
                                        {technologies.map((tech, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                {getTechIcon(tech)}
                                                <span className="text-sm font-semibold text-slate-800">{tech}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : isCompleted ? (
                                    <p className="text-sm text-slate-500 italic">No specific frameworks detected.</p>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mb-2 opacity-50" />
                                        <span className="text-xs font-medium uppercase tracking-wider">Scanning...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 py-6 bg-slate-50 flex justify-end">
                        <button
                            onClick={() => navigate(`/analysis/${id}/overview`)}
                            disabled={!isCompleted}
                            className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 min-w-[160px]
                                ${!isCompleted ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'}`}
                        >
                            {isCompleted ? (
                                <>View Project Overview <ArrowRight className="w-4 h-4" /></>
                            ) : (
                                <>Scanning <Loader2 className="w-4 h-4 animate-spin" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
