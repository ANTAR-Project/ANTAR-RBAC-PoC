import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { createUser } from '../api/services';

export default function AddUserModal({ isOpen, onClose, onUserCreated, showToast }) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('USER');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showToast('Please enter both username and an initial temporary password.', 'error');
      return;
    }

    setLoading(true);
    try {
      await createUser(username.trim(), role, password);
      showToast(`User ${username} provisioned successfully.`, 'success');
      setUsername('');
      setPassword('');
      setRole('USER');
      onUserCreated();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to create user.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '440px', margin: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
      >
        <div className="card-header">
          <div className="card-title">
            <UserPlus size={18} color="#6366f1" />
            <span>Provision New User</span>
          </div>
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-username">Username</label>
            <input
              id="new-username"
              type="text"
              className="form-input"
              placeholder="e.g. operator1 or sarah"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-role">Role Assignment</label>
            <select
              id="new-role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="USER">USER (Standard Member)</option>
              <option value="GUEST">GUEST (Restricted Access)</option>
              <option value="ADMIN">ADMIN (Full Superuser Privileges)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-password">Initial Passkey / Password</label>
            <input
              id="new-password"
              type="password"
              className="form-input"
              placeholder="Temporary password (must change upon first login)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Provisioning...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
