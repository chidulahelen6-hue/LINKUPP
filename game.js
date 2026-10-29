
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/* =====================================
   NEON DASH 3D - GRAPHICS UPGRADE
===================================== */

const container = document.getElementById("game-container");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05000e);
scene.fog = new THREE.FogExp2(0x090018, 0.014);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  350
);

camera.position.set(0, 5.2, 10.5);
camera.lookAt(0, 1, -5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

container.prepend(renderer.domElement);

/* Lighting */

scene.add(new THREE.HemisphereLight(0x8abaff, 0x180022, 2.0));

const moonLight = new THREE.DirectionalLight(0xc8ddff, 2.4);
moonLight.position.set(-5, 12, 8);
scene.add(moonLight);

function addGlowLight(color, position, intensity, distance) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(...position);
  scene.add(light);
  return light;
}

addGlowLight(0x00eaff, [-4, 4, -8], 35, 30);
addGlowLight(0xff00c8, [4, 5, -15], 30, 30);

/* Materials */

const mat = (color, emissive = 0x000000, power = 0) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: power,
    metalness: 0.45,
    roughness: 0.35
  });

const roadMat = mat(0x101020, 0x080020, 0.3);
const cyanMat = mat(0x00eaff, 0x00bfff, 2.6);
const pinkMat = mat(0xff00d4, 0xff00b7, 2.4);
const purpleMat = mat(0x6520ff, 0x4000ff, 1.8);
const whiteMat = mat(0xeafaff, 0x8beeff, 0.7);
const darkMat = mat(0x101426, 0x070b20, 0.2);
const goldMat = mat(0xffbd32, 0xff8900, 2.0);

/* World groups */

const city = new THREE.Group();
const road = new THREE.Group();
const scenery = new THREE.Group();
const dynamicObjects = new THREE.Group();

scene.add(city, road, scenery, dynamicObjects);

/* Ground */

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 360),
  mat(0x080014, 0x100024, 0.5)
);

ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.12, -100);
city.add(ground);

/* Road */

const roadBase = new THREE.Mesh(
  new THREE.BoxGeometry(10, 0.22, 300),
  roadMat
);

roadBase.position.set(0, -0.03, -115);
road.add(roadBase);

const roadSurface = new THREE.Mesh(
  new THREE.PlaneGeometry(9.8, 300),
  mat(0x111222, 0x050b20, 0.35)
);

roadSurface.rotation.x = -Math.PI / 2;
roadSurface.position.set(0, 0.09, -115);
road.add(roadSurface);

/* Road edges */

for (const x of [-5, 5]) {
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 300),
    cyanMat
  );
  edge.position.set(x, 0.12, -115);
  road.add(edge);
}

/* Lane markings */

const laneMarkers = [];

for (const x of [-1.67, 1.67]) {
  for (let i = 0; i < 28; i++) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.035, 2.5),
      i % 2 === 0 ? cyanMat : purpleMat
    );

    marker.position.set(x, 0.13, -i * 8);
    road.add(marker);
    laneMarkers.push(marker);
  }
}

/* City buildings */

const buildingMaterials = [
  mat(0x11152f, 0x071b42, 0.7),
  mat(0x241035, 0x35005c, 0.65),
  mat(0x101b32, 0x002b4c, 0.65),
  mat(0x25102c, 0x3d0030, 0.65)
];

const windowMaterials = [cyanMat, pinkMat, purpleMat, goldMat];

