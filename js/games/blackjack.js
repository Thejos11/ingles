/* js/games/blackjack.js */
import { playCardDeal, playJackpot, playTick, playWin, playWrong } from '../core/audio.js';
import { $, pop, toast } from '../core/dom.js';
import { state, syncPlayer } from '../core/state.js';
import { showAchievementToast } from '../ui/achievements.js';
import { burstConfetti } from '../ui/confetti.js';
import { getSelectedPlayer, updateChipsDisplay, updateGlobalStats } from '../ui/players.js';

const SUITS = ['♠', '♥', '♦', '♣'];

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let bjDeck = [];

let bjPlayerHand = [];

let bjDealerHand = [];

let bjBet = 1;

let bjGameActive = false;

let bjGameOver = false;

let bjPlayerId = null;

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

function faceHTML(card) {
  return `${card.rank}<br>${card.suit}`;
}

function buildCard(card, down, delay) {
  const el = document.createElement('div');
  el.className = `bj-card ${isRedSuit(card.suit) ? 'red' : 'black'} deal-in${down ? ' is-down' : ''}`;
  el.style.setProperty('--d', `${delay}s`);
  // La carta oculta no lleva su valor en el DOM hasta revelarse
  el.innerHTML = `<div class="bj-inner"><div class="bj-face bj-back"></div><div class="bj-face bj-front">${down ? '' : faceHTML(card)}</div></div>`;
  return el;
}

// Sincroniza el DOM con la mano: solo anima las cartas nuevas y voltea la oculta al revelarla
function syncHand(container, hand, hideSecond, baseDelay = 0) {
  if (container.children.length > hand.length) container.innerHTML = '';
  const base = container.children.length === 0 ? baseDelay : 0;
  let fresh = 0;
  for (let i = container.children.length; i < hand.length; i++) {
    container.appendChild(buildCard(hand[i], hideSecond && i === 1, base + fresh * 0.3));
    fresh++;
  }
  const second = container.children[1];
  if (!hideSecond && second && second.classList.contains('is-down')) {
    second.querySelector('.bj-front').innerHTML = faceHTML(hand[1]);
    setTimeout(() => second.classList.remove('is-down'), 450); // volteo 3D
  }
}

function setScore(el, value, bust) {
  const text = String(value);
  if (el.textContent !== text) { el.textContent = text; pop(el); }
  el.classList.toggle('bust', !!bust);
}

function renderBjHands(revealDealer = false) {
  syncHand($('bjPlayerCards'), bjPlayerHand, false, 0);
  const pScore = handScore(bjPlayerHand);
  setScore($('bjPlayerScore'), pScore, pScore > 21);

  const reveal = revealDealer || bjGameOver;
  syncHand($('bjDealerCards'), bjDealerHand, !reveal, 0.15);
  if (reveal) {
    const dScore = handScore(bjDealerHand);
    setScore($('bjDealerScore'), dScore, dScore > 21);
  } else {
    setScore($('bjDealerScore'), bjDealerHand.length > 0 ? cardValue(bjDealerHand[0]) : '', false);
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
  bjPlayerId = sel.value;
  sel.disabled = true;

  // Create fresh deck
  bjDeck = createDeck();
  bjPlayerHand = [];
  bjDealerHand = [];
  bjGameActive = true;
  bjGameOver = false;
  $('bjPlayerCards').innerHTML = '';
  $('bjDealerCards').innerHTML = '';

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
      bjEndGame(bjPlayerId, 'push');
    } else {
      // Player wins with natural blackjack (pays 2.5x)
      bjEndGame(bjPlayerId, 'blackjack');
    }
    return;
  }

  // Check if dealer has blackjack
  if (isBlackjack(bjDealerHand)) {
    bjGameOver = true;
    renderBjHands(true);
    bjEndGame(bjPlayerId, 'dealer_blackjack');
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
    bjEndGame(bjPlayerId, 'bust');
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
      bjEndGame(bjPlayerId, 'dealer_bust');
    } else if (playerScore > dealerScore) {
      bjEndGame(bjPlayerId, 'win');
    } else if (dealerScore > playerScore) {
      bjEndGame(bjPlayerId, 'lose');
    } else {
      bjEndGame(bjPlayerId, 'push');
    }
  });
}

function bjEndGame(playerId, result) {
  bjGameActive = false;
  $('bjPlayerSelect').disabled = false;
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
      message = `🎉 BLACKJACK! 21 natural! +${netGain - bjBet} chips!`;
      resultClass = 'blackjack';
      playJackpot();
      break;

    case 'win':
      netGain = bjBet * 2;
      message = `✅ You win! ${pScore} vs ${dScore} — +${netGain - bjBet} chips!`;
      resultClass = 'win';
      playWin();
      break;

    case 'dealer_bust':
      netGain = bjBet * 2;
      message = `✅ Dealer busts with ${dScore}! +${netGain - bjBet} chips!`;
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

  const table = $('bjResult').closest('.bj-table');
  if (result === 'blackjack') burstConfetti(table, 120);
  else if (result === 'win' || result === 'dealer_bust') burstConfetti(table, 45);

  // Update wheel stats
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
  $('bjPlayerScore').classList.remove('bust');
  $('bjDealerScore').classList.remove('bust');
  $('bjPlayerName').textContent = 'Player';

  bjPlayerHand = [];
  bjDealerHand = [];
  bjGameActive = false;
  bjGameOver = false;

  // Refresh player chips display
  updateChipsDisplay('bjPlayerSelect', 'bjPlayerChips');
}

export function initBlackjack() {
  $('bjBetDown').addEventListener('click', () => {
    if (bjBet > 1) {
      bjBet--;
      $('bjBetAmount').textContent = bjBet;
      pop($('bjBetAmount'));
    }
  });

  $('bjBetUp').addEventListener('click', () => {
    const player = getSelectedPlayer('bjPlayerSelect');
    const max = player ? (player.score || 0) : 10;
    if (bjBet < max) {
      bjBet++;
      $('bjBetAmount').textContent = bjBet;
      pop($('bjBetAmount'));
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

  document.addEventListener('keydown', e => {
    if (!$('viewBlackjack').classList.contains('view-active')) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || document.querySelector('.modal-overlay.open')) return;
    if (e.code === 'KeyH') bjHit();
    else if (e.code === 'KeyS') bjStand();
    else if (e.code === 'Enter' && e.target.tagName !== 'BUTTON') {
      if ($('bjNewRound').style.display !== 'none') bjNewRound();
      else if ($('bjBetControls').style.display !== 'none') bjDeal();
    }
  });
}
