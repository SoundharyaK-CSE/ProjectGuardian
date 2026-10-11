import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnalysis, saveDeveloperDecision } from '../services/api';
import { RefreshCw, Sparkles, Code2, CheckCircle2 } from 'lucide-react';
import WorkflowStepper from './WorkflowStepper';

export default function DeveloperDecision() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [analysis, setAnalysis] = useState(null);
    const [decision, setDecision] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadDecision = async () => {
            try {
                const data = await getAnalysis(id);
                setAnalysis(data);
                if (data.developer_decision) {
                    setDecision(data.developer_decision.decision);
                }
            } catch (err) {
                console.error("Could not load developer decision:", err);
            } finally {
                setLoading(false);
            }
        };
        loadDecision();
    }, [id]);

    const handleDecision = async (selectedDecision) => {
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            await saveDeveloperDecision(id, selectedDecision);
            setDecision(selectedDecision);
            
            // Navigate to appropriate mode
            if (selectedDecision === 'AI_UPDATE') {
                navigate(`/analysis/${id}/ai-update`);
            } else if (selectedDecision === 'GUIDE_ME') {
                navigate(`/analysis/${id}/guide-me`);
            }
        } catch (err) {
            setError("Your decision could not be saved. Please try again.");
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex-1 bg-slate-50 flex items-center justify-center h-screen">
            <RefreshCw className="animate-spin text-indigo-500 w-10 h-10" />
        </div>
    );

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto mt-4">
                
                <WorkflowStepper currentStep="decision" analysis={analysis} />

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold text-indigo-900 mb-8 text-center">How would you like to proceed?</h2>
                    
                    {error && (
                        <div className="w-full max-w-2xl bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-6 text-center text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-8 w-full max-w-3xl">
                        
                        {/* AI Update Card */}
                        <div className={`
                            relative flex flex-col items-center text-center p-8 rounded-2xl border-2 transition-all 
                            ${decision === 'AI_UPDATE' ? 'border-indigo-500 bg-indigo-50/30 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-100 hover:border-indigo-200 hover:shadow-sm bg-gradient-to-br from-rose-50/50 to-indigo-50/30'}
                        `}>
                            {decision === 'AI_UPDATE' && (
                                <div className="absolute top-4 right-4 text-indigo-600 flex items-center gap-1 text-xs font-bold bg-indigo-100 px-2 py-1 rounded-md">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                                </div>
                            )}
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-rose-500">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-indigo-600 uppercase tracking-wide mb-4">AI Update</h3>
                            <p className="text-slate-600 text-sm font-medium mb-8 flex-1 leading-relaxed max-w-[250px]">
                                Guardian will automatically modify the affected code after your permission.
                            </p>
                            <button 
                                disabled={submitting}
                                onClick={() => handleDecision('AI_UPDATE')}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {submitting && decision !== 'GUIDE_ME' ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Choose AI Update"}
                            </button>
                        </div>

                        {/* Guide Me Card */}
                        <div className={`
                            relative flex flex-col items-center text-center p-8 rounded-2xl border-2 transition-all 
                            ${decision === 'GUIDE_ME' ? 'border-indigo-500 bg-indigo-50/30 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-100 hover:border-emerald-200 hover:shadow-sm bg-white'}
                        `}>
                            {decision === 'GUIDE_ME' && (
                                <div className="absolute top-4 right-4 text-emerald-600 flex items-center gap-1 text-xs font-bold bg-emerald-100 px-2 py-1 rounded-md">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                                </div>
                            )}
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center shadow-sm mb-6 text-emerald-500">
                                <Code2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-indigo-600 uppercase tracking-wide mb-4">Guide Me</h3>
                            <p className="text-slate-600 text-sm font-medium mb-8 flex-1 leading-relaxed max-w-[250px]">
                                Get step-by-step guidance and modify the project yourself.
                            </p>
                            <button 
                                disabled={submitting}
                                onClick={() => handleDecision('GUIDE_ME')}
                                className="w-full py-3.5 bg-white border-2 border-slate-200 hover:border-indigo-600 text-indigo-600 font-bold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {submitting && decision !== 'AI_UPDATE' ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Choose Guide Me"}
                            </button>
                        </div>

                    </div>
                    
                </div>
            </div>
        </div>
    );
}
