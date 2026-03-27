// Définition des types de blocs

const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  SNOW: 5,
  WOOD: 6,
  LEAVES: 7
};

const BLOCK_DEFS = {
  [BLOCK.AIR]: {
    id: BLOCK.AIR,
    name: "Air",
    solid: false,
    color: 0x000000,
    visible: false
  },
  [BLOCK.GRASS]: {
    id: BLOCK.GRASS,
    name: "Herbe",
    solid: true,
    color: 0x3ba34a
  },
  [BLOCK.DIRT]: {
    id: BLOCK.DIRT,
    name: "Terre",
    solid: true,
    color: 0x8b5a2b
  },
  [BLOCK.STONE]: {
    id: BLOCK.STONE,
    name: "Pierre",
    solid: true,
    color: 0x808080
  },
  [BLOCK.SAND]: {
    id: BLOCK.SAND,
    name: "Sable",
    solid: true,
    color: 0xd9c58b
  },
  [BLOCK.SNOW]: {
    id: BLOCK.SNOW,
    name: "Neige",
    solid: true,
    color: 0xf5f5f5
  },
  [BLOCK.WOOD]: {
    id: BLOCK.WOOD,
    name: "Bois",
    solid: true,
    color: 0x8b4513
  },
  [BLOCK.LEAVES]: {
    id: BLOCK.LEAVES,
    name: "Feuilles",
    solid: true,
    color: 0x2e8b57
  }
};

// blocs sélectionnables dans la hotbar
const HOTBAR_BLOCKS = [BLOCK.GRASS, BLOCK.STONE, BLOCK.SAND, BLOCK.SNOW];
