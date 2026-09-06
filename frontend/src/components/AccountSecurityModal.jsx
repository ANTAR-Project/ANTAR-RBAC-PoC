import React, { useState } from 'react';
import { X, Fingerprint, KeyRound, CheckCircle2, Shield } from 'lucide-react';
import { changePassword } from '../api/services';
import { registerBiometrics } from '../api/webauthn';

export default function AccountSecurityModal({
  isOpen,
  onClose,
  session,
  onPasswordUpdated,
  onBiometricUpdated,
  showToast,
  initialTab = 'fingerprint'
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'fingerprint' | 'password'
  
  // Fingerprint state
  const [bioLoading, setBioLoading] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  if (!isOpen) return null;

  const handleEnrollBiometrics = async () => {
    setBioLoading(true);
    setBioSuccess(false);
    try {
      showToast('Awaiting fingerprint/sensor interaction... Place your finger on the sensor.', 'info');
      await registerBiometrics(session.username);
      setBioSuccess(true);
      showToast(`Biometric sensor registered for ${session.username}!`, 'success');
      if (onBiometricUpdated) onBiometricUpdated();
    } catch (err) {
      showToast(err.message || 'Biometric enrollment was cancelled or failed.', 'error');
    } finally {
      setBioLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('Please enter your current password.', 'error');
      return;
    }
    if (!newPassword) {
      showToast('Please enter a new password.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setPwLoading(true);
    try {
      const data = await changePassword(session.username, oldPassword, newPassword);
      showToast('Password successfully updated!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onPasswordUpdated) onPasswordUpdated(data.token);
    } catch (err) {
      showToast(err.message || 'Failed to update password. Verify current password.', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '480px', margin: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
      >
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <div className="card-title">
            <Shield size={20} color="#6366f1" />
            <span>Account Security & Credentials</span>
          </div>
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* User identification chip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(8, 12, 20, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 14px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Logged in as: <strong style={{ color: '#f8fafc' }}>{session.username}</strong>
          </div>
          <span className={`user-role-badge ${session.role?.toLowerCase()}`}>
            {session.role}
          </span>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'fingerprint' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setActiveTab('fingerprint')}
          >
            <Fingerprint size={15} />
            <span>Fingerprint / Biometrics</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'password' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setActiveTab('password')}
          >
            <KeyRound size={15} />
            <span>Change Password</span>
          </button>
        </div>

        {/* TAB 1: Fingerprint */}
        {activeTab === 'fingerprint' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'rgba(8, 12, 20, 0.4)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#94a3b8',
              lineHeight: '1.5'
            }}>
              If you did not register your fingerprint during the first setup step, or want to add a new fingerprint / sensor on this device, you can register it now.
            </div>

            {bioSuccess ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <CheckCircle2 size={22} color="#10b981" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
                  <strong>Fingerprint Registered!</strong><br />
                  Your biometric token has been cryptographically registered for <strong>{session.username}</strong>.
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Fingerprint size={20} color="#818cf8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  Touch ID, Face ID, Android Biometrics, or Windows Hello.
                </span>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', minHeight: '44px', marginTop: '4px' }}
              onClick={handleEnrollBiometrics}
              disabled={bioLoading}
            >
              <Fingerprint size={18} />
              {bioLoading ? 'Touch Sensor Now...' : bioSuccess ? 'Add Another Finger' : 'Register / Add Fingerprint'}
            </button>
          </div>
        )}

        {/* TAB 2: Change Password */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="sec-old-pass">Current Password</label>
              <input
                id="sec-old-pass"
                type="password"
                className="form-input"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="sec-new-pass">New Password</label>
              <input
                id="sec-new-pass"
                type="password"
                className="form-input"
                placeholder="Enter new password (any length)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="sec-confirm-pass">Confirm New Password</label>
              <input
                id="sec-confirm-pass"
                type="password"
                className="form-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', minHeight: '42px', marginTop: '6px' }}
              disabled={pwLoading}
            >
              <KeyRound size={16} />
              {pwLoading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
