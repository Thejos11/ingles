/* js/games/roulette.js — ruleta europea: apuestas por jugador, rueda y bola animadas */
import { playSlotLose, playTick, playWin } from '../core/audio.js';
import { $, esc, toast } from '../core/dom.js';
import { saveState, state, syncPlayer } from '../core/state.js';
import { burstConfetti } from '../ui/confetti.js';
import { getSelectedPlayer, populatePlayerSelect, updateBottomBar, updateChipsDisplay, updateGlobalStats } from '../ui/players.js';
import { ORDER, betLabel, betPays, colorOf, settle } from './roulette-rules.js';

const CHIPS = [1, 5, 10, 25, 100];
const TAU = Math.PI * 2;
const ARC = TAU / 37;
const CX = 250;
const FONT = "'Lilita One','Nunito',sans-serif";
const FILL = { red: '#ff3d8b', black: '#14102b', green: '#2fbf71' };
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
const easeOutQuad = t => 1 - (1 - t) * (1 - t);

let chip = 1;
let spinning = false;
let bets = {};        // { playerId: { betKey: fichas } }
let undo = {};        // { playerId: [{ key, amt }] }
let ready = new Set();
let lastBets = {};
let lastNums = [];
let wheelAngle = 0;
let ballAngle = 0;

const activePlayer = () => getSelectedPlayer('rlPlayerSelect');
const stakeOf = id => Object.values(bets[id] || {}).reduce((a, b) => a + b, 0);
const polar = (a, r) => [CX + r * Math.sin(a), CX - r * Math.cos(a)];
const stamp = () => new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/* ---------- Construcción (una vez) ---------- */
function buildWheel() {
  let s = `<circle cx="${CX}" cy="${CX}" r="244" fill="#241d40" stroke="#0a0718" stroke-width="8"/><g id="rlWheelRot">`;
  ORDER.forEach((n, i) => {
    const a0 = i * ARC - ARC / 2, a1 = i * ARC + ARC / 2;
    const [x0, y0] = polar(a0, 218), [x1, y1] = polar(a1, 218), [x2, y2] = polar(a1, 160), [x3, y3] = polar(a0, 160);
    s += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A218 218 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A160 160 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z" fill="${FILL[colorOf(n)]}" stroke="#fff4e0" stroke-width="1.5"/>`;
    s += `<text transform="rotate(${(i * ARC * 180 / Math.PI).toFixed(2)} ${CX} ${CX})" x="${CX}" y="${CX - 196}" text-anchor="middle" dominant-baseline="central" font-size="17" fill="#fff4e0" font-family="${FONT}">${n}</text>`;
  });
  s += `<circle cx="${CX}" cy="${CX}" r="150" fill="#fff4e0" stroke="#0a0718" stroke-width="6"/><circle cx="${CX}" cy="${CX}" r="70" fill="#ff3d8b" stroke="#0a0718" stroke-width="6"/><circle cx="${CX}" cy="${CX}" r="16" fill="#fff4e0" stroke="#0a0718" stroke-width="4"/></g>
    <circle id="rlBall" cx="${CX}" cy="${CX - 232}" r="9" fill="#fff4e0" stroke="#0a0718" stroke-width="3"/>`;
  $('rlWheel').innerHTML = s;
  moveWheel(0, 0, 232);
}

function moveWheel(w, b, r) {
  $('rlWheelRot').setAttribute('transform', `rotate(${(w * 180 / Math.PI).toFixed(2)} ${CX} ${CX})`);
  const [x, y] = polar(b, r);
  $('rlBall').setAttribute('cx', x.toFixed(1));
  $('rlBall').setAttribute('cy', y.toFixed(1));
}

function buildBoard() {
  const cell = (key, label, cls, col, row) =>
    `<button type="button" class="rt-cell ${cls}" data-bet="${key}" style="grid-column:${col};grid-row:${row}">${label}<span class="rt-chip" hidden></span></button>`;
  let h = cell('n:0', '0', 'green', '1', '1 / 4');
  for (let n = 1; n <= 36; n++) h += cell(`n:${n}`, n, colorOf(n), 2 + Math.floor((n - 1) / 3), 3 - ((n - 1) % 3));
  [3, 2, 1].forEach((c, i) => { h += cell(`col:${c}`, '2 to 1', 'out', '14', i + 1); });
  [1, 2, 3].forEach(d => { h += cell(`dozen:${d}`, `${['1st', '2nd', '3rd'][d - 1]} 12`, 'out', `${2 + (d - 1) * 4} / ${6 + (d - 1) * 4}`, '4'); });
  [['low', '1-18', 'out', '2 / 4'], ['even', 'Even', 'out', '4 / 6'], ['red', '◆', 'red', '6 / 8'],
   ['black', '◆', 'black', '8 / 10'], ['odd', 'Odd', 'out', '10 / 12'], ['high', '19-36', 'out', '12 / 14']]
    .forEach(([k, l, c, col]) => { h += cell(k, l, c, col, '5'); });
  [['red-even', 'Red · Even', 'red', '2 / 5'], ['red-odd', 'Red · Odd', 'red', '5 / 8'],
   ['black-even', 'Black · Even', 'black', '8 / 11'], ['black-odd', 'Black · Odd', 'black', '11 / 14']]
    .forEach(([k, l, c, col]) => { h += cell(k, `${l} <small>3:1</small>`, c, col, '6'); });
  $('rlBoard').innerHTML = h;
  $('rlChips').innerHTML = CHIPS.map(v => `<button type="button" class="rt-chipbtn c${v}${v === chip ? ' active' : ''}" data-chip="${v}">${v}</button>`).join('');
}

