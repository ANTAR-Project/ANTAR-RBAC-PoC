import React, { useState, useEffect } from 'react';
import { UserPlus, Fingerprint, Shield, KeyRound, Trash2, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { fetchUsers, deleteUser } from '../api/services';
import AddUserModal from './AddUserModal';
import UserDrawer from './UserDrawer';

export default function UsersTab({ session, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      showToast(err.message || 'Failed to load user directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async (e, username) => {
    e.stopPropagation();
    if (username === 'admin') {
      showToast('Cannot delete root administrator account.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${username}"?`)) {
      return;
    }

    try {
      await deleteUser(username);
      showToast(`User ${username} deleted.`, 'success');
      loadUsers();
      if (selectedUser?.username === username) {
        setSelectedUser(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete user.', 'error');
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Identity & Access Management Directory</h2>
          <p>Manage users, credentials, and click any user to configure microservice permissions</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {session.role === 'ADMIN' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsAddModalOpen(true)}
            >
              <UserPlus size={14} />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Password State</th>
                <th>Biometric Hardware Enclave</th>
                <th style={{ textAlign: 'right' }}>Microservices Access</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id || u.username}
                    className="clickable"
                    onClick={() => setSelectedUser(u)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#a5b4fc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px'
                        }}>
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ display: 'block' }}>{u.username}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {u.role === 'ADMIN' ? 'Primary Admin' : 'Mesh Member'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`user-role-badge ${u.role?.toLowerCase()}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.mustChangePassword ? (
                        <span className="badge badge-warning">
                          <KeyRound size={12} />
                          Temporary Passkey
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          <Shield size={12} />
                          Active
                        </span>
                      )}
                    </td>
                    <td>
                      {u.hasBiometrics ? (
                        <span className="badge badge-success">
                          <Fingerprint size={12} />
                          Enrolled (Touch/Face)
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <Fingerprint size={12} />
                          Not Enrolled
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                          }}
                        >
                          <SlidersHorizontal size={13} />
                          <span>Configure Grants</span>
                        </button>
                        {session.role === 'ADMIN' && u.username !== 'admin' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={(e) => handleDeleteUser(e, u.username)}
                            title="Delete User"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over / Bottom-sheet Drawer */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          showToast={showToast}
        />
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUserCreated={loadUsers}
        showToast={showToast}
      />
    </div>
  );
}
