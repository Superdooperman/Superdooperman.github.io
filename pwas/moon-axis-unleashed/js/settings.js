const KEYS = {
  invertY: 'moon-axis-unleashed-invert-y',
  haptics: 'moon-axis-unleashed-haptics',
};

const Settings = {
  invertY: localStorage.getItem(KEYS.invertY) === '1',
  haptics: localStorage.getItem(KEYS.haptics) !== '0',
  _queued: null,

  setInvertY(v) {
    this.invertY = !!v;
    localStorage.setItem(KEYS.invertY, this.invertY ? '1' : '0');
  },
  setHaptics(v) {
    this.haptics = !!v;
    localStorage.setItem(KEYS.haptics, this.haptics ? '1' : '0');
  },
  rumble(msOrPattern = 16) {
    if (!this.haptics) return;
    try {
      if (navigator.vibrate) navigator.vibrate(msOrPattern);
    } catch (_) { /* iOS Safari has no Vibration API */ }
  },
  queueRumble(msOrPattern = 16) {
    this._queued = msOrPattern;
  },
  flushRumble() {
    if (this._queued == null) return;
    const pat = this._queued;
    this._queued = null;
    this.rumble(pat);
  },
  hapticLabel() {
    if (this.isIOS()) return this.haptics ? 'SHAKE  ON' : 'SHAKE  OFF';
    return this.haptics ? 'HAPTICS  ON' : 'HAPTICS  OFF';
  },
  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  },
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },
};

export default Settings;