function createBuilding(x, z, side) {
  const width = 2.5 + Math.random() * 3;
  const height = 7 + Math.random() * 19;
  const depth = 3 + Math.random() * 5;

  const building = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    buildingMaterials[
      Math.floor(Math.random() * buildingMaterials.length)
    ]
  );

  body.position.y = height / 2;
  building.add(body);

  // Glowing vertical corners
  for (const cornerX of [-width / 2, width / 2]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, height, 0.07),
      Math.random() > 0.5 ? cyanMat : pinkMat
    );

    strip.position.set(cornerX, height / 2, depth / 2 + 0.04);
    building.add(strip);
  }

  // Windows on the front face
  const columns = Math.max(2, Math.floor(width / 0.65));
  const rows = Math.max(3, Math.floor(height / 1.1));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (Math.random() > 0.77) continue;

      const windowMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.32, 0.035),
        windowMaterials[
          Math.floor(Math.random() * windowMaterials.length)
        ]
      );

      windowMesh.position.set(
        -width / 2 + (col + 0.5) * width / columns,
        0.8 + row * 0.85,
        depth / 2 + 0.025
      );

      building.add(windowMesh);
    }
  }

  // Rooftop light
  const roofLight = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.45, 0.08, 0.12),
    side < 0 ? cyanMat : pinkMat
  );

  roofLight.position.set(0, height + 0.05, 0);
  building.add(roofLight);

  building.position.set(x, 0, z);
  building.userData.baseX = x;
  building.userData.side = side;

  city.add(building);
  scenery.add(building);

  return building;
}

for (let i = 0; i < 42; i++) {
  const z = -i * 8 - 8;

  createBuilding(-8 - Math.random() * 6, z, -1);
  createBuilding(8 + Math.random() * 6, z - 3, 1);
}

/* Distant skyline */

for (let i = 0; i < 55; i++) {
  const height = 10 + Math.random() * 28;
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(3 + Math.random() * 4, height, 4),
    buildingMaterials[i % buildingMaterials.length]
  );

  building.position.set(
    (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 35),
    height / 2 - 1,
    -Math.random() * 250
  );

  city.add(building);
}

/* Neon city billboards */

function createBillboard(x, z, color, text) {
  const group = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.15, 0.12),
    darkMat
  );

  group.add(frame);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.25, 0.85),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide
    })
  );

  sign.position.z = 0.07;
  group.add(sign);

  // Decorative glowing lines
  const topLine = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.035, 0.04),
    color === 0xff00d4 ? pinkMat : cyanMat
  );

  topLine.position.y = 0.55;
  topLine.position.z = 0.1;
  group.add(topLine);

  group.position.set(x, 6 + Math.random() * 5, z);
  group.rotation.y = x < 0 ? 0.15 : -0.15;

  city.add(group);
  scenery.add(group);
}

for (let i = 0; i < 12; i++) {
  createBillboard(
    i % 2 === 0 ? -7.2 : 7.2,
    -15 - i * 20,
    i % 2 === 0 ? 0x00ffff : 0xff00d4,
    "NEON"
  );
}

/* Stars in the sky */

const starPositions = [];

for (let i = 0; i < 900; i++) {
  starPositions.push(
    (Math.random() - 0.5) * 180,
    12 + Math.random() * 65,
    -Math.random() * 260
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
    color: 0xb8caff,
    size: 0.22,
    transparent: true,
    opacity: 0.85
  })
);

scene.add(stars);

/* =====================================
   PLAYER MODEL
===================================== */

const player = new THREE.Group();
scene.add(player);

const playerBody = new THREE.Group();
player.add(playerBody);

const suitMat = mat(0x202840, 0x070d30, 0.6);
const helmetMat = mat(0x101a31, 0x06172c, 0.5);
const visorMat = new THREE.MeshStandardMaterial({
  color: 0x00eaff,
  emissive: 0x00d9ff,
  emissiveIntensity: 2.5,
  metalness: 0.8,
  roughness: 0.12
});