/* ---------- Render ---------- */
function renderAll() {
  Object.keys(bets).forEach(id => { if (!state.students.some(s => s.id === id)) { delete bets[id]; ready.delete(id); } });
  const p = activePlayer();
  const avail = p ? (p.score || 0) - stakeOf(p.id) : 0;
  $('rlAvail').textContent = `Available: ${avail}`;

  document.querySelectorAll('#rlBoard .rt-cell').forEach(c => {
    const key = c.dataset.bet;
    const mine = p ? (bets[p.id]?.[key] || 0) : 0;
    const all = Object.values(bets).reduce((a, b) => a + (b[key] || 0), 0);
    const badge = c.querySelector('.rt-chip');
    c.classList.toggle('mine', mine > 0);
    badge.hidden = all === 0;
    badge.classList.toggle('other', mine === 0);
    badge.textContent = mine || all;
  });

  $('rlBets').innerHTML = state.students.length ? state.students.map(s => `
    <div class="rt-prow${p && p.id === s.id ? ' active' : ''}" data-pid="${s.id}">
      <span class="rt-pname">${esc(s.name)}</span>
      <span class="rt-pstake">${stakeOf(s.id)} 🪙</span>
      <button type="button" class="btn btn-sm ${ready.has(s.id) ? 'btn-primary' : 'btn-ghost'}" data-ready="${s.id}">${ready.has(s.id) ? '✓ Ready' : 'Ready?'}</button>
    </div>`).join('') : '<p class="empty-text">No players yet. Add them in the Players tab.</p>';

  const withBets = state.students.filter(s => stakeOf(s.id) > 0);
  const pot = withBets.reduce((a, s) => a + stakeOf(s.id), 0);
  $('rlSummary').textContent = `${withBets.length} player${withBets.length !== 1 ? 's' : ''} betting · ${pot} chips · ${withBets.filter(s => ready.has(s.id)).length}/${withBets.length} ready`;

  $('rlLast').innerHTML = lastNums.map(n => `<span class="rt-num ${colorOf(n)}">${n}</span>`).join('');
  $('rlSpin').disabled = spinning;
  updateChipsDisplay('rlPlayerSelect', 'rlPlayerChips');
  updateGlobalStats();
  updateBottomBar();
}

export function enterRoulette() {
  populatePlayerSelect('rlPlayerSelect', 'rlPlayerChips');
  renderAll();
}

/* ---------- Apuestas ---------- */
function placeBet(key) {
  if (spinning) return;
  const p = activePlayer();
  if (!p) return toast('Select a player first. Add players in the Players tab.', true);
  if (chip > (p.score || 0) - stakeOf(p.id)) return toast('Not enough chips.', true);
  bets[p.id] = bets[p.id] || {};
  bets[p.id][key] = (bets[p.id][key] || 0) + chip;
  (undo[p.id] = undo[p.id] || []).push({ key, amt: chip });
  ready.delete(p.id);
  renderAll();
}

function undoBet() {
  const p = activePlayer();
  const last = p && undo[p.id]?.pop();
  if (spinning || !last) return;
  bets[p.id][last.key] -= last.amt;
  if (bets[p.id][last.key] <= 0) delete bets[p.id][last.key];
  ready.delete(p.id);
  renderAll();
}

function clearBets() {
  const p = activePlayer();
  if (spinning || !p) return;
  bets[p.id] = {}; undo[p.id] = []; ready.delete(p.id);
  renderAll();
}

function repeatBets() {
  const p = activePlayer();
  if (spinning || !p) return;
  const prev = lastBets[p.id];
  if (!prev) return toast('No previous bets to repeat.', true);
  const total = Object.values(prev).reduce((a, b) => a + b, 0);
  if (total > (p.score || 0)) return toast('Not enough chips to repeat.', true);
  bets[p.id] = { ...prev };
  undo[p.id] = Object.entries(prev).map(([key, amt]) => ({ key, amt }));
  ready.delete(p.id);
  renderAll();
}

