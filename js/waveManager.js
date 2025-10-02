// waveManager.js - Centralized wave management
import { state } from "./state.js";
import { emit, on } from "./events.js";
import { AREA_TEMPLATES } from "./content/areaDefs.js";
import { ENEMY_TEMPLATES } from "./content/enemyDefs.js";
import { getBonusGoldMultiplier } from "./area.js";
import { prefixes } from "./content/definitions.js";
import { stopAutoAttack, startAutoAttack, setTarget } from "./systems/combatSystem.js";

const SCALING = {
  baseHP: 1000,
  r: 1.035,
  zone_length: 10,
  zone_multiplier: 1.5,
  boss_base_multiplier: 12,
  spike_set: [50, 100, 200],
  spike_factor: 3,
};

// Utility: choose a random element from an array
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Utility: pick a prefix based on heroLevel
function getRandomPrefix(heroLevel) {
  const unlocked = prefixes.filter(p => heroLevel >= p.unlocks);
  return unlocked.length > 0 ? randomChoice(unlocked).prefix : "";
}

function getEnemyHP(wave, isBoss = false) {
  let hp = SCALING.baseHP
    * Math.pow(SCALING.r, wave - 1)
    * Math.pow(SCALING.zone_multiplier, Math.floor((wave - 1) / SCALING.zone_length));

  if (isBoss) hp *= SCALING.boss_base_multiplier;
  if (SCALING.spike_set.includes(wave)) hp *= SCALING.spike_factor;

  return Math.floor(hp);
}

export function initWaveManager() {
  // Listen for wave-related events
  on("waveCleared", handleWaveCleared);
  on("waveTimedOut", handleWaveTimeout);
  on("areaChanged", handleAreaChanged);
  on("gameStarted", handleGameStart);
}

export function handleGameStart() {
  // Start the first wave when game begins
  if (state.currentArea && state.currentWave === 1) {
    startWave();
  }
}

export function handleAreaChanged(newAreaId) {
  // When switching areas, reset to wave 1 and start
  state.areaWave = 1;
  state.currentArea = newAreaId;
  startWave();
}

export function handleWaveCleared() {
  const currentArea = AREA_TEMPLATES[state.currentArea];
  if (!currentArea) return;
  stopAutoAttack();
  // Calculate bonus gold based on time remaining
  const bonusMultiplier = getBonusGoldMultiplier(); // From area.js
  const bonusGold = Math.floor(50 * bonusMultiplier * state.areaWave);
  state.resources.gold += bonusGold;
  
  console.log(`Wave ${state.currentWave} cleared! Bonus: ${bonusGold} gold`);


  // Check if this was the final wave (boss wave)
  if (state.areaWave >= currentArea.maxWaves) {
    handleAreaCompleted();
  } else {
    // Advance to next wave
    state.currentWave++;
    state.areaWave++;
    setTimeout(() => {
      startWave();
    }, 2000); // 2 second delay between waves
  }
}

export function handleWaveTimeout() {
  console.log("Wave timed out! Restarting area...");
  stopAutoAttack();
  // Reset to wave 1
  state.areaWave = 1;
  
  // Small delay then restart
  setTimeout(() => {
    startWave();
  }, 1500);
  
  //emit("areaReset");
}

export function handleAreaCompleted() {
  const currentArea = AREA_TEMPLATES[state.currentArea];
  console.log(`Area ${currentArea.name} completed!`);

    emit("areaCompleted", {
    areaId: state.currentArea,
    quest: { id: currentArea.questId }
  });
  state.baseLevel += 10; // raise the base level by 10
    
  // unlock next area or loop back to beginning
  if (currentArea.nextArea) {
    state.currentArea = currentArea.nextArea;
  } else {
    // loop back to the beginning and increase difficulty
    state.currentArea = "newSorpigal";
  }
  
  // go to the next area
  state.areaWave = 1;
  setTimeout(() => {
    startWave();
  }, 3000); // Longer delay after area completion
}

export function startWave() {
  console.log(`Starting wave ${state.areaWave} in ${state.currentArea}`);
  
  // Clear existing enemies
  state.enemies = [
    [null, null, null],
    [null, null, null], 
    [null, null, null]
  ];
  
  // Spawn new wave
  spawnWave();
  
  // Emit wave started event (this triggers timer)
  emit("waveStarted", state.areaWave);
  startAutoAttack();
  setTarget(2, 0);
}

