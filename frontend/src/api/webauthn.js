/**
 * Cross-Device WebAuthn / FIDO2 Authentication Helper
 * Compatible with Touch ID (macOS/iOS), Face ID (iOS), Android Biometrics, and Windows Hello.
 */

export function cleanNulls(obj) {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      cleanNulls(obj[key]);
    }
  }
  return obj;
}

/**
 * Enroll new biometric credentials for the specified user
 */
export async function registerBiometrics(username) {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn biometrics are not supported on this browser/device.');
  }

  // 1. Get creation challenge from server
  const resStart = await fetch(`/webauthn/register/start?username=${encodeURIComponent(username)}`, {
    method: 'POST'
  });
  const optionsJson = await resStart.json();
  if (!resStart.ok) {
    throw new Error(optionsJson.message || optionsJson.error || 'Failed to initialize biometric challenge');
  }

  cleanNulls(optionsJson);

  // 2. Trigger platform biometric prompt (Touch ID / Face ID / Android Fingerprint)
  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(optionsJson);
  let credential;
  try {
    credential = await navigator.credentials.create({ publicKey });
  } catch (err) {
    if (err.name === 'InvalidStateError' || err.message?.includes('already registered')) {
      throw new Error('This biometric sensor is already enrolled for this account! You can log in directly.');
    }
    throw err;
  }

  // 3. Send signed assertion to backend to persist public key
  const resFinish = await fetch(`/webauthn/register/finish?username=${encodeURIComponent(username)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credential.toJSON())
  });

  let finishData = {};
  try {
    finishData = await resFinish.json();
  } catch {
    // If response was empty or non-JSON
  }

  if (!resFinish.ok) {
    throw new Error(finishData.message || finishData.error || 'Failed to verify biometric enrollment on server');
  }

  return finishData;
}

/**
 * Authenticate via enrolled biometrics
 */
export async function loginBiometrics(username) {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn biometrics are not supported on this browser/device.');
  }

  // 1. Get request challenge
  const resStart = await fetch(`/webauthn/login/start?username=${encodeURIComponent(username)}`, {
    method: 'POST'
  });
  const optionsJson = await resStart.json();
  if (!resStart.ok) {
    throw new Error(optionsJson.message || optionsJson.error || 'Biometric login challenge failed');
  }

  cleanNulls(optionsJson);
  const requestOptions = cleanNulls(optionsJson.publicKeyCredentialRequestOptions || optionsJson);

  // 2. Prompt user sensor
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(requestOptions);
  const assertion = await navigator.credentials.get({ publicKey });

  // 3. Verify assertion on server
  const resFinish = await fetch(`/webauthn/login/finish?username=${encodeURIComponent(username)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertion.toJSON())
  });

  const authData = await resFinish.json();
  if (!resFinish.ok) {
    throw new Error(authData.message || authData.error || 'Biometric authentication failed');
  }

  return authData;
}

/**
 * Perform step-up re-authentication ceremony for sensitive actions
 */
export async function performStepUp(username, action, resourceId) {
  const resStart = await fetch(`/webauthn/stepup/start?username=${encodeURIComponent(username)}`, {
    method: 'POST'
  });
  const optionsJson = await resStart.json();
  if (!resStart.ok) {
    throw new Error(optionsJson.message || 'Failed to start step-up verification');
  }

  const requestOptions = cleanNulls(optionsJson.publicKeyCredentialRequestOptions || optionsJson);
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(requestOptions);
  const assertion = await navigator.credentials.get({ publicKey });

  const resFinish = await fetch(`/webauthn/stepup/finish?username=${encodeURIComponent(username)}&action=${encodeURIComponent(action)}&resourceId=${encodeURIComponent(resourceId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertion.toJSON())
  });

  const data = await resFinish.json();
  if (!resFinish.ok) {
    throw new Error(data.message || 'Step-up biometric verification rejected');
  }

  return data.assertion; // Short-lived step-up token
}