/* ---------- Giro ---------- */
export function spinRoulette() {
  if (spinning) return;
  const betting = state.students.filter(s => stakeOf(s.id) > 0);
  if (!betting.length) return toast('Place at least one bet.', true);
  const broke = betting.find(s => stakeOf(s.id) > (s.score || 0));
  if (broke) return toast(`${broke.name} doesn't have enough chips.`, true);

  spinning = true;
  document.body.classList.add('busy');
  $('rlResult').innerHTML = '<span class="rt-wait">No more bets… 🎡</span>';
  renderAll();

  const n = Math.floor(Math.random() * 37);
  const th = ORDER.indexOf(n) * ARC;
  const W0 = wheelAngle, W1 = W0 + TAU * 5;
  const B0 = ballAngle;
  const base = W1 + th;
  const B1 = base - TAU * Math.ceil((base - (B0 - TAU * 5)) / TAU); // la bola gira en sentido contrario
  const duration = 7000, t0 = performance.now();
  let lastPocket = -1, lastTick = 0;

  (function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    const w = W0 + (W1 - W0) * easeOutQuad(t);
    const b = B0 + (B1 - B0) * easeOutQuart(t);
    const drop = Math.min(1, Math.max(0, (t - 0.7) / 0.25));
    moveWheel(w, b, 232 - 60 * easeOutQuad(drop));
    const pocket = Math.floor((((b - w) / ARC + 0.5) % 37 + 37) % 37);
    if (pocket !== lastPocket) {
      lastPocket = pocket;
      if (t < 0.97 && now - lastTick > 70) { playTick(); lastTick = now; }
    }
    if (t < 1) requestAnimationFrame(frame);
    else {
      const k = Math.floor(W1 / TAU);
      wheelAngle = W1 - k * TAU;
      ballAngle = B1 - k * TAU;
      finishRound(n);
    }
  })(t0);
}

function finishRound(n) {
  const rows = [];
  state.students.filter(s => stakeOf(s.id) > 0).forEach(s => {
    const r = settle(bets[s.id], n);
    syncPlayer(s.id, (p, fs) => {
      p.score = Math.max(0, (parseInt(p.score, 10) || 0) - r.stake + r.returned);
      p.streak = r.net > 0 ? (p.streak || 0) + 1 : 0;
      fs.history.unshift({ name: p.name, answered: r.net > 0, points: r.net, streak: p.streak, game: 'roulette', date: stamp() });
      fs.history = fs.history.slice(0, 50);
    });
    rows.push({ name: s.name, ...r });
  });
  state.rounds = (state.rounds || 0) + 1;
  saveState();

  lastBets = bets;
  bets = {}; undo = {}; ready = new Set();
  lastNums = [n, ...lastNums].slice(0, 12);
  spinning = false;
  document.body.classList.remove('busy');

  const winners = rows.filter(r => r.net > 0);
  $('rlResult').innerHTML = `<span class="rt-big ${colorOf(n)}">${n}</span>
    <div class="rt-rows">${rows.map(r => `<div class="rt-res ${r.net > 0 ? 'win' : r.net < 0 ? 'lose' : ''}">
      <span>${esc(r.name)}</span><span>${r.wins.length ? r.wins.map(w => betLabel(w.key)).join(', ') : '—'}</span>
      <b>${r.net > 0 ? '+' : ''}${r.net}</b></div>`).join('')}</div>`;
  if (winners.length) { playWin(); burstConfetti($('rlWheelBox'), 40); } else playSlotLose();

  populatePlayerSelect('rlPlayerSelect', 'rlPlayerChips');
  renderAll();
}

/* ---------- Eventos ---------- */
export function initRoulette() {
  buildWheel();
  buildBoard();
  $('rlBoard').addEventListener('click', e => {
    const c = e.target.closest('[data-bet]');
    if (c) placeBet(c.dataset.bet);
  });
  $('rlChips').addEventListener('click', e => {
    const b = e.target.closest('[data-chip]');
    if (!b) return;
    chip = Number(b.dataset.chip);
    $('rlChips').querySelectorAll('.rt-chipbtn').forEach(x => x.classList.toggle('active', x === b));
  });
  $('rlBets').addEventListener('click', e => {
    const rd = e.target.closest('[data-ready]');
    if (rd) { ready.has(rd.dataset.ready) ? ready.delete(rd.dataset.ready) : ready.add(rd.dataset.ready); return renderAll(); }
    const row = e.target.closest('[data-pid]');
    if (row && !spinning) { $('rlPlayerSelect').value = row.dataset.pid; renderAll(); }
  });
  $('rlPlayerSelect').addEventListener('change', renderAll);
  $('rlUndo').onclick = undoBet;
  $('rlClear').onclick = clearBets;
  $('rlRepeat').onclick = repeatBets;
  $('rlSpin').onclick = spinRoulette;
}
