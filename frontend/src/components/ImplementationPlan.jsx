import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis, generateImplementationPlan } from '../services/api';
import { 
    RefreshCw, AlertTriangle, ChevronRight, CheckCircle2, ChevronDown
} from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function ImplementationPlan() {
    const { id } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedItem, setExpandedItem] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAnalysis(id);
            if (data.implementation_plan) {
                setAnalysis({ ...data, implementation_plan: data.implementation_plan });
            } else {
                const result = await generateImplementationPlan(id);
                setAnalysis({ ...data, implementation_plan: result });
            }
        } catch (err) {
            setError("Implementation plan could not be generated. " + (err.response?.data?.error || err.message));
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
                <h2 className="text-xl font-bold text-slate-900 mb-2">Generating implementation plan...</h2>
                <div className="w-full space-y-3 mt-6 text-sm text-slate-600 font-medium">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        <span>Evaluating impact analysis</span>
                    </div>
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
                        <span>Structuring step-by-step plan</span>
                    </div>
                </div>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="flex-1 bg-slate-50 p-8 h-screen">
            <div className="max-w-2xl mx-auto mt-12 bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center flex flex-col items-center">
                <AlertTriangle className="text-red-500 w-12 h-12 mb-4" /> 
                <h2 className="text-xl font-bold text-slate-900 mb-2">Plan could not be generated.</h2>
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

    const planData = analysis?.implementation_plan;
    if (!planData || !planData.plan) return null;

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">
                
                <WorkflowStepper currentStep="implementation" analysis={analysis} />

                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Recommended Changes <ChevronRight className="w-5 h-5 text-indigo-500" />
                    </h1>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Implementation Plan</h2>
                    
                    <div className="space-y-4">
                        {planData.plan.map((item, idx) => (
                            <div key={idx} className="border border-slate-100 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                <button 
                                    className="w-full flex items-center p-4 text-left focus:outline-none"
                                    onClick={() => setExpandedItem(expandedItem === idx ? null : idx)}
                                >
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold text-lg mr-4 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
                                        <p className="text-slate-600 text-sm mt-0.5">{item.description}</p>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedItem === idx ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedItem === idx && (
                                    <div className="px-16 pb-6 pt-2 text-sm text-slate-600 border-t border-slate-100">
                                        <p><strong>Affected Component/File:</strong> Review the impact analysis details for exact implementation guidelines.</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-8">
                        <Link 
                            to={`/analysis/${id}/decision`}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold flex items-center shadow-sm hover:bg-indigo-700 transition-colors"
                        >
                            Continue to Decision <ChevronRight className="w-5 h-5 ml-2" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
