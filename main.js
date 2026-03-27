// Taille du monde
const WORLD_SIZE = 32;      // largeur/longueur en blocs
const WORLD_HEIGHT = 8;     // hauteur max
const BLOCK_SIZE = 1;       // taille d'un bloc

let scene, camera, renderer, controls;
let keys = {};

init();
animate();

function init() {
  const container = document.getElementById('game-container');

  // SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // ciel bleu

  // CAMERA
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(WORLD_SIZE / 2, WORLD_HEIGHT + 5, WORLD_SIZE * 1.5);

  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // CONTROLS (rotation souris)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.target.set(WORLD_SIZE / 2, 2, WORLD_SIZE / 2);

  // LUMIÈRE
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  // SOL VOXEL
  createVoxelWorld();

  // ÉVÈNEMENTS
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', (e) => (keys[e.code] = true));
  window.addEventListener('keyup', (e) => (keys[e.code] = false));
}

function createVoxelWorld() {
  // On utilise InstancedMesh pour éviter le lag
  const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3ba635 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x777777 });

  // On va créer 3 InstancedMesh (herbe, terre, pierre)
  const maxInstances = WORLD_SIZE * WORLD_SIZE * WORLD_HEIGHT;

  const grassMesh = new THREE.InstancedMesh(geometry, grassMat, maxInstances);
  const dirtMesh = new THREE.InstancedMesh(geometry, dirtMat, maxInstances);
  const stoneMesh = new THREE.InstancedMesh(geometry, stoneMat, maxInstances);

  let grassIndex = 0;
  let dirtIndex = 0;
  let stoneIndex = 0;

  const dummy = new THREE.Object3D();

  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      // petite "colline" simple
      const height = 2 + Math.floor(
        2 * Math.sin(x * 0.3) * Math.cos(z * 0.3)
      );

      for (let y = 0; y < height; y++) {
        dummy.position.set(
          x * BLOCK_SIZE,
          y * BLOCK_SIZE,
          z * BLOCK_SIZE
        );
        dummy.updateMatrix();

        if (y === height - 1) {
          // couche du dessus = herbe
          grassMesh.setMatrixAt(grassIndex++, dummy.matrix);
        } else if (y >= height - 3) {
          // sous la surface = terre
          dirtMesh.setMatrixAt(dirtIndex++, dummy.matrix);
        } else {
          // plus profond = pierre
          stoneMesh.setMatrixAt(stoneIndex++, dummy.matrix);
        }
      }
    }
  }

  grassMesh.count = grassIndex;
  dirtMesh.count = dirtIndex;
  stoneMesh.count = stoneIndex;

  grassMesh.instanceMatrix.needsUpdate = true;
  dirtMesh.instanceMatrix.needsUpdate = true;
  stoneMesh.instanceMatrix.needsUpdate = true;

  scene.add(grassMesh);
  scene.add(dirtMesh);
  scene.add(stoneMesh);

  // Un petit "soleil" pour le style
  const sunGeo = new THREE.SphereGeometry(3, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff5a5 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(WORLD_SIZE * 1.5, WORLD_HEIGHT * 3, -WORLD_SIZE);
  scene.add(sun);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Déplacement simple type "noclip" (WASD + Space/Shift)
function updateMovement(delta) {
  const speed = 10; // blocs par seconde

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  if (keys['KeyW']) {
    camera.position.addScaledVector(forward, speed * delta);
    controls.target.addScaledVector(forward, speed * delta);
  }
  if (keys['KeyS']) {
    camera.position.addScaledVector(forward, -speed * delta);
    controls.target.addScaledVector(forward, -speed * delta);
  }
  if (keys['KeyA']) {
    camera.position.addScaledVector(right, -speed * delta);
    controls.target.addScaledVector(right, -speed * delta);
  }
  if (keys['KeyD']) {
    camera.position.addScaledVector(right, speed * delta);
    controls.target.addScaledVector(right, speed * delta);
  }
  if (keys['Space']) {
    camera.position.y += speed * delta;
    controls.target.y += speed * delta;
  }
  if (keys['ShiftLeft'] || keys['ShiftRight']) {
    camera.position.y -= speed * delta;
    controls.target.y -= speed * delta;
  }
}

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  updateMovement(delta);
  controls.update();
  renderer.render(scene, camera);
}
