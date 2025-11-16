// tornadoManager.js
import { spellHandState, state } from "../state.js";
import { damageEnemy } from "../waveManager.js";
import { showFloatingDamage } from "../content/abilities.js";
import { calculateHeroSpellDamage, getAdjacentEnemies } from "../systems/combatSystem.js";
import { handleSkillAnimation } from "../systems/animations.js";
import { updateEnemiesGrid } from "../area.js";
import { getSkillDamageRatio } from "./math.js";


const tornados = [];

/**
 * Spawn a new tornado effect
 */
export function spawnTornado({ row, col, baseDamage, duration, jumpInterval }) {
  const numTicks = 20; // Total number of damage events
  const damageInterval = duration / numTicks; // Time between damage ticks
  
  const tornado = {
    row,
    col,
    baseDamage,
    duration,
    elapsed: 0,
    jumpTimer: 0,
    jumpInterval,
    damageTimer: 0,
    damageInterval,
    carriedCounters: {}, // counters being carried by the tornado
  };
  tornados.push(tornado);
}

/**
 * Update all active tornados — call this in your main game loop
 */
export function updateTornados(delta) {
  for (let i = tornados.length - 1; i >= 0; i--) {
    const t = tornados[i];
    t.elapsed += delta;
    t.jumpTimer += delta;
    t.damageTimer += delta;

    // Remove expired tornados
    if (t.elapsed >= t.duration) {
      // Drop any remaining counters on the last enemy
      const finalEnemy = state.enemies[t.row]?.[t.col];
      if (finalEnemy && finalEnemy.hp > 0) {
        for (const [type, count] of Object.entries(t.carriedCounters)) {
          finalEnemy.counters[type] = (finalEnemy.counters[type] || 0) + count;
        }
      }
      tornados.splice(i, 1);
      if (tornados.length === 0) {
        spellHandState.activeTornado = false;
      }
      continue;
    }

    const currentEnemy = state.enemies[t.row]?.[t.col];
    
    // Damage tick (interval-based)
    if (currentEnemy && currentEnemy.hp > 0 && t.damageTimer >= t.damageInterval) {
      t.damageTimer = 0;
      
      // Deal damage in discrete chunks
      const skillDamageRatio = getSkillDamageRatio("tornado", state.currentWave);
      const baseDamageObject = calculateHeroSpellDamage("air", skillDamageRatio, currentEnemy);
      t.baseDamage = baseDamageObject.damage / 3;
      baseDamageObject.damage = t.baseDamage;
      damageEnemy(currentEnemy, baseDamageObject, "air");
      showFloatingDamage(t.row, t.col, baseDamageObject);
      handleSkillAnimation("tornado", t.row, t.col);
      if (currentEnemy.hp<=0) updateEnemiesGrid();
    }

    // Jump to new target (interval-based)
    if (t.jumpTimer >= t.jumpInterval) {
      t.jumpTimer = 0;

      if (currentEnemy && currentEnemy.hp > 0) {
        // Pick up a PORTION of each counter type (not all)
        const pickupRate = 0.4; // Pick up 40% of each counter type
        for (const [type, count] of Object.entries(currentEnemy.counters || {})) {
          if (count > 0) {
            const amountToPickup = Math.floor(count * pickupRate);
            if (amountToPickup > 0) {
              // Add to tornado's carried counters
              t.carriedCounters[type] = (t.carriedCounters[type] || 0) + amountToPickup;
              // Remove from current enemy
              currentEnemy.counters[type] -= amountToPickup;
              if (currentEnemy.counters[type] <= 0) {
                delete currentEnemy.counters[type];
              }
            }
          }
        }
      }

      // Get adjacent enemies
      const adj = getAdjacentEnemies(t.row, t.col);
      if (adj.length > 0) {
        // Pick a random adjacent target
        const next = adj[Math.floor(Math.random() * adj.length)];
        
        // Distribute a PORTION of carried counters to this enemy
        const distributeRate = 0.5; // Drop off 50% of what we're carrying
        for (const [type, count] of Object.entries(t.carriedCounters)) {
          if (count > 0) {
            const amountToDistribute = Math.ceil(count * distributeRate);
            // Add to new target
            next.enemy.counters[type] = (next.enemy.counters[type] || 0) + amountToDistribute;
            // Reduce from tornado's carried amount
            t.carriedCounters[type] -= amountToDistribute;
            if (t.carriedCounters[type] <= 0) {
              delete t.carriedCounters[type];
            }
          }
        }

        // Move to new position
        t.row = next.row;
        t.col = next.col;
      } else {
        // No adjacent enemies — stays in place and keeps carrying counters
      }
    }

    // If current enemy died, try to move immediately
    if (!currentEnemy || currentEnemy.hp <= 0) {
      const adj = getAdjacentEnemies(t.row, t.col);
      if (adj.length > 0) {
        const next = adj[Math.floor(Math.random() * adj.length)];
        t.row = next.row;
        t.col = next.col;
      }
    }
  }
}