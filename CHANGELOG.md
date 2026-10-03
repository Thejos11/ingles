# Changelog

Registro de cambios de **Casino Royale Hub — Classroom Edition**.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## Cómo mantener este archivo

- Cada cambio nuevo se anota **arriba**, en la sección `[Sin publicar]`, en el mismo momento en que se hace.
- Al cerrar una tanda de cambios, se renombra `[Sin publicar]` a una fecha (`## [AAAA-MM-DD]`) y se crea una nueva sección `[Sin publicar]` vacía.
- Categorías: **Añadido** (funciones nuevas) · **Cambiado** (comportamiento o diseño existente) · **Corregido** (bugs) · **Eliminado** · **Notas** (deuda técnica, advertencias).
- Se indica el archivo afectado entre `backticks` para poder rastrear el cambio.
- Cada entrada indica el **área**: `UI`, `Menú`, `Hub`, `Roulette`, `Slots`, `Blackjack`, `Store`, `Admin`, `Core`, `Docs`.

Plantilla para copiar:

```md
## [Sin publicar]

### Añadido
- **[Área]** Descripción breve. (`ruta/archivo`)

### Cambiado
- **[Área]** Descripción breve. (`ruta/archivo`)

### Corregido
- **[Área]** Descripción breve. (`ruta/archivo`)
```

---

## [Sin publicar]

### Nuevo minijuego: Roulette (ruleta europea)

### Añadido
- **[Roulette]** Ruleta europea de 37 casillas: tablero con números, columnas, docenas, 1-18/19-36, par/impar, rojo/negro y combinaciones color+paridad (3:1); fichas de 1/5/10/25/100; apuestas por jugador con Undo, Clear, Repeat y "Ready"; rueda SVG con bola animada. El 0 pierde todas las apuestas externas. (`js/games/roulette.js`, `index.html`, `css/theme.css`)
- **[Roulette]** Reglas puras sin DOM: orden de la rueda, colores, pagos y `settle()`. (`js/games/roulette-rules.js`)
- **[Hub]** Pestaña y nodo Roulette en el mapa del hub; atajo `Space` para girar. (`index.html`, `js/ui/hub.js`, `js/main.js`)

### Cambiado
- **[Core]** Los chips se descuentan y pagan al terminar el giro con un único `syncPlayer` por jugador; las apuestas viven en memoria durante la ronda. (`js/games/roulette.js`)
- **[UI]** Wheel of Fortune pasa a usar 🎯; 🎡 queda para Roulette. (`index.html`, `js/ui/hub.js`, `js/games/wheel.js`)

### Notas
- El nodo Roulette del hub no tiene foto (se oculta la imagen). Sin probar en navegador. Falta el nodo de Players en el mapa.

### Renombrado: Roulette → Wheel of Fortune

- **[UI]** Nombre visible cambiado a "Wheel of Fortune" (pestaña "Wheel", título, hub, metadatos). (`index.html`, `js/ui/hub.js`)
- **[Core]** Renombrado interno `roulette` → `wheel`: `js/games/wheel.js`, `initWheel()`, `#viewWheel`, vista `wheel`, `game: 'wheel'`. La clave de `localStorage` pasa a `wheel-of-fortune-v2`; si no existe, se lee la antigua `roulette-royale-v2` y el historial `game: 'roulette'` se convierte a `'wheel'` (también al importar desde Admin). Se eliminó el CSS muerto `.roulette-header`. (varios)
- **[Notas]** `legacy/classroom-roulette.html` conserva su nombre por ser la versión original.

### Ruleta recreada (misma funcionalidad, nuevo diseño)

- **[Roulette]** `roulette.js` reescrito: rueda en SVG (antes `<canvas>`), nuevo layout 3 columnas y header compacto. (`js/games/roulette.js`, `index.html`, `css/theme.css`)
- **[Core]** Gestión de jugadores y `render()` global movidos a `js/features/players-manager.js`, con `onRender(fn)` para suscribir vistas; `admin.js` y `main.js` importan de ahí. (`js/features/players-manager.js`)
- **[Notas]** Quedan reglas CSS antiguas de la ruleta sin uso en `css/styles.css` y en la sección MINIJUEGOS de `css/theme.css`. Sin probar en navegador.

### Sección Players

