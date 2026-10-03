/* js/features/players-manager.js — gestión de jugadores y render global */
import { $, esc, toast, uid } from '../core/dom.js';
import { byId, saveState, state } from '../core/state.js';
import { updateGlobalStats } from '../ui/players.js';

const listeners = [];
const busy = () => document.body.classList.contains('busy');

/** Registra una función que se ejecuta en cada render() (p. ej. la vista de ruleta). */
export function onRender(fn) { listeners.push(fn); }

export function render() {
  updateGlobalStats();
  $('playersRoster').innerHTML = state.students.length ? state.students.map((s, i) => `
    <div class="player-row" data-id="${s.id}">
      <span class="player-rank">${i + 1}</span>
      <span class="player-name">${esc(s.name)}</span>
      <span class="player-score">${s.score || 0} pts</span>
      <span class="player-actions">
        <button class="btn btn-ghost" data-edit="${s.id}" title="Edit">✏️</button>
        <button class="btn btn-danger lockable" data-remove="${s.id}" title="Remove">✕</button>
      </span>
    </div>`).join('') : '<p class="empty-text">No players yet. Add names on the left.</p>';
  listeners.forEach(fn => fn());
}

export function addPlayers() {
  if (busy()) return;
  const names = $('namesInput').value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  if (!names.length) return toast('Type at least one name.', true);
  const known = new Set(state.students.map(s => s.name.toLowerCase()));
  let added = 0, skipped = 0;
  names.forEach(n => {
    if (known.has(n.toLowerCase())) { skipped++; return; }
    known.add(n.toLowerCase());
    state.students.push({ id: uid(), name: n.slice(0, 40), score: 0, streak: 0, timesSelected: 0, timesAnswered: 0 });
    added++;
  });
  $('namesInput').value = '';
  saveState();
  render();
  toast(`${added} player${added !== 1 ? 's' : ''} added` +
        (skipped ? ` · ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : '') + '.', !added);
}

export function removeStudent(id) {
  if (busy()) return;
  state.students = state.students.filter(s => s.id !== id);
  saveState();
  render();
}

export function editStudent(id) {
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
  if (state.students.some(s => s.id !== id && s.name.toLowerCase() === newName.toLowerCase()))
    return toast('A player with that name already exists.', true);
  student.name = newName.slice(0, 40);
  saveState();
  render();
  closeEditModal();
  toast(`Name updated to "${newName}".`);
}

export function closeEditModal() { $('editModal').classList.remove('open'); }

export function clearAll() {
  if (busy() || !state.students.length) return;
  if (!confirm('Clear all players and history?')) return;
  state.students = []; state.history = []; state.rounds = 0;
  saveState();
  render();
}

export function resetScores() {
  if (busy() || !state.students.length) return;
  if (!confirm('Reset all points to 0?')) return;
  state.students.forEach(s => { s.score = 0; s.streak = 0; s.timesSelected = 0; s.timesAnswered = 0; });
  state.history = []; state.rounds = 0;
  saveState();
  render();
  toast('Points reset.');
}

export function exportCSV() {
  if (!state.students.length) return toast('No data to export.', true);
  const sorted = [...state.students].sort((a, b) => (b.score || 0) - (a.score || 0));
  let csv = 'Position,Name,Points,Streak,Times Selected,Times Answered\n';
  sorted.forEach((s, i) => {
    csv += `${i + 1},"${s.name}",${s.score || 0},${s.streak || 0},${s.timesSelected || 0},${s.timesAnswered || 0}\n`;
  });
  csv += '\nHistory\nName,Answered,Points,Streak,Game,Date\n';
  state.history.forEach(h => {
    csv += `"${h.name}",${h.answered ? 'Yes' : 'No'},${h.points},${h.streak || 0},"${h.game || 'wheel'}","${h.date || ''}"\n`;
  });
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `casino_results_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function initPlayersManager() {
  $('addBtn').onclick = addPlayers;
  $('namesInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addPlayers();
  });
  $('resetBtn').onclick = resetScores;
  $('clearBtn').onclick = clearAll;
  $('exportBtn').onclick = exportCSV;
  $('editSaveBtn').onclick = saveEdit;
  $('editCancelBtn').onclick = closeEditModal;
  $('editModal').addEventListener('click', e => { if (e.target.id === 'editModal') closeEditModal(); });
  $('editNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveEdit(); });
}
