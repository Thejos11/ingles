/* ============================================================
   ROULETTE ROYALE — Classroom Edition
   app.js  ·  State, wheel, points, history, sounds, confetti
   ============================================================ */

/* =====================================================================
   STATE — everything persists in localStorage
   ===================================================================== */
const STORAGE_KEY = 'roulette-royale-v2';

let state = loadState();
let rotation = 0;
let spinning = false;
let currentWinnerIndex = null; // index in state.students of the current spin winner

function loadState() {
  const fresh = {
    students: [],   // { id, name, score, streak, timesSelected, timesAnswered }
    history: [],    // { name, answered, points, streak, date }
    rounds: 0
  };
  try {
    return Object.assign(fresh, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
  } catch (e) { return fresh; }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

/* ---------- Small helpers ---------- */
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const byId = id => state.students.find(s => s.id === id);
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' err' : '');
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* =====================================================================
   SOUND EFFECTS (Web Audio API — no external files needed)
   ===================================================================== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playTick() {
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.value = 900 + Math.random() * 400;
  g.gain.setValueAtTime(0.08, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.06);
}

function playWin() {
  ensureAudio();
  [523, 659, 784].forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.4);
    o.connect(g).connect(audioCtx.destination);
    o.start(audioCtx.currentTime + i * 0.12);
    o.stop(audioCtx.currentTime + i * 0.12 + 0.4);
  });
}

function playCorrect() {
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
  g.gain.setValueAtTime(0.15, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.3);
}

function playWrong() {
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sawtooth';
  o.frequency.value = 200;
  g.gain.setValueAtTime(0.1, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.3);
}

/* =====================================================================
   CONFETTI (canvas inside the modal)
   ===================================================================== */
function launchConfetti() {
  const canvas = $('confettiCanvas');
  if (!canvas) return;
  const card = canvas.parentElement;
  canvas.width = card.offsetWidth;
  canvas.height = card.offsetHeight;
  const ctx = canvas.getContext('2d');

  const particles = Array.from({ length: 80 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 12 - 4,
    size: Math.random() * 6 + 3,
    color: ['#a78bfa', '#c4b5fd', '#34d399', '#f0d77a', '#f87171', '#7c3aed', '#e9d5ff'][Math.floor(Math.random() * 7)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 12,
    life: 1
  }));

  let frame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.rotation += p.rotSpeed;
      p.life -= 0.012;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (alive) frame = requestAnimationFrame(animate);
  }
  animate();

  // Cleanup after animation
  setTimeout(() => {
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 4000);
}

/* =====================================================================
   PLAYER MANAGEMENT
   ===================================================================== */
