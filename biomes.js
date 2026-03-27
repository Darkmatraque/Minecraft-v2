// Gestion des biomes avancés (C)

const BIOME = {
  PLAINS: "Plaines",
  DESERT: "Désert",
  SNOW: "Neige",
  SAVANNA: "Savane",
  SWAMP: "Marais",
  DARK_FOREST: "Forêt sombre",
  ROCKY: "Plateau rocheux",
  MOUNTAINS: "Montagnes"
};

function getBiomeAt(temp, humid, heightNorm) {
  // temp, humid, heightNorm ∈ [0,1]
  if (heightNorm > 0.8) {
    return BIOME.MOUNTAINS;
  }
  if (heightNorm > 0.65) {
    return BIOME.ROCKY;
  }

  if (temp < 0.3 && heightNorm > 0.5) {
    return BIOME.SNOW;
  }

  if (temp > 0.7 && humid < 0.3) {
    return BIOME.DESERT;
  }

  if (temp > 0.6 && humid > 0.6) {
    return BIOME.SAVANNA;
  }

  if (humid > 0.7 && heightNorm < 0.5) {
    return BIOME.SWAMP;
  }

  if (humid > 0.6 && temp < 0.5) {
    return BIOME.DARK_FOREST;
  }

  return BIOME.PLAINS;
}

function biomeToBlock(biome, y, surfaceY) {
  const depth = surfaceY - y;
  switch (biome) {
    case BIOME.DESERT:
      if (depth === 0) return BLOCK.SAND;
      if (depth < 4) return BLOCK.SAND;
      return BLOCK.STONE;
    case BIOME.SNOW:
      if (depth === 0) return BLOCK.SNOW;
      if (depth < 3) return BLOCK.DIRT;
      return BLOCK.STONE;
    case BIOME.SAVANNA:
      if (depth === 0) return BLOCK.GRASS;
      if (depth < 3) return BLOCK.DIRT;
      return BLOCK.STONE;
    case BIOME.SWAMP:
      if (depth === 0) return BLOCK.GRASS;
      if (depth < 2) return BLOCK.DIRT;
      return BLOCK.STONE;
    case BIOME.DARK_FOREST:
      if (depth === 0) return BLOCK.GRASS;
      if (depth < 4) return BLOCK.DIRT;
      return BLOCK.STONE;
    case BIOME.ROCKY:
      if (depth < 3) return BLOCK.STONE;
      return BLOCK.STONE;
    case BIOME.MOUNTAINS:
      if (depth === 0 && surfaceY > 40) return BLOCK.SNOW;
      return BLOCK.STONE;
    case BIOME.PLAINS:
    default:
      if (depth === 0) return BLOCK.GRASS;
      if (depth < 3) return BLOCK.DIRT;
      return BLOCK.STONE;
  }
}
