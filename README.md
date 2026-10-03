# Casino Royale Hub — Classroom Edition

Casino gamificado para clase (Ruleta, Slots, Blackjack, Tienda y Admin). JS vanilla con módulos ES, sin build.

## Ejecutar
Los módulos ES **no funcionan abriendo `index.html` con doble clic**. Usa Live Server (VS Code, puerto 5502) o cualquier servidor estático (`python -m http.server`).

## Estructura
```
index.html
css/styles.css · css/theme.css (rediseño)
js/
  main.js              punto de entrada: atajos, delegación de eventos, arranque
  core/   dom.js (helpers) · state.js (estado y localStorage) · audio.js (sonidos)
  ui/     hub.js · players.js · achievements.js · confetti.js
  games/  wheel.js · roulette.js · roulette-rules.js · slots.js · blackjack.js
  features/ store.js · admin.js · players-manager.js
legacy/classroom-roulette.html   versión original de un solo archivo
```
Regla: `core` no depende de nada; `ui`, `games` y `features` importan de `core`. Cada módulo con eventos expone una función `initX()` que `main.js` invoca.
