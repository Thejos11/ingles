/* js/core/state.js */
import { uid } from './dom.js';
import { showAchievementToast } from '../ui/achievements.js';

const STORAGE_KEY = 'wheel-of-fortune-v2';
const LEGACY_KEY = 'roulette-royale-v2'; // migración: se lee si aún no existe la clave nueva

export let state = loadState();

function loadState() {
  const fresh = {
    students: [],   // { id, name, score, streak, timesSelected, timesAnswered, achievements: [], inventory: [], bjStreak: 0 }
    history: [],    // { name, answered, points, streak, date, game }
    rounds: 0
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    const loaded = Object.assign(fresh, JSON.parse(raw) || {});
    loaded.history = (loaded.history || []).map(h => h && h.game === 'roulette' ? { ...h, game: 'wheel' } : h);
    return loaded;
  } catch (e) { return fresh; }
}

export function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

export function syncPlayer(id, action) {
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

export const byId = id => state.students.find(s => s.id === id);

export function sanitizeState(raw) {
  const int = v => parseInt(v, 10) || 0;
  const students = raw.students.filter(s => s && typeof s.name === 'string').map(s => ({
    id: String(s.id || uid()), name: s.name.slice(0, 40),
    score: Math.max(0, int(s.score)), streak: int(s.streak),
    timesSelected: int(s.timesSelected), timesAnswered: int(s.timesAnswered),
    achievements: Array.isArray(s.achievements) ? s.achievements.map(String) : [],
    inventory: Array.isArray(s.inventory) ? s.inventory.map(String) : [],
    bjStreak: int(s.bjStreak)
  }));
  const history = Array.isArray(raw.history)
    ? raw.history.filter(h => h && typeof h.name === 'string').slice(0, 50)
        .map(h => h.game === 'roulette' ? { ...h, game: 'wheel' } : h) : [];
  return { students, history, rounds: int(raw.rounds) };
}

export function setState(next) { state = next; }
