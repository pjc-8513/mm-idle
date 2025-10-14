// summonSystem.js
import { state } from "../state.js";
import { emit, on } from "../events.js";
import { getBuildingLevel } from "../town.js";
import { logMessage } from "./log.js";
import { abilities } from "../content/abilities.js";

// Summon definitions
export const summonTemplates = {
  skeleton: {
    id: "skeleton",
    name: "Skeleton",
    rarity: "common",
    resonance: "undead",
    baseDuration: 15, // seconds
    baseStats: { hp: 8, mp: 0, attack: 10, defense: 1, criticalChance: 0.05, speed: 1.0 },
    hasAutoAttack: true,
    image: "../assets/images/summons/skeleton.png",
    order: 1 // Position in progression chain
  },
  zombie: {
    id: "zombie",
    name: "Zombie",
    rarity: "uncommon",
    resonance: "undead",
    baseDuration: 20,
    level: 1,
    baseStats: { hp: 15, mp: 0, attack: 20, defense: 2, criticalChance: 0.03, speed: 0.8 },
    hasAutoAttack: false,
    image: "../assets/images/summons/zombie.png",
    abilities: [
        { id: "plague", unlockLevel: 1 },
        { id: "zombieAmbush", unlockLevel: 1 }
    ],
    skills: {
        plague: { active: true },
        zombieAmbush: { cooldownRemaining: 3500 }
    },
    order: 2
  },
  vampire: {
    id: "vampire",
    name: "Vampire",
    rarity: "rare",
    resonance: "undead",
    baseDuration: 15,
    baseStats: { hp: 12, mp: 5, attack: 30, defense: 3, criticalChance: 0.15, speed: 1.3 },
    hasAutoAttack: false,
    level: 1,
    abilities: [
      { id: "feastOfAges", unlockLevel: 1}
    ],
    skills:{
      feastOfAges: { cooldownRemaining: 5000 }
    },
    image: "../assets/images/summons/vampire.png",
    order: 3
  },
  ghostDragon: {
    id: "ghostDragon",
    name: "Ghost Dragon",
    rarity: "legendary",
    resonance: "undead",
    baseDuration: 30,
    baseStats: { hp: 25, mp: 10, attack: 50, defense: 5, criticalChance: 0.2, speed: 1.5 },
    hasAutoAttack: false,
    image: "../assets/images/summons/ghostdragon.png",
    order: 4
  }
};

// Summon state tracking
export const summonsState = {
  active: [], // Array of active summon instances
  initialized: false
};

// Initialize the summon system
export function initSummonSystem() {
  if (summonsState.initialized) return;
  
  console.log("Initializing Summon System...");
  
  // Listen for enemy defeats from necromancers
  on("enemyDefeated", (data) => {
    handleEnemyDefeated(data);
  });
  
  // Listen for party changes to clean up summons if necromancer removed
  on("partyChanged", (party) => {
    checkNecromancerInParty(party);
  });
  
  summonsState.initialized = true;
  console.log("Summon System initialized");
}

// Handle enemy defeated event - check for summons
function handleEnemyDefeated(data) {
  // Find all necromancers in party
  const necromancers = state.party.filter(member => member.id === "necromancer");
  
  if (necromancers.length === 0) return;
  
  // Each necromancer gets a chance to summon
  necromancers.forEach(necromancer => {
    attemptSummon(necromancer);
  });
}

// Attempt to summon a unit based on progression chain
function attemptSummon(necromancer) {
  const graveyardLevel = getBuildingLevel("graveyard") || 0;
  
  // Check what summons are currently active
  const activeSummonTypes = summonsState.active.map(s => s.templateId);
  
  // Define the progression chain in order
  const progressionChain = ['skeleton', 'zombie', 'vampire', 'ghostDragon'];
  
  // Find the first missing summon in the chain
  let summonToCreate = null;
  
  for (const summonKey of progressionChain) {
    if (!activeSummonTypes.includes(summonKey)) {
      summonToCreate = summonKey;
      break;
    }
  }
  
  // If all summons are active, do nothing
  if (!summonToCreate) {
    console.log("All summons already active - no new summon created");
    return;
  }
  
  // Create the summon
  createSummon(summonToCreate, necromancer, graveyardLevel);
}

