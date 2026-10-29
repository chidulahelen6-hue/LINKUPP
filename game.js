
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const $ = (id) => document.getElementById(id);
const get = (...ids) => ids.map($).find(Boolean);

const container = get("game-container", "game", "game-area") || document.body;
const scoreEl = get("score");
const bestEl = get("best");
const coinsEl = get("coins");
const levelEl = get("level");
const messageEl = get("message");
const menuEl = get("menu");
const pauseEl = get("pause-screen");
const overEl = get("game-over");
const skinsEl = get("skins-screen");

let score = 0;
let coins = Number(localStorage.getItem("neonCoins") || 0);
let best = Number(localStorage.getItem("neonBest") || 0);
let running = false;
let paused = false;
let gameEnded = false;
let lane = 0;
let jumpVelocity = 0;
let jumping = false;
let elapsed = 0;
let spawnTimer = 0;
let speed = 19;
let soundOn = true;
let selectedSkin = 0;

const skins = [0x12eaff, 0xff35d4, 0x9cff38];
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05000d);
scene.fog = new THREE.FogExp2(0x080016, 0.014);

const camera = new THREE.PerspectiveCamera(
  65, window.innerWidth / window.innerHeight, 0.1, 350
);
camera.position.set(0, 5.3, 10.5);
camera.lookAt(0, 1.2, -5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.prepend(renderer.domElement);

Object.assign(renderer.domElement.style, {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  display: "block",
  zIndex: "0",
  touchAction: "none"
});

if (get("game-container", "game", "game-area")) {
  const style = get("game-container", "game", "game-area").style;
  if (!style.position) style.position = "relative";
  style.overflow = "hidden";
}

scene.add(new THREE.HemisphereLight(0x8abaff, 0x180022, 2));
const moon = new THREE.DirectionalLight(0xd7e8ff, 2.4);
moon.position.set(-5, 12, 8);
scene.add(moon);

const pinkLight = new THREE.PointLight(0xff00b8, 35, 38);
pinkLight.position.set(-5, 4, -10);
scene.add(pinkLight);

const blueLight = new THREE.PointLight(0x00bfff, 32, 38);
blueLight.position.set(5, 4, -15);
scene.add(blueLight);

const world = new THREE.Group();
scene.add(world);

const roadMat = new THREE.MeshStandardMaterial({
  color: 0x101020, metalness: 0.65, roughness: 0.35
});
const road = new THREE.Mesh(
  new THREE.BoxGeometry(9, 0.3, 240), roadMat
);
road.position.set(0, -0.2, -85);
world.add(road);

function neonLine(x, z, color) {
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.035, 240),
    new THREE.MeshBasicMaterial({ color })
  );
  line.position.set(x, 0, -85);
  world.add(line);
}
neonLine(-4.48, 0, 0xff00b8);
neonLine(4.48, 0, 0x00d9ff);

const laneLines = [];
for (const x of [-1.5, 1.5]) {
  for (let i = 0; i < 24; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.025, 2.2),
      new THREE.MeshBasicMaterial({ color: 0x34426f })
    );
    line.position.set(x, -0.02, -i * 9);
    world.add(line);
    laneLines.push(line);
  }
}

const buildings = [];
const buildingMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x101528, metalness: 0.6, roughness: 0.4 }),
  new THREE.MeshStandardMaterial({ color: 0x171025, metalness: 0.55, roughness: 0.42 }),
  new THREE.MeshStandardMaterial({ color: 0x0b202c, metalness: 0.6, roughness: 0.35 })
];

for (let side of [-1, 1]) {
  for (let i = 0; i < 30; i++) {
    const h = 5 + Math.random() * 17;
    const w = 2.5 + Math.random() * 4;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 5 + Math.random() * 5),
      buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)]
    );
    b.position.set(side * (7 + Math.random() * 10), h / 2 - 0.15, -i * 9 - 5);
    world.add(b);
    buildings.push(b);

    const windowMat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0x00d9ff : 0xff24bd
    });
    for (let j = 0; j < 4; j++) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.35, 0.04), windowMat
      );
      win.position.set(
        b.position.x - side * (w * 0.25) + Math.random() * side * w * 0.5,
        1 + Math.random() * (h - 1),
        b.position.z + (5 + 0) / 2 + 0.03
      );
      world.add(win);
      buildings.push(win);
    }
  }
}

