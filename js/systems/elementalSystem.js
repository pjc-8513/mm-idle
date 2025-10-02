/**
 * Elemental resistance and weakness calculations
 * @module elementalSystem
 */

// Elemental relationship table
const ELEMENTAL_RELATIONSHIPS = {
  fire: { weakness: 'water' },
  water: { weakness: 'air' },
  air: { weakness: 'earth' },
  earth: { weakness: 'fire' },
  poison: { weakness: 'water' },
  physical: { weakness: 'poison' },
  dark: { weakness: 'light' },
  light: { weakness: 'dark' },
  pest: { weakness: 'physical' },
};

// Base resistance/weakness values
const ELEMENTAL_CONFIG = {
  RESISTANCE_MULTIPLIER: 0.2,  // Resistant enemies take 20% damage (80% reduction)
  WEAKNESS_MULTIPLIER: 2.0,    // Weak enemies take 200% damage (100% increase)
  NEUTRAL_MULTIPLIER: 1.0      // Neutral matchup
};

/**
 * Calculate elemental damage multiplier based on attack element vs target element
 * @param {string} attackElement - The element of the attack (resonance)
 * @param {string} targetElement - The elementType of the target enemy
 * @param {number} elementalPenetration - Optional penetration stat (0-1) that reduces resistance effectiveness
 * @param {number} weaknessBonus - Optional bonus multiplier for weakness damage (additive to base)
 * @returns {number} Damage multiplier
 */
export function getElementalMultiplier(
  attackElement, 
  targetElement, 
  elementalPenetration = 0,
  weaknessBonus = 0
) {
  // Validate inputs
  if (!attackElement || !targetElement) {
    return ELEMENTAL_CONFIG.NEUTRAL_MULTIPLIER;
  }
  console.log("[target] element:", targetElement, typeof targetElement);
  const attackLower = attackElement.toLowerCase();
  const targetLower = targetElement.toLowerCase();

  // Check if target is weak to this attack element
  const targetRelationship = ELEMENTAL_RELATIONSHIPS[targetLower];
  if (targetRelationship?.weakness === attackLower) {
    // Target is weak to this element
    return ELEMENTAL_CONFIG.WEAKNESS_MULTIPLIER + weaknessBonus;
  }

  // Check if target resists this attack element (attacker is weak to target's element)
  const attackRelationship = ELEMENTAL_RELATIONSHIPS[attackLower];
  if (attackRelationship?.weakness === targetLower) {
    // Target resists this element
    const baseResistance = ELEMENTAL_CONFIG.RESISTANCE_MULTIPLIER;
    
    // Apply elemental penetration to reduce resistance
    // Penetration increases the multiplier toward 1.0
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
  if (targetRelationship?.weakness === attackLower) {
    return 'weakness';
  }

  const attackRelationship = ELEMENTAL_RELATIONSHIPS[attackLower];
  if (attackRelationship?.weakness === targetLower) {
    return 'resistance';
  }

  return 'neutral';
}

// Export config for external modification if needed
export { ELEMENTAL_CONFIG, ELEMENTAL_RELATIONSHIPS };