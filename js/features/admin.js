/* js/features/admin.js */
import { $, esc, toast } from '../core/dom.js';
import { sanitizeState, saveState, setState, state, syncPlayer } from '../core/state.js';
import { STORE_ITEMS } from './store.js';
import { render } from './players-manager.js';

let adminAuthed = false;

function pinHash(s) { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); }

function adminUnlock() {
  const K = 'casino-admin-pin';
  let stored = null;
  try { stored = localStorage.getItem(K); } catch (e) {}
  if (!stored) {
    const p = prompt('Create an admin PIN (min. 4 characters):');
    if (!p || p.length < 4) { toast('Invalid PIN.', true); return false; }
    try { localStorage.setItem(K, pinHash(p)); } catch (e) {}
    return true;
  }
  const p = prompt('Admin PIN:');
  if (p && pinHash(p) === stored) return true;
  toast('Wrong PIN.', true);
  return false;
}

export function renderAdminInventory() {
  const names = Object.fromEntries(STORE_ITEMS.map(i => [i.id, i.icon + ' ' + i.name]));
  const rows = [];
  state.students.forEach(s => (s.inventory || []).forEach((it, idx) => rows.push(
    `<div class="history-row"><span class="history-name">${esc(s.name)}</span><span>${esc(names[it] || it)}</span>` +
    `<button class="btn btn-ghost btn-sm" data-redeem="${esc(s.id)}:${idx}">Redeem</button></div>`)));
  $('adminInventory').innerHTML = rows.length ? rows.join('') : '<p class="empty-text">No purchases pending.</p>';
}

export function lockAdmin() { adminAuthed = false; }

export function initAdmin() {
  $('adminBtn').onclick = () => {
    if (!adminAuthed && !adminUnlock()) return;
    adminAuthed = true;
    const sel = $('adminPlayerSelect');
    sel.innerHTML = state.students.map(s => `<option value="${s.id}">${esc(s.name)} (${Number(s.score) || 0} pts)</option>`).join('');
    renderAdminInventory();
    $('adminModal').classList.add('open');
  };

  $('closeAdminBtn').onclick = () => { adminAuthed = false; $('adminModal').classList.remove('open'); };

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

  $('adminImportBtn').onclick = () => $('adminImportFile').click();

  $('adminImportFile').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const newState = JSON.parse(ev.target.result);
        if (Array.isArray(newState.students)) {
          setState(sanitizeState(newState));
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
}
