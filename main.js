// Moteur principal optimisé : rendu, contrôles, minage/placement

let renderer, scene, camera, controls;
let canvas;
let clock;

// Chunks visibles
let chunkMeshes = new Map();

// Biome + hotbar
let currentBiomeLabel = BIOME.PLAINS;
let selectedHotbarIndex = 0;

// Sprint / Accroupi
let isSprinting = false;
let isCrouching = false;

// Optimisation
const CHUNK = { SIZE: WORLD.CHUNK_SIZE };
const VIEW_DISTANCE = 3; // distance en chunks

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

/* -----------------------------------------------------------
   GÉNÉRATION D’UN CHUNK (optimisée + contours noirs)
----------------------------------------------------------- */
function buildChunkMesh(cx, cz) {
  const size = CHUNK.SIZE;
  const startX = cx * size;
  const startZ = cz * size;

  const geom = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  const directions = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 }
  ];

  function addFace(x, y, z, nx, ny, nz, color) {
    const s = 1;
    const px = x;
    const py = y;
    const pz = z;

    const c = new THREE.Color(color);
    const face = [];

    if (nx === 1) {
      face.push(
        px + s, py, pz,
        px + s, py + s, pz,
        px + s, py + s, pz + s,
        px + s, py, pz,
        px + s, py + s, pz + s,
        px + s, py, pz + s
      );
    } else if (nx === -1) {
      face.push(
        px, py, pz,
        px, py + s, pz + s,
        px, py + s, pz,
        px, py, pz,
        px, py, pz + s,
        px, py + s, pz + s
      );
    } else if (ny === 1) {
      face.push(
        px, py + s, pz,
        px, py + s, pz + s,
        px + s, py + s, pz + s,
        px, py + s, pz,
        px + s, py + s, pz + s,
        px + s, py + s, pz
      );
    } else if (ny === -1) {
      face.push(
        px, py, pz,
        px + s, py, pz + s,
        px, py, pz + s,
        px, py, pz,
        px + s, py, pz,
        px + s, py, pz + s
      );
    } else if (nz === 1) {
      face.push(
        px, py, pz + s,
        px + s, py + s, pz + s,
        px, py + s, pz + s,
        px, py, pz + s,
        px + s, py, pz + s,
        px + s, py + s, pz + s
      );
    } else if (nz === -1) {
      face.push(
        px, py, pz,
        px, py + s, pz,
        px + s, py + s, pz,
        px, py, pz,
        px + s, py + s, pz,
        px + s, py, pz
      );
    }

    positions.push(...face);
    for (let i = 0; i < 6; i++) {
      colors.push(c.r, c.g, c.b);
    }
  }

  // Construction du chunk
  for (let x = startX; x < startX + size; x++) {
    for (let z = startZ; z < startZ + size; z++) {
      for (let y = 0; y < WORLD.HEIGHT; y++) {
        const id = getBlock(x, y, z);
        if (id === BLOCK.AIR) continue;

        const def = BLOCK_DEFS[id];
        if (!def || !def.solid) continue;

        for (const d of directions) {
          const nx = x + d.x;
          const ny = y + d.y;
          const nz = z + d.z;

          const nid = getBlock(nx, ny, nz);
          const ndef = BLOCK_DEFS[nid];

          if (!ndef || !ndef.solid) {
            addFace(x, y, z, d.x, d.y, d.z, def.color);
          }
        }
      }
    }
  }

  if (positions.length === 0) return null;

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true
  });

  const mesh = new THREE.Mesh(geom, mat);

  // Contours noirs (optimisé)
  const wireGeom = new THREE.WireframeGeometry(geom);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x000000 });
  const wireframe = new THREE.LineSegments(wireGeom, wireMat);
  mesh.add(wireframe);

  return mesh;
}

/* -----------------------------------------------------------
   CHUNKS VISIBLES (optimisation)
----------------------------------------------------------- */
function ensureChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  if (chunkMeshes.has(key)) return;

  const mesh = buildChunkMesh(cx, cz);
  if (!mesh) return;

  mesh.position.set(0, 0, 0);
  chunkMeshes.set(key, mesh);
  scene.add(mesh);
}

