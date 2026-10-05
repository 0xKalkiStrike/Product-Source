import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { LanguageProvider } from './context/LanguageContext';
import { MainLayout } from './components/layout/MainLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { SystemHealth } from './pages/SystemHealth';
import { ProductsPage } from './pages/Products';
import { SourcesPage } from './pages/Sources';
import { SourceDataPage } from './pages/SourceData';
import { CredentialsPage } from './pages/Credentials';
import { JobsPage } from './pages/Jobs';
import { WorkersPage } from './pages/Workers';

import { VerificationPage } from './pages/Verification';
import { MarketIntelligencePage, PriceComparisonPage } from './pages/MarketIntelligence';
import { MonitoringPage } from './pages/Monitoring';
import { AuditLogsPage } from './pages/AuditLogs';
import { EvidencePage } from './pages/EvidencePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

import './styles/index.css';
import './styles/layout.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading MarketLens Engine...
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <ProjectProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="sources" element={<SourcesPage />} />
                <Route path="source-data" element={<SourceDataPage />} />
                <Route path="credentials" element={<CredentialsPage />} />
                <Route path="verification" element={<VerificationPage />} />
                <Route path="monitoring" element={<MonitoringPage />} />
                <Route path="market-intelligence" element={<MarketIntelligencePage />} />
                <Route path="price-comparison" element={<PriceComparisonPage />} />
                <Route path="jobs" element={<JobsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="evidence" element={<EvidencePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="workers" element={<WorkersPage />} />
                <Route path="health" element={<SystemHealth />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ProjectProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
