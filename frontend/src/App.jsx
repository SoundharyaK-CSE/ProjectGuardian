import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import NewAnalysis from './components/NewAnalysis';
import ProjectOverview from './components/ProjectOverview';
import ProjectScanning from './components/ProjectScanning';
import ProjectOverviewPlaceholder from './components/ProjectOverviewPlaceholder';
import RequirementAnalysis from './components/RequirementAnalysis';
import ImpactAnalysis from './components/ImpactAnalysis';
import ImplementationPlan from './components/ImplementationPlan';
import DeveloperDecision from './components/DeveloperDecision';
import AIUpdateMode from './components/AIUpdateMode';
import DiffReview from './components/DiffReview';
import Validation from './components/Validation';
import FinalResult from './components/FinalResult';
import Report from './components/Report';
import AnalysisViewPlaceholder from './components/AnalysisViewPlaceholder';
import Landing from './components/Landing';
import GuideMe from './components/GuideMe';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new" element={<NewAnalysis />} />
        <Route path="/analysis/:id/scan" element={<ProjectScanning />} />
        <Route path="/analysis/:id/overview" element={<ProjectOverview />} />
        <Route path="/analysis/:id/requirement-analysis" element={<RequirementAnalysis />} />
        <Route path="/analysis/:id/impact" element={<ImpactAnalysis />} />
        <Route path="/analysis/:id/plan" element={<ImplementationPlan />} />
        <Route path="/analysis/:id/decision" element={<DeveloperDecision />} />
        <Route path="/analysis/:id/ai-update" element={<AIUpdateMode />} />
        <Route path="/analysis/:id/diff" element={<DiffReview />} />
        <Route path="/analysis/:id/review" element={<DiffReview />} />
        <Route path="/analysis/:id/validation" element={<Validation />} />
        <Route path="/analysis/:id/result" element={<FinalResult />} />
        <Route path="/analysis/:id/report" element={<Report />} />
        <Route path="/analysis/:id/guide-me" element={<GuideMe />} />
        {/* Temporarily redirect analysis/:id to scan if it hits base */}
        <Route path="/analysis/:id" element={<ProjectScanning />} />
      </Route>
    </Routes>
  );
}

export default App;
