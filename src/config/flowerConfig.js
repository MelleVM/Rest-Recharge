const createSunflowerGrowthStages = () => [
  { 
    name: 'Seed', 
    restsNeeded: 0, 
    scale: 0.5, 
    description: 'Just planted!',
    image: require('../../assets/images/sunflower/seed.png'),
    wiltedImage: require('../../assets/images/sunflower/seed_wilted.png'),
  },
  { 
    name: 'Sprout', 
    restsNeeded: 3, 
    scale: 0.65, 
    description: 'Starting to grow',
    image: require('../../assets/images/sunflower/sprout.png'),
    wiltedImage: require('../../assets/images/sunflower/sprout_wilted.png'),
  },
  { 
    name: 'Young', 
    restsNeeded: 7, 
    scale: 0.8, 
    description: 'Growing strong',
    image: require('../../assets/images/sunflower/young.png'),
    wiltedImage: require('../../assets/images/sunflower/young_wilted.png'),
  },
  { 
    name: 'Blooming', 
    restsNeeded: 15, 
    scale: 0.9, 
    description: 'Almost there!',
    image: require('../../assets/images/sunflower/blooming.png'),
    wiltedImage: require('../../assets/images/sunflower/blooming_wilted.png'),
  },
  { 
    name: 'Full Bloom', 
    restsNeeded: 25, 
    scale: 1.0, 
    description: 'Beautiful!',
    image: require('../../assets/images/sunflower/full_bloom.png'),
    wiltedImage: require('../../assets/images/sunflower/full_bloom_wilted.png'),
  },
];

const createPoppyGrowthStages = () => [
  { 
    name: 'Seed', 
    restsNeeded: 0, 
    scale: 0.5, 
    description: 'Just planted!',
    image: require('../../assets/images/poppy/seed.png'),
    wiltedImage: require('../../assets/images/poppy/seed_wilted.png'),
  },
  { 
    name: 'Sprout', 
    restsNeeded: 3, 
    scale: 0.65, 
    description: 'Starting to grow',
    image: require('../../assets/images/poppy/sprout.png'),
    wiltedImage: require('../../assets/images/poppy/sprout_wilted.png'),
  },
  { 
    name: 'Young', 
    restsNeeded: 7, 
    scale: 0.8, 
    description: 'Growing strong',
    image: require('../../assets/images/poppy/young.png'),
    wiltedImage: require('../../assets/images/poppy/young_wilted.png'),
  },
  { 
    name: 'Blooming', 
    restsNeeded: 15, 
    scale: 0.9, 
    description: 'Almost there!',
    image: require('../../assets/images/poppy/blooming.png'),
    wiltedImage: require('../../assets/images/poppy/blooming_wilted.png'),
  },
  { 
    name: 'Full Bloom', 
    restsNeeded: 25, 
    scale: 1.0, 
    description: 'Beautiful!',
    image: require('../../assets/images/poppy/full_bloom.png'),
    wiltedImage: require('../../assets/images/poppy/full_bloom_wilted.png'),
  },
];

export const FLOWER_TYPES = {
  sunflower: {
    id: 'sunflower',
    name: 'Sunflower',
    unlockAtRests: 0,
    description: 'A cheerful flower that follows the sun',
    rarity: 'Common',
    color: '#FFD700',
    growthStages: createSunflowerGrowthStages(),
  },
  daisy: {
    id: 'daisy',
    name: 'Daisy',
    unlockAtRests: 5,
    description: 'Simple and pure, a symbol of innocence',
    rarity: 'Common',
    color: '#FFFFFF',
    growthStages: createSunflowerGrowthStages(),
  },
  tulip: {
    id: 'tulip',
    name: 'Tulip',
    unlockAtRests: 10,
    description: 'Elegant and graceful, perfect love',
    rarity: 'Uncommon',
    color: '#FF69B4',
    growthStages: createSunflowerGrowthStages(),
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    unlockAtRests: 15,
    description: 'Classic beauty with thorns of protection',
    rarity: 'Uncommon',
    color: '#DC143C',
    growthStages: createSunflowerGrowthStages(),
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    unlockAtRests: 20,
    description: 'Calming fragrance, brings peace and serenity',
    rarity: 'Rare',
    color: '#9370DB',
    growthStages: createSunflowerGrowthStages(),
  },
  lily: {
    id: 'lily',
    name: 'Lily',
    unlockAtRests: 25,
    description: 'Majestic and refined, symbol of purity',
    rarity: 'Rare',
    color: '#FFB6C1',
    growthStages: createSunflowerGrowthStages(),
  },
  orchid: {
    id: 'orchid',
    name: 'Orchid',
    unlockAtRests: 30,
    description: 'Exotic and rare, a treasure to behold',
    rarity: 'Epic',
    color: '#DA70D6',
    growthStages: createSunflowerGrowthStages(),
  },
  poppy: {
    id: 'poppy',
    name: 'Poppy',
    unlockAtRests: 35,
    description: 'Vibrant and bold, remembrance and dreams',
    rarity: 'Epic',
    color: '#FF4500',
    growthStages: createPoppyGrowthStages(),
  },
};

export const PLOT_UNLOCK_REQUIREMENTS = [
  { plotIndex: 0, restsRequired: 0 },
  { plotIndex: 1, restsRequired: 10 },
  { plotIndex: 2, restsRequired: 25 },
  { plotIndex: 3, restsRequired: 50 },
  { plotIndex: 4, restsRequired: 100 },
];

export const MAX_PLOTS = 5;

export const ENERGY_DECAY_RATE = 0.1 / (60 * 60 * 1000);
export const ENERGY_PER_REST = 0.25;
export const MAX_ENERGY = 1.0;

export const getFlowersInUnlockOrder = () => {
  return Object.values(FLOWER_TYPES).sort((a, b) => a.unlockAtRests - b.unlockAtRests);
};

export const getUnlockedFlowers = (totalRests) => {
  return Object.values(FLOWER_TYPES).filter(flower => totalRests >= flower.unlockAtRests);
};

export const isFlowerUnlocked = (flowerId, totalRests) => {
  const flower = FLOWER_TYPES[flowerId];
  return flower && totalRests >= flower.unlockAtRests;
};
