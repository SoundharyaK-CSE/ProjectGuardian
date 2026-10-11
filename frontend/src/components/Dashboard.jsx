import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardStats, getDashboardAnalyses, getDashboardProjects } from '../services/api';
import { 
    Plus, Search, User, Folder, Activity, CheckCircle, AlertTriangle, 
    RefreshCw, Box, ArrowRight, ShieldAlert, CheckCircle2, ShieldCheck,
    Clock, Cpu
} from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [analyses, setAnalyses] = useState(null);
    const [projects, setProjects] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [statsData, analysesData, projectsData] = await Promise.all([
                getDashboardStats(),
                getDashboardAnalyses(),
                getDashboardProjects()
            ]);
            setStats(statsData);
            setAnalyses(analysesData);
            setProjects(projectsData);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            setError('Unable to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatTime = (dateString) => {
        if (!dateString) return 'Unknown time';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
            return `${Math.floor(diffInSeconds / 86400)} days ago`;
        } catch (e) {
            return 'Unknown time';
        }
    };

    const extractTechStack = (scanData) => {
        if (!scanData || !scanData.allFiles) return 'Unknown Stack';
        const tech = [];
        const files = scanData.allFiles.map(f => f.toLowerCase());
        if (files.some(f => f.includes('package.json'))) tech.push('Node.js');
        if (files.some(f => f.includes('.jsx') || f.includes('.tsx'))) tech.push('React');
        if (files.some(f => f.includes('.py'))) tech.push('Python');
        if (files.some(f => f.includes('pom.xml') || f.includes('.java'))) tech.push('Java');
        if (files.some(f => f.includes('go.mod'))) tech.push('Go');
        if (scanData.models?.some(m => m.toLowerCase().includes('pg') || m.toLowerCase().includes('postgres'))) tech.push('PostgreSQL');
        if (scanData.models?.some(m => m.toLowerCase().includes('mongo'))) tech.push('MongoDB');
        
        if (tech.length === 0) return 'Custom Stack';
        return tech.join(' • ');
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col p-8 bg-white">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-6 py-1">
                        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-6">
                                <div className="h-48 bg-slate-200 rounded-xl col-span-5"></div>
                                <div className="h-48 bg-slate-200 rounded-xl col-span-7"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button 
                    onClick={loadData}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="h-full bg-white flex flex-col">
            {/* Top Header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="w-1/3"></div>
                <div className="flex items-center gap-6 w-2/3 justify-end">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200">
                            <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Developer</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto space-y-10">
                    
                    {/* Welcome Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                            Good morning, Developer! <span className="text-2xl">👋</span>
                        </h1>
                        <p className="text-sm text-slate-500">
                            Manage your projects and requirement changes.
                        </p>
                    </div>

                    {/* Top Row: Start Analysis & Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Start New Analysis Card */}
                        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <Box className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 mb-1">Start New Analysis</h2>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Upload a repository and analyze a new requirement.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate('/new')}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                New Analysis
                            </button>
                        </div>

                        {/* Statistics Grid */}
                        <div className="lg:col-span-7 grid grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                                    <Folder className="w-6 h-6 fill-blue-600/20" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 mb-0.5">{stats?.totalProjects || 0}</p>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Projects</p>
                            </div>
                            
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
                                    <Activity className="w-6 h-6 fill-rose-500/20" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 mb-0.5">{stats?.total || 0}</p>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Analyses</p>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                                    <CheckCircle className="w-6 h-6 fill-emerald-600/20" />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 mb-0.5">{stats?.completed || 0}</p>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Projects */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900">Recent Projects</h3>
                            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</button>
                        </div>
                        
                        {!projects || projects.length === 0 ? (
                            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center">
                                <Folder className="w-8 h-8 text-slate-400 mb-3" />
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">No projects yet</h4>
                                <p className="text-xs text-slate-500 mb-4">You haven't analyzed any projects.</p>
                                <button onClick={() => navigate('/new')} className="text-sm font-medium text-indigo-600 hover:underline">Start New Analysis</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {projects.map((proj) => (
                                    <div key={proj.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <Box className="w-5 h-5 fill-blue-600/20" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-slate-900 truncate mb-1">
                                                    {proj.project_name || 'Unnamed Project'}
                                                </h4>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {extractTechStack(proj.scan_data)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium mb-4 mt-auto">
                                            Last analyzed: {formatTime(proj.updated_at)}
                                        </p>
                                        <button 
                                            onClick={() => navigate(`/analysis/${proj.id}`)}
                                            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center group w-max"
                                        >
                                            Open <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Recent Analyses */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900">Recent Analyses</h3>
                            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</button>
                        </div>
                        
                        {!analyses || analyses.length === 0 ? (
                            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center">
                                <Activity className="w-8 h-8 text-slate-400 mb-3" />
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">No analyses yet</h4>
                                <p className="text-xs text-slate-500 mb-4">Run an analysis to see history here.</p>
                                <button onClick={() => navigate('/new')} className="text-sm font-medium text-indigo-600 hover:underline">Start New Analysis</button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {analyses.map((analysis) => {
                                    const isComplete = analysis.status === 'COMPLETED';
                                    const isFailed = analysis.status === 'FAILED';
                                    
                                    return (
                                        <div key={analysis.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <Cpu className="w-5 h-5 fill-indigo-600/20" />
                                                </div>
                                                <div className="min-w-0 pr-4">
                                                    <h4 className="text-sm font-bold text-slate-900 truncate mb-0.5">
                                                        {analysis.project_name || 'Unnamed Project'}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 truncate max-w-md">
                                                        {analysis.requirement_prompt || analysis.identifier}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-6 shrink-0">
                                                <div className="flex items-center gap-3">
                                                    {/* Mocking High Risk logic based on status for visual fidelity to reference */}
                                                    {isFailed && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-600 text-[10px] font-bold tracking-wide uppercase">
                                                            High Risk
                                                        </span>
                                                    )}
                                                    {isComplete ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold tracking-wide uppercase">
                                                            Validation Complete
                                                        </span>
                                                    ) : isFailed ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-600 text-[10px] font-bold tracking-wide uppercase">
                                                            Failed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] font-bold tracking-wide uppercase">
                                                            In Progress
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <span className="text-[11px] font-medium text-slate-400 w-24 text-right">
                                                    {formatTime(analysis.updated_at)}
                                                </span>
                                                
                                                <button 
                                                    onClick={() => navigate(`/analysis/${analysis.id}`)}
                                                    className="text-sm font-bold text-slate-400 hover:text-indigo-600 flex items-center group transition-colors"
                                                >
                                                    View <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