function addPlayerPart(
  geometry,
  material,
  x,
  y,
  z,
  parent = playerBody
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// Torso
addPlayerPart(
  new THREE.BoxGeometry(0.72, 0.9, 0.38),
  suitMat,
  0, 1.48, 0
);

// Chest light
addPlayerPart(
  new THREE.BoxGeometry(0.36, 0.075, 0.04),
  cyanMat,
  0, 1.58, -0.21
);

// Helmet
const helmet = addPlayerPart(
  new THREE.SphereGeometry(0.31, 20, 16),
  helmetMat,
  0, 2.15, 0
);

helmet.scale.set(1, 1.1, 0.95);

// Visor
const visor = addPlayerPart(
  new THREE.BoxGeometry(0.43, 0.12, 0.42),
  visorMat,
  0, 2.18, -0.25
);

// Shoulders
for (const side of [-1, 1]) {
  const shoulder = addPlayerPart(
    new THREE.SphereGeometry(0.19, 12, 10),
    side < 0 ? cyanMat : pinkMat,
    side * 0.47, 1.76, 0
  );

  shoulder.scale.set(1, 0.85, 1);
}

// Arms and legs with pivot points
const limbs = [];

function createLimb(x, y, length, material, width = 0.19) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  playerBody.add(pivot);

  const limb = new THREE.Mesh(
    new THREE.BoxGeometry(width, length, width),
    material
  );

  limb.position.y = -length / 2;
  pivot.add(limb);

  limbs.push(pivot);
  return pivot;
}

const leftArm = createLimb(-0.46, 1.75, 0.7, suitMat, 0.18);
const rightArm = createLimb(0.46, 1.75, 0.7, suitMat, 0.18);
const leftLeg = createLimb(-0.22, 1.05, 0.72, suitMat, 0.23);
const rightLeg = createLimb(0.22, 1.05, 0.72, suitMat, 0.23);

// Neon boots
for (const side of [-1, 1]) {
  addPlayerPart(
    new THREE.BoxGeometry(0.25, 0.13, 0.38),
    side < 0 ? cyanMat : pinkMat,
    side * 0.22, 0.12, -0.04
  );
}

player.position.set(0, 0, 2.5);

/* Player glow ring */

const playerRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.65, 0.025, 8, 48),
  cyanMat
);

playerRing.rotation.x = Math.PI / 2;
playerRing.position.y = 0.08;
player.add(playerRing);

/* =====================================
   OBSTACLES AND COINS
===================================== */

const obstacles = [];
const coinsOnTrack = [];

function createObstacle(lane, z) {
  const group = new THREE.Group();

  const width = 1.1;
  const height = 1.15;

  const block = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.9),
    mat(0x25203b, 0x3b003e, 0.7)
  );

  block.position.y = height / 2;
  group.add(block);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.12, 0.09, 0.96),
    pinkMat
  );

  top.position.y = height + 0.02;
  group.add(top);

  const front = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.15, 0.06),
    cyanMat
  );

  front.position.set(0, 0.65, -0.48);
  group.add(front);

  group.position.set(lane * 3.33, 0, z);
  dynamicObjects.add(group);

  obstacles.push({
    mesh: group,
    active: true
  });
}

function createCoin(lane, z, height = 1.25) {
  const group = new THREE.Group();

  const coin = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.095, 12, 24),
    goldMat
  );

  group.add(coin);

  const center = new THREE.Mesh(
    new THREE.CircleGeometry(0.19, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffe7a0,
      side: THREE.DoubleSide
    })
  );

  center.position.z = 0.03;
  group.add(center);

  group.position.set(lane * 3.33, height, z);
  dynamicObjects.add(group);

  coinsOnTrack.push({
    mesh: group,
    active: true
  });
}

/* =====================================
   GAME STATE
===================================== */

const $ = (id) => document.getElementById(id);

let running = false;
let paused = false;
let gameOver = false;
let score = 0;
let runCoins = 0;
let totalCoins = Number(localStorage.getItem("neonDashCoins") || 0);
let best = Number(localStorage.getItem("neonDashBest") || 0);
let lane = 0;
let targetX = 0;
let jumping = false;
let jumpVelocity = 0;
let speed = 18;
let elapsed = 0;
let spawnTimer = 0;
let soundEnabled = true;

const skins = [
  { name: "CYAN", color: 0x00eaff, price: 0 },
  { name: "PINK", color: 0xff00d4, price: 25 },
  { name: "GOLD", color: 0xffbd32, price: 60 },
  { name: "PURPLE", color: 0x9d50ff, price: 100 }
];

