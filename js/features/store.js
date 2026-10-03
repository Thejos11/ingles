/* js/features/store.js */
import { playWin } from '../core/audio.js';
import { $, toast } from '../core/dom.js';
import { syncPlayer } from '../core/state.js';
import { populatePlayerSelect, updateChipsDisplay } from '../ui/players.js';

export const STORE_ITEMS = [
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
      <button class="btn btn-primary btn-sm" style="margin-top: 0.5rem;" data-buy="${item.id}">Buy</button>
    </div>
  `).join('');
}

export function buyItem(itemId) {
  const item = STORE_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  const cost = item.cost;
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

export function initStoreModule() {
  initStore();
  $('storeBtn').onclick = () => {
    populatePlayerSelect('storePlayerSelect', 'storePlayerChips');
    $('storeModal').classList.add('open');
  };

  $('closeStoreBtn').onclick = () => $('storeModal').classList.remove('open');

  $('storePlayerSelect').addEventListener('change', () => updateChipsDisplay('storePlayerSelect', 'storePlayerChips'));
}
