'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#f06292', // + - pink
  '#4db6ac', // U - teal
  '#aed581', // Y - lime
  '#ffe082', // single - gold
  '#9e9e9e', // hueca 3x3 - gray
  '#ff7043', // bomba
  '#fff176', // rayo
  '#ce93d8', // tinte
  '#a1887f', // gravedad
  '#80deea', // congelar
  '#f5f5f5', // comodín
];

const SINGLE = 11;
const HOLLOW = 12;
const BOMB = 13;
const BOLT = 14;
const TINT = 15;
const GRAVITY = 16;
const FREEZE = 17;
const WILD = 18;
const POWERUPS = [BOMB, BOLT, TINT, GRAVITY, FREEZE];
const GLYPHS = { [BOMB]: '💣', [BOLT]: '⚡', [TINT]: '🎨', [GRAVITY]: '⬇', [FREEZE]: '❄', [WILD]: '★' };
const POWERUP_LINES = 5;
const FREEZE_MS = 5000;
const PENTOMINOES = [8, 9, 10];
const PENTOMINO_CHANCE = 0.10;
const HOLLOW_CHANCE = 0.04;
const ENERGY_LINES = 8;
const PREVIEW_PIECES = 5;
const SLOW_MS = 10000;
const SLOW_FACTOR = 0.5;
const QUEUE_SIZE = 5;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                  // +
  [[9,0,9],[9,9,9],[0,0,0]],                  // U
  [[0,10,0,0],[10,10,10,10],[0,0,0,0],[0,0,0,0]], // Y
  [[11]],                                      // single
  [[12,12,12],[12,0,12],[12,12,12]],          // hueca 3x3
  [[13]], [[14]], [[15]], [[16]], [[17]],      // power-ups
  [[18]],                                      // comodín
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_SCORES = [400, 800, 1200, 1600];
const PERFECT_SCORES = [0, 800, 1200, 1800, 2000];
const B2B_MULT = 1.5;
const TSPIN_NAMES = ['T-SPIN', 'T-SPIN SINGLE', 'T-SPIN DOUBLE', 'T-SPIN TRIPLE'];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeBtn = document.getElementById('theme-toggle');
const comboEl = document.getElementById('combo');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const holdHintEl = document.getElementById('hold-hint');
const energyBar = document.getElementById('energy-bar');
const energyFill = document.getElementById('energy-fill');
const energyHint = document.getElementById('energy-hint');
const abilityMenu = document.getElementById('ability-menu');
const abilityBtns = document.querySelectorAll('#ability-menu [data-ability]');
const abilityCancel = document.getElementById('ability-cancel');

let gridColor = '#22222e';
let highlightColor = 'rgba(255,255,255,0.12)';

let board, current, queue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, rewardPending, powerupPending, powerupLines, freezeLeft;
let combo, b2b, lastRotate, effects, shakeLeft, shakePower;
let energy, choosing, previewLeft, slowLeft, held, holdUsed, lastPlacement;
let muted = false;
let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep(freq, dur, type = 'square', delay = 0, vol = 0.08) {
  if (muted) return;
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur);
}

function playClearSound(cleared, comboN, special, perfect) {
  const base = 330 * Math.pow(2, Math.min(comboN - 1, 12) / 12);
  beep(base, 0.15, 'square');
  if (cleared >= 4 || special) {
    beep(base * 1.25, 0.15, 'square', 0.08);
    beep(base * 1.5, 0.2, 'square', 0.16);
  }
  if (perfect) [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.25, 'triangle', 0.25 + i * 0.1, 0.1));
}

function addText(text, color, size = 22) {
  effects.push({ kind: 'text', text, color, size, life: 1200, max: 1200 });
}

function addShake(power) {
  shakePower = shakeLeft > 0 ? Math.max(shakePower, power) : power;
  shakeLeft = 300;
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const roll = Math.random();
  let type;
  if (roll < PENTOMINO_CHANCE) type = PENTOMINOES[Math.floor(Math.random() * PENTOMINOES.length)];
  else if (roll < PENTOMINO_CHANCE + HOLLOW_CHANCE) type = HOLLOW;
  else type = Math.floor(Math.random() * 7) + 1;
  return makePiece(type);
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastRotate = true;
      return;
    }
  }
}

