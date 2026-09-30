const KEYS = {
  invertY: 'moon-axis-invert-y',
  haptics: 'moon-axis-haptics',
};

const Settings = {
  invertY: localStorage.getItem(KEYS.invertY) === '1',
  haptics: localStorage.getItem(KEYS.haptics) !== '0',

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
