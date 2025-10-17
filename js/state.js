export const partyState = {
  heroLevel: 5,
  heroExp: 0,
  heroGains: { attack: 5 },
  unlockedClasses: [],
  classLevels: {}, // map: { fighter: 1, cleric: 2 }
  party: [],
  heroStats: { hp: 10, attack: 30, defense: 0 },
  elementalDmgModifiers: { physical: 100, fire: 100, water: 100, 
                   air: 100, poison: 100, light: 100, dark: 100, 
                   undead: 100 },
  totalStats: {},
  maxPartySize: 4,
}
export const state = {
  tick: 0,
  resources: {
    gold: 5000,
    gems: 0,
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
  buildings: [],
  spells: [],
  equipment: [],
  currentArea: "newSorpigal",
  currentWave: 1,
  areaWave: 1,
  baseLevel: 1,
  activeWave: true,
  alreadySpawned: false,
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