const player = new THREE.Group();
scene.add(player);
player.position.set(0, 0, 2.5);

const fallback = new THREE.Group();
player.add(fallback);

const torso = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.9, 0.38),
  new THREE.MeshStandardMaterial({
    color: 0x111827, metalness: 0.65, roughness: 0.3,
    emissive: 0x062044, emissiveIntensity: 0.6
  })
);
torso.position.y = 1.25;
fallback.add(torso);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.25, 16, 12),
  new THREE.MeshStandardMaterial({ color: 0x8c593c, roughness: 0.7 })
);
head.position.y = 1.9;
fallback.add(head);

const glow = new THREE.Mesh(
  new THREE.BoxGeometry(0.78, 0.08, 0.43),
  new THREE.MeshBasicMaterial({ color: 0x00eaff })
);
glow.position.y = 1.25;
fallback.add(glow);

const loader = new GLTFLoader();
let character = null;
let mixer = null;

loader.load(
  "./assets/Superhero_male_fullbody.gltf",
  (gltf) => {
    character = gltf.scene;
    character.scale.setScalar(1);
    const box = new THREE.Box3().setFromObject(character);
    const size = box.getSize(new THREE.Vector3());
    const height = Math.max(size.y, 0.001);
    character.scale.setScalar(2.05 / height);
    const centered = new THREE.Box3().setFromObject(character);
    const center = centered.getCenter(new THREE.Vector3());
    character.position.set(-center.x, -center.minY, -center.z);
    player.add(character);
    fallback.visible = false;

    if (gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(character);
      const runClip = gltf.animations.find(a =>
        /run|walk|idle/i.test(a.name)
      ) || gltf.animations[0];
      mixer.clipAction(runClip).play();
    }
  },
  undefined,
  (error) => {
    console.error("Character model failed to load:", error);
    if (messageEl) messageEl.textContent =
      "Character model could not load. Check assets and model files.";
  }
);

const objects = [];
const coinObjects = [];
const obstacleMat = new THREE.MeshStandardMaterial({
  color: 0x24102c, metalness: 0.55, roughness: 0.3,
  emissive: 0xff006b, emissiveIntensity: 1
});

function spawnObstacle() {
  const laneX = [-3, 0, 3][Math.floor(Math.random() * 3)];
  const obstacle = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.3, 1),
    obstacleMat
  );
  body.position.y = 0.65;
  obstacle.add(body);

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(1.28, 0.09, 1.08),
    new THREE.MeshBasicMaterial({ color: 0xff2acb })
  );
  rim.position.y = 1.25;
  obstacle.add(rim);
  obstacle.position.set(laneX, 0, -95);
  world.add(obstacle);
  objects.push(obstacle);
}

function spawnCoin() {
  const coin = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.12, 8, 18),
    new THREE.MeshStandardMaterial({
      color: 0xffdb54, metalness: 0.8, roughness: 0.22,
      emissive: 0xffa800, emissiveIntensity: 1.1
    })
  );
  coin.position.set([-3, 0, 3][Math.floor(Math.random() * 3)], 1.3, -95);
  world.add(coin);
  coinObjects.push(coin);
}

function updateHUD() {
  if (scoreEl) scoreEl.textContent = Math.floor(score);
  if (bestEl) bestEl.textContent = best;
  if (coinsEl) coinsEl.textContent = coins;
  if (levelEl) levelEl.textContent = "LEVEL " + (1 + Math.floor(score / 500));
}

function show(el, visible) {
  if (el) el.style.display = visible ? "flex" : "none";
}

function startGame() {
  score = 0;
  speed = 19;
  elapsed = 0;
  spawnTimer = 0;
  lane = 0;
  jumpVelocity = 0;
  jumping = false;
  gameEnded = false;
  paused = false;
  player.position.set(0, 0, 2.5);

  for (const obj of [...objects, ...coinObjects]) world.remove(obj);
  objects.length = 0;
  coinObjects.length = 0;

  running = true;
  show(menuEl, false);
  show(pauseEl, false);
  show(overEl, false);
  show(skinsEl, false);
  if (messageEl) messageEl.textContent = "";
  updateHUD();
}

function endGame() {
  running = false;
  gameEnded = true;
  best = Math.max(best, Math.floor(score));
  localStorage.setItem("neonBest", best);
  localStorage.setItem("neonCoins", coins);
  updateHUD();
  show(overEl, true);
}