let unlockedSkins = JSON.parse(
  localStorage.getItem("neonDashSkins") || "[0]"
);

let selectedSkin = Number(
  localStorage.getItem("neonDashSelected") || 0
);

function updateHUD() {
  $("score").textContent = Math.floor(score);
  $("best").textContent = best;
  $("coins").textContent = totalCoins;
  $("shop-coins").textContent = totalCoins;
  $("level").textContent = "LEVEL " + (1 + Math.floor(score / 250));
}

function setOverlay(id, visible) {
  $(id).classList.toggle("hidden", !visible);
}

function playSound(frequency = 600, duration = 0.08) {
  if (!soundEnabled) return;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();
    oscillator.stop(audio.currentTime + duration);

    oscillator.onended = () => audio.close();
  } catch (error) {
    // Sound is optional.
  }
}

function applySkin() {
  const skin = skins[selectedSkin] || skins[0];
  const color = skin.color;

  playerBody.traverse((object) => {
    if (!object.isMesh) return;

    if (
      object.material === suitMat ||
      object.material === helmetMat
    ) {
      object.material = mat(color, color, 0.45);
    }
  });

  updateHUD();
}

/* =====================================
   SPAWNING AND COLLISIONS
===================================== */

function spawnWave() {
  const firstLane = Math.floor(Math.random() * 3) - 1;
  const obstacleLane = firstLane;

  createObstacle(obstacleLane, -100 - Math.random() * 18);

  // Add coins in another lane
  const coinLane = [-1, 0, 1].filter(
    (item) => item !== obstacleLane
  )[Math.floor(Math.random() * 2)];

  for (let i = 0; i < 5; i++) {
    createCoin(coinLane, -95 - i * 2.1, 1.25);
  }
}

function removeInactiveObjects(array) {
  for (let i = array.length - 1; i >= 0; i--) {
    if (!array[i].active) {
      dynamicObjects.remove(array[i].mesh);
      array.splice(i, 1);
    }
  }
}

function endGame() {
  if (gameOver) return;

  running = false;
  paused = false;
  gameOver = true;

  best = Math.max(best, Math.floor(score));

  localStorage.setItem("neonDashBest", String(best));
  localStorage.setItem("neonDashCoins", String(totalCoins));

  $("final-score").textContent = Math.floor(score);
  $("final-coins").textContent = runCoins;

  updateHUD();
  setOverlay("game-over", true);
  playSound(130, 0.3);
}

function checkCollisions() {
  for (const obstacle of obstacles) {
    if (!obstacle.active) continue;

    const z = obstacle.mesh.position.z;
    const dx = Math.abs(obstacle.mesh.position.x - player.position.x);

    if (z > 1.4 && z < 3.7 && dx < 1.05) {
      if (player.position.y < 0.95) {
        endGame();
        return;
      }
    }

    if (z > 4) obstacle.active = false;
  }

  for (const coin of coinsOnTrack) {
    if (!coin.active) continue;

    const z = coin.mesh.position.z;
    const dx = Math.abs(coin.mesh.position.x - player.position.x);
    const dy = Math.abs(coin.mesh.position.y - (player.position.y + 1));

    if (z > 1.4 && z < 3.7 && dx < 1 && dy < 1.3) {
      coin.active = false;
      runCoins++;
      totalCoins++;

      localStorage.setItem("neonDashCoins", String(totalCoins));

      updateHUD();
      playSound(950, 0.06);
    }

    if (z > 4) coin.active = false;
  }

  removeInactiveObjects(obstacles);
  removeInactiveObjects(coinsOnTrack);
}

/* =====================================
   GAME CONTROLS
===================================== */

function moveLeft() {
  if (!running || paused || gameOver) return;

  lane = Math.max(-1, lane - 1);
  targetX = lane * 3.33;
  playSound(300, 0.04);
}

function moveRight() {
  if (!running || paused || gameOver) return;

  lane = Math.min(1, lane + 1);
  targetX = lane * 3.33;
  playSound(350, 0.04);
}

