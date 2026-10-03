/* js/games/slots.js */
import { playJackpot, playSlotLose, playSlotTick, playSlotWin } from '../core/audio.js';
import { $, esc, pop, toast } from '../core/dom.js';
import { state, syncPlayer } from '../core/state.js';
import { spin } from './wheel.js';
import { showAchievementToast } from '../ui/achievements.js';
import { burstConfetti } from '../ui/confetti.js';
import { getSelectedPlayer, updateChipsDisplay, updateGlobalStats } from '../ui/players.js';

const SLOT_SYMBOLS = ['👑', '⭐', '7️⃣', '💎', '🔥', '🍒', '🎰'];

const SLOT_SYMBOL_HEIGHT = 120; // matches CSS .slot-symbol height

let slotBet = 1;

export let slotSpinning = false;

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

export function initSlotReels() {
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

export function spinSlots() {
  if (slotSpinning) return;

  const sel = $('slotsPlayerSelect');
  if (!sel || !sel.value) return toast('Select a player first. Add players in the Players tab.', true);
  
  const playerId = sel.value;

  // Refresh state and check balance atomically
  let player = syncPlayer(playerId, p => p);
  if (!player) return toast('Player not found.', true);
  if ((player.score || 0) < slotBet) return toast('Not enough chips to bet!', true);

  slotSpinning = true;
  const betAtSpin = slotBet;
  $('slotSpinBtn').disabled = true;
  const machine = document.querySelector('.slot-machine');
  machine.classList.add('pulling');
  setTimeout(() => machine.classList.remove('pulling'), 700);
  $('slotBetDown').disabled = $('slotBetUp').disabled = true;
  $('slotResult').textContent = '';
  $('slotResult').className = 'slot-result';
  document.querySelectorAll('.slot-reel').forEach(r => r.classList.remove('win', 'land', 'is-moving'));
  document.querySelector('.slot-machine').classList.remove('jackpot');

  // Deduct bet atomically
  player = syncPlayer(playerId, (p) => {
    p.score = Math.max(0, (parseInt(p.score, 10) || 0) - (parseInt(betAtSpin, 10) || 0));
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
      for (let i = 0; i < totalSymbols + 1; i++) { // +1: simbolo senuelo bajo el final (rebote)
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

      const reelEl = $(`reel${reelIndex + 1}`);
      reelEl.classList.add('is-moving');

      // Start playing tick sounds during spin
      const tickInterval = setInterval(() => playSlotTick(), 80 + reelIndex * 20);

      // Animate to final position
      const symH = inner.firstElementChild.offsetHeight || SLOT_SYMBOL_HEIGHT; // altura real (cambia en movil)
      const finalOffset = -(totalSymbols - 1) * symH;
      const duration = 1.5 + reelIndex * 0.6;

      inner.style.transition = `transform ${duration}s cubic-bezier(0.15, 0.85, 0.3, 1)`;
      inner.style.transform = `translateY(${finalOffset}px)`;

      setTimeout(() => {
        clearInterval(tickInterval);
        reelEl.classList.remove('is-moving');
        reelEl.classList.add('land'); // rebote al detenerse
        playSlotTick();
        resolve();
      }, duration * 1000);
    });
  });

  // When all reels stop, evaluate results
  Promise.all(reelPromises).then(() => {
    try {
      evaluateSlotResult(playerId, results, betAtSpin);
    } catch (err) {
      console.error(err);
      toast("Error evaluating result", true);
    } finally {
      slotSpinning = false;
      $('slotSpinBtn').disabled = false;
      $('slotBetDown').disabled = $('slotBetUp').disabled = false;
    }
  }).catch(() => {
    slotSpinning = false;
    $('slotSpinBtn').disabled = false;
      $('slotBetDown').disabled = $('slotBetUp').disabled = false;
  });
}

function evaluateSlotResult(playerId, results, slotBet) {
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
      case '💎': multiplier = 10; resultClass = 'jackpot'; message = `🎉 JACKPOT! 💎💎💎 × 10 = +${slotBet * 9} net chips!`; diamondJackpot = true; break;
      case '⭐': multiplier = 7;  resultClass = 'jackpot'; message = `🔥 SUPER STAR! ⭐⭐⭐ × 7 = +${slotBet * 6} net chips!`; break;
      default:   multiplier = 3;  resultClass = 'win';     message = `🎰 TRIPLE! ${a}${b}${c} × 3 = +${slotBet * 2} net chips!`; break;
    }
  }
  // Check for 2 matching
  else if (a === b || b === c || a === c) {
    multiplier = 1.5;
    resultClass = 'win';
    const winAmount = Math.floor(slotBet * multiplier);
    message = winAmount > slotBet ? `✨ Two match! × 1.5 = +${winAmount - slotBet} net chips` : `🤝 Two match — bet returned`;
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

  // Resalta los carretes ganadores y lanza efectos
  if (multiplier > 0) {
    const counts = {};
    results.forEach(sym => { counts[sym] = (counts[sym] || 0) + 1; });
    results.forEach((sym, i) => { if (counts[sym] > 1) $(`reel${i + 1}`).classList.add('win'); });
  }
  const machine = document.querySelector('.slot-machine');
  if (resultClass === 'jackpot') {
    machine.classList.add('jackpot');
    burstConfetti(machine, 120);
    setTimeout(() => machine.classList.remove('jackpot'), 5000);
  } else if (multiplier >= 3) {
    burstConfetti(machine, 50);
  }
  updateChipsDisplay('slotsPlayerSelect', 'slotsPlayerChips');
  updateGlobalStats();

  // Also update wheel render if it has been initialized
  if ($('playerCount')) {
    $('playerCount').textContent = state.students.length;
    $('roundCount').textContent = state.rounds || 0;
  }
}

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

export function initSlots() {
  $('slotBetDown').addEventListener('click', () => {
    if (slotBet > 1) {
      slotBet--;
      $('slotBetAmount').textContent = slotBet;
      pop($('slotBetAmount'));
    }
  });

  $('slotBetUp').addEventListener('click', () => {
    const player = getSelectedPlayer('slotsPlayerSelect');
    const max = player ? (player.score || 0) : 10;
    if (slotBet < max) {
      slotBet++;
      $('slotBetAmount').textContent = slotBet;
      pop($('slotBetAmount'));
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
  initSlotReels();
}