// Create a new summon
function createSummon(summonKey, necromancer, graveyardLevel) {
  const template = summonTemplates[summonKey];
  
  const duration = template.baseDuration + (graveyardLevel * 2);
  
  const newSummon = {
    id: `summon_${summonKey}_${Date.now()}`,
    templateId: summonKey,
    name: template.name,
    duration: duration,
    maxDuration: duration,
    level: necromancer.level || 1,
    stats: {},
    attackCooldown: 0,
    isSummon: true,
    resonance: template.resonance,
    hasAutoAttack: template.hasAutoAttack,
    abilities: template.abilities ? [...template.abilities] : [],
    skills: template.skills ? { ...template.skills } : {}
  };
  
  // Calculate stats
  updateSummonStats(newSummon, template, graveyardLevel);
  
  // Add to active summons
  summonsState.active.push(newSummon);
  
  // Add to party
  addSummonToParty(newSummon);
  
  console.log(`Summoned ${template.name}!`);
  
  emit("summonCreated", { summon: newSummon });
}

// Update summon stats based on graveyard level
function updateSummonStats(summon, template, graveyardLevel) {
  const graveyardAttackBonus = graveyardLevel * 0.5;
  
  summon.stats = {
    hp: template.baseStats.hp,
    mp: template.baseStats.mp,
    attack: template.baseStats.attack + graveyardAttackBonus,
    defense: template.baseStats.defense,
    criticalChance: template.baseStats.criticalChance,
    speed: template.baseStats.speed
  };
}

// Add summon to party
function addSummonToParty(summon) {
  const template = summonTemplates[summon.templateId];
  
  const partyMember = {
    id: summon.id,
    templateId: summon.templateId,
    name: template.name,
    level: summon.level,
    stats: { ...summon.stats },
    attackCooldown: 0,
    isSummon: true,
    image: template.image,
    resonance: template.resonance,
    hasAutoAttack: template.hasAutoAttack,
    abilities: template.abilities ? [...template.abilities] : [],
    skills: template.skills ? { ...template.skills } : {}
  };
  
  console.log(`[SUMMON] ${summon.templateId} added to party`);
  state.party.push(partyMember);
  emit("partyChanged", state.party);
}

// Update summon durations (called from main game loop)
export function updateSummons(delta) {
  if (summonsState.active.length === 0) return;
  
  const toRemove = [];
  
  summonsState.active.forEach(summon => {
    summon.duration -= delta;
    
    if (summon.duration <= 0) {
      toRemove.push(summon);
    }
  });
  
  // Remove expired summons
  toRemove.forEach(summon => {
    removeSummon(summon);
  });
}

// Remove a summon from the system
function removeSummon(summon) {
  const template = summonTemplates[summon.templateId];
  
  // Remove from active summons
  const index = summonsState.active.findIndex(s => s.id === summon.id);
  if (index !== -1) {
    summonsState.active.splice(index, 1);
  }
  
  // Remove from party
  const partyIndex = state.party.findIndex(m => m.id === summon.id);
  if (partyIndex !== -1) {
    state.party.splice(partyIndex, 1);
    emit("partyChanged", state.party);
  }
  
  console.log(`${template.name} expired`);
  emit("summonExpired", summon);
}

// Check if necromancer is still in party
function checkNecromancerInParty(party) {
  const hasNecromancer = party.some(m => m.id === "necromancer");
  
  if (!hasNecromancer && summonsState.active.length > 0) {
    // Remove all summons if no necromancer
    console.log("No necromancer in party - removing all summons");
    const toRemove = [...summonsState.active];
    toRemove.forEach(summon => removeSummon(summon));
  }
}

// Get total summon power for display/stats
export function getTotalSummonPower() {
  return summonsState.active.reduce((total, summon) => {
    return total + (summon.stats.attack || 0);
  }, 0);
}

// Get active summon count
export function getActiveSummonCount() {
  return summonsState.active.length;
}

// Manual summon clear (for debugging or game events)
export function clearAllSummons() {
  const toRemove = [...summonsState.active];
  toRemove.forEach(summon => removeSummon(summon));
}