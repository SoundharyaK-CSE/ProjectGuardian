import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAnalysis } from '../services/api';
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';

export default function AnalysisViewPlaceholder() {
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

    if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin text-indigo-500" /></div>;
    if (error) return <div className="p-8 text-red-500"><AlertTriangle className="inline mr-2" /> Error: {error}</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-indigo-600 mb-6 hover:underline">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold mb-2">{analysis.project_name}</h1>
            <div className="flex gap-2 mb-8">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200">ID: {analysis.id}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold border border-blue-200">Status: {analysis.status}</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold border border-purple-200">Step: {analysis.workflow_step}</span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Scan Data Overview</h2>
                {analysis.scan_data ? (
                    <pre className="bg-slate-900 text-green-400 p-4 rounded overflow-auto max-h-96 text-sm">
                        {JSON.stringify(analysis.scan_data, null, 2)}
                    </pre>
                ) : (
                    <p className="text-slate-500">No scan data available.</p>
                )}
            </div>
        </div>
    );
}
