async function part(url) {
  const src = await fetch(new URL(url, import.meta.url)).then((r) => {
    if (!r.ok) throw new Error('cheat scene part ' + url);
    return r.text();
  });
  const start = src.indexOf('"') + 1;
  const end = src.lastIndexOf('"');
  return JSON.parse('"' + src.slice(start, end) + '"');
}

const code = (await Promise.all([
  part('./play-body-0.js'),
  part('./play-body-1.js'),
  part('./play-body-2.js'),
])).join('');

const fixed = code
  .replaceAll(" from '../", " from 'https://superdooperman.github.io/pwas/moon-axis-unleashed/js/")
  .replaceAll(" from 'three'", " from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'");

const blobUrl = URL.createObjectURL(new Blob([fixed], { type: 'text/javascript' }));
const mod = await import(blobUrl);
export default mod.default;
