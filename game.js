
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// ========================================
// NEON DASH 3D — GAME SETTINGS
// ========================================

const container = document.getElementById("game-container");

const ui = {
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  coins: document.getElementById("coins"),
  level: document.getElementById("level"),
  menu: document.getElementById("menu"),
  pause: document.getElementById("pause-screen"),
  over: document.getElementById("game-over"),
  skins: document.getElementById("skins-screen"),
  finalScore: document.getElementById("final-score"),
  finalCoins: document.getElementById("final-coins"),
  shopCoins: document.getElementById("shop-coins"),
  skinList: document.getElementById("skin-list"),
  message: document.getElementById("message"),
  pauseButton: document.getElementById("pause-btn"),
  controls: document.getElementById("mobile-controls")
};

const LANES = [-2.2, 0, 2.2];

const SKINS = [
  { id: "cyan", name: "CYBER CYAN", color: 0x00f5ff, price: 0 },
  { id: "pink", name: "HOT PINK", color: 0xff2bd6, price: 30 },
  { id: "gold", name: "GOLD RUSH", color: 0xffbd35, price: 60 },
  { id: "green", name: "TOXIC GREEN", color: 0x39ff75, price: 100 },
  { id: "purple", name: "ULTRA VIOLET", color: 0xb400ff, price: 150 }
];

function readNumber(key, fallback = 0) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

let bestScore = readNumber("neonDashBest");
let totalCoins = readNumber("neonDashCoins");
let unlocked = readJSON("neonDashSkins", ["cyan"]);

if (!Array.isArray(unlocked)) unlocked = ["cyan"];
if (!unlocked.includes("cyan")) unlocked.push("cyan");

let selectedSkin = localStorage.getItem("neonDashSelected") || "cyan";
if (!unlocked.includes(selectedSkin)) selectedSkin = "cyan";

let score = 0;
let runCoins = 0;
let running = false;
let paused = false;
let gameOver = false;
let lane = 1;
let playerY = 0;
let jumpVelocity = 0;
let speed = 15;
let level = 1;
let spawnTimer = 0;
let coinTimer = 0;
let elapsed = 0;
let lastTime = 0;
let messageTimer = 0;
let soundEnabled = true;
let audioContext = null;

const obstacles = [];
const pickups = [];
const scenery = [];

// ========================================
// THREE.JS WORLD
// ========================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080014);
scene.fog = new THREE.Fog(0x080014, 28, 105);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  180
);
camera.position.set(0, 5.2, 10.5);
camera.lookAt(0, 1, -8);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9b8cff, 0x160027, 2.0));

const cyanLight = new THREE.PointLight(0x00eaff, 65, 45);
cyanLight.position.set(-5, 7, -8);
scene.add(cyanLight);

const purpleLight = new THREE.PointLight(0xa000ff, 70, 45);
purpleLight.position.set(5, 6, -15);
scene.add(purpleLight);

const pinkLight = new THREE.PointLight(0xff168f, 35, 30);
pinkLight.position.set(0, 4, 10);
scene.add(pinkLight);

// ========================================
// MATERIALS AND HELPERS
// ========================================

function standard(color, emissive = 0x000000, intensity = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.55,
    metalness: 0.35
  });
}

const roadMaterial = standard(0x100a24, 0x100020, 0.5);
const cyanMaterial = standard(0x00eaff, 0x00eaff, 2.2);
const pinkMaterial = standard(0xff20d5, 0xff20d5, 2.0);
const whiteMaterial = standard(0xf4f2ff, 0x635bff, 0.35);
const obstacleMaterial = standard(0x49105f, 0xff168f, 1.1);
const goldMaterial = standard(0xffc928, 0xff9d00, 2.5);
const buildingMaterial = standard(0x100d2b, 0x210b48, 0.5);

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const coinGeometry = new THREE.TorusGeometry(0.38, 0.12, 8, 16);
const sphereGeometry = new THREE.SphereGeometry(0.3, 12, 10);

