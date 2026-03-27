import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const WORLD_SIZE = 32;
const WORLD_HEIGHT = 8;
const BLOCK_SIZE = 1;

let scene, camera, renderer, controls;
let keys = {};

init();
animate();

function init() {
  const container = document.getElementById("game-container");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(WORLD_SIZE / 2, WORLD_HEIGHT + 5, WORLD_SIZE * 1.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.target.set(WORLD_SIZE / 2, 2, WORLD_SIZE / 2);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  createVoxelWorld();

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
}

function createVoxelWorld() {
  const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3ba635 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x777777 });

  const maxInstances = WORLD_SIZE * WORLD_SIZE * WORLD_HEIGHT;

  const grassMesh = new THREE.InstancedMesh(geometry, grassMat, maxInstances);
  const dirtMesh = new THREE.InstancedMesh(geometry, dirtMat, maxInstances);
  const stoneMesh = new THREE.InstancedMesh(geometry, stoneMat, maxInstances);

  let gi = 0, di = 0, si = 0;
  const dummy = new THREE.Object3D();

  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      const height = 2 + Math.floor(2 * Math.sin(x * 0.3) * Math.cos(z * 0.3));

      for (let y = 0; y < height; y++) {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();

        if (y === height - 1) grassMesh.setMatrixAt(gi++, dummy.matrix);
        else if (y >= height - 3) dirtMesh.setMatrixAt(di++, dummy.matrix);
        else stoneMesh.setMatrixAt(si++, dummy.matrix);
      }
    }
  }

  grassMesh.count = gi;
  dirtMesh.count = di;
  stoneMesh.count = si;

  grassMesh.instanceMatrix.needsUpdate = true;
  dirtMesh.instanceMatrix.needsUpdate = true;
  stoneMesh.instanceMatrix.needsUpdate = true;

  scene.add(grassMesh, dirtMesh, stoneMesh);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateMovement(delta) {
  const speed = 10;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  if (keys["KeyW"]) camera.position.addScaledVector(forward, speed * delta);
  if (keys["KeyS"]) camera.position.addScaledVector(forward, -speed * delta);
  if (keys["KeyA"]) camera.position.addScaledVector(right, -speed * delta);
  if (keys["KeyD"]) camera.position.addScaledVector(right, speed * delta);
  if (keys["Space"]) camera.position.y += speed * delta;
  if (keys["ShiftLeft"]) camera.position.y -= speed * delta;
}

let last = performance.now();
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - last) / 1000;
  last = now;

  updateMovement(delta);
  controls.update();
  renderer.render(scene, camera);
}