function jump() {
  if (!running || paused || gameOver || jumping) return;

  jumping = true;
  jumpVelocity = 9.5;
  playSound(500, 0.08);
}

function startGame() {
  score = 0;
  runCoins = 0;
  speed = 18;
  elapsed = 0;
  spawnTimer = 0;
  lane = 0;
  targetX = 0;
  jumping = false;
  jumpVelocity = 0;
  gameOver = false;
  paused = false;
  running = true;

  for (const object of [...obstacles, ...coinsOnTrack]) {
    dynamicObjects.remove(object.mesh);
  }

  obstacles.length = 0;
  coinsOnTrack.length = 0;

  player.position.set(0, 0, 2.5);
  playerBody.position.y = 0;

  setOverlay("menu", false);
  setOverlay("pause-screen", false);
  setOverlay("game-over", false);
  setOverlay("skins-screen", false);

  spawnWave();
  spawnWave();

  updateHUD();
  playSound(700, 0.12);
}

function pauseGame() {
  if (!running || gameOver) return;

  paused = true;
  running = false;
  setOverlay("pause-screen", true);
}

function resumeGame() {
  if (gameOver) return;

  paused = false;
  running = true;
  setOverlay("pause-screen", false);
}

/* =====================================
   SKIN SHOP
===================================== */

function renderSkins() {
  const list = $("skin-list");
  list.innerHTML = "";

  skins.forEach((skin, index) => {
    const card = document.createElement("div");
    card.className = "skin-option";

    if (index === selectedSkin) {
      card.classList.add("selected");
    }

    const swatch = document.createElement("div");
    swatch.style.width = "36px";
    swatch.style.height = "36px";
    swatch.style.margin = "0 auto 8px";
    swatch.style.borderRadius = "50%";
    swatch.style.background = "#" + skin.color.toString(16).padStart(6, "0");
    swatch.style.boxShadow = `0 0 18px #${skin.color.toString(16).padStart(6, "0")}`;

    const title = document.createElement("strong");
    title.textContent = skin.name;

    const price = document.createElement("p");
    price.textContent = skin.price === 0 ? "FREE" : `${skin.price} COINS`;

    const button = document.createElement("button");
    button.className = "secondary-btn";

    if (unlockedSkins.includes(index)) {
      button.textContent = selectedSkin === index ? "SELECTED" : "SELECT";
    } else {
      button.textContent = "UNLOCK";
    }

    button.addEventListener("click", () => {
      if (unlockedSkins.includes(index)) {
        selectedSkin = index;
        localStorage.setItem("neonDashSelected", String(index));
        applySkin();
        renderSkins();
        playSound(650, 0.08);
        return;
      }

      if (totalCoins < skin.price) {
        $("message").textContent = "NOT ENOUGH COINS";
        setTimeout(() => {
          $("message").textContent = "";
        }, 1000);
        return;
      }

      totalCoins -= skin.price;
      unlockedSkins.push(index);

      localStorage.setItem("neonDashCoins", String(totalCoins));
      localStorage.setItem("neonDashSkins", JSON.stringify(unlockedSkins));

      selectedSkin = index;
      localStorage.setItem("neonDashSelected", String(index));

      applySkin();
      renderSkins();
      updateHUD();
      playSound(850, 0.1);
    });

    card.append(swatch, title, price, button);
    list.appendChild(card);
  });

  updateHUD();
}

/* Buttons */

$("start-btn").addEventListener("click", startGame);
$("restart-btn").addEventListener("click", startGame);
$("play-again-btn").addEventListener("click", startGame);
$("resume-btn").addEventListener("click", resumeGame);
$("pause-btn").addEventListener("click", pauseGame);

$("home-btn").addEventListener("click", () => {
  paused = false;
  running = false;
  setOverlay("pause-screen", false);
  setOverlay("menu", true);
});

$("game-over-home-btn").addEventListener("click", () => {
  gameOver = false;
  setOverlay("game-over", false);
  setOverlay("menu", true);
});

$("skins-btn").addEventListener("click", () => {
  renderSkins();
  setOverlay("menu", false);
  setOverlay("skins-screen", true);
});