function addBox(parent, geometry, material, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

// ========================================
// TRACK
// ========================================

addBox(scene, boxGeometry, roadMaterial, 0, -0.2, -42, 7.5, 0.4, 110);

for (const x of [-3.78, 3.78]) {
  addBox(scene, boxGeometry, cyanMaterial, x, 0.02, -42, 0.09, 0.08, 110);
}

for (const x of [-1.1, 1.1]) {
  const lineMaterial = standard(0x4330a0, 0x4e2cff, 0.8);
  for (let z = -95; z < 15; z += 6) {
    addBox(scene, boxGeometry, lineMaterial, x, 0.015, z, 0.025, 0.025, 2.6);
  }
}

addBox(scene, boxGeometry, standard(0x211044), 0, -0.48, -42, 12, 0.3, 110);

// ========================================
// FUTURISTIC CITY
// ========================================

function makeBuilding(x, z, side) {
  const height = 3 + Math.random() * 11;
  const width = 2 + Math.random() * 2.5;
  const depth = 3 + Math.random() * 5;

  const building = new THREE.Group();
  building.position.set(x, 0, z);
  scene.add(building);

  addBox(
    building, boxGeometry, buildingMaterial,
    0, height / 2, 0, width, height, depth
  );

  const windowMaterial = Math.random() > 0.5 ? cyanMaterial : pinkMaterial;

  for (let y = 1.3; y < height - 0.5; y += 1.6) {
    for (let w = -1; w <= 1; w += 2) {
      addBox(
        building, boxGeometry, windowMaterial,
        w * width * 0.23, y, depth / 2 + 0.015,
        0.12, 0.45, 0.04
      );
    }
  }

  scenery.push({ group: building, baseZ: z, side });
}

for (let z = -95; z <= 15; z += 9) {
  makeBuilding(-7 - Math.random() * 5, z, -1);
  makeBuilding(7 + Math.random() * 5, z - 4, 1);
}

// Distant neon skyline
for (let i = 0; i < 24; i++) {
  const x = (Math.random() - 0.5) * 75;
  const z = -65 - Math.random() * 35;
  const height = 4 + Math.random() * 18;

  addBox(
    scene,
    boxGeometry,
    buildingMaterial,
    x, height / 2, z,
    2 + Math.random() * 3, height, 2 + Math.random() * 4
  );
}

// Stars
const starPositions = [];
for (let i = 0; i < 300; i++) {
  starPositions.push(
    (Math.random() - 0.5) * 100,
    8 + Math.random() * 30,
    -Math.random() * 100
  );
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starPositions, 3)
);

const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0x9beeff,
    size: 0.12,
    transparent: true,
    opacity: 0.8
  })
);
scene.add(stars);

// ========================================
// PLAYER
// ========================================

const player = new THREE.Group();
scene.add(player);
player.position.set(0, 0, 4);

const bodyMaterial = standard(0x00f5ff, 0x00eaff, 1.4);
const darkMaterial = standard(0x141027, 0x3a1870, 0.5);
const visorMaterial = standard(0xffffff, 0x00cfff, 2.5);

const body = addBox(
  player, boxGeometry, bodyMaterial,
  0, 1.05, 0, 0.75, 0.85, 0.48
);

const head = addBox(
  player, boxGeometry, visorMaterial,
  0, 1.8, -0.03, 0.62, 0.52, 0.52
);

const visor = addBox(
  player, boxGeometry, darkMaterial,
  0, 1.82, -0.3, 0.48, 0.2, 0.035
);

const leftArm = addBox(
  player, boxGeometry, bodyMaterial,
  -0.48, 1.12, 0, 0.22, 0.7, 0.24
);

const rightArm = addBox(
  player, boxGeometry, bodyMaterial,
  0.48, 1.12, 0, 0.22, 0.7, 0.24
);

const leftLeg = addBox(
  player, boxGeometry, darkMaterial,
  -0.2, 0.4, 0, 0.25, 0.55, 0.3
);

const rightLeg = addBox(
  player, boxGeometry, darkMaterial,
  0.2, 0.4, 0, 0.25, 0.55, 0.3
);

function updateSkin() {
  const skin = SKINS.find(item => item.id === selectedSkin) || SKINS[0];
  bodyMaterial.color.setHex(skin.color);
  bodyMaterial.emissive.setHex(skin.color);
  visorMaterial.emissive.setHex(skin.color);
  visorMaterial.color.setHex(0xffffff);
  renderSkins();
}