- **[Menú]** Nueva vista `Players` con pestaña propia: alta de jugadores, roster con editar/quitar, Reset Points, Clear All y descarga CSV. (`index.html`, `js/ui/hub.js`, `css/theme.css`)
- **[Core]** Módulo `js/features/players-manager.js`; `addPlayers`, `clearAll`, `resetScores` y `exportCSV` se exportan desde `roulette.js` en vez de duplicarse. (`js/games/roulette.js`)
- **[Roulette]** Se quitaron Add Players, Reset/Clear y Export; el roster queda de solo lectura. (`index.html`, `css/theme.css`)
- **[Notas]** Falta el nodo de Players en el mapa del hub (solo hay pestaña). Sin probar en navegador.

### Layout 1080p y rediseño de la máquina de Slots

### Añadido
- **[Slots]** Máquina con marquesina de bombillas, carretes de 150x180, bandeja de fichas y palanca que baja al girar. (`css/theme.css`, `index.html`, `js/games/slots.js`)
- **[UI]** Sección "VIEWPORT 1080p" (>=1200px) con `--stage-h`: Roulette, Slots y Blackjack caben en 1920x1080 sin scroll de página. (`css/theme.css`)

### Cambiado
- **[Slots]** Layout de 3 columnas: jugador e historial / máquina / paytable. (`css/theme.css`)
- **[Roulette]** Header compacto, rueda dimensionada con `--stage-h` y listas laterales con menor alto. (`css/theme.css`)
- **[Blackjack]** Solo compactación de paddings y ancho; sin cambios de markup. (`css/theme.css`)

### Corregido
- **[Roulette]** El título rotado ya no pisa el subtítulo (subtítulo oculto, margen añadido). (`css/theme.css`)

### Notas
- No probado en navegador (sin smoke test).

---

### Rediseño y animación de minijuegos (Roulette, Slots, Blackjack)

Se llevó el estilo del hub (bloques planos, contorno grueso, sombra dura, paleta rosa/cian/crema) a los tres minijuegos, con nivel de animación alto. Casi todo está en una sección nueva al final de `css/theme.css`.

### Añadido
- **[UI]** Sección "MINIJUEGOS" en `css/theme.css` con animaciones compartidas: `stickerPop`, `blockIn`, `bump`, `stripesMove`, `stickerBounce`, `frameShake`, `btnIdle`, `shakeX`. (`css/theme.css`)
- **[UI]** Entrada escalonada de los bloques de cada vista (Roulette, Slots, Blackjack) al navegar. (`css/theme.css`)
- **[UI]** `pop(el, cls)` en `js/core/dom.js`: relanza una animación CSS sobre un elemento (rebote de fichas, apuesta y puntuación). (`js/core/dom.js`)
- **[UI]** `burstConfetti(host, count)` en `js/ui/confetti.js`: confeti estilo sticker sobre cualquier contenedor con `position: relative`; se usa en Slots y Blackjack. (`js/ui/confetti.js`)
- **[Menú]** Atajos de teclado visibles dentro de los botones: `Space` en SPIN y PULL LEVER, `Enter` en DEAL, `H` en Hit y `S` en Stand. (`index.html`)
- **[Roulette]** Puntero que rebota al cruzar cada porción y "golpe" de la rueda al detenerse. (`js/games/roulette.js`, `css/theme.css`)
- **[Slots]** Desenfoque de movimiento mientras gira, rebote al detenerse cada carrete, resalte y sacudida de los carretes ganadores, y modo jackpot (franjas rosa/cian en movimiento, sacudida del marco y confeti). (`js/games/slots.js`, `css/theme.css`)
- **[Blackjack]** Reparto con cartas que se deslizan desde la esquina, volteo 3D de la carta oculta del crupier, puntuación que cambia a rosa y vibra al pasarse de 21, y confeti en Blackjack natural y victorias. (`js/games/blackjack.js`, `css/theme.css`)

