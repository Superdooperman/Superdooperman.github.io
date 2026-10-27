// User-visible machine names. A rename happens here (plus the static fallback text in index.html
// and the manifest description, which can't import JS). index.html marks each spot with data-name.
export const NAMES = { drums: 'PAH-KAW B0B', bass: 'YOLK E0E', pad: 'KHAOTIC KOCK' };
// fill every [data-name] element: its first text node becomes the name (child spans stay)
export function applyNames(root = document) {
  for (const el of root.querySelectorAll('[data-name]')) {
    const n = NAMES[el.dataset.name]; if (!n) continue;
    const t = [...el.childNodes].find((c) => c.nodeType === 3);
    if (t) t.nodeValue = n; else el.prepend(n);
  }
}
