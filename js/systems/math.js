import { partyState } from "../state.js";
import { emit, on } from "../events.js";
import { classes } from "../content/classes.js";

export function initMath() {
  console.log("Math system initialized");
  on("partyChanged", () => {
	updateElementalModifiers()
});
  on("classUpgraded", ({ id, level }) => {
    calculateClassStats(id, level);
    updateElementalModifiers();
  });
}

// Math utilities
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function chance(prob) {
  return Math.random() < prob;
}

// Helper to get class data by ID
export function getClassById(id) {
  console.log("Getting class by ID:", id);
  return classes.find(c => c.id === id);
}

export function calculatePercentage(number, percentage) {
return (number * percentage) / 100;
}

// Calculate elemental stats in partyState.elementalDmgModifiers from resonance

export function updateElementalModifiers() {
  const baseModifiers = {
    physical: 100,
    fire: 100,
    water: 100,
    air: 100,
    poison: 100,
    light: 100,
    dark: 100,
    undead: 100
  };

  // Count how many members share each resonance
  const resonanceCounts = {};
  for (const member of partyState.party) {
    const res = member.resonance;
    if (res) {
      resonanceCounts[res] = (resonanceCounts[res] || 0) + 1;
    }
  }

  // Apply tiered bonuses
  for (const element in baseModifiers) {
    const count = resonanceCounts[element] || 0;
    let bonus = 0;
    if (count === 2) bonus = 25;
    else if (count === 3) bonus = 50;
    else if (count === 4) bonus = 100;

    baseModifiers[element] += bonus;
  }
  partyState.elementalDmgModifiers = { ...baseModifiers };
  emit("elementalModifiersUpdated", partyState.elementalDmgModifiers);
  console.log("Updated elemental modifiers:", partyState.elementalDmgModifiers);
}


/* 
 * @param {*} num 
 * @returns 
 */
export function formatNumber(num) {
  if (num >= 1_000_000_000) {
    return { text: (num / 1_000_000_000).toFixed(1) + "B", suffix: "B" };
  } else if (num >= 1_000_000) {
    return { text: (num / 1_000_000).toFixed(1) + "M", suffix: "M" };
  } else if (num >= 1_000) {
    return { text: (num / 1_000).toFixed(1) + "K", suffix: "K" };
  } else {
    return { text: num.toString(), suffix: "" };
  }
}

export const suffixColors = {
  "K": "brown",
  "M": "yellow",
  "B": "red",
  "": "white" // default for plain numbers
};

/**
 * Calculate hero's current stats based on level
 */
export function getHeroStats() {
  const stats = {};
  for (const stat in partyState.heroBaseStats) {
    const base = partyState.heroBaseStats[stat];
    const growth = partyState.heroGrowthPerLevel[stat] || 0;
    const bonus = partyState.heroBonuses[stat] || 0;
    stats[stat] = base + (growth * (partyState.heroLevel - 1)) + bonus;
  }
  return stats;
}

/**
 * Calculate a class member's stats based on their level AND hero stats
 * @param {Object} classTemplate - The class definition
 * @param {number} classLevel - The class's current level
 * @returns {Object} - Calculated stats for this class instance
 */
export function calculateClassStats(classTemplate, classLevel) {
  const heroStats = getHeroStats();
  const stats = {};
  
  // Each class has a ratio of hero stats (e.g., fighter gets 80% of hero attack)
  for (const stat in classTemplate.heroStatRatios) {
    const ratio = classTemplate.heroStatRatios[stat];
    const fromHero = (heroStats[stat] || 0) * ratio;
    
    // Plus their own base and growth
    const classBase = classTemplate.baseStats?.[stat] || 0;
    const classGrowth = classTemplate.growthPerLevel?.[stat] || 0;
    const fromClass = classBase + (classGrowth * (classLevel - 1));
    
    stats[stat] = fromHero + fromClass;
  }
  
  return stats;
}

/**
 * Recalculate all party member stats and totals
 */
export function updateTotalStats() {
  const totals = { hp: 0, attack: 0, defense: 0 };
  
  // Update each party member's stats first
  for (const member of partyState.party) {
    const classLevel = partyState.classLevels[member.id] || 1;
    const classTemplate = classes.find(c => c.id === member.id);
    
    if (classTemplate) {
      member.stats = calculateClassStats(classTemplate, classLevel);
      member.level = classLevel;
      
      // Add to totals
      totals.hp += member.stats.hp || 0;
      totals.attack += member.stats.attack || 0;
      totals.defense += member.stats.defense || 0;
    }
  }
  
  partyState.totalStats = totals;
  emit("statsUpdated", totals);
}

/**
 * Level up the hero
 */
export function levelUpHero() {
  partyState.heroLevel++;
  updateTotalStats(); // All classes benefit from hero level up
  emit("heroLevelUp", partyState.heroLevel);
}

/**
 * Level up a specific class
 */
export function levelUpClass(classId) {
  partyState.classLevels[classId] = (partyState.classLevels[classId] || 1) + 1;
  
  // If this class is in the party, update stats
  if (partyState.party.some(m => m.id === classId)) {
    updateTotalStats();
  }
  
  emit("classLevelUp", { id: classId, level: partyState.classLevels[classId] });
}

/**
 * Add blacksmith or other external bonuses
 */
export function addHeroBonus(stat, amount) {
  partyState.heroBonuses[stat] = (partyState.heroBonuses[stat] || 0) + amount;
  updateTotalStats(); // Affects all classes
  emit("heroBonusAdded", { stat, amount });
}