export const ENEMY_TEMPLATES = {
  // Basic Enemies
  dragonFly: {
    id: "dragonFly",
    baseName: "Dragon Fly",
    type: "pest",
    elementType: "pest",
    tier: 1,
    speed: 2,
    maxMp: 15,
    row: 0,
    description: "Nuisance dragon flies common throughout the land."
  },
  goblin: {
    id: "goblin",
    baseName: "Goblin",
    type: "humanoid",
    elementType: "poison",
    tier: 1,
    speed: 1.5,
    maxMp: 20,
    row: 0,
    hpFormula: (level) => Math.floor(10 + level * (Math.random() * 2 + 25) + Math.pow(level, 1.2) * 4),
    attackFormula: (level) => Math.floor(3 + level * 1.2),
    xpFormula: (level) => Math.floor(20 * Math.pow(1.13, level - 1)),
    description: "A small, green humanoid creature known for its cunning and mischief.",
    /*
    resistances: {
      physical: 0,
      fire: 0,
        water: 0,
        earth: 0,
        air: 0,
        poison: 10,
        light: 0,
        dark: 0,
    },
    weaknesses: {
        physical: 0,
        fire: 0,
        water: 10,
        earth: 0,
        air: 10,
        poison: 0,
        light: 10,
        dark: 0,
    },
    */
    // Special abilities (healer)
    /*
    specialAbilities: [{
      type: "heal",
      amount: 0.2,     // heals for 20% of target's max HP
      interval: 3000,   // heals every 3 seconds
      cost: 10 
    }]
    */
    //isAOE: true,
    /*
    statusEffect: {
      curse: {
      key: 'curse',
      chance: 1
      }
    }
    */
    //variants: ["Scout", "Warrior", "Chieftain"]
  },
   bandit: {
    id: "bandit",
    baseName: "Bandit",
    type: "humanoid",
    elementType: "physical",
    tier: 1,
    dodge: .30,
    speed: 2.5,
    row: 1,
    hpFormula: (level) => Math.floor(15 + level * (Math.random() * 2 + 25) + Math.pow(level, 1.2) * 5),
    attackFormula: (level) => Math.floor(4 + level * 1.3),
    goldFormula: (level) => Math.floor(14 + level * 3),
    xpFormula: (level) => Math.floor(20 * Math.pow(1.13, level - 1)),
    //variants: ["Thief", "Outlaw", "Captain"]
  },
  
  apprenticeMage: {
    id: "apprenticeMage",
    baseName: "Apprentice Mage",
    type: "humanoid",
    elementType: "fire",
    tier: 1,
    speed: 1.5,
    row: 2,
    isMagic: true,
    hpFormula: (level) => Math.floor(20 + level * (Math.random() * 2 + 25) + Math.pow(level, 1.2) * 5),
    attackFormula: (level) => Math.floor(7 + level * 1.4),
    goldFormula: (level) => Math.floor(10 + level * 1.5),
    xpFormula: (level) => Math.floor(20 * Math.pow(1.13, level - 1))
  },
    swarm: {
      id: "swarm",
      baseName: "Swarm",
      type: "pest",
      elementType: "pest",
      tier: "boss",
      isBoss: true,
      maxMp: 30
    },
    goblinKing: {
    id: "goblinKing",
    baseName: "Goblin King",
    type: "humanoid",
    elementType: "poison",
    tier: "boss",
    isBoss: true,
    lootTier: 4,
    maxMp: 40,
    hpFormula: (level) => Math.floor((20 + level * (Math.random() * 2 + 25) + Math.pow(level, 1.2) * 5) * 2),
    attackFormula: (level) => Math.floor(12 + level * 2.5),
    goldFormula: (level) => Math.floor(60 + level * 3),
    xpFormula: (level) => Math.floor(30 * Math.pow(1.13, level - 1)),
    variants: ["Warlord", "Tyrant", "Destroyer"],
    // Special abilities
    specialAbilities: [{
      type: "summon",
      summonId: "goblin",   // what to summon
      interval: 7500,             // every 7.5s
      max: 2,                      // maximum alive
      cost: 20
    }]
    }

};

// Higher tier enemies can be defined similarly
// e.g., bandit, apprenticeMage, goblinKing, etc.