export function spawnWave() {
  const currentArea = AREA_TEMPLATES[state.currentArea];
  if (!currentArea) return;
  
  const isLastWave = state.areaWave >= currentArea.maxWaves;
  const enemiesToSpawn = [];
  
  if (isLastWave) {
    // Keep track of positions already reserved in this spawn
    const reservedPositions = new Set();
    reservedPositions.add("1,1"); // Reserve center for boss
    // Boss wave - spawn boss in center, maybe some minions
    const boss = createEnemy(currentArea.boss, state.currentWave, true);
    enemiesToSpawn.push({ enemy: boss, row: 1, col: 1 }); // Center position
    
    // Add some minions around boss
    const minionCount = Math.min(3, currentArea.enemies.length);
    for (let i = 0; i < minionCount; i++) {
      const minionType = currentArea.enemies[Math.floor(Math.random() * currentArea.enemies.length)];
      const minion = createEnemy(minionType, state.currentWave);
      
      // Place minions in random positions (not center)
      let row, col;
      do {
        row = Math.floor(Math.random() * 3);
        col = Math.floor(Math.random() * 3);
      } while (state.enemies[row][col] !== null || reservedPositions.has(`${row},${col}`));
    
      reservedPositions.add(`${row},${col}`);  
      enemiesToSpawn.push({ enemy: minion, row, col });
    }
  } else {
    // Normal wave - always spawn 9 enemies
    const enemyCount = 9;
    
    // Keep track of positions already reserved in this spawn
    const reservedPositions = new Set();
    
    for (let i = 0; i < enemyCount; i++) {
      const enemyType = currentArea.enemies[Math.floor(Math.random() * currentArea.enemies.length)];
      const enemy = createEnemy(enemyType, state.currentWave);
      
      // Find random empty position that's not reserved
      let row, col;
      do {
        row = Math.floor(Math.random() * 3);
        col = Math.floor(Math.random() * 3);
        const posKey = `${row},${col}`;
      } while (state.enemies[row][col] !== null || reservedPositions.has(`${row},${col}`));
      
      // Mark this position as reserved
      reservedPositions.add(`${row},${col}`);
      enemiesToSpawn.push({ enemy, row, col });
    }
  }
  
  // Place all enemies
  enemiesToSpawn.forEach(({ enemy, row, col }) => {
    state.enemies[row][col] = enemy;
    console.log(`Placed enemy ${enemy.name} (Lvl ${enemy.level}) at [${row}, ${col}]`);
  });
  
  console.log(`Spawned ${enemiesToSpawn.length} enemies for wave ${state.currentWave}`);
  emit("waveStarted");
}

let enemyCounter = 0;
function generateUniqueEnemyId(enemyId) {
  return `${enemyId}-${enemyCounter++}`;
}

export function createEnemy(enemyId, wave, isBoss = false) {
  const template = ENEMY_TEMPLATES[enemyId];
  if (!template) return null;

  const { heroLevel, currentArea } = state;

  // 1. Get HP and Attack scaling
  const hp = getEnemyHP(wave, isBoss);

  // Attack could scale similarly (simple version for now)
  const attack = Math.floor(
    (template.baseAttack || 5) 
    * Math.pow(SCALING.r, wave - 1) 
    * Math.pow(SCALING.zone_multiplier, Math.floor((wave - 1) / SCALING.zone_length))
    * (isBoss ? 2 : 1) // bosses hit harder
  );

  // 2. Assign prefix
  const prefix = getRandomPrefix(heroLevel);
  const name = prefix ? `${prefix} ${template.baseName}` : template.baseName;
  
  // 3. Build final enemy object
  return {
    id: enemyId,
    uniqueId: generateUniqueEnemyId(enemyId),
    name,
    prefix,
    level: state.currentWave, // or scale by wave if you want
    hp,
    maxHp: hp,
    attack,
    statusEffects: [],
    justDamaged: false,
    row: template.row,
    elementType: template.elementType,
    resistances: { ...template.resistances },
    weaknesses: { ...template.weaknesses },
    specialAbilities: template.specialAbilities ? [...template.specialAbilities] : [],
    isBoss
  };
}

// Utility function to check if wave is cleared
export function checkWaveCleared() {
  const hasEnemies = state.enemies.some(row => 
    row.some(enemy => enemy !== null && enemy.hp > 0)
  );
  
  if (!hasEnemies) {
    emit("waveCleared");
    return true;
  }
  return false;
}

// Export for use in combat/damage systems
export function damageEnemy(row, col, damage) {
  const enemy = state.enemies[row][col];
  if (!enemy || enemy.hp <= 0) return false;
  
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.justDamaged = true;
  
  emit("enemyDamaged", { row, col, enemy, damage });
  
  // Check if enemy died
  if (enemy.hp <= 0) {
    emit("enemyDefeated", { row, col, enemy });
    
    // Small delay then check if wave is cleared
    setTimeout(() => {
      checkWaveCleared();
    }, 100);
  }
  
  return true;
}