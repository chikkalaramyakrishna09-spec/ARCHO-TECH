// 🎯 Archery Balloon Pop Game — Fixed Arrow Release Direction

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = (canvas.width = canvas.clientWidth);
let H = (canvas.height = canvas.clientHeight);

window.addEventListener("resize", () => {
  W = canvas.width = canvas.clientWidth;
  H = canvas.height = canvas.clientHeight;
});

// ----- Game Variables -----
let score = 0;
let arrowsLeft = 5;
let running = true;
let gameLoopId = null;

// Bow position
const bow = {
  x: W * 0.15,
  y: H * 0.5,
  size: Math.min(W, H) * 0.12,
};

// Arrow setup
let arrow = createArrow();
let balloons = [];

const MAX_PULL = Math.min(W, H) * 0.25;
const POWER = 0.25; // shooting strength
const GRAVITY = 0.15;

// Bow image
const bowImg = new Image();
bowImg.src = makeBowSVG();

// ----- Helper Functions -----
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function createArrow() {
  return {
    x: bow.x + 40,
    y: bow.y,
    vx: 0,
    vy: 0,
    angle: 0,
    dragging: false,
    flying: false,
    active: true,
  };
}

function spawnBalloons(count = 5) {
  balloons = [];
  for (let i = 0; i < count; i++) {
    const y = rand(80, H - 100);
    const r = rand(25, 35);
    balloons.push({
      x: rand(W * 0.6, W - r - 20),
      y,
      r,
      vx: rand(1.0, 2.0) * (Math.random() > 0.5 ? 1 : -1),
      color: `hsl(${Math.floor(rand(0, 360))},70%,60%)`,
      popped: false,
    });
  }
}