$("skins-back-btn").addEventListener("click", () => {
  setOverlay("skins-screen", false);
  setOverlay("menu", true);
});

$("sound-btn").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("sound-btn").textContent = soundEnabled ? "🔊" : "🔇";

  if (soundEnabled) playSound(650, 0.08);
});

$("left-btn").addEventListener("pointerdown", moveLeft);
$("right-btn").addEventListener("pointerdown", moveRight);
$("jump-btn").addEventListener("pointerdown", jump);

window.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") moveLeft();
  if (event.code === "ArrowRight" || event.code === "KeyD") moveRight();

  if (
    event.code === "Space" ||
    event.code === "ArrowUp" ||
    event.code === "KeyW"
  ) {
    event.preventDefault();
    jump();
  }

  if (event.code === "Escape") {
    if (running) pauseGame();
    else if (paused) resumeGame();
  }
});

/* Mobile swipes */

let touchStartX = 0;
let touchStartY = 0;

renderer.domElement.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

renderer.domElement.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];

  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) moveLeft();
    else moveRight();
  } else if (dy < -35) {
    jump();
  }
}, { passive: true });

/* =====================================
   ANIMATION LOOP
===================================== */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.04);

  // Animate the city atmosphere even in menus
  elapsed += delta;

  stars.rotation.y += delta * 0.003;

  playerRing.rotation.z += delta * 0.7;
  playerRing.material = cyanMat;

  if (running && !paused && !gameOver) {
    score += delta * speed * 0.8;
    speed = Math.min(34, 18 + score * 0.012);

    spawnTimer += delta;

    if (spawnTimer > Math.max(0.85, 1.8 - score / 2000)) {
      spawnWave();
      spawnTimer = 0;
    }

    // Move buildings toward the runner to simulate forward motion
    for (const building of scenery.children) {
      building.position.z += speed * delta;

      if (building.position.z > 12) {
        building.position.z -= 336;
      }
    }

    // Scroll road markings
    for (const marker of laneMarkers) {
      marker.position.z += speed * delta;

      if (marker.position.z > 6) {
        marker.position.z -= 224;
      }
    }

    // Move obstacles and coins toward the player
    for (const obstacle of obstacles) {
      if (obstacle.active) {
        obstacle.mesh.position.z += speed * delta;
      }
    }

    for (const coin of coinsOnTrack) {
      if (coin.active) {
        coin.mesh.position.z += speed * delta;
        coin.mesh.rotation.y += delta * 3.5;
        coin.mesh.rotation.x = Math.sin(elapsed * 3) * 0.12;
      }
    }

    // Smooth lane switching
    player.position.x += (targetX - player.position.x) *
      Math.min(1, delta * 12);

    // Jump physics
    if (jumping) {
      player.position.y += jumpVelocity * delta;
      jumpVelocity -= 24 * delta;

      if (player.position.y <= 0) {
        player.position.y = 0;
        jumping = false;
        jumpVelocity = 0;
      }
    }

    // Running animation
    const runCycle = elapsed * 12;

    leftArm.rotation.x = Math.sin(runCycle) * 0.65;
    rightArm.rotation.x = -Math.sin(runCycle) * 0.65;
    leftLeg.rotation.x = -Math.sin(runCycle) * 0.7;
    rightLeg.rotation.x = Math.sin(runCycle) * 0.7;

    playerBody.rotation.z +=
      (-(targetX - player.position.x) * 0.035 -
        playerBody.rotation.z) * Math.min(1, delta * 8);

    playerBody.position.y = jumping ? 0 : Math.abs(Math.sin(runCycle)) * 0.035;

    // Camera follows the player
    camera.position.x +=
      (player.position.x * 0.2 - camera.position.x) *
      Math.min(1, delta * 3);

    camera.lookAt(player.position.x * 0.18, 1.2, -5);

    checkCollisions();
    updateHUD();
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
});

/* Initial setup */

applySkin();
updateHUD();
renderSkins();
animate();
