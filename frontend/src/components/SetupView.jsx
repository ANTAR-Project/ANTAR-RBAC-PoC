import React, { useState } from 'react';
import { KeyRound, Fingerprint, CheckCircle2, ArrowRight } from 'lucide-react';
import { changePassword } from '../api/services';
import { registerBiometrics } from '../api/webauthn';

export default function SetupView({ session, initialPassword, onSetupComplete, showToast }) {
  const [step, setStep] = useState(1); // 1 = Password Change, 2 = Biometric Enrollment
  const [oldPassword, setOldPassword] = useState(initialPassword || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      showToast('Please enter a new password.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await changePassword(session.username, oldPassword, newPassword);
      showToast('Password updated! Next: Register your device biometric token.', 'success');
      
      // Update session token with updated credentials
      session.token = data.token;
      setStep(2);
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricEnroll = async () => {
    setLoading(true);
    try {
      showToast('Awaiting device biometric prompt... Touch your fingerprint / sensor.', 'info');
      await registerBiometrics(session.username);
      showToast('Biometric passkey successfully enrolled in hardware secure enclave!', 'success');
      
      setTimeout(() => {
        onSetupComplete(session);
      }, 1000);
    } catch (err) {
      showToast(err.message || 'Biometric enrollment failed. You can retry or continue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div className="auth-brand-logo" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            {step === 1 ? <KeyRound size={28} /> : <Fingerprint size={28} />}
          </div>
          <h1 className="auth-title">Mandatory Security Setup</h1>
          <p className="auth-subtitle">
            Account: <strong style={{ color: '#f8fafc' }}>{session.username}</strong>
            {' · '}Step {step} of 2
          </p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <div style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: '#10b981'
          }} />
          <div style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: step === 2 ? '#10b981' : 'var(--border-subtle)'
          }} />
        </div>

        {step === 1 ? (
          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '18px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>
              Your account currently has the default out-of-the-box passkey. Set your secure private password to proceed.
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="old-pass">Current / Default Passkey</label>
              <input
                id="old-pass"
                type="password"
                className="form-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-pass">New Private Password</label>
              <input
                id="new-pass"
                type="password"
                className="form-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-pass">Confirm New Password</label>
              <input
                id="confirm-pass"
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
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Save Password & Proceed to Biometrics'}
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <div>
            <div style={{ marginBottom: '20px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
              Register this physical device's biometric sensor (Touch ID, Face ID, or Windows Hello) to enable hardware-backed biometric step-up authentication.
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                Password changed successfully. Complete setup by enrolling your biometric sensor.
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', minHeight: '44px' }}
              onClick={handleBiometricEnroll}
              disabled={loading}
            >
              <Fingerprint size={20} />
              {loading ? 'Awaiting Fingerprint / Face ID...' : 'Enroll Biometrics Now'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '10px' }}
              onClick={() => onSetupComplete(session)}
            >
              Skip for Now & Open Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