// regla de 3 esquinas: la T (siempre 3×3) está en T-spin si ≥3 esquinas diagonales al centro están ocupadas
function isTSpin() {
  const cx = current.x + 1, cy = current.y + 1;
  let filled = 0;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx])) filled++;
  }
  return filled >= 3;
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines(tspin, isPowerup) {
  let cleared = 0;
  const clearedRows = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    // los comodines pueden rellenar huecos de la fila (uno por comodín)
    const empty = board[r].filter(v => v === 0).length;
    const wild = board[r].filter(v => v === WILD).length;
    if (empty <= wild) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      clearedRows.push(r - cleared); // fila en coordenadas previas a la limpieza
      cleared++;
      r++;
    }
  }
  if (!cleared) {
    if (tspin) {
      score += TSPIN_SCORES[0] * level;
      addText(TSPIN_NAMES[0], '#ba68c8');
      playClearSound(0, 1, true, false);
    } else if (!isPowerup) {
      combo = 0;
    }
    updateHUD();
    return;
  }

  combo++;
  const difficult = cleared === 4 || tspin;
  const b2bApplies = difficult && b2b;
  b2b = difficult;
  const base = tspin ? TSPIN_SCORES[cleared] : LINE_SCORES[cleared];
  score += Math.round(base * (b2bApplies ? B2B_MULT : 1) * combo * level);

  if (cleared === 4) rewardPending = true;
  powerupLines += cleared;
  if (powerupLines >= POWERUP_LINES) {
    powerupLines %= POWERUP_LINES;
    powerupPending = true;
  }
  const wasFull = energy >= ENERGY_LINES;
  energy = Math.min(ENERGY_LINES, energy + cleared);
  if (!wasFull && energy >= ENERGY_LINES) addText('ENERGÍA LISTA [E]', '#7aa2f7', 20);
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);

  const perfect = board.every(row => row.every(v => !v));
  if (perfect) score += PERFECT_SCORES[cleared] * level;

  // efectos
  effects.push({ kind: 'flash', rows: clearedRows, life: 250, max: 250 });
  if (tspin) addText(TSPIN_NAMES[cleared], '#ba68c8');
  else if (cleared === 4) addText('TETRIS', '#4dd0e1', 26);
  if (b2bApplies) addText('BACK-TO-BACK x' + B2B_MULT, '#ffd54f');
  if (combo > 1) addText('COMBO x' + combo, `hsl(${Math.max(0, 50 - combo * 8)}, 90%, 60%)`, 20 + Math.min(combo, 8));
  if (perfect) addText('PERFECT CLEAR', '#fff176', 26);
  if (combo >= 3 || b2bApplies || perfect) addShake(Math.min(2 + combo, 10) + (perfect ? 4 : 0));
  playClearSound(cleared, combo, tspin || b2bApplies, perfect);
  updateHUD();
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  if (gy > current.y) lastRotate = false;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastRotate = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function applyPowerup(type, x, y) {
  switch (type) {
    case BOMB:
      for (let r = y - 1; r <= y + 1; r++)
        for (let c = x - 1; c <= x + 1; c++)
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
      break;
    case BOLT:
      if (Math.random() < 0.5) board[y].fill(0);
      else for (let r = 0; r < ROWS; r++) board[r][x] = 0;
      break;
    case TINT: {
      // color del bloque bajo la pieza; si no hay, el más abundante
      let target = y + 1 < ROWS ? board[y + 1][x] : 0;
      if (!target || target === WILD) {
        const counts = {};
        for (const row of board) for (const v of row) if (v && v !== WILD) counts[v] = (counts[v] || 0) + 1;
        target = +Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 0;
      }
      if (target)
        for (const row of board)
          for (let c = 0; c < COLS; c++) if (row[c] === target) row[c] = WILD;
      break;
    }
    case GRAVITY:
      for (let c = 0; c < COLS; c++) {
        const col = [];
        for (let r = 0; r < ROWS; r++) if (board[r][c]) col.push(board[r][c]);
        for (let r = ROWS - 1; r >= 0; r--) board[r][c] = col.pop() || 0;
      }
      break;
    case FREEZE:
      freezeLeft = FREEZE_MS;
      break;
  }
}