function renderSkins() {
  if (!ui.skinList) return;
  ui.skinList.innerHTML = "";

  for (const skin of SKINS) {
    const owned = unlocked.includes(skin.id);
    const selected = selectedSkin === skin.id;

    const row = document.createElement("div");
    row.className = "skin-option" + (selected ? " selected" : "");

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "skin-name";
    name.textContent = skin.name;
    name.style.color = "#" + skin.color.toString(16).padStart(6, "0");

    const price = document.createElement("div");
    price.className = "skin-price";
    price.textContent = skin.price === 0 ? "FREE" : `${skin.price} COINS`;

    info.append(name, price);

    const button = document.createElement("button");
    button.textContent = selected ? "EQUIPPED" : owned ? "EQUIP" : "UNLOCK";

    button.addEventListener("click", () => {
      if (owned) {
        selectedSkin = skin.id;
        saveValue("neonDashSelected", selectedSkin);
        updateSkin();
        playSound(650, 0.07);
        return;
      }

      if (totalCoins < skin.price) {
        showMessage("NOT ENOUGH COINS!");
        playSound(150, 0.12);
        return;
      }

      totalCoins -= skin.price;
      unlocked.push(skin.id);
      selectedSkin = skin.id;

      saveValue("neonDashCoins", totalCoins);
      saveValue("neonDashSkins", JSON.stringify(unlocked));
      saveValue("neonDashSelected", selectedSkin);

      updateUI();
      updateSkin();
      showMessage("NEW SKIN UNLOCKED!");
      playSound(850, 0.12);
    });

    row.append(info, button);
    ui.skinList.appendChild(row);
  }
}

// ========================================
// OBSTACLES AND COINS
// ========================================

function makeObstacle(laneIndex, z) {
  const group = new THREE.Group();
  group.position.set(LANES[laneIndex], 0, z);
  scene.add(group);

  const height = 0.9 + Math.random() * 0.35;
  addBox(
    group, boxGeometry, obstacleMaterial,
    0, height / 2, 0, 1.05, height, 0.8
  );

  addBox(
    group, boxGeometry, pinkMaterial,
    0, height + 0.05, 0, 1.12, 0.07, 0.86
  );

  obstacles.push({
    group,
    lane: laneIndex,
    hit: false,
    height
  });
}

function makeCoin(laneIndex, z, height = 1.35) {
  const mesh = new THREE.Mesh(coinGeometry, goldMaterial);
  mesh.position.set(LANES[laneIndex], height, z);
  scene.add(mesh);

  pickups.push({
    mesh,
    lane: laneIndex,
    collected: false,
    phase: Math.random() * Math.PI * 2
  });
}

function randomLane() {
  return Math.floor(Math.random() * 3);
}

function spawnObstacleSet() {
  const firstLane = randomLane();
  makeObstacle(firstLane, -48);

  // Sometimes add a second obstacle, leaving at least one lane open.
  if (Math.random() < 0.28) {
    let secondLane = randomLane();
    while (secondLane === firstLane) secondLane = randomLane();
    makeObstacle(secondLane, -58);
  }
}

function spawnCoinLine() {
  const coinLane = randomLane();
  for (let i = 0; i < 5; i++) {
    makeCoin(coinLane, -32 - i * 2.1, 1.25 + (i === 2 ? 0.5 : 0));
  }
}

// ========================================
// SOUND EFFECTS
// ========================================

function playSound(frequency = 500, duration = 0.08, type = "sine") {
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequency * 0.65),
      audioContext.currentTime + duration
    );

    gain.gain.setValueAtTime(0.09, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
}

document.getElementById("sound-btn").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  document.getElementById("sound-btn").textContent = soundEnabled ? "🔊" : "🔇";
  if (soundEnabled) playSound(600, 0.1);
});

// ========================================
// GAME UI
// ========================================

function showMessage(text) {
  ui.message.textContent = text;
  messageTimer = 1.6;
}

function updateUI() {
  ui.score.textContent = Math.floor(score);
  ui.best.textContent = bestScore;
  ui.coins.textContent = totalCoins;
  ui.level.textContent = `LEVEL ${level}`;
  ui.shopCoins.textContent = totalCoins;
}

function hideAllOverlays() {
  ui.menu.classList.add("hidden");
  ui.pause.classList.add("hidden");
  ui.over.classList.add("hidden");
  ui.skins.classList.add("hidden");
}

function openHome() {
  running = false;
  paused = false;
  gameOver = false;
  hideAllOverlays();
  ui.menu.classList.remove("hidden");
  ui.pauseButton.classList.add("hidden");
  ui.controls.classList.remove("hidden");
}

