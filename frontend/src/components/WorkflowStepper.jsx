import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';

export const WORKFLOW_STEPS = [
    { key: 'project', label: 'Project', path: (id) => id ? `/analysis/${id}/overview` : '/new' },
    { key: 'scan', label: 'Scan', path: (id) => id ? `/analysis/${id}/scan` : null },
    { key: 'requirements', label: 'Requirements', path: (id) => id ? `/analysis/${id}/requirement-analysis` : null },
    { key: 'impact', label: 'Impact', path: (id) => id ? `/analysis/${id}/impact` : null },
    { key: 'risk', label: 'Risk', path: (id) => id ? `/analysis/${id}/impact` : null },
    { key: 'decision', label: 'Decision', path: (id) => id ? `/analysis/${id}/decision` : null },
    { key: 'implementation', label: 'Implementation', path: (id) => id ? `/analysis/${id}/plan` : null },
    { key: 'validation', label: 'Validation', path: (id) => id ? `/analysis/${id}/validation` : null },
    { key: 'result', label: 'Result', path: (id) => id ? `/analysis/${id}/result` : null },
];

/**
 * Determine the 0-based active step index and completion state
 * based on current step key and actual analysis data.
 */
export function getStepStatus(stepIndex, currentStepIndex, analysis) {
    const isCurrent = stepIndex === currentStepIndex;

    // Check if this step is completed based on actual data
    let isCompleted = false;
    if (analysis) {
        switch (stepIndex) {
            case 0: // Project
                isCompleted = Boolean(analysis.project_name || analysis.id);
                break;
            case 1: // Scan
                isCompleted = analysis.status === 'SCANNED' || Boolean(analysis.scan_data);
                break;
            case 2: // Requirements
                isCompleted = Boolean(analysis.requirement_analysis);
                break;
            case 3: // Impact
                isCompleted = Boolean(analysis.impact_analysis);
                break;
            case 4: // Risk
                isCompleted = Boolean(analysis.impact_analysis);
                break;
            case 5: // Decision
                isCompleted = Boolean(analysis.developer_decision);
                break;
            case 6: // Implementation
                isCompleted = Boolean(
                    analysis.ai_update_result?.status === 'COMPLETED' || 
                    analysis.implementation_plan?.status === 'completed' ||
                    analysis.implementation_plan?.plan
                );
                break;
            case 7: // Validation
                isCompleted = Boolean(
                    analysis.validation_result?.status === 'PASSED' || 
                    analysis.validation_result?.status === 'FAILED'
                );
                break;
            case 8: // Result
                isCompleted = Boolean(analysis.validation_result?.status === 'PASSED');
                break;
            default:
                isCompleted = false;
        }
    }

    // If the step is both completed and current, indicate both!
    if (isCurrent) {
        return { isCurrent: true, isCompleted: isCompleted, isInactive: false };
    }

    if (isCompleted) {
        return { isCurrent: false, isCompleted: true, isInactive: false };
    }

    return { isCurrent: false, isCompleted: false, isInactive: true };
}

export default function WorkflowStepper({ currentStep = 'project', analysis = null, className = '' }) {
    const navigate = useNavigate();
    const { id } = useParams();
    const analysisId = id || analysis?.id;

    const currentStepIndex = WORKFLOW_STEPS.findIndex(
        s => s.key.toLowerCase() === (currentStep || '').toLowerCase()
    );

    const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

    return (
        <div className={`w-full max-w-5xl mx-auto mb-10 ${className}`}>
            <div className="flex items-center justify-between relative px-2">
                {/* Horizontal connector line */}
                <div className="absolute left-6 right-6 top-4 h-[2px] bg-slate-200 -z-0" />

                {WORKFLOW_STEPS.map((step, index) => {
                    const { isCurrent, isCompleted, isInactive } = getStepStatus(index, activeIndex, analysis);
                    const canNavigate = Boolean(analysisId && (isCompleted || isCurrent) && step.path(analysisId));

                    return (
                        <div 
                            key={step.key} 
                            className="flex flex-col items-center relative z-10 bg-transparent px-1 cursor-pointer select-none"
                            onClick={() => {
                                if (canNavigate) {
                                    navigate(step.path(analysisId));
                                }
                            }}
                        >
                            {/* Circle badge */}
                            <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm
                                    ${isCompleted
                                        ? isCurrent
                                            ? 'bg-emerald-500 text-white border-2 border-emerald-600 ring-4 ring-emerald-100'
                                            : 'bg-emerald-500 text-white border-2 border-emerald-500'
                                        : isCurrent
                                            ? 'bg-white text-indigo-600 border-2 border-indigo-600 ring-4 ring-indigo-50'
                                            : 'bg-white text-slate-400 border-2 border-slate-200'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                ) : (
                                    index + 1
                                )}
                            </div>

                            {/* Label */}
                            <span 
                                className={`text-[11px] mt-2 font-semibold uppercase tracking-wider transition-colors text-center
                                    ${isCompleted
                                        ? isCurrent
                                            ? 'text-emerald-700 font-bold'
                                            : 'text-emerald-700'
                                        : isCurrent
                                            ? 'text-indigo-600 font-bold'
                                            : 'text-slate-400'
                                    }
                                `}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