function lockPiece() {
  const isPowerup = POWERUPS.includes(current.type);
  const tspin = current.type === 3 && lastRotate && isTSpin();
  lastPlacement = {
    board: board.map(row => [...row]),
    type: current.type,
    queue: queue.map(p => p.type),
    held,
    score, lines, level, combo, b2b, powerupLines, rewardPending, powerupPending, dropInterval, freezeLeft,
  };
  if (isPowerup) applyPowerup(current.type, current.x, current.y);
  else merge();
  clearLines(tspin, isPowerup);
  previewLeft = Math.max(0, previewLeft - 1);
  holdUsed = false;
  spawn();
}

function spawn() {
  lastRotate = false;
  if (powerupPending) {
    current = makePiece(POWERUPS[Math.floor(Math.random() * POWERUPS.length)]);
    powerupPending = false;
  } else if (rewardPending) {
    current = makePiece(SINGLE);
    rewardPending = false;
  } else {
    current = queue.shift();
    queue.push(randomPiece());
  }
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
  drawHold();
  updateHUD();
}

function holdPiece() {
  if (holdUsed) return;
  if (held === null) {
    held = current.type;
    spawn();
  } else {
    const swapped = makePiece(held);
    if (collide(swapped.shape, swapped.x, swapped.y)) return;
    held = current.type;
    current = swapped;
    lastRotate = false;
  }
  holdUsed = true;
  drawHold();
  updateHUD();
}

function openAbilityMenu() {
  choosing = true;
  cancelAnimationFrame(animId);
  abilityBtns[3].disabled = !lastPlacement; // deshacer
  abilityMenu.classList.remove('hidden');
}

function closeAbilityMenu() {
  choosing = false;
  abilityMenu.classList.add('hidden');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (!gameOver && !paused) {
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }
}

function swapCurrent() {
  for (let i = 0; i < 30; i++) {
    const p = randomPiece();
    if (p.type === current.type) continue;
    const spawnX = p.x;
    p.x = current.x;
    p.y = current.y;
    if (collide(p.shape, p.x, p.y)) {
      p.x = spawnX;
      p.y = 0;
      if (collide(p.shape, p.x, p.y)) continue;
    }
    current = p;
    lastRotate = false;
    return true;
  }
  return false;
}

function undoPlacement() {
  const s = lastPlacement;
  if (!s) return false;
  board = s.board;
  ({ held, score, lines, level, combo, b2b, powerupLines, rewardPending, powerupPending, dropInterval, freezeLeft } = s);
  queue = s.queue.map(makePiece);
  current = makePiece(s.type);
  lastPlacement = null;
  lastRotate = false;
  holdUsed = false;
  dropAccum = 0;
  drawNext();
  drawHold();
  return true;
}

function useAbility(n) {
  if (!choosing) return;
  let ok = true;
  switch (n) {
    case 1: previewLeft = PREVIEW_PIECES; break;
    case 2: ok = swapCurrent(); break;
    case 3: slowLeft = SLOW_MS; break;
    case 4: ok = undoPlacement(); break;
  }
  if (ok) {
    energy = 0;
    addText(['', 'VISTA x5', 'CAMBIO', 'RALENTIZAR', 'DESHACER'][n], '#7aa2f7');
  } else {
    addText('NO SE PUEDE', '#e57373');
  }
  drawNext();
  drawHold();
  updateHUD();
  closeAbilityMenu();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo > 1 ? 'x' + combo + (b2b ? ' B2B' : '') : (b2b ? 'B2B' : '-');
  const full = energy >= ENERGY_LINES;
  energyFill.style.width = (energy / ENERGY_LINES * 100) + '%';
  energyBar.classList.toggle('full', full);
  energyHint.textContent = full ? 'PULSA E' : energy + '/' + ENERGY_LINES;
  holdHintEl.textContent = holdUsed ? 'BLOQUEADO' : 'C / Shift';
  holdCanvas.classList.toggle('locked', holdUsed);
}

