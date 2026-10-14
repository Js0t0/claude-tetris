# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Piezas especiales**: pentominós **+**, **U** e **Y** que aparecen ocasionalmente, una pieza **3×3 hueca** como reto, y un bloque **1×1** de recompensa tras hacer un Tetris (4 líneas a la vez).
- **Power-ups**: cada 5 líneas eliminadas la siguiente pieza es un bloque especial 1×1 aleatorio que actúa al aterrizar:
  - 💣 **Bomba** — destruye el área 3×3 alrededor.
  - ⚡ **Rayo** — limpia la fila o la columna completa (al azar).
  - 🎨 **Tinte** — convierte en comodines (★) todos los bloques del color que tiene debajo (o el más abundante). Un comodín rellena un hueco de su fila: la fila se limpia si sus huecos ≤ sus comodines.
  - ⬇ **Gravedad** — compacta los huecos del tablero.
  - ❄ **Congelar** — detiene la caída automática durante 5 s (puedes seguir moviendo la pieza).
- **Habilidades cargables**: una barra de **energía** se llena con las líneas eliminadas (8 líneas). Cuando está llena, pulsa `E` (el juego se pausa) y elige una habilidad con `1`–`5` o el ratón (`Esc` cancela sin gastar energía); la barra se vacía:
  - **1 · Ver 5 piezas** — el panel NEXT muestra las próximas 5 piezas durante 5 colocaciones.
  - **2 · Cambiar pieza** — sustituye la pieza actual por otra al azar del pool.
  - **3 · Ralentizar** — la caída automática va a la mitad de velocidad durante 10 s.
  - **4 · Deshacer** — revierte la última colocación (tablero, puntuación, líneas y cola); no se encadena.
  - **5 · Reservar (hold)** — activa `C` durante las próximas 5 piezas: guarda la pieza actual o la intercambia con la guardada (una vez por pieza). La pieza guardada se conserva en el panel HOLD.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Combos y multiplicadores**: limpiar líneas en piezas consecutivas multiplica la puntuación (x2, x3, x4…); una pieza que no limpia líneas reinicia el combo (los power-ups no lo rompen).
  - **T-spin**: girar una T como último movimiento con ≥3 esquinas ocupadas (400 / 800 / 1200 / 1600 según líneas).
  - **Back-to-Back**: Tetris o T-spin con líneas seguidos de otro igual → ×1.5.
  - **Perfect Clear**: dejar el tablero vacío suma 800 / 1200 / 1800 / 2000 × nivel.
  - Fórmula: `base × (B2B ? 1.5 : 1) × combo × nivel` (+ Perfect Clear).
  - Efectos visuales (destello, textos, sacudida) y sonido (Web Audio); `M` silencia.
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `E`       | Abrir menú de habilidades (barra llena) |
| `C`       | Hold (tras activar la habilidad Reservar) |
| `P`       | Pausar / reanudar                 |
| `M`       | Silenciar / activar sonido        |

Además, el botón **Modo claro / Modo oscuro** (arriba a la derecha) alterna el tema. El juego inicia siempre en modo oscuro.

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza y la lista de controles.
- Un overlay para los estados **PAUSA** y **GAME OVER**.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–12) que identifica la pieza.
- **Generación de piezas** (`randomPiece`): 10 % pentominó (+, U o Y al azar), 4 % pieza hueca 3×3 y el resto una de las 7 estándar. Tras limpiar 4 líneas a la vez, la siguiente pieza en caer es un bloque 1×1 (`rewardPending`); la vista previa conserva la pieza que ya estaba en cola.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.

### Flujo del juego

```
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── game.js         # Toda la lógica del Tetris (~300 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 12 colores            |
| `PENTOMINO_CHANCE` | Probabilidad de pentominó (+, U, Y)  | `0.10`                |
| `HOLLOW_CHANCE` | Probabilidad de pieza hueca 3×3         | `0.04`                |
| `POWERUP_LINES` | Líneas necesarias para un power-up    | `5`                   |
| `FREEZE_MS`    | Duración de Congelar en ms               | `5000`                |
| `ENERGY_LINES` | Líneas para llenar la barra de energía   | `8`                   |
| `PREVIEW_PIECES` / `HOLD_PIECES` | Piezas que duran Ver 5 / Hold | `5`             |
| `SLOW_MS` / `SLOW_FACTOR` | Duración y factor de Ralentizar | `10000` / `0.5`     |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `TSPIN_SCORES` | Puntos de T-spin con 0, 1, 2 o 3 líneas  | `[400,800,1200,1600]` |
| `PERFECT_SCORES` | Bonus de Perfect Clear por nº de líneas | `[0,800,1200,1800,2000]` |
| `B2B_MULT`     | Multiplicador Back-to-Back               | `1.5`                 |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |

Los colores de la interfaz son variables CSS (`--bg`, `--accent`, `--grid`, …) definidas en `:root` de `style.css`; el tema claro las redefine en `:root[data-theme="light"]`.

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
