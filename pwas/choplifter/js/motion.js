const Motion = (() => {
  let enabled = false;
  let available = false;
  let calibrated = false;
  let beta0 = 0;
  let gamma0 = 0;
  let beta = 0;
  let gamma = 0;
  let smoothBeta = 0;
  let smoothGamma = 0;
  let sensitivity = 1;
  let listener = null;

  function checkAvailable() {
    available = typeof window.DeviceOrientationEvent !== 'undefined';
    return available;
  }

  function onOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    beta = e.beta;
    gamma = e.gamma;
    smoothBeta = smoothBeta * 0.85 + beta * 0.15;
    smoothGamma = smoothGamma * 0.85 + gamma * 0.15;
  }

  async function requestPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        return result === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  async function enable() {
    if (!checkAvailable()) return false;
    const ok = await requestPermission();
    if (!ok) return false;
    if (!listener) {
      listener = onOrientation;
      window.addEventListener('deviceorientation', listener);
    }
    enabled = true;
    return true;
  }

  function disable() {
    enabled = false;
    calibrated = false;
  }

  function calibrate() {
    beta0 = smoothBeta || beta || 0;
    gamma0 = smoothGamma || gamma || 0;
    calibrated = true;
  }

  function setSensitivity(v) {
    sensitivity = Math.max(0.5, Math.min(2, v));
  }

  function getInput() {
    if (!enabled || !calibrated) return { x: 0, y: 0 };
    const pitch = (smoothBeta - beta0) * 0.04 * sensitivity;
    const roll = (smoothGamma - gamma0) * 0.04 * sensitivity;
    return {
      x: Math.max(-1, Math.min(1, roll)),
      y: Math.max(-1, Math.min(1, -pitch)),
    };
  }

  function isEnabled() { return enabled; }
  function isAvailable() { return checkAvailable(); }
  function isCalibrated() { return calibrated; }

  return {
    enable, disable, calibrate, setSensitivity, getInput,
    isEnabled, isAvailable, isCalibrated,
  };
})();