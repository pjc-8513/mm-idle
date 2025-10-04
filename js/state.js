export const state = {
  tick: 0,
  resources: {
    gold: 500,
    gems: 0,
    wood: 0,
    ore: 0,
    goldIncomePerHit: 0,
    gemIncomePerSecond: 0,
    woodIncomePerSecond: 0,
    oreIncomePerSecond: 0,
  },
  heroLevel: 5,
  heroExp: 0,
  heroGains: { attack: 5 },
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
  unlockedClasses: [],
  classLevels: {}, // map: { fighter: 1, cleric: 2 }
  party: [],
  heroStats: { hp: 0, mp: 0, attack: 30, defense: 0 },
  elementalDmgModifiers: { physical: 100, fire: 100, water: 100, 
                   air: 100, poison: 100, light: 100, dark: 100 },
  buildings: [],
  spells: [],
  equipment: [],
  currentArea: "newSorpigal",
  currentWave: 1,
  areaWave: 1,
  baseLevel: 1,
  nextArea: "",
//  unlockedAreas: ["newSorpigal"], // Add newly unlocked areas here
  enemies: [
  [null, null, null], // row 0
  [null, null, null], // row 1
  [null, null, null], // row 2
  ],
  maxPartySize: 4,
  // Combat/damage tracking (for future use)
  combatLog: [],
  lastAction: null,

  ui: {}, // Placeholder for UI state and animations

  activePanel: "panelArea"
  
};

export function initState() {
  console.log("Game state initialized");
}
