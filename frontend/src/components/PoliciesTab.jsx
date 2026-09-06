import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Cpu,
  Lock,
  HardDrive,
  Video,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Search,
  Filter
} from 'lucide-react';
import {
  fetchPolicies,
  updatePolicy,
  fetchMicroservices,
  fetchUserPermissions
} from '../api/services';

export default function PoliciesTab({ session, showToast }) {
  const isAdmin = session?.role === 'ADMIN';

  const [policies, setPolicies] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [microservices, setMicroservices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [servicesData, policiesData] = await Promise.all([
          fetchMicroservices(),
          fetchPolicies()
        ]);
        setMicroservices(servicesData || []);
        setPolicies(policiesData || []);
      } else {
        const [permsData, servicesData, policiesData] = await Promise.all([
          fetchUserPermissions(session.username),
          fetchMicroservices(),
          fetchPolicies()
        ]);
        setUserPermissions(permsData || []);
        setMicroservices(servicesData || []);
        setPolicies(policiesData || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load policy data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session?.username, isAdmin]);

  const handlePolicyChange = async (serviceKey, action, role, newRequirement) => {
    const mutationKey = `${serviceKey}-${action}-${role}`;
    setMutatingId(mutationKey);
    try {
      await updatePolicy(serviceKey, action, role, newRequirement);
      showToast(`Policy for ${serviceKey} [${action}] (${role}) updated to ${newRequirement}.`, 'success');
      setPolicies((prev) => {
        const exists = prev.some(
          (p) => p.serviceKey === serviceKey && p.action === action && p.role === role
        );
        if (exists) {
          return prev.map((p) =>
            p.serviceKey === serviceKey && p.action === action && p.role === role
              ? { ...p, authRequirement: newRequirement }
              : p
          );
        } else {
          return [
            ...prev,
            { serviceKey, action, role, authRequirement: newRequirement }
          ];
        }
      });
    } catch (err) {
      showToast(err.message || 'Failed to update policy.', 'error');
    } finally {
      setMutatingId(null);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toUpperCase()) {
      case 'IOT':
        return <Cpu size={16} color="#38bdf8" />;
      case 'SECURITY':
        return <Lock size={16} color="#f43f5e" />;
      case 'STORAGE':
        return <HardDrive size={16} color="#a855f7" />;
      case 'MEDIA':
        return <Video size={16} color="#3b82f6" />;
      default:
        return <Shield size={16} color="#818cf8" />;
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category?.toUpperCase()) {
      case 'IOT':
        return 'badge-info';
      case 'SECURITY':
        return 'badge-danger';
      case 'STORAGE':
        return 'badge-warning';
      case 'MEDIA':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  const getRequirementDisplay = (req) => {
    switch (req) {
      case 'NO_AUTH':
        return {
          badgeClass: 'badge-success',
          label: 'NO_AUTH (Zero Auth)',
          desc: 'Open access — executable instantly without re-verification'
        };
      case 'BIOMETRIC_STEP_UP':
        return {
          badgeClass: 'badge-warning',
          label: 'BIOMETRIC_STEP_UP (Touch Required)',
          desc: 'Strict hardware biometric touch or passkey required on execution'
        };
      case 'SESSION':
      default:
        return {
          badgeClass: 'badge-info',
          label: 'SESSION (Standard Token)',
          desc: 'Standard authenticated session token required'
        };
    }
  };

  const getServiceActions = (service, servicePolicies) => {
    const actions = Array.from(new Set(servicePolicies.map((p) => p.action)));
    if (actions.length > 0) return actions;

    switch (service.serviceKey) {
      case 'smart-bulb':
        return ['POWER'];
      case 'smart-fan':
        return ['SPEED'];
      case 'smart-lock':
        return ['UNLOCK'];
      case 'nas-storage':
        return ['DELETE'];
      case 'streaming-svc':
        return ['STREAM'];
      default:
        return ['ACCESS'];
    }
  };

  // ----------------------------------------------------
  // NON-ADMIN VIEW: Only show what this specific user has permissions for
  // ----------------------------------------------------
  if (!isAdmin) {
    const grantedMap = new Map((userPermissions || []).map((p) => [p.serviceKey, p.permissionLevel || 'CONTROL']));
    const userGrantedServices = microservices.filter((s) => grantedMap.has(s.serviceKey));

    const userPolicyRows = [];
    userGrantedServices.forEach((service) => {
      const permLevel = grantedMap.get(service.serviceKey);
      const matchingPolicies = policies.filter(
        (p) => p.serviceKey === service.serviceKey && p.role === session.role
      );

      if (matchingPolicies.length > 0) {
        matchingPolicies.forEach((p) => {
          userPolicyRows.push({
            id: p.id || `${service.serviceKey}-${p.action}`,
            serviceKey: service.serviceKey,
            displayName: service.displayName,
            category: service.category,
            description: service.description,
            permissionLevel: permLevel,
            action: p.action,
            authRequirement: p.authRequirement
          });
        });
      } else {
        userPolicyRows.push({
          id: `${service.serviceKey}-DEFAULT`,
          serviceKey: service.serviceKey,
          displayName: service.displayName,
          category: service.category,
          description: service.description,
          permissionLevel: permLevel,
          action: 'ALL_OPERATIONS',
          authRequirement: 'SESSION'
        });
      }
    });

    return (
      <div>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>My Auth Policy & Granted Permissions</h2>
            <p>
              Microservices specifically granted to your account and their security verification requirements
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Policy</span>
          </button>
        </div>

        {/* User Status Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {session?.username}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Role: <span className={`user-role-badge ${session?.role?.toLowerCase()}`}>{session?.role}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-info" style={{ fontSize: '12px' }}>
              {userPolicyRows.length} Granted Rule{userPolicyRows.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Permissions & Policies Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Granted Microservice</th>
                  <th>Permission Level</th>
                  <th>Permitted Action</th>
                  <th>Enforcement Requirement</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && userPolicyRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                      Loading your authorization policies...
                    </td>
                  </tr>
                ) : userPolicyRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
                      <ShieldAlert size={36} color="#f59e0b" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.8 }} />
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                        No Microservices Granted
                      </div>
                      <p style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto', color: '#94a3b8' }}>
                        Your account has not been assigned permissions to any microservices yet. An administrator can grant you access to IoT devices or services in the User Directory.
                      </p>
                    </td>
                  </tr>
                ) : (
                  userPolicyRows.map((row) => {
                    const reqInfo = getRequirementDisplay(row.authRequirement);
                    return (
                      <tr key={row.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {getCategoryIcon(row.category)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {row.displayName}
                              </div>
                              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#818cf8' }}>
                                {row.serviceKey}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              color: '#a5b4fc',
                              borderColor: 'rgba(99, 102, 241, 0.3)'
                            }}
                          >
                            {row.permissionLevel}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-info">{row.action}</span>
                        </td>
                        <td>
                          <div>
                            <span className={`badge ${reqInfo.badgeClass}`}>
                              {reqInfo.label}
                            </span>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {reqInfo.desc}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: '#10b981',
                              fontWeight: 500
                            }}
                          >
                            <CheckCircle2 size={14} />
                            Authorized
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN VIEW: Clean Grouped Matrix by Microservice
  // ----------------------------------------------------
  const filteredServices = microservices.filter((s) => {
    const matchesCategory = selectedCategory === 'ALL' || s.category?.toUpperCase() === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      s.displayName?.toLowerCase().includes(query) ||
      s.serviceKey?.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const categories = ['ALL', 'IOT', 'SECURITY', 'STORAGE', 'MEDIA'];

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Authentication Policy & Verification Presets</h2>
          <p>
            Grouped by targeted microservice. Configure enforcement requirements for USER and GUEST roles (Admin retains universal access).
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Policies</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map((cat) => {
            const count =
              cat === 'ALL'
                ? microservices.length
                : microservices.filter((s) => s.category?.toUpperCase() === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)'
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'ALL' ? 'All Microservices' : cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
          <Search
            size={14}
            color="#64748b"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search service or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '32px',
              height: '32px',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Grouped Microservice Cards */}
      {loading && microservices.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
          Loading microservice policy catalog...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
          <Filter size={32} color="#64748b" style={{ margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
            No microservices match your filter
          </div>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            Try adjusting your search query or selecting a different category.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {filteredServices.map((service) => {
            const servicePolicies = policies.filter((p) => p.serviceKey === service.serviceKey);
            const actions = getServiceActions(service, servicePolicies);

            return (
              <div
                key={service.serviceKey}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-card)'
                }}
              >
                {/* Group Header */}
                <div
                  style={{
                    padding: '14px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {getCategoryIcon(service.category)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          {service.displayName}
                        </h3>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: '#818cf8',
                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {service.serviceKey}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ fontSize: '10px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.25)' }}>
                      Admin: Full Access
                    </span>
                    <span className={`badge ${getCategoryBadgeClass(service.category)}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                      {service.category}
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>
                      {actions.length} Operation{actions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Group Table: Action Type Column + Role Columns (USER, GUEST) with Enforcement Dropdowns */}
                <div className="table-responsive">
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '28%', minWidth: '160px' }}>Action Type</th>
                        <th style={{ width: '36%', minWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="user-role-badge user" style={{ fontSize: '10px' }}>USER</span>
                            <span>Enforcement Requirement</span>
                          </div>
                        </th>
                        <th style={{ width: '36%', minWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="user-role-badge guest" style={{ fontSize: '10px' }}>GUEST</span>
                            <span>Enforcement Requirement</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((action) => (
                        <tr key={action}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className="badge badge-info"
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  letterSpacing: '0.4px'
                                }}
                              >
                                {action}
                              </span>
                            </div>
                          </td>

                          {['USER', 'GUEST'].map((role) => {
                            const pol = servicePolicies.find((p) => p.action === action && p.role === role);
                            const currentReq = pol ? pol.authRequirement : 'SESSION';
                            const mutationKey = `${service.serviceKey}-${action}-${role}`;
                            const isBusy = mutatingId === mutationKey;

                            return (
                              <td key={role}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <select
                                    className="form-select"
                                    value={currentReq}
                                    disabled={isBusy}
                                    style={{
                                      padding: '6px 10px',
                                      fontSize: '12px',
                                      width: '100%',
                                      borderColor:
                                        currentReq === 'BIOMETRIC_STEP_UP'
                                          ? 'rgba(245, 158, 11, 0.45)'
                                          : currentReq === 'NO_AUTH'
                                          ? 'rgba(16, 185, 129, 0.45)'
                                          : 'rgba(56, 189, 248, 0.35)',
                                      backgroundColor:
                                        currentReq === 'BIOMETRIC_STEP_UP'
                                          ? 'rgba(245, 158, 11, 0.05)'
                                          : currentReq === 'NO_AUTH'
                                          ? 'rgba(16, 185, 129, 0.05)'
                                          : '#0b1120'
                                    }}
                                    onChange={(e) =>
                                      handlePolicyChange(service.serviceKey, action, role, e.target.value)
                                    }
                                  >
                                    <option value="NO_AUTH">🟢 NO_AUTH (Zero Auth)</option>
                                    <option value="SESSION">🔵 SESSION (Login Token)</option>
                                    <option value="BIOMETRIC_STEP_UP">🛡️ BIOMETRIC (Touch ID)</option>
                                  </select>
                                  {isBusy && <RefreshCw size={12} className="spin" color="#818cf8" />}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
