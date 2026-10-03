/* js/games/roulette-rules.js — reglas puras de la ruleta europea (sin DOM) */

/** Orden real de las casillas en la rueda europea (sentido horario). */
export const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const colorOf = n => n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';

const even = n => n > 0 && n % 2 === 0;
const odd = n => n % 2 === 1;

/** Apuestas externas: clave -> [etiqueta, ganancia por ficha (N:1), condición]. */
const OUTSIDE = {
  red:          ['Red', 1, n => colorOf(n) === 'red'],
  black:        ['Black', 1, n => colorOf(n) === 'black'],
  even:         ['Even', 1, even],
  odd:          ['Odd', 1, odd],
  low:          ['1-18', 1, n => n >= 1 && n <= 18],
  high:         ['19-36', 1, n => n >= 19],
  'red-even':   ['Red · Even', 3, n => colorOf(n) === 'red' && even(n)],
  'red-odd':    ['Red · Odd', 3, n => colorOf(n) === 'red' && odd(n)],
  'black-even': ['Black · Even', 3, n => colorOf(n) === 'black' && even(n)],
  'black-odd':  ['Black · Odd', 3, n => colorOf(n) === 'black' && odd(n)]
};

/** Ganancia por ficha (N:1) de una apuesta. */
export function betPays(key) {
  if (key.startsWith('n:')) return 35;
  if (key.startsWith('dozen:') || key.startsWith('col:')) return 2;
  return OUTSIDE[key] ? OUTSIDE[key][1] : 0;
}

export function betWins(key, n) {
  if (key.startsWith('n:')) return Number(key.slice(2)) === n;
  if (key.startsWith('dozen:')) return n > 0 && Math.ceil(n / 12) === Number(key.slice(6));
  if (key.startsWith('col:')) return n > 0 && ((n - 1) % 3) + 1 === Number(key.slice(4));
  return OUTSIDE[key] ? OUTSIDE[key][2](n) : false;
}

export function betLabel(key) {
  if (key.startsWith('n:')) return `#${key.slice(2)}`;
  if (key.startsWith('dozen:')) return `${['1st', '2nd', '3rd'][Number(key.slice(6)) - 1]} 12`;
  if (key.startsWith('col:')) return `Column ${key.slice(4)}`;
  return OUTSIDE[key] ? OUTSIDE[key][0] : key;
}

/** Liquida las apuestas de un jugador ({clave: fichas}) contra el número ganador. */
export function settle(bets, n) {
  let stake = 0, returned = 0;
  const wins = [];
  for (const [key, amount] of Object.entries(bets)) {
    stake += amount;
    if (betWins(key, n)) {
      const profit = amount * betPays(key);
      returned += amount + profit;
      wins.push({ key, amount, profit });
    }
  }
  return { stake, returned, net: returned - stake, wins };
}
