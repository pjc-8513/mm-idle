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
    baseStats: { hp: 8, mp: 0, attack: 3, defense: 1, criticalChance: 0.05, speed: 1.0 },
    summonChance: 0.4, // 40% base chance
    hasAutoAttack: true,
    image: "../assets/images/summons/skeleton.png"
  },
  zombie: {
    id: "zombie",
    name: "Zombie",
    rarity: "uncommon",
    resonance: "undead",
    baseDuration: 20,
    level: 1,
    baseStats: { hp: 15, mp: 0, attack: 5, defense: 2, criticalChance: 0.03, speed: 0.8 },
    summonChance: 0.25, // 25% base chance
    hasAutoAttack: false,
    image: "../assets/images/summons/zombie.png",
    abilities: [
        { id: "plague", unlockLevel: 1 },
        { id: "zombieAmbush", unlockLevel: 1 }
    ],
    skills: {
        plague: { active: true },
        zombieAmbush: { cooldownRemaining: 3500 }
    }
  },
  vampire: {
    id: "vampire",
    name: "Vampire",
    rarity: "rare",
    resonance: "undead",
    baseDuration: 15,
    baseStats: { hp: 12, mp: 5, attack: 20, defense: 3, criticalChance: 0.15, speed: 1.3 },
    summonChance: 0.08, // 8% base chance
    hasAutoAttack: false,
    level: 1,
    abilities: [
      { id: "feastOfAges", unlockLevel: 1}
    ],
    skills:{
      feastOfAges: { cooldownRemaining: 5000 }
    },
    //storedHP: 0,
    image: "../assets/images/summons/vampire.png"
  },
  ghostDragon: {
    id: "ghostDragon",
    name: "Ghost Dragon",
    rarity: "legendary",
    resonance: "undead",
    baseDuration: 30,
    baseStats: { hp: 25, mp: 10, attack: 12, defense: 5, criticalChance: 0.2, speed: 1.5 },
    summonChance: 0.02, // 2% base chance
    hasAutoAttack: false,
    image: "../assets/images/summons/ghostdragon.png"
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

// Attempt to summon a unit
function attemptSummon(necromancer) {
  const graveyardLevel = getBuildingLevel("graveyard") || 0;
  
  // Roll for which summon type
  const roll = Math.random();
  let cumulativeChance = 0;
  let selectedSummon = null;
  
  // Check each summon type in order (rarest first for priority)
  const summonOrder = ['ghostDragon', 'vampire', 'zombie', 'skeleton'];
  
  for (const summonKey of summonOrder) {
    const template = summonTemplates[summonKey];
    let chance = template.summonChance;
    
    // Graveyard increases higher tier summon rates
    if (template.rarity === "rare") {
      chance += graveyardLevel * 0.01; // +1% per level
    } else if (template.rarity === "legendary") {
      chance += graveyardLevel * 0.005; // +0.5% per level
    }
    
    cumulativeChance += chance;
    
    if (roll <= cumulativeChance) {
      selectedSummon = summonKey;
      break;
    }
  }
  
  if (!selectedSummon) return;
  
  // Create or stack the summon
  createOrStackSummon(selectedSummon, necromancer, graveyardLevel);
}

// Create a new summon or stack existing one
function createOrStackSummon(summonKey, necromancer, graveyardLevel) {
  const template = summonTemplates[summonKey];
  
  // Check if this summon type already exists
  const existingSummon = summonsState.active.find(s => s.templateId === summonKey);
  
  if (existingSummon) {
    // Stack it
    existingSummon.stacks++;
    existingSummon.duration = template.baseDuration + (graveyardLevel * 2); // Refresh duration
    
    // Update stats (multiplicative stacking)
    updateSummonStats(existingSummon, template, graveyardLevel);
    
    // Update the party member
    updatePartyMemberSummon(existingSummon);
    
    console.log(`Stacked ${template.name}! Now x${existingSummon.stacks}`);
    
    emit("summonStacked", { summon: existingSummon });
  } else {
    // Create new summon
    const duration = template.baseDuration + (graveyardLevel * 2);
    
    const newSummon = {
      id: `summon_${summonKey}_${Date.now()}`,
      templateId: summonKey,
      name: template.name,
      stacks: 1,
      duration: duration,
      maxDuration: duration,
      level: necromancer.level || 1,
      stats: {},
      attackCooldown: 0,
      isSummon: true,
      resonance: template.resonance,
      //storedHP: template.storedHP || 0,
      hasAutoAttack: template.hasAutoAttack,
        // ✅ Include abilities and skills
        abilities: template.abilities ? [...template.abilities] : [],
        skills: template.skills ? { ...template.skills } : {}

    };
    
    // Calculate initial stats
    updateSummonStats(newSummon, template, graveyardLevel);
    
    // Add to active summons
    summonsState.active.push(newSummon);
    
    // Add to party
    addSummonToParty(newSummon);
    
    console.log(`Summoned ${template.name}!`);
    
    emit("summonCreated", { summon: newSummon });
  }
}

// Update summon stats based on stacks and graveyard
function updateSummonStats(summon, template, graveyardLevel) {
  const graveyardAttackBonus = graveyardLevel * 0.5;
  
  // Stats scale with stacks
  summon.stats = {
    hp: template.baseStats.hp * summon.stacks,
    mp: template.baseStats.mp * summon.stacks,
    attack: (template.baseStats.attack + graveyardAttackBonus) * summon.stacks,
    defense: template.baseStats.defense * summon.stacks,
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
    name: `${template.name} x${summon.stacks}`,
    level: summon.level,
    stats: { ...summon.stats },
    attackCooldown: 0,
    isSummon: true,
    image: template.image,
    resonance: template.resonance,
    //storedHP: template.storedHP || 0,
    hasAutoAttack: template.hasAutoAttack,
    // ✅ Include abilities and skills
    abilities: template.abilities ? [...template.abilities] : [],
    skills: template.skills ? { ...template.skills } : {}
  };
  //logMessage('Necromancer summoned: ', summon.id);
  console.log(`[SUMMON] ${summon}`);
  state.party.push(partyMember);
  emit("partyChanged", state.party);
}

// Update existing party member when summon stacks
function updatePartyMemberSummon(summon) {
  const template = summonTemplates[summon.templateId];
  const partyMember = state.party.find(m => m.id === summon.id);
  
  if (partyMember) {
    partyMember.name = `${template.name} x${summon.stacks}`;
    partyMember.stats = { ...summon.stats };
    emit("partyChanged", state.party);
  }
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
  return summonsState.active.reduce((total, summon) => {
    return total + summon.stacks;
  }, 0);
}

// Manual summon clear (for debugging or game events)
export function clearAllSummons() {
  const toRemove = [...summonsState.active];
  toRemove.forEach(summon => removeSummon(summon));
}