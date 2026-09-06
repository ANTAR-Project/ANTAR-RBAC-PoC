import React, { useState, useEffect } from 'react';
import { getSession, setSession } from './api/client';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import LoginView from './components/LoginView';
import SetupView from './components/SetupView';
import ElementsTab from './components/ElementsTab';
import UsersTab from './components/UsersTab';
import PoliciesTab from './components/PoliciesTab';
import AccountSecurityModal from './components/AccountSecurityModal';

export default function App() {
  const [session, setSessionState] = useState(getSession());
  const [activeTab, setActiveTab] = useState('elements');
  const [setupMode, setSetupMode] = useState(null); // { session, initialPassword } if setup needed
  const [securityModalTab, setSecurityModalTab] = useState(null); // null | 'fingerprint' | 'password'
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const isAdmin = session?.role === 'ADMIN';

  useEffect(() => {
    if (session && !isAdmin && activeTab === 'users') {
      setActiveTab('elements');
    }
  }, [session, isAdmin, activeTab]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleLoginSuccess = (newSession) => {
    setSession(newSession);
    setSessionState(newSession);
    setSetupMode(null);
  };

  const handleRequireSetup = (tempSession, initialPassword) => {
    setSetupMode({ session: tempSession, initialPassword });
  };

  const handleSetupComplete = (finalSession) => {
    setSession(finalSession);
    setSessionState(finalSession);
    setSetupMode(null);
    showToast('Setup completed! Portal unlocked.', 'success');
  };

  const handleLogout = () => {
    setSession(null);
    setSessionState(null);
    setSetupMode(null);
    setSecurityModalTab(null);
    showToast('Signed out of ANTAR portal.', 'info');
  };

  const handlePasswordUpdated = (newToken) => {
    if (session) {
      const updated = { ...session, token: newToken || session.token };
      setSession(updated);
      setSessionState(updated);
    }
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onLogout={handleLogout}
        onOpenSecurity={(tab) => setSecurityModalTab(tab || 'fingerprint')}
      />

      <main className="main-content">
        {!session && !setupMode ? (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            onRequireSetup={handleRequireSetup}
            showToast={showToast}
          />
        ) : setupMode ? (
          <SetupView
            session={setupMode.session}
            initialPassword={setupMode.initialPassword}
            onSetupComplete={handleSetupComplete}
            showToast={showToast}
          />
        ) : (
          <>
            {activeTab === 'elements' && (
              <ElementsTab session={session} showToast={showToast} />
            )}
            {activeTab === 'users' && isAdmin && (
              <UsersTab session={session} showToast={showToast} />
            )}
            {activeTab === 'policies' && (
              <PoliciesTab session={session} showToast={showToast} />
            )}
          </>
        )}
      </main>

      <AccountSecurityModal
        isOpen={!!securityModalTab}
        initialTab={securityModalTab || 'fingerprint'}
        onClose={() => setSecurityModalTab(null)}
        session={session}
        onPasswordUpdated={handlePasswordUpdated}
        showToast={showToast}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