function showShop() {
  running = false;
  paused = false;
  hideAllOverlays();
  ui.skins.classList.remove("hidden");
  ui.pauseButton.classList.add("hidden");
  ui.shopCoins.textContent = totalCoins;
  renderSkins();
}

document.getElementById("skins-btn").addEventListener("click", showShop);
document.getElementById("skins-back-btn").addEventListener("click", openHome);

// ========================================
// START, PAUSE, RESUME, RESTART
// ========================================

function clearRunObjects() {
  for (const item of obstacles) scene.remove(item.group);
  for (const item of pickups) scene.remove(item.mesh);
  obstacles.length = 0;
  pickups.length = 0;
}

function startGame() {
  clearRunObjects();

  score = 0;
  runCoins = 0;
  lane = 1;
  playerY = 0;
  jumpVelocity = 0;
  speed = 15;
  level = 1;
  spawnTimer = 0.7;
  coinTimer = 1.2;
  elapsed = 0;
  running = true;
  paused = false;
  gameOver = false;

  player.position.set(0, 0, 4);
  player.rotation.set(0, 0, 0);

  hideAllOverlays();
  ui.pauseButton.classList.remove("hidden");
  ui.controls.classList.remove("hidden");

  updateUI();
  playSound(600, 0.13);
}

function pauseGame() {
  if (!running || gameOver) return;
  running = false;
  paused = true;
  ui.pause.classList.remove("hidden");
  ui.pauseButton.classList.add("hidden");
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  running = true;
  ui.pause.classList.add("hidden");
  ui.pauseButton.classList.remove("hidden");
  lastTime = performance.now();
}

function endGame() {
  if (gameOver) return;

  running = false;
  paused = false;
  gameOver = true;

  bestScore = Math.max(bestScore, Math.floor(score));
  saveValue("neonDashBest", bestScore);

  ui.finalScore.textContent = Math.floor(score);
  ui.finalCoins.textContent = runCoins;
  updateUI();

  ui.over.classList.remove("hidden");
  ui.pauseButton.classList.add("hidden");
  playSound(180, 0.35, "sawtooth");
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("resume-btn").addEventListener("click", resumeGame);
document.getElementById("pause-btn").addEventListener("click", pauseGame);
document.getElementById("restart-btn").addEventListener("click", startGame);
document.getElementById("play-again-btn").addEventListener("click", startGame);
document.getElementById("home-btn").addEventListener("click", openHome);
document.getElementById("game-over-home-btn").addEventListener("click", openHome);

// ========================================
// PLAYER CONTROLS
// ========================================

function moveLeft() {
  if (!running) return;
  lane = Math.max(0, lane - 1);
  playSound(320, 0.045);
}

function moveRight() {
  if (!running) return;
  lane = Math.min(2, lane + 1);
  playSound(360, 0.045);
}

function jump() {
  if (!running || playerY > 0.03) return;
  jumpVelocity = 10.5;
  playSound(520, 0.12);
}

document.getElementById("left-btn").addEventListener("click", moveLeft);
document.getElementById("right-btn").addEventListener("click", moveRight);
document.getElementById("jump-btn").addEventListener("click", jump);

window.addEventListener("keydown", event => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "Escape"].includes(event.key)) {
    event.preventDefault();
  }

  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") moveLeft();
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") moveRight();
  if (event.key === "ArrowUp" || event.key === " ") jump();

  if (event.key === "Escape") {
    if (running) pauseGame();
    else if (paused) resumeGame();
  }
});

// Swipe gestures on the game canvas
let touchStartX = 0;
let touchStartY = 0;

renderer.domElement.addEventListener("touchstart", event => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

renderer.domElement.addEventListener("touchend", event => {
  if (!running) return;

  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) moveLeft();
    else moveRight();
  } else if (dy < 0) {
    jump();
  }
}, { passive: true });

// ========================================
// COLLISIONS AND COLLECTIONS
// ========================================

function checkCollisions() {
  for (const obstacle of obstacles) {
    if (obstacle.hit) continue;

    const closeEnough = Math.abs(obstacle.group.position.z - player.position.z) < 0.85;
    const sameLane = obstacle.lane === lane;
    const lowEnough = playerY < obstacle.height - 0.1;

    if (closeEnough && sameLane && lowEnough) {
      obstacle.hit = true;
      endGame();
      return;
    }
  }

  for (const coin of pickups) {
    if (coin.collected) continue;

    const closeEnough = Math.abs(coin.mesh.position.z - player.position.z) < 1.1;
    const sameLane = coin.lane === lane;
    const closeHeight = Math.abs(coin.mesh.position.y - (playerY + 1.2)) < 1.4;

    if (closeEnough && sameLane && closeHeight) {
      coin.collected = true;
      scene.remove(coin.mesh);

      runCoins++;
      totalCoins++;
      score += 10;

      saveValue("neonDashCoins", totalCoins);
      updateUI();
      playSound(900, 0.07, "triangle");
    }
  }
}

