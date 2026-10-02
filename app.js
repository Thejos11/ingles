/* ============================================================
   CASINO ROYALE HUB — Classroom Edition
   app.js  ·  Hub Navigation, Roulette, Slots, Blackjack
   ============================================================ */

/* =====================================================================
   STATE — everything persists in localStorage
   ===================================================================== */
const STORAGE_KEY = 'roulette-royale-v2';

let state = loadState();
let rotation = 0;
let spinning = false;
let currentWinnerIndex = null;

function loadState() {
  const fresh = {
    students: [],   // { id, name, score, streak, timesSelected, timesAnswered, achievements: [], inventory: [], bjStreak: 0 }
    history: [],    // { name, answered, points, streak, date, game }
    rounds: 0
  };
  try {
    return Object.assign(fresh, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
  } catch (e) { return fresh; }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function syncPlayer(id, action) {
  const freshState = loadState();
  const p = freshState.students.find(s => s.id === id);
  if (!p) return null;
  
  if (!p.achievements) p.achievements = [];
  if (!p.inventory) p.inventory = [];
  if (p.bjStreak === undefined) p.bjStreak = 0;

  action(p, freshState);
  
  // Check common achievements
  if (p.score >= 100 && !p.achievements.includes('rich')) {
    p.achievements.push('rich');
    showAchievementToast('High Roller', 'Reached 100 chips!', '💰');
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
  state = freshState; // Update global state
  return p;
}

function showAchievementToast(name, desc, icon) {
  const container = $('achievementToasts');
  const t = document.createElement('div');
  t.className = 'achievement-toast';
  t.innerHTML = `<div class="achievement-icon">${icon}</div>
                 <div class="achievement-text"><h4>Achievement Unlocked!</h4><p>${name} - ${desc}</p></div>`;
  container.appendChild(t);
  playWin();
  setTimeout(() => {
    t.style.animation = 'slideInRight 0.4s reverse both';
    setTimeout(() => t.remove(), 400);
  }, 4000);
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

/* Slot-specific sounds */
function playSlotTick() {
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = 600 + Math.random() * 200;
  g.gain.setValueAtTime(0.04, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.04);
}

function playSlotWin() {
  ensureAudio();
  const notes = [660, 880, 1100, 1320];
  notes.forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.3);
    o.connect(g).connect(audioCtx.destination);
    o.start(audioCtx.currentTime + i * 0.1);
    o.stop(audioCtx.currentTime + i * 0.1 + 0.3);
  });
}

function playJackpot() {
  ensureAudio();
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  notes.forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    const t = audioCtx.currentTime + i * 0.12;
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.5);
  });
}

function playCardDeal() {
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.value = 1200;
  g.gain.setValueAtTime(0.06, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.05);
}

