import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Plus, Folder, History, Settings, ShieldCheck } from 'lucide-react';

export default function Layout() {
    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <aside className="w-[260px] bg-[#0F172A] text-slate-300 flex flex-col items-start py-6 px-4 shrink-0 flex-col">
                <div className="flex items-center gap-3 mb-10 px-3 w-full text-white">
                    <ShieldCheck className="w-6 h-6 text-indigo-500 fill-indigo-500/20" />
                    <h1 className="text-lg font-semibold tracking-tight">Project Guardian</h1>
                </div>
                
                <nav className="w-full flex flex-col gap-1.5 flex-1">
                    <NavLink to="/dashboard" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </NavLink>
                    <NavLink to="/new" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                        <Plus className="w-4 h-4" />
                        New Analysis
                    </NavLink>
                    <NavLink to="/projects" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                        <Folder className="w-4 h-4" />
                        Projects
                    </NavLink>
                    <NavLink to="/history" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                        <History className="w-4 h-4" />
                        History
                    </NavLink>
                    <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800/50 hover:text-white'}`}>
                        <Settings className="w-4 h-4" />
                        Settings
                    </NavLink>
                </nav>

                <div className="w-full bg-slate-800/40 rounded-xl p-4 mt-auto border border-slate-700/50">
                    <h4 className="text-sm font-semibold text-white mb-1">Pro Plan</h4>
                    <p className="text-xs text-slate-400 mb-3">Unlimited analyses</p>
                    <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                        Upgrade
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
