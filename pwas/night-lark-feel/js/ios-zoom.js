// Block iOS Safari double-tap and pinch *page* zoom. The in-game camera zoom (zoom.js) is
// a canvas scale and is not touched. Viewport meta is set in index.html (maximum-scale=1,
// user-scalable=no); this file is the JS belt: preventDefault on gesture/dblclick/double
// touchend, and snap visualViewport.scale back to 1 if the page still zooms.
export function blockPageZoom(target = window, doc = document) {
  const prevent = (e) => { e.preventDefault(); };
  target.addEventListener('gesturestart', prevent, { capture: true, passive: false });
  target.addEventListener('gesturechange', prevent, { capture: true, passive: false });
  target.addEventListener('gestureend', prevent, { capture: true, passive: false });
  target.addEventListener('dblclick', prevent, { capture: true, passive: false });

  let lastTouchEnd = 0;
  target.addEventListener('touchend', (e) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastTouchEnd < 300) prevent(e);
    lastTouchEnd = now;
  }, { capture: true, passive: false });

  const snap = () => {
    const vv = target.visualViewport;
    if (!vv || Math.abs(vv.scale - 1) < 1e-3) return;
    // iOS: briefly set zoom then restore so the page scale snaps back to 1.
    const body = doc.body;
    if (!body) return;
    const prev = body.style.zoom;
    body.style.zoom = String(1 / vv.scale);
    requestAnimationFrame(() => { body.style.zoom = prev || ''; });
  };
  if (target.visualViewport) {
    target.visualViewport.addEventListener('resize', snap);
    target.visualViewport.addEventListener('scroll', snap);
  }
  target.addEventListener('touchend', snap, { capture: true, passive: true });
  return snap;
}
