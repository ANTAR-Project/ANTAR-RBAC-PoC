import React, { useState } from 'react';
import { Shield, Fingerprint, Lock, User, ArrowRight } from 'lucide-react';
import { passwordLogin } from '../api/services';
import { loginBiometrics } from '../api/webauthn';

export default function LoginView({ onLoginSuccess, onRequireSetup, showToast }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const cleanUser = username?.trim();
    const cleanPass = password?.trim();

    if (!cleanUser || !cleanPass) {
      showToast('Please enter both username and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await passwordLogin(cleanUser, cleanPass);
      showToast(`Welcome back, ${cleanUser}!`, 'success');
      
      const sessionData = {
        username: cleanUser,
        role: data.role,
        token: data.token
      };

      if (data.mustChangePassword === 'true' || data.mustChangePassword === true) {
        onRequireSetup(sessionData, cleanPass);
      } else {
        onLoginSuccess(sessionData);
      }
    } catch (err) {
      const msg = err.message === 'ACCESS_DENIED' || err.data?.error === 'ACCESS_DENIED'
        ? `Incorrect password for user "${cleanUser}". Please verify and try again.`
        : (err.message || 'Authentication failed. Please check credentials.');
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSubmit = async () => {
    if (!username) {
      showToast('Please enter your username above to locate biometric credentials.', 'info');
      return;
    }

    setBioLoading(true);
    try {
      showToast('Awaiting biometric touch / sensor interaction...', 'info');
      const data = await loginBiometrics(username);
      showToast(`Biometric match verified for ${username}.`, 'success');
      
      onLoginSuccess({
        username,
        role: data.role,
        token: data.token
      });
    } catch (err) {
      showToast(err.message || 'Biometric authentication failed.', 'error');
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand-logo">
            <Shield size={32} />
          </div>
          <h1 className="auth-title">AN|TAR Security Portal</h1>
          <p className="auth-subtitle">Enterprise Zero-Trust Authentication Mesh</p>
        </div>

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="e.g. admin or username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                style={{ paddingLeft: '38px' }}
              />
              <User
                size={16}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingLeft: '38px' }}
              />
              <Lock
                size={16}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading || bioLoading}
          >
            {loading ? 'Authenticating...' : 'Sign In with Password'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="divider">
          <span>Or Fast Pass</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', borderColor: 'rgba(99, 102, 241, 0.4)' }}
          onClick={handleBiometricSubmit}
          disabled={loading || bioLoading}
        >
          <Fingerprint size={18} color="#818cf8" />
          {bioLoading ? 'Scanning Sensor...' : 'Sign In with Biometrics (Touch / Face)'}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
          Initial Admin Passkey:{' '}
          <code
            style={{ color: '#a5b4fc', cursor: 'pointer', textDecoration: 'underline dotted' }}
            title="Click to fill password"
            onClick={() => {
              setPassword('welcome_to_AN|TAR.');
              showToast('Filled default passkey', 'info');
            }}
          >
            welcome_to_AN|TAR.
          </code>
        </div>
      </div>
    </div>
  );
}