function drawEffects() {
  for (const e of effects) {
    const t = e.life / e.max; // 1 → 0
    if (e.kind === 'flash') {
      ctx.fillStyle = `rgba(255,255,255,${0.7 * t})`;
      for (const r of e.rows) ctx.fillRect(0, r * BLOCK, COLS * BLOCK, BLOCK);
    }
  }
  // popups de texto apilados, el más reciente abajo
  const texts = effects.filter(e => e.kind === 'text');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  texts.forEach((e, i) => {
    const t = e.life / e.max;
    const y = canvas.height / 2 + (i - texts.length + 1) * 30 - (1 - t) * 40;
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.font = `bold ${e.size}px monospace`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(e.text, canvas.width / 2, y);
    ctx.fillStyle = e.color;
    ctx.fillText(e.text, canvas.width / 2, y);
  });
  ctx.globalAlpha = 1;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = highlightColor;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (GLYPHS[colorIndex]) {
    context.fillStyle = '#000';
    context.font = `${size * 0.6}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(GLYPHS[colorIndex], x * size + size / 2, y * size + size / 2 + 1);
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (shakeLeft > 0) {
    const p = shakePower * (shakeLeft / 300);
    ctx.translate((Math.random() - 0.5) * 2 * p, (Math.random() - 0.5) * 2 * p);
  }
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

  if (freezeLeft > 0) {
    ctx.fillStyle = 'rgba(128,222,234,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#80deea';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`❄ ${(freezeLeft / 1000).toFixed(1)}s`, 6, 6);
  }

  if (slowLeft > 0) {
    ctx.fillStyle = 'rgba(186,104,200,0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ba68c8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`🐢 ${(slowLeft / 1000).toFixed(1)}s`, 6, freezeLeft > 0 ? 28 : 6);
  }

  drawEffects();
  ctx.restore();
}

// dibuja una forma centrada en una celda de 4×4 bloques de tamaño `size`
function drawShapeCentered(context, shape, size, alpha) {
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], size, alpha);
}

function drawNext() {
  const height = previewLeft > 0 ? 120 + (QUEUE_SIZE - 1) * 60 : 120;
  if (nextCanvas.height !== height) nextCanvas.height = height;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawShapeCentered(nextCtx, queue[0].shape, 30);
  if (previewLeft <= 0) return;
  for (let i = 1; i < QUEUE_SIZE; i++) {
    nextCtx.save();
    nextCtx.translate(30, 120 + (i - 1) * 60);
    drawShapeCentered(nextCtx, queue[i].shape, 15);
    nextCtx.restore();
  }
}

function drawHold() {
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (held === null) return;
  drawShapeCentered(holdCtx, PIECES[held], 30);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeLeft > 0) freezeLeft = Math.max(0, freezeLeft - dt);
  else dropAccum += slowLeft > 0 ? dt * SLOW_FACTOR : dt;
  if (slowLeft > 0) slowLeft = Math.max(0, slowLeft - dt);
  if (shakeLeft > 0) shakeLeft = Math.max(0, shakeLeft - dt);
  for (const e of effects) e.life -= dt;
  effects = effects.filter(e => e.life > 0);
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      lastRotate = false;
    } else {
      lockPiece();
      if (gameOver) return;
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  rewardPending = false;
  powerupPending = false;
  powerupLines = 0;
  freezeLeft = 0;
  combo = 0;
  b2b = false;
  lastRotate = false;
  effects = [];
  shakeLeft = 0;
  shakePower = 0;
  energy = 0;
  choosing = false;
  previewLeft = 0;
  slowLeft = 0;
  held = null;
  holdUsed = false;
  lastPlacement = null;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  queue = Array.from({ length: QUEUE_SIZE }, randomPiece);
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  abilityMenu.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  getAudio(); // el navegador exige un gesto del usuario para iniciar el audio
  if (e.code === 'KeyM') { muted = !muted; return; }
  if (choosing) {
    if (e.code === 'Escape') closeAbilityMenu();
    else if (/^Digit[1-4]$/.test(e.code)) useAbility(+e.code.slice(5));
    return;
  }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'KeyE':
      if (energy >= ENERGY_LINES) openAbilityMenu();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) { current.x--; lastRotate = false; }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) { current.x++; lastRotate = false; }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
abilityBtns.forEach(btn => btn.addEventListener('click', () => useAbility(+btn.dataset.ability)));
abilityCancel.addEventListener('click', closeAbilityMenu);

function applyTheme(theme) {
  const light = theme === 'light';
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = light ? 'Modo oscuro' : 'Modo claro';
  themeBtn.setAttribute('aria-pressed', String(light));
  const styles = getComputedStyle(document.documentElement);
  gridColor = styles.getPropertyValue('--grid').trim();
  highlightColor = styles.getPropertyValue('--highlight').trim();
  // redibujar para reflejar el cambio en pausa o game over
  if (current && queue) {
    draw();
    drawNext();
    drawHold();
  }
}

themeBtn.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  themeBtn.blur(); // evita que Space/P activen el botón
});

applyTheme('dark');

init();