### Cambiado
- **[UI]** Títulos de cada juego como etiqueta crema ladeada (como el título del panel de detalle del hub); contadores del header de Roulette y selector de jugador como bloques con borde y sombra dura. (`css/theme.css`)
- **[UI]** Fichas del jugador, apuesta y contador de la barra inferior hacen "bump" cuando cambia el valor. (`js/ui/players.js`, `css/theme.css`)
- **[UI]** Botones SPIN / PULL LEVER / DEAL como bloques planos con sombra que se hunde al presionar y movimiento suave en reposo. (`css/theme.css`)
- **[UI]** Resultados de Slots y Blackjack como stickers ladeados (cian = gana, morado = pierde, crema = empate, rosa con rebote = jackpot/blackjack). (`css/theme.css`)
- **[Roulette]** Rueda con porciones planas (rosa, cian, crema y morados), contorno grueso, nombres en Lilita One y centro crema con punto rosa; puntero rosa con contorno; anillo exterior con sombra dura. (`js/games/roulette.js`, `css/theme.css`)
- **[Roulette]** Modal del ganador (solo `#modal`) con etiqueta ladeada, nombre rosa con sombra dura y entrada con rebote. Los modales de tienda y admin no se tocaron. (`css/theme.css`)
- **[Roulette]** El confeti del modal usa la paleta nueva. (`js/ui/confetti.js`)
- **[Slots]** Máquina con marco rosa, carretes crema con borde grueso y línea de pago cian; tabla de pagos como tarjeta ladeada. (`css/theme.css`)
- **[Blackjack]** Mesa plana con patrón de puntos (sin la textura de fieltro), "VS" como rombo rosa, cartas con borde grueso y sombra dura. (`css/theme.css`)
- **[Blackjack]** El render de manos ahora es incremental: solo se anima la carta nueva en lugar de repetir la animación en todas las cartas. (`js/games/blackjack.js`)

### Corregido
- **[Slots]** La altura de símbolo usada para detener el carrete se lee del DOM; antes estaba fija en 120px y en móvil (96px) el carrete podía detenerse desalineado. (`js/games/slots.js`)

### Notas
- Se respeta `prefers-reduced-motion` en Roulette, Slots, Blackjack y el modal del ganador.
- Se quitó el `import { rotation }` sin uso de `js/ui/confetti.js`, lo que elimina una dependencia circular con `roulette.js`.
- Estos cambios **no se han probado en navegador**; conviene revisarlos visualmente, sobre todo el volteo 3D, el rebote de carretes en móvil y la animación de jackpot.
- Pendiente (no incluido en esta tanda): modales de tienda y admin, y las notas de partículas/estilos en línea del hub indicadas en la entrada anterior.

---

## [2026-10-03] — Rediseño visual (UI, menú y hub)

Rediseño estético completo con estilo de **bloques planos, contornos gruesos y sombras duras**. Se implementó como una hoja de estilos adicional (`css/theme.css`) que carga **después** de `css/styles.css` y sobrescribe sus valores, sin tocar la hoja base.

### Añadido
- **[UI]** `css/theme.css`: nueva hoja de tema enlazada en `index.html` justo después de `css/styles.css`. (`css/theme.css`, `index.html`)
- **[UI]** Tipografías Lilita One (títulos, botones, pestañas, números destacados) y Nunito (texto general) desde Google Fonts. (`index.html`, `css/theme.css`)
- **[Menú]** Barra inferior fija (`bottombar`) con:
  - Contador central grande (`#barValue`) y su etiqueta (`#barLabel`).
  - Ayudas de teclado contextuales (`<kbd>`) que cambian según la vista activa mediante `body[data-view]`:
    - Hub: `Tab` Navegar · `Enter` Abrir
    - Roulette: `Space` Girar
    - Slots: `Space` Palanca
    - Blackjack: `Enter` Repartir · `H` Pedir · `S` Plantarse
    - Todas: `Esc` Cerrar
  - Se oculta en pantallas ≤ 900px (solo queda el contador). (`index.html`, `css/theme.css`, `js/ui/players.js`)
- **[Hub]** Selector de mundos con **mapa de nodos**:
  - Nodo `START` (rombo rosa) y 4 nodos: Roulette 🎡, Slots 🎰, Blackjack 🃏 y Top 10 🏆.
  - Líneas SVG con flecha entre nodos que se iluminan en rosa según el nodo seleccionado. (`index.html`, `css/theme.css`, `js/ui/hub.js`)
- **[Hub]** Panel de detalle lateral (`#hubDetail`) con tarjeta ladeada, título tipo etiqueta, foto, tecla principal, descripción, requisito (`Requires`) y botón **▶ Enter world**. Para Top 10 muestra podio y ranking en lugar del detalle del juego. (`index.html`, `css/theme.css`, `js/ui/hub.js`)
- **[Hub]** Datos de cada mundo (`HUB_NODES`): título, imagen de Unsplash con crédito al autor, tecla, descripción y requisito. Nodo seleccionado por defecto: Roulette. (`js/ui/hub.js`)
- **[UI]** Soporte `prefers-reduced-motion`: se desactivan rotaciones de la pestaña activa y transiciones de botones. (`css/theme.css`)
- **[UI]** Estilo de foco accesible (`outline` crema de 3px) para campos y botones. (`css/theme.css`)