function playSlotLose() {
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(300, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.25);
  g.gain.setValueAtTime(0.08, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  o.connect(g).connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.25);
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

  setTimeout(() => {
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 4000);
}

/* =====================================================================
   HUB NAVIGATION — SPA View Controller
   ===================================================================== */
let currentView = 'hub';
const VIEW_MAP = {
  hub:       { el: 'viewHub',       label: 'World Selector' },
  roulette:  { el: 'viewRoulette',  label: '🎡 Roulette Royale' },
  slots:     { el: 'viewSlots',     label: '🎰 Neon Slots' },
  blackjack: { el: 'viewBlackjack', label: '🃏 Cyber Blackjack' }
};

function navigateTo(view) {
  if (!VIEW_MAP[view] || view === currentView) return;

  // Deactivate current
  const oldEl = $(VIEW_MAP[currentView].el);
  if (oldEl) oldEl.classList.remove('view-active');

  // Activate new
  currentView = view;
  const newEl = $(VIEW_MAP[view].el);
  if (newEl) {
    newEl.classList.add('view-active');
    // Re-trigger animation
    newEl.style.animation = 'none';
    newEl.offsetHeight; // force reflow
    newEl.style.animation = '';
  }

  // Update topbar view label
  $('currentView').textContent = VIEW_MAP[view].label;

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // If navigating to roulette, redraw wheel
  if (view === 'roulette') {
    drawWheel();
  }

  // If navigating to slots or blackjack, populate player selects
  if (view === 'slots') {
    populatePlayerSelect('slotsPlayerSelect', 'slotsPlayerChips');
    initSlotReels();
  }
  if (view === 'blackjack') {
    populatePlayerSelect('bjPlayerSelect', 'bjPlayerChips');
  }

  // Start/stop hub particles and render leaderboard
  if (view === 'hub') {
    startHubParticles();
    renderHubLeaderboard();
  } else {
    stopHubParticles();
  }
}

function renderHubLeaderboard() {
  const sorted = [...state.students].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top10 = sorted.slice(0, 10);
  const top3 = top10.slice(0, 3).filter(s => s.score > 0);
  
  if (top3.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['gold', 'silver', 'bronze'];
    $('hubPodium').innerHTML = top3.map((s, i) => `
      <div class="podium-item ${classes[i]}">
        <span class="podium-medal">${medals[i]}</span>
        <span class="podium-name">${esc(s.name)}</span>
        <span class="podium-pts">${s.score} pts</span>
      </div>
    `).join('');
  } else {
    $('hubPodium').innerHTML = '<p class="empty-text">No points yet.</p>';
  }

  $('hubLeaderboardList').innerHTML = top10.length ? top10.map((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    return `
    <div class="player-row ${i < 3 && s.score > 0 ? 'score-highlight' : ''}" style="background: rgba(10,10,20,0.8); margin-bottom: 0.3rem;">
      <span class="player-rank">${medal || (i + 1)}</span>
      <span class="player-name">${esc(s.name)}</span>
      ${s.achievements && s.achievements.length ? `<span class="player-streak" style="color:var(--gold)">🏅${s.achievements.length}</span>` : ''}
      <span class="player-score" style="font-size: 1rem;">${s.score || 0} pts</span>
    </div>`;
  }).join('') : '';
}

/* =====================================================================
   HUB PARTICLES — Floating particles on canvas
   ===================================================================== */
let hubParticleFrame = null;
let hubParticles = [];

function startHubParticles() {
  const canvas = $('hubParticles');
  if (!canvas) return;

  const parent = canvas.parentElement;
  canvas.width = parent.offsetWidth;
  canvas.height = parent.offsetHeight;
  const ctx = canvas.getContext('2d');

  // Initialize particles
  if (hubParticles.length === 0) {
    hubParticles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.5 + 0.1,
      color: ['#7c3aed', '#a78bfa', '#c4b5fd', '#22d3ee', '#f0d77a', '#f472b6'][Math.floor(Math.random() * 6)]
    }));
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hubParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();

      // Glow effect
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.15;
      ctx.fill();
    });

    // Draw connecting lines between nearby particles
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1;
    for (let i = 0; i < hubParticles.length; i++) {
      for (let j = i + 1; j < hubParticles.length; j++) {
        const dx = hubParticles[i].x - hubParticles[j].x;
        const dy = hubParticles[i].y - hubParticles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.globalAlpha = 0.06 * (1 - dist / 120);
          ctx.beginPath();
          ctx.moveTo(hubParticles[i].x, hubParticles[i].y);
          ctx.lineTo(hubParticles[j].x, hubParticles[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    hubParticleFrame = requestAnimationFrame(animateParticles);
  }

  // Handle resize
  const resizeHandler = () => {
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
  };
  window.addEventListener('resize', resizeHandler);

  animateParticles();
}

function stopHubParticles() {
  if (hubParticleFrame) {
    cancelAnimationFrame(hubParticleFrame);
    hubParticleFrame = null;
  }
}

/* =====================================================================
   GLOBAL TOPBAR UPDATES
   ===================================================================== */
function updateGlobalStats() {
  $('globalPlayerCount').textContent = state.students.length;
  $('globalRoundCount').textContent = state.rounds || 0;
}

/* =====================================================================
   PLAYER SELECT — Shared for Slots & Blackjack
   ===================================================================== */
function populatePlayerSelect(selectId, chipsId) {
  const sel = $(selectId);
  if (!sel) return;

  const prev = sel.value;
  sel.innerHTML = '';

  if (state.students.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— No players (add in Roulette) —';
    sel.appendChild(opt);
    $(chipsId).textContent = '0';
    return;
  }

  state.students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name} (${s.score || 0} pts)`;
    sel.appendChild(opt);
  });

  // Restore previous selection if still valid
  if (prev && state.students.some(s => s.id === prev)) {
    sel.value = prev;
  }

  // Update chips display
  updateChipsDisplay(selectId, chipsId);
}

function updateChipsDisplay(selectId, chipsId) {
  const sel = $(selectId);
  const player = byId(sel.value);
  $(chipsId).textContent = player ? (player.score || 0) : '0';
}

function getSelectedPlayer(selectId) {
  const sel = $(selectId);
  return byId(sel.value);
}

/* =====================================================================
   PLAYER MANAGEMENT (Roulette)
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
const wheelCanvas = $('wheel');
const wheelCtx = wheelCanvas.getContext('2d');
const SIZE = wheelCanvas.width;
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
  wheelCtx.clearRect(0, 0, SIZE, SIZE);
  wheelCtx.save();
  wheelCtx.translate(C, C);
  wheelCtx.rotate(rotation);

  if (n === 0) {
    // Empty placeholder
    wheelCtx.beginPath();
    wheelCtx.arc(0, 0, R, 0, Math.PI * 2);
    wheelCtx.fillStyle = '#1e1b4b';
    wheelCtx.fill();
    wheelCtx.strokeStyle = '#4c1d95';
    wheelCtx.lineWidth = 4;
    wheelCtx.stroke();
    wheelCtx.restore();
    wheelCtx.fillStyle = '#a78bfa';
    wheelCtx.textAlign = 'center';
    wheelCtx.font = '700 36px Outfit, sans-serif';
    wheelCtx.fillText('Add players', C, C - 12);
    wheelCtx.font = '400 22px Outfit, sans-serif';
    wheelCtx.fillStyle = '#8b85a0';
    wheelCtx.fillText('to fill the wheel', C, C + 24);
    return;
  }

  const arc = Math.PI * 2 / n;
  const fontSize = Math.max(12, Math.min(44, (Math.PI * 2 * R * 0.7 / n) * 0.55));
  wheelCtx.font = `700 ${fontSize}px Outfit, sans-serif`;
  wheelCtx.textBaseline = 'middle';

  state.students.forEach((s, i) => {
    const a0 = i * arc;
    const a1 = a0 + arc;

    // Slice
    wheelCtx.beginPath();
    wheelCtx.moveTo(0, 0);
    wheelCtx.arc(0, 0, R, a0, a1);
    wheelCtx.closePath();
    wheelCtx.fillStyle = sliceColor(i, n);
    wheelCtx.fill();

    // Border
    wheelCtx.strokeStyle = 'rgba(167,139,250,0.35)';
    wheelCtx.lineWidth = 2;
    wheelCtx.stroke();

    // Name
    wheelCtx.save();
    wheelCtx.rotate(a0 + arc / 2);
    wheelCtx.textAlign = 'right';
    wheelCtx.fillStyle = '#ede9fe';
    const label = s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name;
    wheelCtx.fillText(label, R - 30, 0, R * 0.65);
    wheelCtx.restore();
  });

  // Hub circle
  wheelCtx.beginPath();
  wheelCtx.arc(0, 0, 48, 0, Math.PI * 2);
  const hub = wheelCtx.createRadialGradient(-8, -8, 4, 0, 0, 48);
  hub.addColorStop(0, '#c4b5fd');
  hub.addColorStop(0.5, '#7c3aed');
  hub.addColorStop(1, '#3b0764');
  wheelCtx.fillStyle = hub;
  wheelCtx.fill();
  wheelCtx.strokeStyle = 'rgba(167,139,250,0.5)';
  wheelCtx.lineWidth = 3;
  wheelCtx.stroke();

  wheelCtx.restore();
}

/* =====================================================================
   SPIN ENGINE (Roulette)
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
   SCORE RESPONSE (modal buttons — Roulette)
   ===================================================================== */
function handleAnswered() {
  $('scoreQuestion').classList.remove('visible');
  $('pointsSelector').classList.add('visible');
  playCorrect();
}

function handleSkipped() {
  const winnerId = state.students[currentWinnerIndex]?.id;
  if (!winnerId) return;

  const winner = syncPlayer(winnerId, (p, freshState) => {
    p.streak = 0;
    freshState.history.unshift({
      name: p.name,
      answered: false,
      points: 0,
      streak: 0,
      game: 'roulette',
      date: new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    });
    freshState.history = freshState.history.slice(0, 50);
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
  const winnerId = state.students[currentWinnerIndex]?.id;
  if (!winnerId) return;

  const winner = syncPlayer(winnerId, (p, freshState) => {
    p.score = Math.max(0, (parseInt(p.score, 10) || 0) + (parseInt(pts, 10) || 0));
    p.streak = (p.streak || 0) + 1;
    p.timesAnswered = (p.timesAnswered || 0) + 1;
    
    freshState.history.unshift({
      name: p.name,
      answered: true,
      points: pts,
      streak: p.streak,
      game: 'roulette',
      date: new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    });
    freshState.history = freshState.history.slice(0, 50);
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

  csv += '\nHistory\n';
  csv += 'Name,Answered,Points,Streak,Game,Date\n';
  state.history.forEach(h => {
    csv += `"${h.name}",${h.answered ? 'Yes' : 'No'},${h.points},${h.streak || 0},"${h.game || 'roulette'}","${h.date || ''}"\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `casino_results_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('📥 CSV file downloaded.');
}

/* =====================================================================
   RENDERING (Roulette + Global)
   ===================================================================== */
function render() {
  const n = state.students.length;
  $('playerCount').textContent = n;
  $('roundCount').textContent = state.rounds || 0;

  // Global topbar
  updateGlobalStats();

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
  $('history').innerHTML = state.history.length ? '<div class="history-list">' + state.history.map(h => {
    const gameIcon = h.game === 'slots' ? '🎰' : h.game === 'blackjack' ? '🃏' : '🎡';
    return `
    <div class="history-row">
      <span class="history-icon">${h.answered ? '✅' : '❌'} ${gameIcon}</span>
      <span class="history-name">${esc(h.name)}</span>
      <span class="history-pts ${h.answered ? 'positive' : 'zero'}">${h.answered ? '+' + h.points : (h.points < 0 ? h.points : '0')}</span>
      ${h.streak > 1 ? `<span class="history-streak">🔥${h.streak}</span>` : ''}
      <span class="history-meta">${h.date || ''}</span>
    </div>
  `}).join('') + '</div>' : '<p class="empty-text">No history yet.</p>';

  // ---------- Status ----------
  if (!spinning) {
    $('statusText').textContent = n < 2
      ? 'Waiting for players…'
      : 'Ready to spin! 🎲';
  }

  drawWheel();
}


/* =====================================================================
   ███████ ██       ██████  ████████ ███████
   ██      ██      ██    ██    ██    ██
   ███████ ██      ██    ██    ██    ███████
        ██ ██      ██    ██    ██         ██
   ███████ ███████  ██████     ██    ███████
   NEON SLOTS — Slot Machine Engine
   ===================================================================== */

const SLOT_SYMBOLS = ['👑', '⭐', '7️⃣', '💎', '🔥', '🍒', '🎰'];
const SLOT_SYMBOL_HEIGHT = 120; // matches CSS .slot-symbol height
let slotBet = 1;
let slotSpinning = false;

/* Symbol weights (lower index = rarer) */
const SLOT_WEIGHTS = [1, 1, 2, 3, 4, 5, 4]; // 👑 & ⭐ are rarest

function weightedRandomSymbol() {
  const totalWeight = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    r -= SLOT_WEIGHTS[i];
    if (r <= 0) return SLOT_SYMBOLS[i];
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

function initSlotReels() {
  // Fill each reel with symbols
  for (let r = 1; r <= 3; r++) {
    const inner = $(`reelInner${r}`);
    inner.innerHTML = '';
    // Create a long strip of symbols for visual spinning
    for (let i = 0; i < 40; i++) {
      const div = document.createElement('div');
      div.className = 'slot-symbol';
      div.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      inner.appendChild(div);
    }
    // Position to show first symbol centered
    inner.style.transition = 'none';
    inner.style.transform = `translateY(0px)`;
  }
}

function spinSlots() {
  if (slotSpinning) return;

  const sel = $('slotsPlayerSelect');
  if (!sel || !sel.value) return toast('Select a player first. Add players in Roulette.', true);
  
  const playerId = sel.value;

  // Refresh state and check balance atomically
  let player = syncPlayer(playerId, p => p);
  if (!player) return toast('Player not found.', true);
  if ((player.score || 0) < slotBet) return toast('Not enough chips to bet!', true);

  slotSpinning = true;
  $('slotSpinBtn').disabled = true;
  $('slotResult').textContent = '';
  $('slotResult').className = 'slot-result';

  // Deduct bet atomically
  player = syncPlayer(playerId, (p) => {
    p.score = Math.max(0, (parseInt(p.score, 10) || 0) - (parseInt(slotBet, 10) || 0));
  });
  updateChipsDisplay('slotsPlayerSelect', 'slotsPlayerChips');


  // Determine final symbols for each reel
  const results = [weightedRandomSymbol(), weightedRandomSymbol(), weightedRandomSymbol()];

  // Animate each reel with staggered timing
  const reelPromises = results.map((finalSymbol, reelIndex) => {
    return new Promise(resolve => {
      const inner = $(`reelInner${reelIndex + 1}`);

      // Rebuild reel strip with final symbol at landing position
      inner.innerHTML = '';
      const totalSymbols = 30 + reelIndex * 8; // more symbols = longer spin
      for (let i = 0; i < totalSymbols; i++) {
        const div = document.createElement('div');
        div.className = 'slot-symbol';
        // Place the final symbol at the last position
        if (i === totalSymbols - 1) {
          div.textContent = finalSymbol;
        } else {
          div.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        }
        inner.appendChild(div);
      }

      // Start from top
      inner.style.transition = 'none';
      inner.style.transform = `translateY(0px)`;

      // Force reflow
      inner.offsetHeight;

      // Start playing tick sounds during spin
      const tickInterval = setInterval(() => playSlotTick(), 80 + reelIndex * 20);

      // Animate to final position
      const finalOffset = -(totalSymbols - 1) * SLOT_SYMBOL_HEIGHT;
      const duration = 1.5 + reelIndex * 0.6;

      inner.style.transition = `transform ${duration}s cubic-bezier(0.15, 0.85, 0.35, 1.02)`;
      inner.style.transform = `translateY(${finalOffset}px)`;

      setTimeout(() => {
        clearInterval(tickInterval);
        resolve();
      }, duration * 1000);
    });
  });

  // When all reels stop, evaluate results
  Promise.all(reelPromises).then(() => {
    try {
      evaluateSlotResult(playerId, results);
    } catch (err) {
      console.error(err);
      toast("Error evaluating result", true);
    } finally {
      slotSpinning = false;
      $('slotSpinBtn').disabled = false;
    }
  }).catch(() => {
    slotSpinning = false;
    $('slotSpinBtn').disabled = false;
  });
}

function evaluateSlotResult(playerId, results) {
  const [a, b, c] = results;
  let multiplier = 0;
  let resultClass = 'lose';
  let message = '';
  let diamondJackpot = false;

  // Validate player still exists before evaluation
  const activePlayer = state.students.find(p => p.id === playerId);
  if (!activePlayer) {
    toast('Player not found — spin voided.', true);
    return;
  }

  // Check for 3 matching
  if (a === b && b === c) {
    switch (a) {
      case '💎': multiplier = 10; resultClass = 'jackpot'; message = `🎉 JACKPOT! 💎💎💎 × 10 = +${slotBet * 10} chips!`; diamondJackpot = true; break;
      case '⭐': multiplier = 7;  resultClass = 'jackpot'; message = `🔥 SUPER STAR! ⭐⭐⭐ × 7 = +${slotBet * 7} chips!`; break;
      default:   multiplier = 3;  resultClass = 'win';     message = `🎰 TRIPLE! ${a}${b}${c} × 3 = +${slotBet * 3} chips!`; break;
    }
  }
  // Check for 2 matching
  else if (a === b || b === c || a === c) {
    multiplier = 1.5;
    resultClass = 'win';
    const winAmount = Math.floor(slotBet * multiplier);
    message = `✨ Two match! × 1.5 = +${winAmount} chips`;
  }
  // No match
  else {
    multiplier = 0;
    resultClass = 'lose';
    message = `😔 Inténtalo de nuevo — Perdiste ${slotBet} chip${slotBet > 1 ? 's' : ''}`;
  }

  // Apply winnings atomically
  const player = syncPlayer(playerId, (p, freshState) => {
    if (multiplier > 0) {
      const winnings = Math.floor(slotBet * multiplier);
      p.score = Math.max(0, (parseInt(p.score, 10) || 0) + winnings);

      if (diamondJackpot && !p.achievements.includes('slots_diamond')) {
        p.achievements.push('slots_diamond');
        showAchievementToast('Diamond Hands', 'Got 3 Diamonds in Slots!', '💎');
      }

      freshState.history.unshift({
        name: p.name,
        answered: true,
        points: winnings - slotBet, // net gain
        streak: 0,
        game: 'slots',
        date: new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
    } else {
      freshState.history.unshift({
        name: p.name,
        answered: false,
        points: -slotBet,
        streak: 0,
        game: 'slots',
        date: new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
    }
    freshState.history = freshState.history.slice(0, 50);
    freshState.rounds = (freshState.rounds || 0) + 1;
  });

  // Sound effects based on result
  if (multiplier >= 7) playJackpot();
  else if (multiplier > 0) playSlotWin();
  else playSlotLose();

  // Update UI
  renderSlotsHistory();
  $('slotResult').textContent = message;
  $('slotResult').className = `slot-result ${resultClass}`;
  updateChipsDisplay('slotsPlayerSelect', 'slotsPlayerChips');
  updateGlobalStats();

  // Also update roulette render if it has been initialized
  if ($('playerCount')) {
    $('playerCount').textContent = state.students.length;
    $('roundCount').textContent = state.rounds || 0;
  }
}

/* ---------- Slots Spin History ---------- */
function renderSlotsHistory() {
  const container = $('slotsHistory');
  if (!container) return;

  const slotsEntries = (state.history || []).filter(h => h.game === 'slots').slice(0, 20);

  if (!slotsEntries.length) {
    container.innerHTML = '<p class="empty-text">No spins yet. Try your luck!</p>';
    return;
  }

  container.innerHTML = slotsEntries.map(h => {
    const isWin = h.answered;
    const icon = isWin ? '✅' : '❌';
    const cls  = isWin ? 'positive' : 'zero';
    const pts  = isWin ? `+${h.points}` : `${h.points}`;
    return `
      <div class="history-row">
        <span class="history-icon">${icon} 🎰</span>
        <span class="history-name">${esc(h.name)}</span>
        <span class="history-pts ${cls}">${pts}</span>
        <span class="history-meta">${h.date || ''}</span>
      </div>`;
  }).join('');
}


/* =====================================================================
   ██████  ██       █████   ██████ ██   ██      ██  █████   ██████ ██   ██
   ██   ██ ██      ██   ██ ██      ██  ██       ██ ██   ██ ██      ██  ██
   ██████  ██      ███████ ██      █████        ██ ███████ ██      █████
   ██   ██ ██      ██   ██ ██      ██  ██  ██   ██ ██   ██ ██      ██  ██
   ██████  ███████ ██   ██  ██████ ██   ██  █████  ██   ██  ██████ ██   ██
   CYBER BLACKJACK — Card Game Engine
   ===================================================================== */

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let bjDeck = [];
let bjPlayerHand = [];
let bjDealerHand = [];
let bjBet = 1;
let bjGameActive = false;
let bjGameOver = false;

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  // Shuffle (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11; // Adjusted dynamically
  return parseInt(card.rank);
}

function handScore(hand) {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    score += cardValue(card);
    if (card.rank === 'A') aces++;
  }
  // Adjust aces from 11 to 1 as needed
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function isBlackjack(hand) {
  return hand.length === 2 && handScore(hand) === 21;
}

function isRedSuit(suit) {
  return suit === '♥' || suit === '♦';
}

function renderCard(card, faceDown = false) {
  if (faceDown) {
    return `<div class="bj-card face-down" style="animation-delay: ${bjPlayerHand.length * 0.1}s"></div>`;
  }
  const colorClass = isRedSuit(card.suit) ? 'red' : 'black';
  return `<div class="bj-card face-up ${colorClass}">${card.rank}<br>${card.suit}</div>`;
}

function renderBjHands(revealDealer = false) {
  // Render player cards
  $('bjPlayerCards').innerHTML = bjPlayerHand.map(c => renderCard(c)).join('');
  $('bjPlayerScore').textContent = handScore(bjPlayerHand);

  // Render dealer cards
  if (revealDealer || bjGameOver) {
    $('bjDealerCards').innerHTML = bjDealerHand.map(c => renderCard(c)).join('');
    $('bjDealerScore').textContent = handScore(bjDealerHand);
  } else {
    // Show first card face up, second face down
    $('bjDealerCards').innerHTML =
      (bjDealerHand.length > 0 ? renderCard(bjDealerHand[0]) : '') +
      (bjDealerHand.length > 1 ? renderCard(bjDealerHand[1], true) : '');
    $('bjDealerScore').textContent = bjDealerHand.length > 0 ? cardValue(bjDealerHand[0]) : '';
  }
}

function bjDeal() {
  const sel = $('bjPlayerSelect');
  if (!sel || !sel.value) return toast('Select a player first.', true);

  let player = syncPlayer(sel.value, p => p);
  if (!player) return toast('Player not found.', true);
  if ((player.score || 0) < bjBet) return toast('Not enough chips to bet!', true);

  // Deduct bet atomically
  player = syncPlayer(sel.value, p => {
    p.score = Math.max(0, (parseInt(p.score, 10) || 0) - (parseInt(bjBet, 10) || 0));
  });
  updateChipsDisplay('bjPlayerSelect', 'bjPlayerChips');

  // Create fresh deck
  bjDeck = createDeck();
  bjPlayerHand = [];
  bjDealerHand = [];
  bjGameActive = true;
  bjGameOver = false;

  // Deal initial cards
  bjPlayerHand.push(bjDeck.pop());
  playCardDeal();
  bjDealerHand.push(bjDeck.pop());
  bjPlayerHand.push(bjDeck.pop());
  bjDealerHand.push(bjDeck.pop());

  // Update player name
  $('bjPlayerName').textContent = player.name;

  // Show actions, hide bet controls
  $('bjBetControls').style.display = 'none';
  $('bjActions').style.display = 'flex';
  $('bjNewRound').style.display = 'none';
  $('bjResult').textContent = '';
  $('bjResult').className = 'bj-result';

  renderBjHands(false);

  // Check for natural blackjack
  if (isBlackjack(bjPlayerHand)) {
    // Reveal dealer and resolve
    bjGameOver = true;
    renderBjHands(true);

    if (isBlackjack(bjDealerHand)) {
      // Push — both have blackjack
      bjEndGame(sel.value, 'push');
    } else {
      // Player wins with natural blackjack (pays 2.5x)
      bjEndGame(sel.value, 'blackjack');
    }
    return;
  }

  // Check if dealer has blackjack
  if (isBlackjack(bjDealerHand)) {
    bjGameOver = true;
    renderBjHands(true);
    bjEndGame(sel.value, 'dealer_blackjack');
  }
}

function bjHit() {
  if (!bjGameActive || bjGameOver) return;

  bjPlayerHand.push(bjDeck.pop());
  playCardDeal();
  renderBjHands(false);

  const score = handScore(bjPlayerHand);
  if (score > 21) {
    // Bust
    bjGameOver = true;
    renderBjHands(true);
    const sel = $('bjPlayerSelect');
    bjEndGame(sel.value, 'bust');
  } else if (score === 21) {
    // Auto-stand at 21
    bjStand();
  }
}

function bjStand() {
  if (!bjGameActive || bjGameOver) return;

  bjGameOver = true;

  // Dealer plays (must hit on 16 or less, stand on 17+)
  renderBjHands(true);

  function dealerDraw() {
    return new Promise(resolve => {
      function drawNext() {
        if (handScore(bjDealerHand) < 17) {
          setTimeout(() => {
            bjDealerHand.push(bjDeck.pop());
            playCardDeal();
            renderBjHands(true);
            drawNext();
          }, 500);
        } else {
          setTimeout(resolve, 300);
        }
      }
      drawNext();
    });
  }

  dealerDraw().then(() => {
    const playerScore = handScore(bjPlayerHand);
    const dealerScore = handScore(bjDealerHand);
    const sel = $('bjPlayerSelect');

    if (dealerScore > 21) {
      bjEndGame(sel.value, 'dealer_bust');
    } else if (playerScore > dealerScore) {
      bjEndGame(sel.value, 'win');
    } else if (dealerScore > playerScore) {
      bjEndGame(sel.value, 'lose');
    } else {
      bjEndGame(sel.value, 'push');
    }
  });
}

function bjEndGame(playerId, result) {
  bjGameActive = false;
  $('bjActions').style.display = 'none';
  $('bjNewRound').style.display = 'inline-flex';

  let message = '';
  let resultClass = '';
  let netGain = 0;

  const pScore = handScore(bjPlayerHand);
  const dScore = handScore(bjDealerHand);

  switch (result) {
    case 'blackjack':
      netGain = Math.floor(bjBet * 2.5); // pays 3:2 means total return is 2.5x bet
      message = `🎉 BLACKJACK! 21 natural! +${netGain} chips!`;
      resultClass = 'blackjack';
      playJackpot();
      break;

    case 'win':
      netGain = bjBet * 2;
      message = `✅ You win! ${pScore} vs ${dScore} — +${netGain} chips!`;
      resultClass = 'win';
      playWin();
      break;

    case 'dealer_bust':
      netGain = bjBet * 2;
      message = `✅ Dealer busts with ${dScore}! +${netGain} chips!`;
      resultClass = 'win';
      playWin();
      break;

    case 'push':
      netGain = bjBet;
      message = `🤝 Push! ${pScore} vs ${dScore} — Bet returned.`;
      resultClass = 'push';
      playTick();
      break;

    case 'bust':
      message = `💥 Bust! ${pScore} — Lost ${bjBet} chip${bjBet > 1 ? 's' : ''}.`;
      resultClass = 'lose';
      playWrong();
      break;

    case 'dealer_blackjack':
      message = `🃏 Dealer has Blackjack! Lost ${bjBet} chip${bjBet > 1 ? 's' : ''}.`;
      resultClass = 'lose';
      playWrong();
      break;

    case 'lose':
      message = `❌ Dealer wins. ${pScore} vs ${dScore} — Lost ${bjBet} chip${bjBet > 1 ? 's' : ''}.`;
      resultClass = 'lose';
      playWrong();
      break;
  }

  // Record history and points atomically
  const player = syncPlayer(playerId, (p, freshState) => {
    const isWin = ['blackjack', 'win', 'dealer_bust'].includes(result);
    p.score = Math.max(0, (parseInt(p.score, 10) || 0) + (parseInt(netGain, 10) || 0));

    if (isWin) {
      p.bjStreak = (p.bjStreak || 0) + 1;
      if (p.bjStreak >= 3 && !p.achievements.includes('bj_streak')) {
        p.achievements.push('bj_streak');
        showAchievementToast('Card Shark', 'Won 3 Blackjack hands in a row!', '🦈');
      }
    } else if (result !== 'push') {
      p.bjStreak = 0;
    }

    const actualNet = isWin ? (netGain - bjBet) : (result === 'push' ? 0 : -bjBet);
    freshState.history.unshift({
      name: p.name,
      answered: isWin,
      points: actualNet,
      streak: p.bjStreak,
      game: 'blackjack',
      date: new Date().toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    });
    freshState.history = freshState.history.slice(0, 50);
    freshState.rounds = (freshState.rounds || 0) + 1;
  });

  updateChipsDisplay('bjPlayerSelect', 'bjPlayerChips');
  updateGlobalStats();

  $('bjResult').textContent = message;
  $('bjResult').className = `bj-result ${resultClass}`;

  // Update roulette stats
  if ($('playerCount')) {
    $('playerCount').textContent = state.students.length;
    $('roundCount').textContent = state.rounds || 0;
  }
}

function bjNewRound() {
  // Reset to bet phase
  $('bjBetControls').style.display = 'flex';
  $('bjActions').style.display = 'none';
  $('bjNewRound').style.display = 'none';
  $('bjResult').textContent = '';
  $('bjResult').className = 'bj-result';
  $('bjPlayerCards').innerHTML = '';
  $('bjDealerCards').innerHTML = '';
  $('bjPlayerScore').textContent = '';
  $('bjDealerScore').textContent = '';
  $('bjPlayerName').textContent = 'Player';

  bjPlayerHand = [];
  bjDealerHand = [];
  bjGameActive = false;
  bjGameOver = false;

  // Refresh player chips display
  updateChipsDisplay('bjPlayerSelect', 'bjPlayerChips');
}


/* =====================================================================
   STORE & ADMIN PANEL LOGIC
   ===================================================================== */
const STORE_ITEMS = [
  { id: 'pass', name: 'Late Delivery Pass', cost: 50, icon: '🎫' },
  { id: 'points', name: '+0.5 on Next Exam', cost: 200, icon: '📝' },
  { id: 'music', name: 'Pick Next Song', cost: 30, icon: '🎵' },
  { id: 'skip', name: 'Skip Homework', cost: 300, icon: '🎮' }
];

function initStore() {
  $('storeGrid').innerHTML = STORE_ITEMS.map(item => `
    <div class="store-item">
      <div class="store-item-icon">${item.icon}</div>
      <div class="store-item-name">${item.name}</div>
      <div class="store-item-cost">${item.cost} 🪙</div>
      <button class="btn btn-primary btn-sm" style="margin-top: 0.5rem;" onclick="buyItem('${item.id}', ${item.cost})">Buy</button>
    </div>
  `).join('');
}

function buyItem(itemId, cost) {
  const sel = $('storePlayerSelect');
  if (!sel || !sel.value) return toast('Select a player to purchase!', true);
  
  const player = syncPlayer(sel.value, p => p);
  if (!player) return toast('Player not found.', true);
  if (player.score < cost) return toast('Not enough chips to buy this item!', true);

  syncPlayer(sel.value, p => {
    p.score = Math.max(0, (parseInt(p.score, 10) || 0) - (parseInt(cost, 10) || 0));
    p.inventory.push(itemId);
  });
  
  updateChipsDisplay('storePlayerSelect', 'storePlayerChips');
  toast('Item purchased successfully!');
  playWin();
}

$('storeBtn').onclick = () => {
  populatePlayerSelect('storePlayerSelect', 'storePlayerChips');
  $('storeModal').classList.add('open');
};
$('closeStoreBtn').onclick = () => $('storeModal').classList.remove('open');
$('storePlayerSelect').addEventListener('change', () => updateChipsDisplay('storePlayerSelect', 'storePlayerChips'));

// Admin Panel
$('adminBtn').onclick = () => {
  const sel = $('adminPlayerSelect');
  sel.innerHTML = state.students.map(s => `<option value="${s.id}">${s.name} (${s.score} pts)</option>`).join('');
  $('adminModal').classList.add('open');
};
$('closeAdminBtn').onclick = () => $('adminModal').classList.remove('open');

$('adminAddBtn').onclick = () => {
  const id = $('adminPlayerSelect').value;
  const pts = parseInt($('adminPointsInput').value) || 0;
  if (!id || pts <= 0) return;
  syncPlayer(id, p => { p.score = Math.max(0, (parseInt(p.score, 10) || 0) + pts); });
  toast(`Added ${pts} points.`);
  $('adminBtn').click(); // refresh list
  render();
};

$('adminSubBtn').onclick = () => {
  const id = $('adminPlayerSelect').value;
  const pts = parseInt($('adminPointsInput').value) || 0;
  if (!id || pts <= 0) return;
  syncPlayer(id, p => { p.score = Math.max(0, (parseInt(p.score, 10) || 0) - pts); });
  toast(`Subtracted ${pts} points.`);
  $('adminBtn').click();
  render();
};

$('adminResetPlayerBtn').onclick = () => {
  const id = $('adminPlayerSelect').value;
  if (!id) return;
  syncPlayer(id, p => { p.score = 0; });
  toast(`Player points reset to 0.`);
  $('adminBtn').click();
  render();
};

$('adminExportBtn').onclick = () => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `casino_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

$('adminImportFile').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const newState = JSON.parse(ev.target.result);
      if (newState.students) {
        state = newState;
        saveState();
        render();
        toast('Data imported successfully!');
        $('adminModal').classList.remove('open');
      } else throw new Error("Invalid format");
    } catch (err) {
      toast('Failed to import JSON file.', true);
    }
  };
  reader.readAsText(file);
};

