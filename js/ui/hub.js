/* js/ui/hub.js */
import { $, esc } from '../core/dom.js';
import { state } from '../core/state.js';
import { drawWheel } from '../games/wheel.js';
import { initSlotReels } from '../games/slots.js';
import { populatePlayerSelect, updateBottomBar } from './players.js';
import { enterRoulette } from '../games/roulette.js';

export let currentView = 'hub';

const VIEW_MAP = {
  hub:       { el: 'viewHub',       label: 'World Selector' },
  wheel:     { el: 'viewWheel',     label: '🎯 Wheel of Fortune' },
  roulette:  { el: 'viewRoulette',  label: '🎡 Roulette' },
  slots:     { el: 'viewSlots',     label: '🎰 Neon Slots' },
  blackjack: { el: 'viewBlackjack', label: '🃏 Cyber Blackjack' },
  players:   { el: 'viewPlayers',   label: '👥 Players' }
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

  // If navigating to wheel, redraw wheel
  if (view === 'wheel') {
    drawWheel();
  }

  // If navigating to slots or blackjack, populate player selects
  if (view === 'slots') {
    populatePlayerSelect('slotsPlayerSelect', 'slotsPlayerChips');
    initSlotReels();
  }
  if (view === 'roulette') enterRoulette();
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
  document.body.dataset.view = view;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  updateBottomBar();
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

  animateParticles();
}

function stopHubParticles() {
  if (hubParticleFrame) {
    cancelAnimationFrame(hubParticleFrame);
    hubParticleFrame = null;
  }
}

const HUB_NODES = {
  wheel: { view: 'wheel', title: 'Wheel of Fortune', img: 'https://images.unsplash.com/photo-1627831389670-d20f5a01c536?auto=format&fit=crop&w=900&q=70', credit: 'Hush Naidoo Jade Photography', creditUrl: 'https://unsplash.com/@hush52',
    key: 'Space', keyLabel: 'Spin', req: '2+ players',
    desc: 'Spin the wheel, pick a student at random and award points for correct answers. Points become chips for the other worlds.' },
  slots: { view: 'slots', title: 'Neon Slots', img: 'https://images.unsplash.com/photo-1518895312237-a9e23508077d?auto=format&fit=crop&w=900&q=70', credit: 'Carl Raw', creditUrl: 'https://unsplash.com/@carltraw',
    key: 'Space', keyLabel: 'Pull lever', req: '1+ chip',
    desc: 'Three reels and one payline. Pairs pay x1.5, triples x3, and three diamonds hit the x10 jackpot.' },
  blackjack: { view: 'blackjack', title: 'Cyber Blackjack', img: 'https://images.unsplash.com/photo-1728165932410-4238dd745af2?auto=format&fit=crop&w=900&q=70', credit: 'Samyam Kittur', creditUrl: 'https://unsplash.com/@ideawashy',
    key: 'H / S', keyLabel: 'Hit / Stand', req: '1+ chip',
    desc: 'Beat the dealer without going over 21. A natural blackjack pays 3:2. Deal with Enter, hit with H and stand with S.' },
  roulette: { view: 'roulette', title: 'Roulette', img: '', credit: 'Unsplash', creditUrl: 'https://unsplash.com',
    key: 'Space', keyLabel: 'Spin', req: '1+ chip',
    desc: 'European roulette: everyone bets chips on numbers, colors, even/odd, dozens or columns, then the ball decides. A number pays 35:1.' },
  ranking: { title: 'Top 10' }
};
let hubSelected = 'wheel';

function selectHubNode(key) {
  const n = HUB_NODES[key];
  if (!n) return;
  hubSelected = key;
  document.querySelectorAll('.hub-node[data-node]').forEach(b => b.classList.toggle('selected', b.dataset.node === key));
  document.querySelectorAll('.graph-line').forEach(l => l.classList.toggle('lit', l.dataset.to === key));
  const rank = key === 'ranking';
  $('hdTitle').textContent = n.title;
  $('hdGame').hidden = rank;
  $('hdRank').hidden = !rank;
  const img = $('hdImg');
  img.hidden = rank;
  if (!rank) {
    img.onerror = () => { img.hidden = true; };
    if (img.getAttribute('src') !== n.img) img.src = n.img;
    img.alt = n.title;
    $('hdKey').innerHTML = `<kbd>${n.key}</kbd> ${n.keyLabel}`;
    $('hdDesc').textContent = n.desc;
    $('hdReq').textContent = n.req;
    const c = $('hdCredit');
    c.textContent = n.credit;
    c.href = n.creditUrl;
  }
}

function enterHubNode(key) {
  const n = HUB_NODES[key];
  if (n && n.view) navigateTo(n.view);
}

function initHubNodes() {
  document.querySelectorAll('.hub-node[data-node]').forEach(b => {
    const k = b.dataset.node;
    b.addEventListener('focus', () => selectHubNode(k));
    b.addEventListener('mouseenter', () => selectHubNode(k));
    b.addEventListener('click', () => selectHubNode(k));
    b.addEventListener('dblclick', () => enterHubNode(k));
    b.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enterHubNode(k); } });
  });
  $('hdEnter').addEventListener('click', () => enterHubNode(hubSelected));
  selectHubNode('wheel');
}

export function initHub() {
  document.querySelectorAll('.nav-tab').forEach(t => t.addEventListener('click', () => navigateTo(t.dataset.view)));
  initHubNodes();

  $('hubBtn').addEventListener('click', () => navigateTo('hub'));

  window.addEventListener('resize', () => {
    if (currentView === 'hub') {
      stopHubParticles();
      hubParticles = [];
      startHubParticles();
    }
  });
  startHubParticles();
  renderHubLeaderboard();
  updateBottomBar();
}