function makeBowSVG() {
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='180' height='360' viewBox='0 0 180 360'>
    <defs>
      <linearGradient id='g' x1='0' x2='1'>
        <stop offset='0' stop-color='#8b5a2b'/>
        <stop offset='1' stop-color='#5b3214'/>
      </linearGradient>
    </defs>
    <g transform='translate(90,180)'>
      <path d='M0,-160 C60,-130 70,-40 0,0 C70,40 60,130 0,160' fill='none' stroke='url(#g)' stroke-width='14' stroke-linecap='round'/>
      <line x1='-5' y1='-150' x2='5' y2='150' stroke='#222' stroke-width='2'/>
    </g>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// ----- Input Handling -----
let pointerDown = false;
let pointerId = null;

function getPointerPos(e) {
  if (e.touches && e.touches.length) {
    const t = e.touches[0];
    return {
      x: t.clientX - canvas.getBoundingClientRect().left,
      y: t.clientY - canvas.getBoundingClientRect().top,
    };
  } else {
    return {
      x: e.clientX - canvas.getBoundingClientRect().left,
      y: e.clientY - canvas.getBoundingClientRect().top,
    };
  }
}

canvas.addEventListener("pointerdown", (e) => {
  if (!running) return;
  const p = getPointerPos(e);
  const d = Math.hypot(p.x - arrow.x, p.y - arrow.y);
  if (!arrow.flying && d < 40 && arrow.active) {
    arrow.dragging = true;
    pointerDown = true;
    pointerId = e.pointerId;
    canvas.setPointerCapture(pointerId);
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!arrow.dragging || !pointerDown) return;
  const p = getPointerPos(e);
  const gx = bow.x;
  const gy = bow.y;

  // vector from bow to pointer → pulling backward
  const dx = p.x - gx;
  const dy = p.y - gy;
  const dist = Math.min(Math.hypot(dx, dy), MAX_PULL);

  const ux = dx / (Math.hypot(dx, dy) || 1);
  const uy = dy / (Math.hypot(dx, dy) || 1);

  // move arrow backward when dragging
  arrow.x = gx + ux * dist;
  arrow.y = gy + uy * dist;

  // rotate arrow forward (toward balloons)
  arrow.angle = Math.atan2(gy - arrow.y, gx - arrow.x);
});

canvas.addEventListener("pointerup", (e) => {
  if (!pointerDown) return;
  pointerDown = false;
  if (pointerId) {
    try {
      canvas.releasePointerCapture(pointerId);
    } catch {}
    pointerId = null;
  }

  if (arrow.dragging) {
    const gx = bow.x;
    const gy = bow.y;
    const dx = arrow.x - gx;
    const dy = arrow.y - gy;
    const pull = Math.hypot(dx, dy);

    if (pull > 6) {
      // ✅ FIXED: arrow now shoots FORWARD toward target
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      arrow.vx = -ux * pull * POWER; // <-- reversed direction
      arrow.vy = -uy * pull * POWER;
      arrow.flying = true;
      arrow.dragging = false;
    } else {
      resetArrow();
    }
  }
});

// ----- Game Logic -----
function resetArrow() {
  arrow.x = bow.x + 40;
  arrow.y = bow.y;
  arrow.vx = 0;
  arrow.vy = 0;
  arrow.angle = 0;
  arrow.flying = false;
  arrow.dragging = false;
}

function nextArrow() {
  if (arrowsLeft <= 0) {
    running = false;
    showGameOver();
    return;
  }
  arrow = createArrow();
  arrowsLeft--;
  updateHUD();
}

function updateHUD() {
  document.getElementById("score").textContent = score;
  document.getElementById("arrowsLeft").textContent = arrowsLeft;
}

function checkBalloonHits() {
  if (!arrow.flying) return;
  for (const b of balloons) {
    if (b.popped) continue;
    const d = Math.hypot(arrow.x - b.x, arrow.y - b.y);
    if (d < b.r) {
      b.popped = true;
      score += 10;
      updateHUD();
      setTimeout(() => {
        respawnBalloon(b);
        nextArrow();
      }, 150);
      return;
    }
  }
}

function respawnBalloon(b) {
  b.x = rand(W * 0.6, W - 40);
  b.y = rand(80, H - 120);
  b.r = rand(25, 35);
  b.vx = rand(1.0, 2.0) * (Math.random() > 0.5 ? 1 : -1);
  b.color = `hsl(${Math.floor(rand(0, 360))},70%,60%)`;
  b.popped = false;
}

function update(dt) {
  if (arrow.flying) {
    arrow.vy += GRAVITY;
    arrow.x += arrow.vx;
    arrow.y += arrow.vy;
    arrow.angle = Math.atan2(arrow.vy, arrow.vx);

    if (arrow.x > W || arrow.y > H || arrow.x < 0 || arrow.y < 0) {
      nextArrow();
    }
  }

  for (const b of balloons) {
    if (b.popped) continue;
    b.x += b.vx;
    if (b.x < W * 0.55 || b.x > W - b.r - 10) b.vx *= -1;
  }

  checkBalloonHits();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // draw bow
  const bw = bow.size;
  const bh = bow.size * 2;
  ctx.drawImage(bowImg, bow.x - bw / 2, bow.y - bh / 2, bw, bh);

  // bowstring
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bow.x, bow.y - bow.size);
  ctx.lineTo(arrow.x, arrow.y);
  ctx.lineTo(bow.x, bow.y + bow.size);
  ctx.stroke();

  // arrow
  drawArrow(arrow);

  // balloons
  for (const b of balloons) {
    if (b.popped) continue;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.strokeStyle = "#444";
    ctx.stroke();
  }
}

function drawArrow(a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.angle);
  ctx.fillStyle = "#5a3b1a";
  ctx.fillRect(-20, -3, 40, 6);
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(28, -5);
  ctx.lineTo(28, 5);
  ctx.closePath();
  ctx.fillStyle = "#222";
  ctx.fill();
  ctx.restore();
}

// ----- Popup -----
const popup = document.getElementById("gameOverPopup");
const finalScoreEl = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");
const exitBtn = document.getElementById("exitBtn");

function showGameOver() {
  finalScoreEl.textContent = score;
  popup.classList.remove("hidden");
}

restartBtn.addEventListener("click", () => {
  popup.classList.add("hidden");
  startGame();
});

exitBtn.addEventListener("click", () => {
  popup.classList.add("hidden");
  running = false;
  document.getElementById("game-wrap").style.display = "none";
  document.getElementById("ui-top").style.display = "none";
  document.getElementById("exitMessage").classList.remove("hidden");
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
});

// ----- Game Start -----
function startGame() {
  score = 0;
  arrowsLeft = 5;
  updateHUD();
  spawnBalloons(5);
  running = true;
  arrow = createArrow();
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  loop();
}

function loop() {
  if (!running) return;
  update(16);
  draw();
  gameLoopId = requestAnimationFrame(loop);
}

updateHUD();
startGame();
