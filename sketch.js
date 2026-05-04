let W = 540;
let H = 580;

let sprites = {};
let gameState = "menu";
let player = null;
let platforms = [];
let cameraY = 0;
let score = 0;
let bestScore = 0;
let deathTimer = 0;
let lastTime = 0;

function preload() {
  sprites.plat = loadImage("platform.png");
  sprites.dead = loadImage("after fall.png");
  sprites.idle = loadImage("idle.png");
  sprites.jump = loadImage("jump.png");
  sprites.fall = loadImage("fall.png");
}

function setup() {
  createCanvas(W, H);
  textFont("Courier New");

  const saved = localStorage.getItem("scholarJumpBest");
  if (saved) bestScore = int(saved);
}

function cleanText() {
  noStroke();
  drawingContext.shadowBlur = 0;
  drawingContext.shadowColor = "transparent";
}

function draw() {
  let now = millis();
  let dt = lastTime === 0 ? 1 : min((now - lastTime) / 16.67, 3);
  lastTime = now;

  if (gameState === "playing") {
    updateGame(dt);
  }

  drawGame();

  if (gameState === "menu") {
    drawMenuOverlay();
  } else if (gameState === "dead") {
    drawDeathOverlay();
  }

  drawUI();
}

function keyPressed() {
  if (gameState === "playing" && (keyCode === 32 || keyCode === UP_ARROW)) {
    tryJump();
    return false;
  }

  if ((gameState === "menu" || gameState === "dead") && keyCode === ENTER) {
    startGame();
    return false;
  }
}

function mousePressed() {
  if (gameState === "menu" || gameState === "dead") {
    startGame();
  }
}

function tryJump() {
  if (player.onGround || player.coyoteTime > 0) {
    player.vy = -15;
    player.onGround = false;
    player.coyoteTime = 0;
  }
}

function startGame() {
  initGame();
}

function initGame() {
  cameraY = 0;
  score = 0;
  deathTimer = 0;

  player = {
    x: W / 2 - 30,
    y: H - 160,
    w: 64,
    h: 74,
    vx: 0,
    vy: 0,
    onGround: false,
    coyoteTime: 0,
    facingLeft: false,
    state: "idle",
    deadSnapCamY: 0
  };

  platforms = [];

  platforms.push({
    x: W / 2 - 90,
    y: H - 80,
    w: 200,
    h: 20,
    hitX: 4,
    hitW: 192,
    hitY: 5,
    hitH: 12
  });

  generatePlatforms(cameraY - H * 2);

  gameState = "playing";
}

function generatePlatforms(topY) {
  let y;

  if (platforms.length > 0) {
    y = Math.min(...platforms.map(p => p.y));
  } else {
    y = H - 80;
  }

  while (y > topY) {
    y -= 90 + random() * 40;
    const pw = 120 + random() * 100;
    const px = random(15, W - pw - 15);

    platforms.push({
      x: px,
      y: y,
      w: pw,
      h: 20,
      hitX: 8,
      hitW: pw - 16,
      hitY: 6,
      hitH: 10
    });
  }
}

function updateGame(dt) {
  if (gameState !== "playing" || !player) return;
  if (!platforms) platforms = [];

  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    player.vx = -5;
    player.facingLeft = true;
  } else if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    player.vx = 5;
    player.facingLeft = false;
  } else {
    player.vx *= 0.72;
  }

  player.vy += 0.65 * dt;
  if (player.vy > 20) player.vy = 20;

  const prevY = player.y;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  if (player.x + player.w < 0) player.x = W;
  if (player.x > W) player.x = -player.w;

  if (player.onGround) {
    player.coyoteTime = 8;
  } else if (player.coyoteTime > 0) {
    player.coyoteTime--;
  }

  player.onGround = false;

  if (player.vy >= 0) {
    const prevFeet = prevY + player.h;
    const feet = player.y + player.h;

    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];

      const hitLeft = p.x + (p.hitX || 0);
      const hitRight = hitLeft + (p.hitW || p.w);
      const hitTop = p.y + (p.hitY || 0);

      if (
        player.x + player.w - 4 > hitLeft &&
        player.x + 4 < hitRight &&
        prevFeet <= hitTop + 10 &&
        feet >= hitTop
      ) {
        player.y = hitTop - player.h;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }

  const targetCam = player.y - H * 0.5;
  if (targetCam < cameraY) {
    cameraY += (targetCam - cameraY) * 0.15;
  }

  const h = Math.round(-cameraY / 18);
  if (h > score) score = h;

  if (platforms.length > 0) {
    const topmost = Math.min(...platforms.map(function (p) {
      return p.y;
    }));

    if (topmost > cameraY - H) {
      generatePlatforms(cameraY - H * 2);
    }
  }

  platforms = platforms.filter(function (p) {
    return p.y - cameraY < H + 400;
  });

  if (player.vy < -2) {
    player.state = "jumping";
  } else if (player.vy > 3) {
    player.state = "falling";
  } else {
    player.state = "idle";
  }

  if (player.y - cameraY > H + 100) {
    gameState = "dead";

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("scholarJumpBest", bestScore);
    }

    deathTimer = 0;
    player.deadSnapCamY = cameraY;
  }
}

