// Note: We use the existing foundation verification form here for testing.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAnalysis, uploadProject, scanProject } from '../services/api';

export default function NewAnalysisPlaceholder() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [status, setStatus] = useState('');

    const handleCreate = async () => {
        try {
            if (!projectName || !file) {
                setStatus('Please provide a project name and a ZIP file.');
                return;
            }
            setStatus('Creating analysis...');
            const created = await createAnalysis({ projectName, existingRequirement: '', newRequirement: '' });
            
            setStatus('Uploading ZIP...');
            await uploadProject(created.id, file);

            setStatus('Scanning project...');
            await scanProject(created.id);

            setStatus('Done! Redirecting...');
            setTimeout(() => navigate('/'), 1500);
        } catch (err) {
            console.error(err);
            setStatus(`Error: ${err.message || 'Something went wrong'}`);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Start New Analysis</h1>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                    <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        placeholder="e.g. MyAwesomeApp"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project ZIP File</label>
                    <input 
                        type="file" 
                        accept=".zip"
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        onChange={e => setFile(e.target.files[0])}
                    />
                </div>
                {status && <div className="text-sm font-medium text-indigo-600 bg-indigo-50 p-3 rounded">{status}</div>}
                <button 
                    onClick={handleCreate}
                    className="w-full bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors"
                >
                    Create & Scan
                </button>
            </div>
        </div>
    );
}