function addPlayers() {
  if (spinning) return;
  const raw = $('namesInput').value;
  const names = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  if (!names.length) return toast('Type at least one name.', true);

  const known = new Set(state.students.map(s => s.name.toLowerCase()));
  let added = 0, skipped = 0;

  names.forEach(n => {
    if (known.has(n.toLowerCase())) { skipped++; return; }
    known.add(n.toLowerCase());
    state.students.push({
      id: uid(),
      name: n.slice(0, 40),
      score: 0,
      streak: 0,
      timesSelected: 0,
      timesAnswered: 0
    });
    added++;
  });

  $('namesInput').value = '';
  saveState();
  render();
  toast(`${added} player${added !== 1 ? 's' : ''} added` +
        (skipped ? ` · ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : '') + '.',
        !added);
}

function removeStudent(id) {
  if (spinning) return;
  state.students = state.students.filter(s => s.id !== id);
  saveState();
  render();
}

function editStudent(id) {
  const student = byId(id);
  if (!student) return;
  $('editNameInput').value = student.name;
  $('editPlayerId').value = id;
  $('editModal').classList.add('open');
  $('editNameInput').focus();
}

function saveEdit() {
  const id = $('editPlayerId').value;
  const newName = $('editNameInput').value.trim();
  if (!newName) return toast('Name cannot be empty.', true);

  const student = byId(id);
  if (!student) return;

  // Check duplicates
  const exists = state.students.some(s => s.id !== id && s.name.toLowerCase() === newName.toLowerCase());
  if (exists) return toast('A player with that name already exists.', true);

  student.name = newName.slice(0, 40);
  saveState();
  render();
  closeEditModal();
  toast(`Name updated to "${newName}".`);
}

function closeEditModal() {
  $('editModal').classList.remove('open');
}

function clearAll() {
  if (spinning || !state.students.length) return;
  if (!confirm('Clear all players and history?')) return;
  state.students = [];
  state.history = [];
  state.rounds = 0;
  saveState();
  render();
}

function resetScores() {
  if (spinning || !state.students.length) return;
  if (!confirm('Reset all points to 0?')) return;
  state.students.forEach(s => { s.score = 0; s.streak = 0; s.timesSelected = 0; s.timesAnswered = 0; });
  state.history = [];
  state.rounds = 0;
  saveState();
  render();
  toast('Points reset.');
}

/* =====================================================================
   WHEEL DRAWING (Canvas)
   ===================================================================== */
const canvas = $('wheel');
const ctx = canvas.getContext('2d');
const SIZE = canvas.width;
const C = SIZE / 2;
const R = C - 10;

/* Purple palette for wheel slices */
const SLICE_COLORS = [
  '#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed',
  '#8b5cf6', '#3b0764', '#581c87', '#6b21a8',
  '#1e1b4b', '#312e81', '#4338ca', '#4f46e5'
];

function sliceColor(i, n) {
  return SLICE_COLORS[i % SLICE_COLORS.length];
}

function drawWheel() {
  const n = state.students.length;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.translate(C, C);
  ctx.rotate(rotation);

  if (n === 0) {
    // Empty placeholder
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'center';
    ctx.font = '700 36px Outfit, sans-serif';
    ctx.fillText('Add players', C, C - 12);
    ctx.font = '400 22px Outfit, sans-serif';
    ctx.fillStyle = '#8b85a0';
    ctx.fillText('to fill the wheel', C, C + 24);
    return;
  }

  const arc = Math.PI * 2 / n;
  const fontSize = Math.max(12, Math.min(44, (Math.PI * 2 * R * 0.7 / n) * 0.55));
  ctx.font = `700 ${fontSize}px Outfit, sans-serif`;
  ctx.textBaseline = 'middle';

  state.students.forEach((s, i) => {
    const a0 = i * arc;
    const a1 = a0 + arc;

    // Slice
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = sliceColor(i, n);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(167,139,250,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Name
    ctx.save();
    ctx.rotate(a0 + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ede9fe';
    const label = s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name;
    ctx.fillText(label, R - 30, 0, R * 0.65);
    ctx.restore();
  });

  // Hub circle
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  const hub = ctx.createRadialGradient(-8, -8, 4, 0, 0, 48);
  hub.addColorStop(0, '#c4b5fd');
  hub.addColorStop(0.5, '#7c3aed');
  hub.addColorStop(1, '#3b0764');
  ctx.fillStyle = hub;
  ctx.fill();
  ctx.strokeStyle = 'rgba(167,139,250,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

/* =====================================================================
   SPIN ENGINE
   ===================================================================== */
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

// Tick sound tracking
let lastSliceIndex = -1;

function spin() {
  const n = state.students.length;
  if (spinning) return;
  if (n < 2) return toast('Add at least 2 players to spin.', true);

  spinning = true;
  document.body.classList.add('busy');
  $('spinBtn').disabled = true;
  $('statusText').textContent = '🎰 The wheel is spinning…';
  lastSliceIndex = -1;

  // Pick winner (uniform random)
  const w = Math.floor(Math.random() * n);
  const arc = Math.PI * 2 / n;

  // Calculate final angle so slice w ends under pointer (top = -90°)
  const jitter = (Math.random() - 0.5) * 0.65;
  const targetAngle = -Math.PI / 2 - (w + 0.5 + jitter) * arc;
  const twoPi = Math.PI * 2;
  const delta = (((targetAngle - rotation) % twoPi) + twoPi) % twoPi;
  const start = rotation;
  const end = rotation + delta + twoPi * (5 + Math.floor(Math.random() * 4));

  const duration = 6500;
  const t0 = performance.now();

  (function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    rotation = start + (end - start) * easeOutQuart(t);
    drawWheel();

    // Tick sound when crossing slice boundary
    const currentAngle = ((-Math.PI / 2 - rotation) % twoPi + twoPi) % twoPi;
    const currentSlice = Math.floor(currentAngle / arc) % n;
    if (currentSlice !== lastSliceIndex) {
      lastSliceIndex = currentSlice;
      if (t > 0.1 && t < 0.95) playTick();
    }

    if (t < 1) requestAnimationFrame(frame);
    else finishSpin(w);
  })(t0);
}

function finishSpin(w) {
  const winner = state.students[w];
  currentWinnerIndex = w;

  // Increment selection count
  winner.timesSelected = (winner.timesSelected || 0) + 1;
  state.rounds = (state.rounds || 0) + 1;

  spinning = false;
  document.body.classList.remove('busy');
  $('spinBtn').disabled = false;

  // Play win sound
  playWin();

  // Show modal
  $('winnerName').textContent = winner.name;
  $('scoreQuestion').classList.add('visible');
  $('pointsSelector').classList.remove('visible');
  $('scoreResultBadge').className = 'score-result-badge';
  $('scoreResultBadge').textContent = '';
  $('modal').classList.add('open');

  saveState();
  render();
}

/* =====================================================================
   SCORE RESPONSE (modal buttons)
   ===================================================================== */
function handleAnswered() {
  // Hide yes/no buttons, show points selector
  $('scoreQuestion').classList.remove('visible');
  $('pointsSelector').classList.add('visible');
  playCorrect();
}

function handleSkipped() {
  const winner = state.students[currentWinnerIndex];
  if (!winner) return;

  // Reset streak
  winner.streak = 0;

  // Record in history
  state.history.unshift({
    name: winner.name,
    answered: false,
    points: 0,
    streak: 0,
  date: new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  });
  state.history = state.history.slice(0, 30);

  // Show result
  $('scoreQuestion').classList.remove('visible');
  $('pointsSelector').classList.remove('visible');
  const badge = $('scoreResultBadge');
  badge.className = 'score-result-badge skipped';
  badge.textContent = '❌ No answer — 0 points';

  playWrong();
  saveState();
  render();
}

function handlePoints(pts) {
  const winner = state.students[currentWinnerIndex];
  if (!winner) return;

  // Add points
  winner.score = (winner.score || 0) + pts;
  winner.streak = (winner.streak || 0) + 1;
  winner.timesAnswered = (winner.timesAnswered || 0) + 1;

  // Record in history
  state.history.unshift({
    name: winner.name,
    answered: true,
    points: pts,
    streak: winner.streak,
  date: new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  });
  state.history = state.history.slice(0, 30);

  // Show result
  $('pointsSelector').classList.remove('visible');
  const badge = $('scoreResultBadge');
  badge.className = 'score-result-badge answered';
  badge.textContent = `✅ +${pts} point${pts > 1 ? 's' : ''} — Streak: ${winner.streak} 🔥`;

  // Confetti!
  launchConfetti();
  playCorrect();

  saveState();
  render();
}

function closeModal() {
  $('modal').classList.remove('open');
  currentWinnerIndex = null;
}

/* =====================================================================
   EXPORT (CSV)
   ===================================================================== */
function exportCSV() {
  if (!state.students.length) return toast('No data to export.', true);

  const sorted = [...state.students].sort((a, b) => (b.score || 0) - (a.score || 0));
  let csv = 'Position,Name,Points,Streak,Times Selected,Times Answered\n';

  sorted.forEach((s, i) => {
    csv += `${i + 1},"${s.name}",${s.score || 0},${s.streak || 0},${s.timesSelected || 0},${s.timesAnswered || 0}\n`;
  });

  // History section
  csv += '\nHistory\n';
  csv += 'Name,Answered,Points,Streak,Date\n';
  state.history.forEach(h => {
    csv += `"${h.name}",${h.answered ? 'Yes' : 'No'},${h.points},${h.streak || 0},"${h.date || ''}"\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roulette_results_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('📥 CSV file downloaded.');
}

/* =====================================================================
   RENDERING
   ===================================================================== */
function render() {
  const n = state.students.length;
  $('playerCount').textContent = n;
  $('roundCount').textContent = state.rounds || 0;

  // ---------- Podium (top 3) ----------
  const sorted = [...state.students].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top3 = sorted.slice(0, 3).filter(s => s.score > 0);

  if (top3.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['gold', 'silver', 'bronze'];
    $('podium').innerHTML = top3.map((s, i) => `
      <div class="podium-item ${classes[i]}">
        <span class="podium-medal">${medals[i]}</span>
        <span class="podium-name">${esc(s.name)}</span>
        <span class="podium-pts">${s.score} pts</span>
      </div>
    `).join('');
    $('podium').style.display = 'flex';
  } else {
    $('podium').innerHTML = '';
    $('podium').style.display = 'none';
  }

  // ---------- Roster (LEFT — player list, original order) ----------
  $('roster').innerHTML = state.students.length ? state.students.map((s, i) => `
    <div class="player-row" data-id="${s.id}">
      <span class="player-rank">${i + 1}</span>
      <span class="player-name">${esc(s.name)}</span>
      <span class="player-score">${s.score || 0} pts</span>
      <span class="player-actions">
        <button class="btn btn-ghost" data-edit="${s.id}" title="Edit">✏️</button>
        <button class="btn btn-danger lockable" data-remove="${s.id}" title="Remove">✕</button>
      </span>
    </div>
  `).join('') : '<p class="empty-text">No players yet. Add names above.</p>';

  // ---------- Ranking list (RIGHT — sorted by score) ----------
  $('rankingList').innerHTML = sorted.length ? sorted.map((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    return `
    <div class="player-row ${i < 3 && s.score > 0 ? 'score-highlight' : ''}">
      <span class="player-rank">${medal || (i + 1)}</span>
      <span class="player-name">${esc(s.name)}</span>
      ${s.streak > 1 ? `<span class="player-streak">🔥${s.streak}</span>` : ''}
      <span class="player-score">${s.score || 0} pts</span>
    </div>`;
  }).join('') : '<p class="empty-text">No ranking data yet.</p>';

  // ---------- History ----------
  $('history').innerHTML = state.history.length ? '<div class="history-list">' + state.history.map(h => `
    <div class="history-row">
      <span class="history-icon">${h.answered ? '✅' : '❌'}</span>
      <span class="history-name">${esc(h.name)}</span>
      <span class="history-pts ${h.answered ? 'positive' : 'zero'}">${h.answered ? '+' + h.points : '0'}</span>
      ${h.streak > 1 ? `<span class="history-streak">🔥${h.streak}</span>` : ''}
      <span class="history-meta">${h.date || ''}</span>
    </div>
  `).join('') + '</div>' : '<p class="empty-text">The wheel hasn\'t been spun yet.</p>';

  // ---------- Status ----------
  if (!spinning) {
    $('statusText').textContent = n < 2
      ? 'Waiting for players…'
      : 'Ready to spin! 🎲';
  }

  drawWheel();
}

/* =====================================================================
   EVENT BINDINGS
   ===================================================================== */
// Add players
$('addBtn').onclick = addPlayers;
$('namesInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addPlayers();
});

// Management
$('clearBtn').onclick = clearAll;
$('resetBtn').onclick = resetScores;

// Spin
$('spinBtn').onclick = spin;

// Modal
$('btnAnswered').onclick = handleAnswered;
$('btnSkipped').onclick = handleSkipped;
$('closeModal').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

// Points selector
$('assignPointsBtn').onclick = () => {
  const pts = parseInt($('customPointsInput').value, 10);
  if (isNaN(pts) || pts < 1) {
    toast('Please enter a valid number greater than 0.', true);
    return;
  }
  handlePoints(pts);
};

// Edit modal
$('editSaveBtn').onclick = saveEdit;
$('editCancelBtn').onclick = closeEditModal;
$('editModal').addEventListener('click', e => { if (e.target.id === 'editModal') closeEditModal(); });
$('editNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveEdit(); });

// Export
$('exportBtn').onclick = exportCSV;

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeEditModal();
  }
  // Space to spin (when not in input)
  if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    e.preventDefault();
    spin();
  }
});

// Event delegation for dynamic buttons (edit / remove)
document.addEventListener('click', e => {
  const rm = e.target.closest('[data-remove]');
  if (rm) removeStudent(rm.dataset.remove);

  const ed = e.target.closest('[data-edit]');
  if (ed) editStudent(ed.dataset.edit);
});

/* =====================================================================
   INIT
   ===================================================================== */
// Wait for fonts then draw
if (document.fonts) document.fonts.ready.then(drawWheel);
render();