// Fullscreen
$('fullscreenBtn').onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => toast('Fullscreen failed', true));
  } else {
    document.exitFullscreen();
  }
};


/* =====================================================================
   EVENT BINDINGS
   ===================================================================== */

// ---- Hub Navigation ----
document.querySelectorAll('.world-card').forEach(card => {
  card.addEventListener('click', () => {
    const world = card.dataset.world;
    if (world) navigateTo(world);
  });
});

$('hubBtn').addEventListener('click', () => navigateTo('hub'));

// ---- Roulette Events ----
$('addBtn').onclick = addPlayers;
$('namesInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addPlayers();
});

$('clearBtn').onclick = clearAll;
$('resetBtn').onclick = resetScores;
$('spinBtn').onclick = spin;

$('btnAnswered').onclick = handleAnswered;
$('btnSkipped').onclick = handleSkipped;
$('closeModal').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

$('assignPointsBtn').onclick = () => {
  const pts = parseInt($('customPointsInput').value, 10);
  if (isNaN(pts) || pts < 1) {
    toast('Please enter a valid number greater than 0.', true);
    return;
  }
  handlePoints(pts);
};

$('editSaveBtn').onclick = saveEdit;
$('editCancelBtn').onclick = closeEditModal;
$('editModal').addEventListener('click', e => { if (e.target.id === 'editModal') closeEditModal(); });
$('editNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveEdit(); });

$('exportBtn').onclick = exportCSV;

// ---- Slots Events ----
$('slotBetDown').addEventListener('click', () => {
  if (slotBet > 1) {
    slotBet--;
    $('slotBetAmount').textContent = slotBet;
  }
});

$('slotBetUp').addEventListener('click', () => {
  const player = getSelectedPlayer('slotsPlayerSelect');
  const max = player ? (player.score || 0) : 10;
  if (slotBet < max) {
    slotBet++;
    $('slotBetAmount').textContent = slotBet;
  }
});

$('slotSpinBtn').addEventListener('click', spinSlots);

$('slotsPlayerSelect').addEventListener('change', () => {
  updateChipsDisplay('slotsPlayerSelect', 'slotsPlayerChips');
  // Reset bet if it exceeds new player's chips
  const player = getSelectedPlayer('slotsPlayerSelect');
  if (player && slotBet > (player.score || 0)) {
    slotBet = Math.max(1, player.score || 0);
    $('slotBetAmount').textContent = slotBet;
  }
});

// ---- Blackjack Events ----
$('bjBetDown').addEventListener('click', () => {
  if (bjBet > 1) {
    bjBet--;
    $('bjBetAmount').textContent = bjBet;
  }
});

$('bjBetUp').addEventListener('click', () => {
  const player = getSelectedPlayer('bjPlayerSelect');
  const max = player ? (player.score || 0) : 10;
  if (bjBet < max) {
    bjBet++;
    $('bjBetAmount').textContent = bjBet;
  }
});

$('bjDealBtn').addEventListener('click', bjDeal);
$('bjHitBtn').addEventListener('click', bjHit);
$('bjStandBtn').addEventListener('click', bjStand);
$('bjNewRound').addEventListener('click', bjNewRound);

$('bjPlayerSelect').addEventListener('change', () => {
  updateChipsDisplay('bjPlayerSelect', 'bjPlayerChips');
  const player = getSelectedPlayer('bjPlayerSelect');
  if (player && bjBet > (player.score || 0)) {
    bjBet = Math.max(1, player.score || 0);
    $('bjBetAmount').textContent = bjBet;
  }
});

// ---- Keyboard shortcuts ----
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeEditModal();
  }
  // Space to spin (when in Roulette and not in input)
  if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    e.preventDefault();
    if (currentView === 'roulette') spin();
    else if (currentView === 'slots' && !slotSpinning) spinSlots();
  }
});

// ---- Event delegation for dynamic buttons (edit / remove) ----
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
initSlotReels();
initStore();
startHubParticles();
renderHubLeaderboard();

// Handle window resize for hub particles
window.addEventListener('resize', () => {
  if (currentView === 'hub') {
    stopHubParticles();
    hubParticles = [];
    startHubParticles();
  }
});

