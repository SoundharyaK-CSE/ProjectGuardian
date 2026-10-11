import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Code2, Map, CheckCircle2, ChevronRight, LayoutTemplate, Box, FileCode, Layers } from 'lucide-react';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col relative overflow-hidden">
            {/* Background glowing effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/40 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-200/30 blur-[120px] pointer-events-none" />
            
            {/* Navigation */}
            <nav className="relative z-10 px-8 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                    <span className="font-bold text-lg text-slate-900 tracking-tight">Project Guardian</span>
                </div>
                
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <Link to="/" className="text-indigo-600 font-bold">Home</Link>
                    <Link to="/" className="hover:text-slate-900 transition-colors">Features</Link>
                    <Link to="/" className="hover:text-slate-900 transition-colors">Pricing</Link>
                    <Link to="/" className="hover:text-slate-900 transition-colors">Docs</Link>
                </div>
                
                <div>
                    <Link to="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section & Features */}
            <main className="relative z-10 flex-1 flex flex-col justify-between max-w-7xl mx-auto w-full px-6 sm:px-8 pt-6 sm:pt-10 pb-12 sm:pb-16 gap-12 sm:gap-16">
                {/* 2-Column Responsive Hero Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full my-auto">
                    
                    {/* Hero Text */}
                    <div className="flex flex-col items-start text-left max-w-2xl">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                            Project Guardian
                        </h1>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-600 mb-6">
                            Understand. Analyze. Change. Validate.
                        </h2>
                        <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 max-w-lg leading-relaxed">
                            AI-powered software change analysis for existing projects.
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4">
                            <button 
                                onClick={() => navigate('/new')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                            >
                                Start New Analysis
                            </button>
                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="bg-white hover:bg-slate-50 text-indigo-600 border-2 border-indigo-100 hover:border-indigo-200 px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                            >
                                View Projects
                            </button>
                        </div>
                    </div>

                    {/* Hero Visual - Code Illustration (relative, contained) */}
                    <div className="relative w-full min-h-[300px] sm:min-h-[340px] flex items-center justify-center lg:justify-end">
                        <div className="relative w-full max-w-md h-full flex items-center justify-center py-6">
                            {/* Main editor window */}
                            <div className="relative z-20 w-[300px] sm:w-[340px] h-[220px] sm:h-[240px] bg-[#0F172A] rounded-xl shadow-2xl border border-slate-700 overflow-hidden transform -rotate-y-12 rotate-x-12 translate-z-0 translate-y-2 translate-x-2">
                                <div className="h-8 bg-slate-800/80 border-b border-slate-700 flex items-center px-3 gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                                </div>
                                <div className="p-4 space-y-2.5">
                                    <div className="w-3/4 h-3 rounded bg-indigo-500/20" />
                                    <div className="w-1/2 h-3 rounded bg-slate-700" />
                                    <div className="w-5/6 h-3 rounded bg-slate-700" />
                                    <div className="w-2/3 h-3 rounded bg-indigo-400/30 ml-4" />
                                    <div className="w-1/2 h-3 rounded bg-indigo-400/30 ml-4" />
                                    <div className="w-1/3 h-3 rounded bg-slate-700" />
                                </div>
                            </div>
                            
                            {/* Floating analytical badges */}
                            <div className="absolute z-30 top-4 -left-2 sm:-left-4 bg-white p-2.5 sm:p-3 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 transform -rotate-6 animate-bounce" style={{ animationDuration: '4s' }}>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <FileCode className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="absolute z-10 bottom-8 -right-2 sm:-right-4 bg-white p-2.5 sm:p-3 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 transform rotate-6 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="absolute z-30 -bottom-2 left-6 sm:left-10 bg-white p-2.5 sm:p-3 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 transform rotate-3 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }}>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                    <Layers className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="absolute z-10 -top-2 right-6 sm:right-10 bg-white p-2.5 sm:p-3 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 transform -rotate-12 animate-bounce" style={{ animationDuration: '6s', animationDelay: '0.2s' }}>
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Box className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Feature Cards in Normal Document Flow */}
                <div className="w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Analyze */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                    <Code2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Analyze</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Understand how a requirement affects your existing project.
                            </p>
                        </div>
                        
                        {/* Guide */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                    <Map className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Guide</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Get AI-guided code changes with developer control.
                            </p>
                        </div>

                        {/* Validate */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Validate</h3>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Verify the updated project before delivery.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