function updateVisibleChunks() {
  const cx = Math.floor(player.x / CHUNK.SIZE);
  const cz = Math.floor(player.z / CHUNK.SIZE);

  const needed = new Set();

  for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
    for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
      const ncx = cx + dx;
      const ncz = cz + dz;

      if (ncx < 0 || ncz < 0) continue;
      if (ncx >= WORLD.WIDTH / CHUNK.SIZE) continue;
      if (ncz >= WORLD.DEPTH / CHUNK.SIZE) continue;

      const key = chunkKey(ncx, ncz);
      needed.add(key);
      ensureChunk(ncx, ncz);
    }
  }

  // Suppression des chunks hors champ
  for (const [key, mesh] of chunkMeshes.entries()) {
    if (!needed.has(key)) {
      scene.remove(mesh);
      chunkMeshes.delete(key);
    }
  }
}

/* -----------------------------------------------------------
   RAYCAST BLOCS (optimisé)
----------------------------------------------------------- */
function getLookRay() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir.normalize();
}

function raycastBlock(maxDist = 6) {
  const origin = new THREE.Vector3(
    player.x,
    player.y + PLAYER.eyeHeight,
    player.z
  );

  const dir = getLookRay();
  const step = 0.1;
  let dist = 0;

  let lastAirPos = null;

  while (dist < maxDist) {
    const px = origin.x + dir.x * dist;
    const py = origin.y + dir.y * dist;
    const pz = origin.z + dir.z * dist;

    const bx = Math.floor(px);
    const by = Math.floor(py);
    const bz = Math.floor(pz);

    const id = getBlock(bx, by, bz);

    if (id !== BLOCK.AIR) {
      return {
        hit: true,
        x: bx,
        y: by,
        z: bz,
        placePos: lastAirPos
      };
    }

    lastAirPos = { x: bx, y: by, z: bz };
    dist += step;
  }

  return { hit: false };
}

/* -----------------------------------------------------------
   MINAGE
----------------------------------------------------------- */
function mineBlock() {
  const hit = raycastBlock();
  if (!hit.hit) return;

  setBlock(hit.x, hit.y, hit.z, BLOCK.AIR);
  rebuildChunkAt(hit.x, hit.z);
}

/* -----------------------------------------------------------
   PLACEMENT
----------------------------------------------------------- */
function placeBlock() {
  const hit = raycastBlock();
  if (!hit.hit || !hit.placePos) return;

  const blockId = HOTBAR_BLOCKS[selectedHotbarIndex] || BLOCK.STONE;
  const { x, y, z } = hit.placePos;

  // Empêche de se placer un bloc dans la tête
  if (
    Math.abs(x + 0.5 - player.x) < PLAYER.radius &&
    Math.abs(y + 0.5 - player.y) < PLAYER.height &&
    Math.abs(z + 0.5 - player.z) < PLAYER.radius
  ) {
    return;
  }

  setBlock(x, y, z, blockId);
  rebuildChunkAt(x, z);
}

/* -----------------------------------------------------------
   REBUILD CHUNK
----------------------------------------------------------- */
function rebuildChunkAt(x, z) {
  const cx = Math.floor(x / CHUNK.SIZE);
  const cz = Math.floor(z / CHUNK.SIZE);

  const key = chunkKey(cx, cz);
  const old = chunkMeshes.get(key);

  if (old) {
    scene.remove(old);
    chunkMeshes.delete(key);
  }

  ensureChunk(cx, cz);
}

/* -----------------------------------------------------------
   HOTBAR UI
----------------------------------------------------------- */
function updateHotbarUI() {
  hotbarEl.innerHTML = "";

  HOTBAR_BLOCKS.forEach((id, i) => {
    const def = BLOCK_DEFS[id];

    const slot = document.createElement("div");
    slot.className = "hotbar-slot";

    if (i === selectedHotbarIndex) slot.classList.add("selected");

    slot.textContent = def ? def.name[0] : "?";

    hotbarEl.appendChild(slot);
  });
}

/* -----------------------------------------------------------
   INFO UI (biome + position)
----------------------------------------------------------- */
function updateInfoUI() {
  biomeLabelEl.textContent = "Biome: " + currentBiomeLabel;

  posLabelEl.textContent =
    "X: " + player.x.toFixed(1) +
    " Y: " + player.y.toFixed(1) +
    " Z: " + player.z.toFixed(1);
}

/* -----------------------------------------------------------
   BIOME LABEL
----------------------------------------------------------- */
function updateBiomeLabel() {
  const nx = player.x / 256;
  const nz = player.z / 256;

  const hBase = heightNoise.noise(nx * 1.5, nz * 1.5);
  const hDetail = heightNoise.noise(nx * 4.0, nz * 4.0) * 0.25;

  const heightNorm = Math.min(1, Math.max(0, hBase * 0.7 + hDetail * 0.3));

  const temp = tempNoise.noise(nx * 0.8, nz * 0.8);
  const humid = humidNoise.noise(nx * 0.8, nz * 0.8);

  currentBiomeLabel = getBiomeAt(temp, humid, heightNorm);
}

