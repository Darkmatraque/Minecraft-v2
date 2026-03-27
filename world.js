// Génération du monde 3D en blocs

const WORLD = {
  WIDTH: 2048,
  DEPTH: 2048,
  HEIGHT: 64,
  CHUNK_SIZE: 16
};

let worldData = null;
let heightNoise, tempNoise, humidNoise;

function initWorld() {
  heightNoise = new Noise2D(1337);
  tempNoise = new Noise2D(4242);
  humidNoise = new Noise2D(7777);

  worldData = new Uint8Array(WORLD.WIDTH * WORLD.DEPTH * WORLD.HEIGHT);

  for (let x = 0; x < WORLD.WIDTH; x++) {
    for (let z = 0; z < WORLD.DEPTH; z++) {
      const nx = x / 256;
      const nz = z / 256;

      const hBase = heightNoise.noise(nx * 1.5, nz * 1.5);
      const hDetail = heightNoise.noise(nx * 4.0, nz * 4.0) * 0.25;
      const heightNorm = Math.min(1, Math.max(0, hBase * 0.7 + hDetail * 0.3));
      const surfaceY = Math.floor(20 + heightNorm * 40);

      const temp = tempNoise.noise(nx * 0.8, nz * 0.8);
      const humid = humidNoise.noise(nx * 0.8, nz * 0.8);

      const biome = getBiomeAt(temp, humid, heightNorm);

      for (let y = 0; y < WORLD.HEIGHT; y++) {
        let blockId = BLOCK.AIR;
        if (y <= surfaceY) {
          blockId = biomeToBlock(biome, y, surfaceY);
        }
        setBlock(x, y, z, blockId);
      }
    }
  }
}

function worldIndex(x, y, z) {
  return x + z * WORLD.WIDTH + y * WORLD.WIDTH * WORLD.DEPTH;
}

function getBlock(x, y, z) {
  if (
    x < 0 || x >= WORLD.WIDTH ||
    y < 0 || y >= WORLD.HEIGHT ||
    z < 0 || z >= WORLD.DEPTH
  ) return BLOCK.AIR;
  return worldData[worldIndex(x, y, z)];
}

function setBlock(x, y, z, id) {
  if (
    x < 0 || x >= WORLD.WIDTH ||
    y < 0 || y >= WORLD.HEIGHT ||
    z < 0 || z >= WORLD.DEPTH
  ) return;
  worldData[worldIndex(x, y, z)] = id;
}

function getSurfaceHeightAt(x, z) {
  x = Math.max(0, Math.min(WORLD.WIDTH - 1, x));
  z = Math.max(0, Math.min(WORLD.DEPTH - 1, z));
  for (let y = WORLD.HEIGHT - 1; y >= 0; y--) {
    const id = getBlock(x, y, z);
    if (id !== BLOCK.AIR) return y;
  }
  return 0;
}
