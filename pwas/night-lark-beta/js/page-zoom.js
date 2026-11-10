// Beta pinch zoom (beta-zoom, Nov 9 2026; Zoro's review notes, fixed after Chopper's verify).
// The beta lets a player pinch-zoom the page (viewport maximum-scale=3, no user-scalable=no)
// so small text and the HUD can be read on a phone. The main build keeps ios-zoom.js (page
// zoom fully blocked).
//  - touch-action is scoped to the canvas (pinch-zoom: the browser itself suppresses one-finger
//    pans and double-tap zoom there, and still lets a two-finger pinch zoom) and to the touch
//    buttons (none); html/body no longer set it.
//  - touchstart is NEVER cancelled: a pinch arrives as touchstart(1 finger) then
//    touchstart(2 fingers), and cancelling that first one-finger touchstart kills the zoom for
//    the whole touch sequence (Chopper, Nov 9). The only touch listener is a canvas touchmove
//    that cancels a move while exactly one finger is down, as a belt for browsers without
//    touch-action pinch-zoom; a move with two fingers is never cancelled.
//  - reset-zoom fallback: while the page is zoomed (visualViewport.scale > 1) a small
//    "RESET ZOOM" button shows; tapping it snaps the page back to scale 1 (initial-scale nudge).
// Only a cancelable event is ever prevented (see ios-zoom.js, Nov 7 2026).
export const RESET_EPS = 0.02;

/** True for a touch event while exactly one finger is on the screen. */
export function isSingleFinger(e) {
  return !!(e && e.touches && e.touches.length === 1);
}

export function allowPinchZoom(canvas, win = window, doc = document) {
  const prevent = (e) => { if (e.cancelable !== false) e.preventDefault(); };
  if (canvas && canvas.addEventListener) {
    canvas.addEventListener('touchmove', (e) => { if (isSingleFinger(e)) prevent(e); }, { passive: false });
    canvas.addEventListener('dblclick', prevent, { passive: false });
  }

  const vv = win && win.visualViewport;
  const meta = doc && doc.querySelector ? doc.querySelector('meta[name="viewport"]') : null;
  const zoomed = () => !!vv && vv.scale > 1 + RESET_EPS;
  let restoring = null;
  const reset = () => {
    // A changed initial-scale makes the browser re-apply it, which snaps the page back to that
    // scale (headless Chrome 844x390, Nov 9: scale 3 -> 1 in one frame). Clamping
    // maximum-scale=1 does NOT reset a page that is already zoomed. So: nudge initial-scale to
    // 1.0001 (still "not zoomed", RESET_EPS), then set it back to exactly 1 once the page has
    // zoomed out (or after 400 ms), which re-applies scale 1 again. maximum-scale=3 is kept.
    if (meta && !restoring) {
      const content = meta.getAttribute('content') || '';
      const nudged = /initial-scale=[\d.]+/.test(content) ? content.replace(/initial-scale=[\d.]+/, 'initial-scale=1.0001') : content + ', initial-scale=1.0001';
      meta.setAttribute('content', nudged);
      const done = () => {
        if (!restoring) return;
        if (vv && vv.removeEventListener) vv.removeEventListener('resize', check);
        clearTimeout(restoring); restoring = null;
        meta.setAttribute('content', content);
        sync();
      };
      const check = () => { if (!zoomed()) setTimeout(done, 50); };
      restoring = setTimeout(done, 400);
      if (vv) vv.addEventListener('resize', check);
    }
    // Also scroll the page back to the origin.
    if (win.scrollTo) try { win.scrollTo(0, 0); } catch { /* old browsers */ }
  };

  let btn = null;
  if (doc && doc.createElement && doc.body) {
    btn = doc.createElement('button');
    btn.id = 'reset-zoom';
    btn.type = 'button';
    btn.textContent = 'RESET ZOOM';
    btn.hidden = true;
    btn.addEventListener('click', (e) => { e.preventDefault(); reset(); });
    doc.body.appendChild(btn);
  }
  const sync = () => {
    if (!btn) return;
    const z = zoomed();
    if (btn.hidden === z) btn.hidden = !z;
    if (z && vv) {
      // keep it in the visible corner of the zoomed viewport, at a constant on-screen size
      btn.style.transform = `translate(${vv.offsetLeft}px, ${vv.offsetTop}px) scale(${1 / vv.scale})`;
    }
  };
  if (vv) { vv.addEventListener('resize', sync); vv.addEventListener('scroll', sync); }
  sync();
  return { reset, sync, zoomed, button: btn };
}
