/* js/games/wheel.js — Wheel of Fortune (rueda SVG) */
import { playCorrect, playTick, playWin, playWrong } from '../core/audio.js';
import { $, esc, toast } from '../core/dom.js';
import { saveState, state, syncPlayer } from '../core/state.js';
import { launchConfetti } from '../ui/confetti.js';
import { onRender, render } from '../features/players-manager.js';

const TAU = Math.PI * 2;
const C = 500, R = 470;
const FONT = "'Lilita One','Nunito',sans-serif";
const STYLES = [
  { bg: '#ff3d8b', fg: '#0a0718' }, { bg: '#3a2f63', fg: '#fff4e0' },
  { bg: '#2de0d0', fg: '#0a0718' }, { bg: '#4a3d7a', fg: '#fff4e0' },
  { bg: '#fff4e0', fg: '#0a0718' }, { bg: '#241d40', fg: '#fff4e0' }
];
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

let rotation = 0;
let spinning = false;
let lastSlice = -1;
let winnerId = null;
let builtKey = '';

const styleFor = (i, n) => (n > 1 && i === n - 1 && i % STYLES.length === 0) ? STYLES[1] : STYLES[i % STYLES.length];
const pt = (a, r) => [C + r * Math.cos(a), C + r * Math.sin(a)];

function setRotation() {
  const g = $('wheelRot');
  if (g) g.setAttribute('transform', `rotate(${(rotation * 180 / Math.PI).toFixed(2)} ${C} ${C})`);
}

/** Dibuja la rueda; solo reconstruye el SVG si cambió la lista de nombres. */
export function drawWheel() {
  const svg = $('wheel');
  const n = state.students.length;
  const key = state.students.map(s => s.name).join('|');
  if (key !== builtKey || !$('wheelRot')) {
    builtKey = key;
    let body = '';
    if (!n) {
      body = `<circle cx="${C}" cy="${C}" r="${R}" fill="#241d40"/><text x="${C}" y="${C + 130}" text-anchor="middle" font-size="58" fill="#fff4e0" font-family="${FONT}">ADD PLAYERS</text>`;
    } else {
      const arc = TAU / n;
      const size = Math.max(24, Math.min(58, 64 - n * 1.4));
      for (let i = 0; i < n; i++) {
        const st = styleFor(i, n);
        const [x1, y1] = pt(i * arc, R), [x2, y2] = pt((i + 1) * arc, R);
        body += n === 1
          ? `<circle cx="${C}" cy="${C}" r="${R}" fill="${st.bg}"/>`
          : `<path d="M${C} ${C} L${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${st.bg}" stroke="#0a0718" stroke-width="6" stroke-linejoin="round"/>`;
        const name = state.students[i].name;
        const label = esc(name.length > 14 ? name.slice(0, 13) + '…' : name);
        body += `<text transform="rotate(${(((i + 0.5) * arc) * 180 / Math.PI).toFixed(2)} ${C} ${C})" x="${C + R - 36}" y="${C}" text-anchor="end" dominant-baseline="central" font-size="${size}" fill="${st.fg}" font-family="${FONT}">${label}</text>`;
      }
    }
    svg.innerHTML = `<g id="wheelRot">${body}</g>
      <circle cx="${C}" cy="${C}" r="${R + 8}" fill="none" stroke="#0a0718" stroke-width="16"/>
      <circle cx="${C}" cy="${C}" r="62" fill="#fff4e0" stroke="#0a0718" stroke-width="8"/>
      <circle cx="${C}" cy="${C}" r="20" fill="#ff3d8b" stroke="#0a0718" stroke-width="5"/>`;
  }
  setRotation();
}

function tickPointer() {
  const p = $('pointer');
  if (!p) return;
  p.classList.remove('tick');
  void p.getBoundingClientRect();
  p.classList.add('tick');
}

export function spin() {
  const n = state.students.length;
  if (spinning) return;
  if (n < 2) return toast('Add at least 2 players to spin.', true);

  spinning = true;
  document.body.classList.add('busy');
  $('spinBtn').disabled = true;
  $('statusText').textContent = '🎰 The wheel is spinning…';
  lastSlice = -1;

  const w = Math.floor(Math.random() * n);
  const arc = TAU / n;
  const target = -Math.PI / 2 - (w + 0.5 + (Math.random() - 0.5) * 0.65) * arc;
  const delta = (((target - rotation) % TAU) + TAU) % TAU;
  const start = rotation;
  const end = rotation + delta + TAU * (5 + Math.floor(Math.random() * 4));
  const duration = 6500;
  const t0 = performance.now();

  (function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    rotation = start + (end - start) * easeOutQuart(t);
    setRotation();
    const ang = ((-Math.PI / 2 - rotation) % TAU + TAU) % TAU;
    const slice = Math.floor(ang / arc) % n;
    if (slice !== lastSlice) {
      lastSlice = slice;
      if (t < 0.995) tickPointer();
      if (t > 0.1 && t < 0.95) playTick();
    }
    if (t < 1) requestAnimationFrame(frame);
    else finishSpin(w);
  })(t0);
}

