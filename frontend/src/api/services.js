import { apiRequest } from './client';
import { performStepUp } from './webauthn';

// Auth endpoints
export async function passwordLogin(username, password) {
  const params = new URLSearchParams({ username, password });
  return apiRequest(`/auth/password/login?${params.toString()}`, {
    method: 'POST'
  });
}

export async function changePassword(username, oldPassword, newPassword) {
  const params = new URLSearchParams({ username, oldPassword, newPassword });
  return apiRequest(`/auth/password/change?${params.toString()}`, {
    method: 'POST'
  });
}

// User management endpoints
export async function fetchUsers() {
  return apiRequest('/api/users');
}

export async function createUser(username, role, initialPassword) {
  const params = new URLSearchParams({ username, role, initialPassword });
  return apiRequest(`/api/users?${params.toString()}`, {
    method: 'POST'
  });
}

export async function deleteUser(username) {
  return apiRequest(`/api/users/${encodeURIComponent(username)}`, {
    method: 'DELETE'
  });
}

// Microservices catalog & permissions
export async function fetchMicroservices() {
  return apiRequest('/api/services');
}

export async function fetchUserPermissions(username) {
  return apiRequest(`/api/services/permissions/${encodeURIComponent(username)}`);
}

export async function grantPermission(username, serviceKey) {
  const params = new URLSearchParams({ username, serviceKey });
  return apiRequest(`/api/services/permissions/grant?${params.toString()}`, {
    method: 'POST'
  });
}

export async function revokePermission(username, serviceKey) {
  const params = new URLSearchParams({ username, serviceKey });
  return apiRequest(`/api/services/permissions/revoke?${params.toString()}`, {
    method: 'POST'
  });
}

// Access Policy presets
export async function fetchPolicies() {
  return apiRequest('/api/services/policies');
}

export async function updatePolicy(serviceKey, action, role, authRequirement) {
  const params = new URLSearchParams({ serviceKey, action, role, authRequirement });
  return apiRequest(`/api/services/policies?${params.toString()}`, {
    method: 'POST'
  });
}

// Device Control with Step-Up Biometric Loop
export async function sendDeviceControl(serviceKey, action, payload = {}, stepUpToken = null, currentUser = '') {
  const headers = {};
  if (stepUpToken) {
    headers['X-Step-Up-Assertion'] = stepUpToken;
  }

  const query = new URLSearchParams({ serviceKey, action });

  try {
    return await apiRequest(`/api/services/device-control?${query.toString()}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    // If backend reports STEP_UP_REQUIRED, prompt biometric step-up and retry
    if (error.status === 403 && (error.data?.error === 'STEP_UP_REQUIRED' || error.message?.includes('Step-Up'))) {
      const token = await performStepUp(currentUser, action, serviceKey);
      return sendDeviceControl(serviceKey, action, payload, token, currentUser);
    }
    throw error;
  }
}

// Fetch live IoT devices telemetry
export async function fetchIoTDevices() {
  // Query simulator directly on port 5050 (or fallback to simulated items)
  try {
    const res = await fetch('/devices-api/api/devices');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    try {
      const resFallback = await fetch('http://localhost:5050/api/devices', { mode: 'cors' });
      if (resFallback.ok) return await resFallback.json();
    } catch (_) {}
  }

  return [
    { id: 'smart-bulb', name: 'Living Room Smart Bulb', type: 'LIGHTING', power: true, brightness: 80, color: '#ffd166', power_watts: 9.2, status: 'ONLINE' },
    { id: 'smart-fan', name: 'Master Bedroom Smart Fan', type: 'CLIMATE', power: true, speed: 3, mode: 'Breeze', oscillate: true, rpm: 1200, status: 'ONLINE' },
    { id: 'smart-lock', name: 'Main Entry Biometric Deadbolt', type: 'SECURITY', locked: true, battery: 94, last_accessed: 'Admin (Verified Touch ID)', status: 'ARMED' }
  ];
}

// Fetch live hardware simulation event logs
export async function fetchSimulationLogs() {
  try {
    const res = await fetch('http://localhost:5050/api/logs', { mode: 'cors' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Simulator temporarily unreachable
  }
  return [];
}

