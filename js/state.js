export const spellHandState = {
  lastHeroSpellResonance: null,
  counter: 0, // counter for determining when to draw a new spell
  hand: [], // Array of spell IDs currently in hand
  maxHandSize: 5
};

export const partyState = {
  heroLevel: 5,
  heroExp: 0,
  heroGains: { attack: 5 },
  unlockedClasses: [],
  classLevels: {}, // map: { fighter: 1, cleric: 2 }
  party: [],
  heroStats: { hp: 10, attack: 30, defense: 0, criticalChance: 0.05, elementalPenetration: 0, weaknessBonus: 0},
  elementalDmgModifiers: { physical: 100, fire: 100, water: 100, 
                   air: 100, poison: 100, light: 100, dark: 100, 
                   undead: 100 },
  totalStats: {},
  maxPartySize: 4,
  activeHeroBuffs: []
}
export const state = {
  tick: 0,
  resources: {
    gold: 5000,
    gems: 15,
    maxGems: 20,
    wood: 0,
    ore: 0,
    goldIncomePerHit: 0,
    gemIncomePerSecond: 0,
    woodIncomePerSecond: 0,
    oreIncomePerSecond: 0,
  },
  autoQuest: false,
  activeQuest: null, // Add this
  quests: {
    prefixQuests: {},
    typeQuests: {}
  },
  incrementalQuests: {
    gems_collected: {
      type: 'collect_total',
      resource: 'gems',
      targetAmount: 1000,
      currentAmount: 0,
      expReward: 500,
      isComplete: false
    }
  },
    dailyQuests: {
    daily_1: {
      type: 'daily_kills',
      targetCount: 50,
      currentCount: 0,
      expReward: 300,
      resetTime: '2025-09-31T00:00:00',
      isComplete: false
    }
  },
  enemyTypeQuests: {
    pest_slayer: {
      type: 'defeat_enemy_type',
      enemyType: 'pest',
      targetCount: 100,
      currentCount: 0,
      expReward: 200,
      isComplete: false
    }
  },
  buildings: [], // array {id: building-id, level: building-level}
  innAssignments: {
    slots: [null, null, null, null], // Each slot holds a class ID or null
    goldIncomeMultiplier: 1.0 // Starts at 1.0, increases by 0.2 per assignment
  },
  spells: [],
  equipment: [],
  currentArea: "newSorpigal",
  currentWave: 1,
  areaWave: 1,
  baseLevel: 1,
  activeWave: true,
  alreadySpawned: false,
  newArea: false,
  nextArea: "",
//  unlockedAreas: ["newSorpigal"], // Add newly unlocked areas here
  enemies: [
  [null, null, null], // row 0
  [null, null, null], // row 1
  [null, null, null], // row 2
  ],
  // Combat/damage tracking (for future use)
  combatLog: [],
  lastAction: null,

  ui: {}, // Placeholder for UI state and animations

  activePanel: "panelArea"
  
};

export const quickSpellState = {
  // array of spell IDs currently assigned to quick slots
  registered: [],

  // maximum number of quick slots available (can increase with upgrades)
  maxSlots: 4,

  // optional: stores the order and slot assignment
  slots: [
    // Example:
    // { slotIndex: 0, spellId: "breathOfDecay" },
    // { slotIndex: 1, spellId: "fireball" },
  ],

  // cooldowns for each spell (used by hotbar or combat loop)
  cooldowns: {
    // breathOfDecay: 0,
    // fireball: 0,
  },

  // helper flag for UI refresh or rebind logic
  dirty: false,
};


export function initState() {
  console.log("Game state initialized");
}

export function updateTotalStats() {
  const totals = { hp: 0, attack: 0, defense: 0 };

  for (const member of partyState.party) {
    if (!member.stats) continue;
    totals.hp += Number(member.stats.hp) || 0;
    totals.attack += Number(member.stats.attack) || 0;
    totals.defense += Number(member.stats.defense) || 0;
  }

  totals.attack += Number(partyState.heroGains.attack) || 0;

  partyState.totalStats = totals;
}
