const BEST_KEY = 'moon-axis-hiscore';
const LIST_KEY = 'moon-axis-scores';
const TAG_KEY = 'moon-axis-tag';

function pad(n) {
  return String(Math.max(0, n | 0)).padStart(6, '0');
}

function loadList() {
  try {
    const rows = JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

const Scores = {
  pad,
  best() {
    const fromList = loadList().reduce((m, r) => Math.max(m, r.score | 0), 0);
    return Math.max(Number(localStorage.getItem(BEST_KEY) || 0), fromList);
  },
  list() {
    return loadList().slice().sort((a, b) => b.score - a.score).slice(0, 10);
  },
  tag() {
    const t = (localStorage.getItem(TAG_KEY) || 'ACE').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (t || 'ACE').slice(0, 3).padEnd(3, 'X');
  },
  setTag(s) {
    const t = String(s || 'ACE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'X');
    localStorage.setItem(TAG_KEY, t);
    return t;
  },
  submit({ score, stage, won }) {
    const row = {
      score: score | 0,
      stage: stage | 0,
      won: !!won,
      t: Date.now(),
      tag: this.tag(),
    };
    const rows = loadList();
    rows.push(row);
    rows.sort((a, b) => b.score - a.score || a.t - b.t);
    const top = rows.slice(0, 10);
    localStorage.setItem(LIST_KEY, JSON.stringify(top));
    const best = Math.max(this.best(), row.score);
    localStorage.setItem(BEST_KEY, String(best));
    const rank = top.findIndex((r) => r.t === row.t && r.score === row.score) + 1;
    return { row, rank: rank || 11, list: top, best };
  },
  render(el, highlightT = 0) {
    const rows = this.list();
    if (!rows.length) {
      el.innerHTML = '<p class="hint">NO SORTIES LOGGED</p>';
      return;
    }
    const body = rows.map((r, i) => {
      const hi = highlightT && r.t === highlightT ? ' class="hi-row"' : '';
      const mark = r.won ? 'WIN' : `S${(r.stage | 0) + 1}`;
      return `<tr${hi}><td>${i + 1}</td><td>${r.tag || 'ACE'}</td><td>${pad(r.score)}</td><td>${mark}</td></tr>`;
    }).join('');
    el.innerHTML = `<table class="score-table"><thead><tr><th>#</th><th>ACE</th><th>SCORE</th><th></th></tr></thead><tbody>${body}</tbody></table>`;
  },
};

export default Scores;
