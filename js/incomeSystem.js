import { state } from "./state.js";
import { emit } from "./events.js";

// Constants
const K_HIT = 0.02;       // gold per point of auto damage dealt
const BOUNTY_FACTOR = 0.02; // gold per enemy HP on kill

// Centralized income functions
export const incomeSystem = {
  applyHitIncome(attacker, damage) {
    let income = 0;

    // Base income from damage dealt
    income += damage * K_HIT;

    // Class bonus (if class defines income per hit)
    if (attacker.goldIncomePerHit) {
      income += attacker.goldIncomePerHit;
    }

    // Building bonuses (loop through owned buildings in state)
    for (const building of state.buildings) {
      income += building.goldIncomePerHit || 0;
    }

    // Global/time bonuses
    income *= getBonusGoldMultiplier();

    // Apply to state
    state.resources.gold += income;

    // Emit event for UI/logging
    emit("goldChanged", state.resources.gold);

    return income;
  },

  applyKillIncome(enemy) {
    let income = enemy.maxHp * BOUNTY_FACTOR;
    income *= getBonusGoldMultiplier();

    state.resources.gold += income;
    emit("goldChanged", state.resources.gold);

    return income;
  }
};

// Example multiplier function (expand later)
function getBonusGoldMultiplier() {
  return 1; // could factor in artifacts, wave clears, buffs, etc.
}

export function addGems(amount) {
  if (typeof amount !== 'number' || amount < 0) {
    console.error('Invalid amount');
    return;
  }
  state.resources.gems = Math.min(state.resources.gems + amount, state.resources.maxGems);
  emit("gemsChanged", state.resources.gems);
}