import React, { useState, useEffect } from 'react';
import { X, Shield, Cpu, HardDrive, Video } from 'lucide-react';
import {
  fetchMicroservices,
  fetchUserPermissions,
  grantPermission,
  revokePermission
} from '../api/services';

export default function UserDrawer({ user, onClose, showToast }) {
  const [services, setServices] = useState([]);
  const [grantedKeys, setGrantedKeys] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [mutatingKey, setMutatingKey] = useState(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [servicesData, permsData] = await Promise.all([
          fetchMicroservices(),
          fetchUserPermissions(user.username)
        ]);

        if (isMounted) {
          setServices(servicesData);
          const granted = new Set((permsData || []).map((p) => p.serviceKey));
          setGrantedKeys(granted);
        }
      } catch (err) {
        showToast('Failed to load user permissions.', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [user]);

  if (!user) return null;

  const handleToggle = async (serviceKey) => {
    setMutatingKey(serviceKey);
    const isGranted = grantedKeys.has(serviceKey);

    try {
      if (isGranted) {
        await revokePermission(user.username, serviceKey);
        setGrantedKeys((prev) => {
          const next = new Set(prev);
          next.delete(serviceKey);
          return next;
        });
        showToast(`Revoked ${serviceKey} for ${user.username}`, 'info');
      } else {
        await grantPermission(user.username, serviceKey);
        setGrantedKeys((prev) => {
          const next = new Set(prev);
          next.add(serviceKey);
          return next;
        });
        showToast(`Granted ${serviceKey} to ${user.username}`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Permission update failed', 'error');
    } finally {
      setMutatingKey(null);
    }
  };

  const getServiceIcon = (category) => {
    switch (category) {
      case 'IOT':
      case 'SECURITY':
        return <Cpu size={18} color="#818cf8" />;
      case 'MEDIA':
        return <Video size={18} color="#f472b6" />;
      case 'STORAGE':
        return <HardDrive size={18} color="#34d399" />;
      default:
        return <Shield size={18} color="#94a3b8" />;
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
              Access Control Drawer
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
              {user.username}
            </h3>
          </div>
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={onClose}
            title="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div style={{
            background: 'rgba(8, 12, 20, 0.5)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Shield size={16} color="#6366f1" />
            <span>
              Toggle microservice access grants for this user. Changes take effect on the edge mesh instantly.
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
              Loading permissions...
            </div>
          ) : (
            services.map((svc) => {
              const isGranted = grantedKeys.has(svc.serviceKey);
              const isBusy = mutatingKey === svc.serviceKey;

              return (
                <div key={svc.serviceKey} className="permission-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getServiceIcon(svc.category)}
                    </div>
                    <div className="permission-info">
                      <div className="permission-title">{svc.displayName}</div>
                      <div className="permission-desc">{svc.description}</div>
                      <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        Key: {svc.serviceKey} · {svc.category}
                      </span>
                    </div>
                  </div>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isGranted}
                      disabled={isBusy}
                      onChange={() => handleToggle(svc.serviceKey)}
                    />
                    <span className="slider-toggle"></span>
                  </label>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
