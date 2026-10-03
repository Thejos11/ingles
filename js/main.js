/* js/main.js — entry point */
import { $, toast } from './core/dom.js';
import { syncPlayer } from './core/state.js';
import { initAdmin, lockAdmin, renderAdminInventory } from './features/admin.js';
import { buyItem, initStoreModule } from './features/store.js';
import { initBlackjack } from './games/blackjack.js';
import { closeModal, initWheel, spin } from './games/wheel.js';
import { initRoulette, spinRoulette } from './games/roulette.js';
import { closeEditModal, editStudent, initPlayersManager, removeStudent, render } from './features/players-manager.js';
import { initSlots, slotSpinning, spinSlots } from './games/slots.js';
import { currentView, initHub } from './ui/hub.js';

$('fullscreenBtn').onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => toast('Fullscreen failed', true));
  } else {
    document.exitFullscreen();
  }
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeEditModal();
    lockAdmin();
    $('storeModal').classList.remove('open');
    $('adminModal').classList.remove('open');
  }
  // Space to spin (when in Wheel of Fortune and not in input)
  if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && !document.querySelector('.modal-overlay.open')) {
    e.preventDefault();
    if (currentView === 'wheel') spin();
    else if (currentView === 'roulette') spinRoulette();
    else if (currentView === 'slots' && !slotSpinning) spinSlots();
  }
});

document.addEventListener('click', e => {
  const rm = e.target.closest('[data-remove]');
  if (rm) removeStudent(rm.dataset.remove);

  const ed = e.target.closest('[data-edit]');
  if (ed) editStudent(ed.dataset.edit);

  const by = e.target.closest('[data-buy]');
  if (by) buyItem(by.dataset.buy);

  const rd = e.target.closest('[data-redeem]');
  if (rd) {
    const [id, idx] = rd.dataset.redeem.split(':');
    syncPlayer(id, p => { p.inventory.splice(Number(idx), 1); });
    toast('Prize redeemed.');
    renderAdminInventory();
  }
});

initPlayersManager();
initWheel();
initRoulette();
render();
initSlots();
initBlackjack();
initStoreModule();
initAdmin();
initHub();
