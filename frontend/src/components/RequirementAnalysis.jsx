import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis, analyzeRequirement } from '../services/api';
import { 
    RefreshCw, AlertTriangle, ChevronRight, CheckCircle2, ArrowRight
} from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function RequirementAnalysis() {
    const { id } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAnalysis(id);
            if (data.requirement_analysis) {
                setAnalysis({ ...data, requirement_analysis: data.requirement_analysis });
            } else {
                // Perform requirement analysis if not present
                const result = await analyzeRequirement(id);
                setAnalysis({ ...data, requirement_analysis: result });
            }
        } catch (err) {
            setError("Requirement analysis could not be completed. " + (err.response?.data?.error || err.message));
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
                <h2 className="text-xl font-bold text-slate-900 mb-2">Analyzing Requirement...</h2>
                <div className="w-full space-y-3 mt-6 text-sm text-slate-600 font-medium">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        <span>Compare existing and new requirements</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        <span>Detecting change</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        <span>Identifying affected areas</span>
                    </div>
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
                        <span>Calculating confidence</span>
                    </div>
                </div>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="flex-1 bg-slate-50 p-8 h-screen">
            <div className="max-w-2xl mx-auto mt-12 bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center flex flex-col items-center">
                <AlertTriangle className="text-red-500 w-12 h-12 mb-4" /> 
                <h2 className="text-xl font-bold text-slate-900 mb-2">Requirement analysis could not be completed.</h2>
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

    const reqAnalysis = analysis?.requirement_analysis;

    if (!reqAnalysis) return null;

    // Determine confidence color
    let confidenceColor = "text-green-500";
    let confidenceBorder = "border-green-500";
    if (reqAnalysis.confidence < 70) {
        confidenceColor = "text-yellow-500";
        confidenceBorder = "border-yellow-500";
    }
    if (reqAnalysis.confidence < 40) {
        confidenceColor = "text-red-500";
        confidenceBorder = "border-red-500";
    }

    // Colors for categories based on the visual reference (example mappings)
    const getCategoryStyle = (cat) => {
        const lowerCat = cat.toLowerCase();
        if (lowerCat.includes('auth')) return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        if (lowerCat.includes('input') || lowerCat.includes('ui')) return 'bg-rose-50 text-rose-600 border border-rose-100';
        if (lowerCat.includes('api')) return 'bg-blue-50 text-blue-600 border border-blue-100';
        if (lowerCat.includes('data')) return 'bg-teal-50 text-teal-600 border border-teal-100';
        if (lowerCat.includes('verif')) return 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100';
        if (lowerCat.includes('test')) return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    };

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-8">
                
                <WorkflowStepper currentStep="requirements" analysis={analysis} />

                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Requirement Analysis <ChevronRight className="w-5 h-5 text-indigo-500" />
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Guardian compared the existing and new requirements to identify core changes.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
                    
                    {/* Change Detected Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Change Detected</h3>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <AlertTriangle className="w-5 h-5 text-rose-500 rotate-180" />
                            <h2 className="text-xl font-bold text-slate-900">{reqAnalysis.changeType || 'Requirement Modification'}</h2>
                        </div>

                        {/* Comparison Flow */}
                        <div className="flex items-center justify-between gap-4">
                            {/* OLD Card */}
                            <div className="flex-1 bg-rose-50/50 border border-rose-100 rounded-xl p-6 min-h-[140px] flex flex-col justify-center">
                                <span className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">OLD</span>
                                <p className="text-rose-600 font-medium text-lg leading-snug">
                                    {analysis.existing_requirement}
                                </p>
                            </div>

                            {/* Arrow */}
                            <div className="flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg w-12 h-12 shadow-sm">
                                <ArrowRight className="text-slate-600 w-6 h-6" />
                            </div>

                            {/* NEW Card */}
                            <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 min-h-[140px] flex flex-col justify-center">
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">NEW</span>
                                <p className="text-emerald-700 font-medium text-lg leading-snug">
                                    {analysis.new_requirement}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Change Explanation */}
                    <div className="mb-10 text-slate-700 text-lg">
                        {reqAnalysis.explanation}
                    </div>

                    {/* Bottom Split (Categories & Confidence) */}
                    <div className="grid grid-cols-[1fr_250px] gap-8">
                        
                        {/* Categories Box */}
                        <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-slate-800 mb-4">Change Categories</h3>
                            <div className="flex flex-wrap gap-3">
                                {reqAnalysis.categories?.map((cat, idx) => (
                                    <span key={idx} className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${getCategoryStyle(cat)}`}>
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Confidence Box */}
                        <div className="border border-slate-100 rounded-xl p-6 flex flex-col items-center justify-center shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-4">Confidence</h3>
                            <div className="relative w-28 h-28 flex items-center justify-center">
                                {/* Simple ring */}
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-slate-100"
                                        strokeWidth="4"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className={confidenceColor}
                                        strokeDasharray={`${reqAnalysis.confidence}, 100`}
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute flex items-center justify-center w-full h-full">
                                    <span className="text-2xl font-bold text-slate-800">{reqAnalysis.confidence}%</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="flex justify-end pt-4 pb-12">
                    <Link 
                        to={`/analysis/${id}/impact`}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold flex items-center shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                        Continue Analysis <ChevronRight className="w-5 h-5 ml-2" />
                    </Link>
                </div>

            </div>
        </div>
    );
}