/* -----------------------------------------------------------
   UI INIT
----------------------------------------------------------- */
function initUI() {
  hotbarEl = document.getElementById("hotbar");
  biomeLabelEl = document.getElementById("biome-label");
  posLabelEl = document.getElementById("pos-label");
  hintEl = document.getElementById("hint");

  updateHotbarUI();
}

/* -----------------------------------------------------------
   CONTRÔLES (optimisés + sprint toggle + accroupi)
----------------------------------------------------------- */
let keys = {};
let pointerLocked = false;

function initControls() {
  document.addEventListener("keydown", (e) => {
    keys[e.code] = true;

    // Hotbar
    if (e.code >= "Digit1" && e.code <= "Digit4") {
      selectedHotbarIndex = Number(e.code.slice(-1)) - 1;
      updateHotbarUI();
    }

    // Sprint TOGGLE (une pression = ON / OFF)
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
      isSprinting = !isSprinting;   // inverse l'état
    }

    // Accroupi (maintenu)
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      isCrouching = true;
    }
  });

  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;

    // Accroupi (maintenu)
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      isCrouching = false;
    }

    // IMPORTANT : ne rien mettre ici pour CTRL
    // (sinon ça annule le toggle)
  });

  // Pointer lock
  document.body.addEventListener("click", () => {
    if (!pointerLocked) controls.lock();
  });

  controls.addEventListener("lock", () => {
    pointerLocked = true;
    hintEl.style.display = "none";
  });

  controls.addEventListener("unlock", () => {
    pointerLocked = false;
    hintEl.style.display = "block";
  });

  // Minage / placement
  document.addEventListener("mousedown", (e) => {
    if (!pointerLocked) return;

    if (e.button === 0) mineBlock();
    else if (e.button === 2) placeBlock();
  });

  document.addEventListener("contextmenu", (e) => e.preventDefault());
}


/* -----------------------------------------------------------
   SCÈNE + LUMIÈRES
----------------------------------------------------------- */
function initScene() {
  canvas = document.getElementById("game-canvas");

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(player.x, player.y + PLAYER.eyeHeight, player.z);

  controls = new THREE.PointerLockControls(camera, document.body);

  // Lumières
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
  hemi.position.set(0, 100, 0);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 100, 50);
  dirLight.castShadow = true;
  scene.add(dirLight);

  clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* -----------------------------------------------------------
   GAME LOOP (optimisée + sprint + accroupi)
----------------------------------------------------------- */
function gameLoop() {
  requestAnimationFrame(gameLoop);

  const delta = clock.getDelta();

  if (pointerLocked) {
    // Direction caméra
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // Mouvement
    let moveX = 0;
    let moveZ = 0;

    if (keys["KeyW"]) moveZ += 1;
    if (keys["KeyS"]) moveZ -= 1;
    if (keys["KeyA"]) moveX -= 1;
    if (keys["KeyD"]) moveX += 1;

    const len = Math.hypot(moveX, moveZ);

    let dirVec = {
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      move: 0,
      jump: keys["Space"] || false,
      speedMultiplier: 1
    };

    if (len > 0) {
      moveX /= len;
      moveZ /= len;

      dirVec.forward.copy(forward).multiplyScalar(moveZ);
      dirVec.right.copy(right).multiplyScalar(moveX);
      dirVec.move = 1;
    }

    // Sprint
    if (isSprinting) dirVec.speedMultiplier = 1.8;

    // Accroupi
    if (isCrouching) dirVec.speedMultiplier = 0.45;

    // Déplacement joueur
    movePlayer(delta, dirVec);

    // Caméra (accroupi)
    let eye = PLAYER.eyeHeight;
    if (isCrouching) eye *= 0.55;

    camera.position.set(player.x, player.y + eye, player.z);
  }

  updateVisibleChunks();
  updateBiomeLabel();
  updateInfoUI();

  renderer.render(scene, camera);
}

/* -----------------------------------------------------------
   MAIN
----------------------------------------------------------- */
function main() {
  initWorld();
  spawnPlayer();
  initScene();
  initUI();
  initControls();
  updateVisibleChunks();
  gameLoop();
}

document.addEventListener("DOMContentLoaded", main);
