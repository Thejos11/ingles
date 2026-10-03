/* js/ui/players.js */
import { $, pop } from '../core/dom.js';
import { byId, state } from '../core/state.js';

export function updateGlobalStats() {
  $('globalPlayerCount').textContent = state.students.length;
  $('globalRoundCount').textContent = state.rounds || 0;
  updateBottomBar();
}

export function populatePlayerSelect(selectId, chipsId) {
  const sel = $(selectId);
  if (!sel) return;

  const prev = sel.value;
  sel.innerHTML = '';

  if (state.students.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— No players (add in Players) —';
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

export function updateChipsDisplay(selectId, chipsId) {
  const sel = $(selectId);
  const player = byId(sel.value);
  const el = $(chipsId);
  const next = String(player ? (player.score || 0) : 0);
  if (el.textContent !== next) { el.textContent = next; pop(el, 'bump'); }
  updateBottomBar();
}

export function getSelectedPlayer(selectId) {
  const sel = $(selectId);
  return byId(sel.value);
}

export function updateBottomBar() {
  const v = document.body.dataset.view || 'hub';
  const sel = { slots: 'slotsPlayerSelect', blackjack: 'bjPlayerSelect', roulette: 'rlPlayerSelect' }[v];
  let label = 'Players', value = state.students.length;
  if (sel) { const pl = byId($(sel).value); label = 'Chips available'; value = pl ? (pl.score || 0) : 0; }
  else if (v === 'wheel') { label = 'Rounds played'; value = state.rounds || 0; }
  $('barLabel').textContent = label;
  const bv = $('barValue');
  if (bv.textContent !== String(value)) { bv.textContent = value; pop(bv, 'bump'); }
}