function drawGame() {
  background(235);
  drawNotebook();

  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    const sy = p.y - cameraY;

    if (sy > -40 && sy < H + 40) {
      drawSprite(sprites.plat, p.x, sy - 12, p.w, 28, false);
    }
  }

  if (!player) return;

  if (gameState === "dead") {
    deathTimer++;

    if (deathTimer < 110) {
      cameraY = player.deadSnapCamY + deathTimer * 3.2;
    }

    const py = player.y - cameraY;

    push();
    translate(player.x + player.w / 2, py + player.h / 2);
    rotate(min(deathTimer * 0.07, PI * 1.5));
    imageMode(CENTER);
    image(sprites.dead, 0, 0, player.w + 12, player.h + 12);
    pop();

    imageMode(CORNER);

    if (deathTimer > 110) {
      noStroke();
      const alpha = min((deathTimer - 110) / 35, 1) * 230;
      fill(255, alpha);
      rect(0, 0, W, H);
    }
  } else {
    const py = player.y - cameraY;

    let img;
    if (player.state === "jumping") img = sprites.jump;
    else if (player.state === "falling") img = sprites.fall;
    else img = sprites.idle;

    drawSprite(img, player.x - 6, py - 6, player.w + 12, player.h + 12, player.facingLeft);
  }
}

function drawNotebook() {
  noStroke();
  fill(235);
  rect(0, 0, W, H);

  const lh = 30;
  const off = ((cameraY * 0.6) % lh + lh) % lh;

  stroke(140, 170, 255, 100);
  strokeWeight(1);

  for (let y = -lh + off; y < H + lh; y += lh) {
    line(0, y, W, y);
  }

  stroke(210, 50, 50, 130);
  strokeWeight(2);
  line(70, 0, 70, H);
}

function drawSprite(img, x, y, w, h, flipX) {
  if (!img) {
    noStroke();
    fill(85);
    rect(x, y, w, h);
    return;
  }

  push();

  if (flipX) {
    translate(x + w, y);
    scale(-1, 1);
    image(img, 0, 0, w, h);
  } else {
    image(img, x, y, w, h);
  }

  pop();
}

function drawUI() {
  push();
  cleanText();

  fill(34);
  textAlign(LEFT, TOP);
  textSize(15);
  textStyle(BOLD);

  text("HEIGHT: " + score + "m", 18, 12);
  text("BEST: " + bestScore + "m", 220, 12);

  textSize(11);
  fill(85);
  text("← → MOVE    SPACE / ↑ JUMP", 18, H - 22);

  pop();
}

function drawMenuOverlay() {
  push();
  cleanText();

  fill(255, 225);
  rect(0, 0, W, H);

  textAlign(CENTER, CENTER);
  fill(34);
  textStyle(BOLD);
  textSize(38);
  text("JUMPING GUY", W / 2, H / 2 - 60);

  textSize(13);
  fill(85);
  text("Jump up the platforms. Don't fall!", W / 2, H / 2 - 20);

  fill(34);
  rectMode(CENTER);
  rect(W / 2, H / 2 + 35, 170, 46);

  fill(255);
  textSize(15);
  text("START", W / 2, H / 2 + 35);

  fill(140);
  textSize(11);
  text("Click or press ENTER", W / 2, H / 2 + 80);

  pop();
  rectMode(CORNER);
}

function drawDeathOverlay() {
  if (deathTimer <= 140) return;

  const isNew = score > 0 && score >= bestScore;

  push();
  cleanText();

  fill(255, 230);
  rect(0, 0, W, H);

  textAlign(CENTER, CENTER);
  fill(34);
  textStyle(BOLD);
  textSize(38);
  text("UNLUCKY", W / 2, H / 2 - 60);

  textSize(16);
  fill(60);
  text("You reached " + score + "m" + (isNew ? "   NEW BEST!" : ""), W / 2, H / 2 - 15);

  fill(34);
  rectMode(CENTER);
  rect(W / 2, H / 2 + 35, 190, 46);

  fill(255);
  textSize(15);
  text("TRY AGAIN", W / 2, H / 2 + 35);

  fill(140);
  textSize(11);
  text("Click or press ENTER", W / 2, H / 2 + 80);

  pop();
  rectMode(CORNER);
}