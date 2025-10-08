import { state } from "../state.js";
import { emit, on } from "../events.js";
import { classes } from "../content/classes.js";

export function initMath() {
  console.log("Math system initialized");
  on("partyChanged", () => {
	updateElementalModifiers()
});
  on("classUpgraded", ({ id, level }) => {
    calculateStats(id, level);
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
/*
// Calculate stats based on class levels
export function calculateTotalStats() {
  const totalStats = { hp: 0, mp: 0, attack: 0, defense: 0, criticalChance: 0, speed: 0 };
  state.party.forEach(member => {
    const cls = getClassById(member.id);
    const level = state.classLevels[member.id] || 1;
    if (cls && cls.baseStates && cls.growthPerLevel) {
      totalStats.hp += cls.baseStates.hp + cls.growthPerLevel.hp * (level - 1);
      totalStats.mp += cls.baseStates.mp + cls.growthPerLevel.mp * (level - 1);
      totalStats.attack += cls.baseStates.attack + cls.growthPerLevel.attack * (level - 1);
      totalStats.defense += cls.baseStates.defense + cls.growthPerLevel.defense * (level - 1);
      totalStats.criticalChance += cls.baseStates.criticalChance || 0;
      totalStats.speed += cls.baseStates.speed || 0;
    }
  });
  state.totalStats = totalStats;
  emit("statsUpdated", totalStats);
}
*/
// Helper to get class data by ID
export function getClassById(id) {
  console.log("Getting class by ID:", id);
  return classes.find(c => c.id === id);
}

export function calculatePercentage(number, percentage) {
return (number * percentage) / 100;
}

/**
 * Calculates the stats for a character based on their level.
 * @param {Object} character - The character template object.
 * @param {number} level - The level to calculate stats for.
 * @returns {Object} - A new object with calculated stats.
 */
export function calculateStats(character, level) {
  /*
  const character = getClassById(classId);
  if (!character) {
    console.warn(`Character with ID ${classId} not found.`);
    return {};
  }
  */
  const calculatedStats = {};

  for (const stat in character.baseStats) {
    const base = character.baseStats[stat] || 0;
    const perLevel = character.growthPerLevel?.[stat] || 0;
    calculatedStats[stat] = base + perLevel * (level - 1);
  }

  return calculatedStats;
}

// Calculate elemental stats in state.elementalDmgModifiers from resonance

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
  for (const member of state.party) {
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
  state.elementalDmgModifiers = { ...baseModifiers };
  emit("elementalModifiersUpdated", state.elementalDmgModifiers);
  console.log("Updated elemental modifiers:", state.elementalDmgModifiers);
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
