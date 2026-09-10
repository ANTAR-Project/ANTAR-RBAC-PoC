import React from 'react';
import { Shield, Cpu, Users, Sliders, LogOut, KeyRound } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, session, onLogout, onOpenSecurity }) {
  const isAdmin = session?.role === 'ADMIN';

  const tabs = [
    { id: 'elements', label: 'Smart Elements', icon: <Cpu size={16} /> },
    ...(isAdmin ? [{ id: 'users', label: 'User Directory', icon: <Users size={16} /> }] : []),
    { id: 'policies', label: isAdmin ? 'Auth Policies' : 'Auth Policy', icon: <Sliders size={16} /> }
  ];

  return (
    <>
      <header className="navbar">
        <div className="nav-brand" onClick={() => setActiveTab('elements')}>
          <div className="brand-badge">
            <Shield size={16} />
            <span>AN|TAR</span>
          </div>
          <div>
            <span className="brand-title">Enterprise Auth</span>
            <span className="brand-sub">Microservices Mesh</span>
          </div>
        </div>

        {session && (
          <nav className="nav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="nav-actions">
          {session ? (
            <>
              <div
                className="user-chip"
                onClick={() => onOpenSecurity && onOpenSecurity('fingerprint')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Account Security: Click to manage Fingerprint & Password"
              >
                <Shield size={13} color="#818cf8" />
                <span>{session.username}</span>
                <span className={`user-role-badge ${session.role?.toLowerCase()}`}>
                  {session.role}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onLogout}
                title="Sign out"
              >
                <LogOut size={14} />
                <span style={{ display: 'none', sm: 'inline' }}>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="badge badge-info">
              <KeyRound size={12} />
              <span>Authentication Gate</span>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      {session && (
        <nav className="mobile-tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`mobile-tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
