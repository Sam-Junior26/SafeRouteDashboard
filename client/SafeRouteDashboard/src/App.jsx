import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/Layout';
import { Loading } from './components/UI';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import SafetyMapPage from './pages/SafetyMapPage';
import SOSAlertsPage from './pages/SOSAlertsPage';
import CampusLocationsPage from './pages/CampusLocationsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function Guard({ children }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Checking secure session..."/>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
  if (!profile || profile.role !== 'administrator' || profile.account_status !== 'active') return <Navigate to="/login" replace state={{ denied: true }}/>;
  return children;
}
function LoginGuard() { const { session, profile, loading } = useAuth(); if (loading) return <Loading/>; return session && profile?.role === 'administrator' && profile?.account_status === 'active' ? <Navigate to="/dashboard" replace/> : <LoginPage/>; }
function RouteTree() {
  return <Routes>
    <Route path="/login" element={<LoginGuard/>}/>
    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
    <Route element={<Guard><DashboardLayout/></Guard>}>
      <Route path="/dashboard" element={<DashboardPage/>}/>
      <Route path="/incidents" element={<IncidentsPage/>}/>
      <Route path="/incidents/:id" element={<IncidentDetailPage/>}/>
      <Route path="/map" element={<SafetyMapPage/>}/>
      <Route path="/sos-alerts" element={<SOSAlertsPage/>}/>
      <Route path="/campus-locations" element={<CampusLocationsPage/>}/>
      <Route path="/reports" element={<ReportsPage/>}/>
      <Route path="/settings" element={<SettingsPage/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
  </Routes>;
}
export default function App() { return <AuthProvider><RouteTree/></AuthProvider>; }