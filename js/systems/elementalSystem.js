import { state } from "../state.js";
/**
 * Elemental resistance and weakness calculations
 * @module elementalSystem
 */

// Elemental relationship table
const ELEMENTAL_RELATIONSHIPS = {
  fire: { weakness: ['water'] },
  water: { weakness: ['air'] },
  air: { weakness: ['earth'] },
  earth: { weakness: ['fire'] },
  poison: { weakness: ['water'] },
  physical: { weakness: ['poison', 'undead'] },
  dark: { weakness: ['light'] },
  light: { weakness: ['dark'] },
  pest: { weakness: ['physical'] },
  undead: { weakness: ['light', 'fire', 'water'] },
};


// Base resistance/weakness values
const ELEMENTAL_CONFIG = {
  RESISTANCE_MULTIPLIER: 0.2,  // Resistant enemies take 20% damage (80% reduction)
  WEAKNESS_MULTIPLIER: 2.0,    // Weak enemies take 200% damage (100% increase)
  DEFAULT_MULTIPLIER: 1.0,      // Matchup not found
  // neutral matchup, enemy resistance increases deeper in
  get NEUTRAL_MULTIPLIER(){
    if (!state.currentWave) return 1.0;
    if (state.currentWave <= 30){ 
      return 1.0;
    } else if (state.currentWave <= 50){ 
      return 0.8;
    } else if (state.currentWave <= 70){
      return 0.6; 
    } else {
      return 0.5; // Changed to handle waves beyond 70
    }
  }
};

/**
 * Calculate elemental damage multiplier based on attack element vs target element
 * @param {string} attackElement - The element of the attack (resonance)
 * @param {string} targetElement - The elementType of the target enemy
 * @param {number} [elementalPenetration=0] - Optional penetration stat (0-1) that reduces resistance effectiveness
 * @param {number} [weaknessBonus=0] - Optional bonus multiplier for weakness damage (additive to base)
 * @returns {number} Damage multiplier
 */
export function getElementalMultiplier(
  attackElement, 
  targetElement, 
  elementalPenetration = 0,
  weaknessBonus = 0
) {
  // Validate inputs
  if (typeof attackElement !== 'string' || typeof targetElement !== 'string') {
    return ELEMENTAL_CONFIG.DEFAULT_MULTIPLIER;
  }
  if (typeof elementalPenetration !== 'number' || typeof weaknessBonus !== 'number') {
    throw new Error('elementalPenetration and weaknessBonus must be numbers');
  }

  const attackLower = attackElement.toLowerCase();
  const targetLower = targetElement.toLowerCase();

  // Check if target is weak to this attack element
  const targetRelationship = ELEMENTAL_RELATIONSHIPS[targetLower];
  if (targetRelationship?.weakness?.includes(attackLower)) {
    return ELEMENTAL_CONFIG.WEAKNESS_MULTIPLIER + weaknessBonus;
  }

  // Check if target resists this attack element (attacker is weak to target's element)
  const attackRelationship = ELEMENTAL_RELATIONSHIPS[attackLower];
  if (attackRelationship?.weakness?.includes(targetLower)) {
    const baseResistance = ELEMENTAL_CONFIG.RESISTANCE_MULTIPLIER;
    const penetrationEffect = elementalPenetration * (1.0 - baseResistance);
    return baseResistance + penetrationEffect;
  }

  // Neutral matchup
  return ELEMENTAL_CONFIG.NEUTRAL_MULTIPLIER;
}

/**
 * Get a description of the elemental matchup for UI feedback
 * @param {string} attackElement - The element of the attack
 * @param {string} targetElement - The elementType of the target
 * @returns {string} Description: 'weakness', 'resistance', or 'neutral'
 */
export function getElementalMatchup(attackElement, targetElement) {
  if (!attackElement || !targetElement) return 'neutral';

  const attackLower = attackElement.toLowerCase();
  const targetLower = targetElement.toLowerCase();

const targetRelationship = ELEMENTAL_RELATIONSHIPS[targetLower];
if (targetRelationship?.weakness?.includes(attackLower)) {
  return 'weakness';
}

const attackRelationship = ELEMENTAL_RELATIONSHIPS[attackLower];
if (attackRelationship?.weakness?.includes(targetLower)) {
  return 'resistance';
}


  return 'neutral';
}

// Export config for external modification if needed
export { ELEMENTAL_CONFIG, ELEMENTAL_RELATIONSHIPS };