function finishSpin(w) {
  const winner = state.students[w];
  winnerId = winner.id;
  winner.timesSelected = (winner.timesSelected || 0) + 1;
  state.rounds = (state.rounds || 0) + 1;

  spinning = false;
  document.body.classList.remove('busy');
  $('spinBtn').disabled = false;
  playWin();

  const wrap = $('wheelWrap');
  wrap.classList.remove('landed');
  void wrap.offsetWidth;
  wrap.classList.add('landed');

  $('winnerName').textContent = winner.name;
  $('scoreQuestion').classList.add('visible');
  $('pointsSelector').classList.remove('visible');
  $('scoreResultBadge').className = 'score-result-badge';
  $('scoreResultBadge').textContent = '';
  $('modal').classList.add('open');

  saveState();
  render();
}

const stamp = () => new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function handleAnswered() {
  $('scoreQuestion').classList.remove('visible');
  $('pointsSelector').classList.add('visible');
  playCorrect();
}

function handleSkipped() {
  if (!winnerId) return;
  syncPlayer(winnerId, (p, fs) => {
    p.streak = 0;
    fs.history.unshift({ name: p.name, answered: false, points: 0, streak: 0, game: 'wheel', date: stamp() });
    fs.history = fs.history.slice(0, 50);
  });
  $('scoreQuestion').classList.remove('visible');
  $('pointsSelector').classList.remove('visible');
  const badge = $('scoreResultBadge');
  badge.className = 'score-result-badge skipped';
  badge.textContent = '❌ No answer — 0 points';
  playWrong();
  render();
}

function handlePoints(pts) {
  if (!winnerId) return;
  const winner = syncPlayer(winnerId, (p, fs) => {
    p.score = Math.max(0, (parseInt(p.score, 10) || 0) + (parseInt(pts, 10) || 0));
    p.streak = (p.streak || 0) + 1;
    p.timesAnswered = (p.timesAnswered || 0) + 1;
    fs.history.unshift({ name: p.name, answered: true, points: pts, streak: p.streak, game: 'wheel', date: stamp() });
    fs.history = fs.history.slice(0, 50);
  });
  $('pointsSelector').classList.remove('visible');
  const badge = $('scoreResultBadge');
  badge.className = 'score-result-badge answered';
  badge.textContent = `✅ +${pts} point${pts > 1 ? 's' : ''} — Streak: ${winner.streak} 🔥`;
  launchConfetti();
  playCorrect();
  saveState();
  render();
}

export function closeModal() {
  $('modal').classList.remove('open');
  winnerId = null;
}

/** Paneles de la vista Wheel (roster, podio, ranking, historial, rueda). */
function renderWheelView() {
  const n = state.students.length;
  $('playerCount').textContent = n;
  $('roundCount').textContent = state.rounds || 0;

  const sorted = [...state.students].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top3 = sorted.slice(0, 3).filter(s => s.score > 0);
  const medals = ['🥇', '🥈', '🥉'], cls = ['gold', 'silver', 'bronze'];
  $('podium').style.display = top3.length ? 'flex' : 'none';
  $('podium').innerHTML = top3.map((s, i) => `
    <div class="podium-item ${cls[i]}"><span class="podium-medal">${medals[i]}</span>
      <span class="podium-name">${esc(s.name)}</span><span class="podium-pts">${s.score} pts</span></div>`).join('');

  $('roster').innerHTML = n ? state.students.map((s, i) => `
    <div class="player-row"><span class="player-rank">${i + 1}</span>
      <span class="player-name">${esc(s.name)}</span><span class="player-score">${s.score || 0} pts</span></div>`).join('')
    : '<p class="empty-text">No players yet. Add them in the Players tab.</p>';

  $('rankingList').innerHTML = n ? sorted.map((s, i) => `
    <div class="player-row ${i < 3 && s.score > 0 ? 'score-highlight' : ''}">
      <span class="player-rank">${medals[i] || (i + 1)}</span><span class="player-name">${esc(s.name)}</span>
      ${s.streak > 1 ? `<span class="player-streak">🔥${s.streak}</span>` : ''}
      <span class="player-score">${s.score || 0} pts</span></div>`).join('')
    : '<p class="empty-text">No ranking data yet.</p>';

  $('history').innerHTML = state.history.length ? '<div class="history-list">' + state.history.map(h => `
    <div class="history-row">
      <span class="history-icon">${h.answered ? '✅' : '❌'} ${h.game === 'slots' ? '🎰' : h.game === 'blackjack' ? '🃏' : h.game === 'roulette' ? '🎡' : '🎯'}</span>
      <span class="history-name">${esc(h.name)}</span>
      <span class="history-pts ${h.answered ? 'positive' : 'zero'}">${h.answered ? '+' + h.points : (h.points < 0 ? h.points : '0')}</span>
      ${h.streak > 1 ? `<span class="history-streak">🔥${h.streak}</span>` : ''}
      <span class="history-meta">${h.date || ''}</span></div>`).join('') + '</div>'
    : '<p class="empty-text">No history yet.</p>';

  if (!spinning) $('statusText').textContent = n < 2 ? 'Waiting for players…' : 'Ready to spin! 🎲';
  drawWheel();
}

export function initWheel() {
  onRender(renderWheelView);
  $('spinBtn').onclick = spin;
  $('btnAnswered').onclick = handleAnswered;
  $('btnSkipped').onclick = handleSkipped;
  $('closeModal').onclick = closeModal;
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  $('assignPointsBtn').onclick = () => {
    const pts = parseInt($('customPointsInput').value, 10);
    if (isNaN(pts) || pts < 1) return toast('Please enter a valid number greater than 0.', true);
    handlePoints(pts);
  };
  if (document.fonts) document.fonts.ready.then(() => { builtKey = ''; drawWheel(); });
}
