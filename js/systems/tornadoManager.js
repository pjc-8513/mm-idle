import { state } from "../state.js";
import { damageEnemy } from "../waveManager.js";
import { showFloatingDamage } from "../content/abilities.js";
import { getAdjacentEnemies } from "../systems/combatSystem.js";

const tornados = [];

/**
 * Spawn a new tornado effect
 */
export function spawnTornado({ row, col, baseDamage, duration, jumpInterval }) {
  const tornado = {
    row,
    col,
    baseDamage,
    duration,
    elapsed: 0,
    jumpTimer: 0,
    jumpInterval,
    storedCounters: {}, // carries counters to next enemy
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

    if (t.elapsed >= t.duration) {
      tornados.splice(i, 1);
      continue;
    }

    const currentEnemy = state.enemies[t.row]?.[t.col];
    if (currentEnemy && currentEnemy.hp > 0) {
      // Apply a small tick of air damage
      damageEnemy(currentEnemy, t.baseDamage * delta, "air");
      showFloatingDamage(t.row, t.col, Math.round(t.baseDamage * delta));

      // Periodically jump to a new target
      if (t.jumpTimer >= t.jumpInterval) {
        t.jumpTimer = 0;

        // Gather counters to carry forward
        for (const [type, count] of Object.entries(currentEnemy.counters || {})) {
          t.storedCounters[type] = (t.storedCounters[type] || 0) + count;
        }
        currentEnemy.counters = {}; // remove from current

        // Get adjacent enemies
        const adj = getAdjacentEnemies(t.row, t.col);
        if (adj.length > 0) {
          // Pick a random adjacent target
          const next = adj[Math.floor(Math.random() * adj.length)];
          t.row = next.row;
          t.col = next.col;

          // Apply stored counters to new target
          for (const [type, count] of Object.entries(t.storedCounters)) {
            next.enemy.counters[type] = (next.enemy.counters[type] || 0) + count;
          }
          t.storedCounters = {};

        } else {
          // No adjacent enemies — stays in place
        }
      }
    } else {
      // Try to move if current enemy is gone
      const adj = getAdjacentEnemies(t.row, t.col);
      if (adj.length > 0) {
        const next = adj[Math.floor(Math.random() * adj.length)];
        t.row = next.row;
        t.col = next.col;
      }
    }
  }
}
