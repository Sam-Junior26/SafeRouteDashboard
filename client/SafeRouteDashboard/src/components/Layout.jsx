import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, Building2, ChartNoAxesCombined, ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Map, Menu, Settings, Shield, Siren, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/incidents', label: 'Incidents', icon: Shield },
  { to: '/map', label: 'Safety Map', icon: Map },
  { to: '/sos-alerts', label: 'SOS Alerts', icon: Siren },
  { to: '/safe-zones', label: 'Safe Zones', icon: Building2 },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
  { to: '/settings', label: 'Settings', icon: Settings }
];
const titles = { '/dashboard': 'Overview', '/incidents': 'Incident Management', '/map': 'Safety Map', '/sos-alerts': 'SOS Monitoring', '/campus-locations': 'Campus Locations', '/reports': 'Reports & Analytics', '/settings': 'Settings' };
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation(); const navigate = useNavigate();
  const title = location.pathname.startsWith('/incidents/') ? 'Incident Details' : (titles[location.pathname] || 'SafeRoute');
  async function logout() { await signOut(); navigate('/login'); }

  return (
    <div
      className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}
    >
      {drawer && (
        <button
          className="drawer-shade"
          onClick={() => setDrawer(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`sidebar ${drawer ? 'drawer-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">
            <Shield size={22} />
          </span>

          {!collapsed && (
            <span>
              <b>SafeRoute</b>
              <small>ADMIN CONSOLE</small>
            </span>
          )}

          <button
            className="mobile-close"
            onClick={() => setDrawer(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-label">
          {!collapsed && 'WORKSPACE'}
        </div>

        <nav>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setDrawer(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={19} />

              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-avatar">
            {(profile?.full_name || 'A')
              .slice(0, 1)
              .toUpperCase()}
          </div>

          {!collapsed && (
            <div className="admin-details">
              <b>{profile?.full_name || 'Administrator'}</b>
              <small>Administrator</small>
            </div>
          )}

          <button
            className="logout-icon"
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>

        <button
          className="collapse-button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight size={17} />
          ) : (
            <>
              <ChevronLeft size={17} />
              <span>Collapse menu</span>
            </>
          )}
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setDrawer(true)}
          >
            <Menu size={21} />
          </button>

          <div className="breadcrumbs">
            <span>SafeRoute</span>
            <span>/</span>
            <b>{title}</b>
          </div>

          <div className="topbar-right">
            <span className="system-status">
              <i />
              System online
            </span>

            <div className="top-avatar">
              {(profile?.full_name || 'A')
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div className="top-user">
              <b>{profile?.full_name || 'Administrator'}</b>
              <small>Admin</small>
            </div>

            <button
              className="icon-button"
              title="Sign out"
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>

        <footer className="footer">
          <span>SafeRoute Admin</span>
          <span>Student safety operations</span>
        </footer>
      </main>
    </div>
  );
}