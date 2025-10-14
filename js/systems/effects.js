import { state } from '../state.js';
import { updateEnemyCard } from '../area.js';

export function applyVisualEffect(effectType, duration = 0.6) {
  for (let row = 0; row < state.enemies.length; row++) {
    for (let col = 0; col < state.enemies[row].length; col++) {
      const enemy = state.enemies[row][col];
      if (!enemy || enemy.hp <= 0) continue;
      
      enemy.visualEffect = effectType;
      enemy.visualEffectTimer = duration;
      updateEnemyCard(enemy, row, col);
    }
  }
}

export function updateVisualEffects(delta) {
  for (let row = 0; row < state.enemies.length; row++) {
    for (let col = 0; col < state.enemies[row].length; col++) {
      const enemy = state.enemies[row][col];
      if (!enemy) continue;
      
      if (enemy.visualEffect && enemy.visualEffectTimer > 0) {
        enemy.visualEffectTimer -= delta;
        
        if (enemy.visualEffectTimer <= 0) {
          enemy.visualEffect = null;
          enemy.visualEffectTimer = 0;
          //console.log(`[light flash] creating flash at ${row}, ${col}`);
          updateEnemyCard(enemy, row, col);
        }
      }
    }
  }
}