### Cambiado
- **[UI]** Paleta: fondo morado oscuro (`--bg-deep #1a1530`), texto crema (`#fff4e0`), acción primaria rosa (`#ff3d8b`) y acento cian (`#2de0d0`). Se reasignaron las variables existentes (`--purple-*`, `--gold`, `--border`, etc.) para que el resto de la hoja base adopte la nueva paleta automáticamente. (`css/theme.css`)
- **[UI]** Superficies (`.panel`, `.p-panel`, `.modal-card`, `.world-card-inner`, `.store-item`, `.slot-machine`, `.bj-table`, `.podium-item`, `.player-row`): fondo plano, borde de 3px `--ink` y sombra dura sin desenfoque (`6px 6px 0`; `3px 3px 0` en filas de jugador). (`css/theme.css`)
- **[UI]** Botones (`.btn`, `.topbar-btn`): borde grueso, sombra dura; al pasar el mouse se desplazan y crece la sombra, al presionar se "hunden". (`css/theme.css`)
- **[UI]** Campos de formulario (`.field`) con borde grueso y fuente heredada. (`css/theme.css`)
- **[UI]** Fondo del `body`: degradado diagonal fijo en dos tonos; se añadió `padding-bottom: 88px` para no quedar tapado por la barra inferior. (`css/theme.css`)
- **[UI]** Títulos y etiquetas en mayúsculas con Lilita One y sin sombra de texto. (`css/theme.css`)
- **[Menú]** Barra superior (`topbar`):
  - Fondo oscuro con borde inferior de 4px y esquinas inferiores recortadas con `clip-path`.
  - Logo con icono cian ligeramente rotado (-6°).
  - Pestañas (Hub, Roulette, Slots, Blackjack); la activa se muestra como bloque crema inclinado (-1.5°) con sombra dura.
  - Contadores globales **Players** y **Rounds** en bloques con borde, y botones **Store**, **Admin** y **Fullscreen**.
  - En ≤ 900px las pestañas pasan a una segunda fila con scroll horizontal y se quita el recorte. (`index.html`, `css/theme.css`)
- **[Hub]** Se reemplazó la antigua pantalla de selección de mundos por el mapa de nodos con panel de detalle (layout en 2 columnas 58/42; una sola columna en ≤ 900px). (`index.html`, `css/theme.css`, `js/ui/hub.js`)
- **[Hub]** Las partículas del fondo se mantienen pero con opacidad reducida (`.25`) y se oculta el resplandor de las tarjetas (`.world-card-glow`). (`css/theme.css`)
- **[Menú]** `navigateTo()` ahora sincroniza `document.body.dataset.view`, la pestaña activa y la barra inferior al cambiar de vista. (`js/ui/hub.js`)
- **[Core]** `updateGlobalStats()` también actualiza la barra inferior. (`js/ui/players.js`)

### Notas
- `css/theme.css` depende del orden de carga: **debe ir después de `css/styles.css`**. Si se invierte, el rediseño no se aplica.
- Las imágenes del hub se cargan desde Unsplash (requiere conexión a internet); si no hay red, el panel de detalle muestra el fondo de color de reserva.
- Las partículas del hub (`hub.js`) siguen usando la paleta anterior (`#7c3aed`, `#a78bfa`, etc.), por lo que no coinciden del todo con la paleta nueva. Pendiente de unificar.
- Algunos estilos en línea de `hub.js` (por ejemplo `background: rgba(10,10,20,0.8)` en las filas del ranking) y `var(--gold)` en el contador de logros no siguen el nuevo estilo de bloques planos. Pendiente de migrar a clases en `theme.css`.

---

## [2026-10-03] — Modularización del proyecto

Versión modular a partir del archivo único original.

### Añadido
- **[Core]** Estructura en módulos ES sin build: `core/` (`dom`, `state`, `audio`), `ui/` (`hub`, `players`, `achievements`, `confetti`), `games/` (`roulette`, `slots`, `blackjack`) y `features/` (`store`, `admin`), con `js/main.js` como punto de entrada.
- **[Docs]** `README.md` con instrucciones de ejecución (servidor estático, puerto 5502 en Live Server) y estructura del proyecto.
- **[Core]** Estado persistente en `localStorage` (clave `roulette-royale-v2`) con `syncPlayer()` para actualizar un jugador sin pisar cambios hechos desde otra pestaña.

### Notas
- La versión original de un solo archivo se conserva en `legacy/classroom-roulette.html`.
- `js/core/state.js` importa `js/ui/achievements.js`, lo que rompe la regla "core no depende de nada" descrita en el README.