// ========================================
// ANIMATION LOOP
// ========================================

function updateGame(dt, now) {
  elapsed += dt;
  score += dt * speed * 0.6;

  speed = 15 + Math.min(15, elapsed * 0.16);
  level = 1 + Math.floor(elapsed / 20);

  spawnTimer -= dt;
  coinTimer -= dt;

  if (spawnTimer <= 0) {
    spawnObstacleSet();
    spawnTimer = Math.max(0.85, 1.65 - elapsed * 0.006) + Math.random() * 0.35;
  }

  if (coinTimer <= 0) {
    spawnCoinLine();
    coinTimer = 2.6 + Math.random() * 1.5;
  }

  // Smoothly change lanes.
  const targetX = LANES[lane];
  player.position.x += (targetX - player.position.x) * Math.min(1, dt * 12);

  // Jump physics.
  if (playerY > 0 || jumpVelocity > 0) {
    playerY += jumpVelocity * dt;
    jumpVelocity -= 25 * dt;

    if (playerY <= 0) {
      playerY = 0;
      jumpVelocity = 0;
    }
  }

  player.position.y = playerY;

  // Running animation.
  const stride = Math.sin(now * 0.012) * (playerY > 0 ? 0.12 : 0.65);
  leftLeg.rotation.x = stride;
  rightLeg.rotation.x = -stride;
  leftArm.rotation.x = -stride * 0.8;
  rightArm.rotation.x = stride * 0.8;

  player.rotation.z = (targetX - player.position.x) * 0.08;

  // Move the obstacles toward the player.
  for (const obstacle of obstacles) {
    obstacle.group.position.z += speed * dt;
  }

  for (const coin of pickups) {
    if (coin.collected) continue;
    coin.mesh.position.z += speed * dt;
    coin.mesh.rotation.y += dt * 3.5;
    coin.mesh.position.y += Math.sin(now * 0.004 + coin.phase) * dt * 0.4;
  }

  // Loop the neon road markings to create forward motion.
  for (const child of scene.children) {
    if (child.userData.roadMarker) {
      child.position.z += speed * dt;
      if (child.position.z > 10) child.position.z -= 105;
    }
  }

  // Gently move the city scenery backward.
  for (const item of scenery) {
    item.group.position.z += speed * dt * 0.25;
    if (item.group.position.z > 22) item.group.position.z -= 110;
  }

  checkCollisions();

  // Remove objects behind the player.
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].group.position.z > 14) {
      scene.remove(obstacles[i].group);
      obstacles.splice(i, 1);
    }
  }

  for (let i = pickups.length - 1; i >= 0; i--) {
    if (pickups[i].collected || pickups[i].mesh.position.z > 14) {
      scene.remove(pickups[i].mesh);
      pickups.splice(i, 1);
    }
  }

  // Move the camera slightly with the player.
  camera.position.x += (player.position.x * 0.22 - camera.position.x) * dt * 2;
  camera.lookAt(player.position.x * 0.18, 1.0 + playerY * 0.12, -8);

  updateUI();
}

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - (lastTime || now)) / 1000, 0.04);
  lastTime = now;

  if (running) {
    updateGame(dt, now);
  } else if (!paused && !gameOver) {
    // Idle animation on the title screen.
    player.position.y = Math.sin(now * 0.0018) * 0.05;
    player.rotation.y = Math.sin(now * 0.0007) * 0.08;
  }

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) ui.message.textContent = "";
  }

  renderer.render(scene, camera);
}

// ========================================
// RESPONSIVE SCREEN
// ========================================

function resizeGame() {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
}

window.addEventListener("resize", resizeGame);

if ("ResizeObserver" in window) {
  new ResizeObserver(resizeGame).observe(container);
}

// ========================================
// STARTUP
// ========================================

updateSkin();
updateUI();
resizeGame();
requestAnimationFrame(animate);