function moveLane(direction) {
  if (!running || paused) return;
  lane = THREE.MathUtils.clamp(lane + direction, -1, 1);
}

function jump() {
  if (!running || paused || jumping) return;
  jumping = true;
  jumpVelocity = 9;
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  show(pauseEl, paused);
}

get("start-btn", "play-btn")?.addEventListener("click", startGame);
get("left-btn")?.addEventListener("click", () => moveLane(-1));
get("right-btn")?.addEventListener("click", () => moveLane(1));
get("jump-btn")?.addEventListener("click", jump);
get("pause-btn")?.addEventListener("click", togglePause);

get("sound-btn")?.addEventListener("click", () => {
  soundOn = !soundOn;
  const btn = get("sound-btn");
  if (btn) btn.textContent = soundOn ? "🔊" : "🔇";
});

get("skins-btn")?.addEventListener("click", () => {
  show(menuEl, false);
  show(skinsEl, true);
});

get("restart-btn", "retry-btn")?.addEventListener("click", startGame);
get("resume-btn")?.addEventListener("click", togglePause);
get("home-btn", "menu-btn")?.addEventListener("click", () => {
  running = false;
  paused = false;
  show(overEl, false);
  show(pauseEl, false);
  show(menuEl, true);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") moveLane(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") moveLane(1);
  if (event.key === " " || event.key === "ArrowUp") jump();
  if (event.key.toLowerCase() === "p" || event.key === "Escape") togglePause();
});

let touchX = null;
renderer.domElement.addEventListener("touchstart", (e) => {
  touchX = e.touches[0].clientX;
}, { passive: true });
renderer.domElement.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 35) moveLane(dx > 0 ? 1 : -1);
  touchX = null;
}, { passive: true });

function update(dt) {
  if (!running || paused) return;

  elapsed += dt;
  score += dt * 12;
  speed = Math.min(32, 19 + score / 350);
  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnObstacle();
    if (Math.random() > 0.35) spawnCoin();
    spawnTimer = Math.max(0.48, 1.05 - score / 5000);
  }

  player.position.x += (lane * 3 - player.position.x) * Math.min(1, dt * 10);

  if (jumping) {
    player.position.y += jumpVelocity * dt;
    jumpVelocity -= 22 * dt;
    if (player.position.y <= 0) {
      player.position.y = 0;
      jumping = false;
      jumpVelocity = 0;
    }
  }

  if (mixer) mixer.update(dt);
  if (!character) {
    fallback.rotation.z = Math.sin(elapsed * 12) * 0.035;
    fallback.position.y = jumping ? 0 : Math.abs(Math.sin(elapsed * 10)) * 0.06;
  }

  for (const line of laneLines) {
    line.position.z += speed * dt;
    if (line.position.z > 8) line.position.z -= 216;
  }

  for (const b of buildings) {
    b.position.z += speed * dt * 0.55;
    if (b.position.z > 15) b.position.z -= 270;
  }

  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    obj.position.z += speed * dt;
    if (Math.abs(obj.position.z - player.position.z) < 1.15 &&
        Math.abs(obj.position.x - player.position.x) < 1.15 &&
        player.position.y < 0.85) {
      endGame();
      return;
    }
    if (obj.position.z > 8) {
      world.remove(obj);
      objects.splice(i, 1);
    }
  }

  for (let i = coinObjects.length - 1; i >= 0; i--) {
    const coin = coinObjects[i];
    coin.position.z += speed * dt;
    coin.rotation.y += dt * 3;
    if (Math.abs(coin.position.z - player.position.z) < 1 &&
        Math.abs(coin.position.x - player.position.x) < 1.2 &&
        Math.abs(coin.position.y - (player.position.y + 1.2)) < 1.3) {
      coins++;
      world.remove(coin);
      coinObjects.splice(i, 1);
      localStorage.setItem("neonCoins", coins);
    } else if (coin.position.z > 8) {
      world.remove(coin);
      coinObjects.splice(i, 1);
    }
  }

  camera.position.x += (player.position.x * 0.25 - camera.position.x) * dt * 3;
  camera.lookAt(player.position.x * 0.18, 1.1 + player.position.y * 0.3, -5);
  updateHUD();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  update(dt);
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateHUD();
show(pauseEl, false);
show(overEl, false);
show(skinsEl, false);
animate();
