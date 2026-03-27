// Gestion du joueur FPS (position, physique, collisions)

const PLAYER = {
  height: 1.8,
  radius: 0.4,
  eyeHeight: 1.6,
  speed: 6,
  jumpSpeed: 8,
  gravity: 20
};

let player = {
  x: WORLD.WIDTH / 2,
  y: 60,
  z: WORLD.DEPTH / 2,
  vx: 0,
  vy: 0,
  vz: 0,
  onGround: false
};

function spawnPlayer() {
  const sx = Math.floor(WORLD.WIDTH / 2);
  const sz = Math.floor(WORLD.DEPTH / 2);
  const sy = getSurfaceHeightAt(sx, sz) + 3;

  player.x = sx + 0.5;
  player.z = sz + 0.5;
  player.y = sy;
  player.vx = player.vy = player.vz = 0;
  player.onGround = false;
}

function movePlayer(delta, controlsDir) {
  const accel = PLAYER.speed;

  const forward = controlsDir.forward;
  const right = controlsDir.right;

  player.vx = (forward.x * accel + right.x * accel) * controlsDir.move;
  player.vz = (forward.z * accel + right.z * accel) * controlsDir.move;

  if (!player.onGround) {
    player.vy -= PLAYER.gravity * delta;
  }

  if (controlsDir.jump && player.onGround) {
    player.vy = PLAYER.jumpSpeed;
    player.onGround = false;
  }

  integratePlayer(delta);
}

function integratePlayer(delta) {
  let nx = player.x + player.vx * delta;
  let ny = player.y + player.vy * delta;
  let nz = player.z + player.vz * delta;

  const radius = PLAYER.radius;
  const height = PLAYER.height;

  function isSolidAt(px, py, pz) {
    const bx = Math.floor(px);
    const by = Math.floor(py);
    const bz = Math.floor(pz);
    const id = getBlock(bx, by, bz);
    const def = BLOCK_DEFS[id];
    return def && def.solid;
  }

  // X
  if (
    isSolidAt(nx + radius, player.y, player.z) ||
    isSolidAt(nx - radius, player.y, player.z) ||
    isSolidAt(nx + radius, player.y + height * 0.5, player.z) ||
    isSolidAt(nx - radius, player.y + height * 0.5, player.z)
  ) {
    player.vx = 0;
    nx = player.x;
  }

  // Z
  if (
    isSolidAt(player.x, player.y, nz + radius) ||
    isSolidAt(player.x, player.y, nz - radius) ||
    isSolidAt(player.x, player.y + height * 0.5, nz + radius) ||
    isSolidAt(player.x, player.y + height * 0.5, nz - radius)
  ) {
    player.vz = 0;
    nz = player.z;
  }

  // Y
  player.onGround = false;
  if (player.vy > 0) {
    if (
      isSolidAt(nx, ny + height, nz) ||
      isSolidAt(nx, ny + height * 0.9, nz)
    ) {
      player.vy = 0;
      ny = Math.floor(ny + height) - height;
    }
  } else {
    if (
      isSolidAt(nx, ny, nz) ||
      isSolidAt(nx, ny + 0.1, nz)
    ) {
      player.vy = 0;
      player.onGround = true;
      ny = Math.floor(ny) + 0.001;
    }
  }

  player.x = nx;
  player.y = ny;
  player.z = nz;

  if (player.y < 0) {
    spawnPlayer();
  }
}
