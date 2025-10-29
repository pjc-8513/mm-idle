import { calculateHeroSpellDamage, getActiveEnemies, getEnemiesBasedOnSkillLevel } from '../systems/combatSystem.js';
import { damageEnemy } from '../waveManager.js';
import { handleSkillAnimation } from '../systems/animations.js';
//import { floatingTextManager } from '../systems/floatingtext.js';
import { showFloatingDamage } from './abilities.js';
import { state, partyState } from '../state.js';
import { emit } from '../events.js';
import { logMessage } from '../systems/log.js';
import { applyVisualEffect, flashScreen, shakeScreen } from '../systems/effects.js';
import { randInt } from '../systems/math.js';
import { renderAreaPanel, updateEnemiesGrid } from '../area.js';
import { getBuildingLevel } from '../town.js';
import { spellHandState } from '../state.js';
import { updateSpellDock } from '../systems/dockManager.js';

export const heroSpells = [
    {
        id: "moonbeam",
        name: "Moonbeam",
        resonance: "dark",
            get skillBaseDamage() {
            return 3.8 * partyState.heroStats.attack;
        },

        skillLevel: 1,
        gemCost: 3,
        tier: 2,
        unlocked: true,
        description: "Absorbs all counters from enemies, converts them to dark counters, redistributes them randomly, then deals dark damage based on how many each enemy has.",
        icon: "../../assets/images/icons/moonbeam.png",

        activate: function () {
            if (state.resources.gems < this.gemCost) {
                logMessage(`Cannot afford to cast ${this.name}`);
                return;
            }
            const enemies = getActiveEnemies();
            let totalCounters = 0;

            // Step 1: Collect all counters
            enemies.forEach(enemy => {
            for (const type in enemy.counters) {
                totalCounters += enemy.counters[type];
            }
            Object.keys(enemy.counters).forEach(k => delete enemy.counters[k]);
            });

            if (totalCounters === 0) {
                logMessage(`${this.name}: No counters to absorb.`);
                return;
            }
            applyVisualEffect('dark-flash', 0.8);
            // Step 3: Redistribute as dark counters
            for (let i = 0; i < totalCounters; i++) {
            const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
            randomEnemy.counters["dark"] = (randomEnemy.counters["dark"] || 0) + 1;
            }

            // Step 4: Deal damage and consume counters
            enemies.forEach(enemy => {
            const darkCount = enemy.counters["dark"] || 0;
            const initialSkillDamage = this.skillBaseDamage * darkCount;
            const skillDamageObject = calculateHeroSpellDamage(this.resonance, initialSkillDamage, enemy);
            const skillDamage = skillDamageObject.damage;


            if (darkCount > 0) {
                damageEnemy(enemy, skillDamage, this.resonance);
                //handleSkillAnimation("moonbeam", enemy.position.row, enemy.position.col);
                showFloatingDamage(enemy.position.row, enemy.position.col, skillDamage);
            }

            delete enemy.counters["dark"];; // Step 5: Consume all counters
            });
          spellHandState.lastHeroSpellResonance = "dark";
        }
    },
    {
        id: "brilliantLight",
        name: "Brilliant Light",
        resonance: "light",
        get skillBaseDamage() {
            return 10 * partyState.heroStats.attack;
        },

        skillLevel: 1,
        gemCost: 3,
        tier: 2,
        unlocked: true,
        description: "Convert all active counters to a random counter type, then deals damage based on the type selected.",
        icon: "../../assets/images/icons/brilliant.png",
        activate: function () {
        if (state.resources.gems < this.gemCost) {
            logMessage(`Cannot afford to cast ${this.name}`);
            return;
        }
        const damageMultipliers = {
            "dark": 0.5,
            "undead": 0.5,
            "earth": 0.5,
            "physical": 0.5,
            "poison": 0.5,
            "air": 1,
            "water": 1,
            "fire": 1,
            "light": 2
        };

        applyVisualEffect('light-flash', 0.8);
        const enemies = getActiveEnemies();
        const counterTypes = ["fire", "water", "poison", "light", "dark", "air", "undead", "physical"]; // define your game's counter types
        const newType = counterTypes[Math.floor(Math.random() * counterTypes.length)];
        const initialSkillDamage = this.skillBaseDamage * damageMultipliers[newType];
        enemies.forEach(enemy => {
            const currentCounters = enemy.counters;
            const totalCounters = Object.values(currentCounters).reduce((sum, val) => sum + val, 0);

            // Step 2: Convert all counters to the new type
            enemy.counters = { [newType]: totalCounters };
            
            const skillDamageObject = calculateHeroSpellDamage(newType, initialSkillDamage, enemy);
            const skillDamage = skillDamageObject.damage;
            console.log(`Brilliant Light converting to ${newType} counters, dealing ${skillDamage} damage.`);

            // Consume all counters
            //enemy.counters = {};

            // Apply damage and animation
            damageEnemy(enemy, skillDamage, this.resonance);
            //handleSkillAnimation("brilliantLight", enemy.row, enemy.col);
            showFloatingDamage(enemy.position.row, enemy.position.col, skillDamage);
        });
        spellHandState.lastHeroSpellResonance = "light";
        },
    },
    {
	id: "breathOfDecay",
	name: "Breath of Decay",
	resonance: "undead",
        get skillBaseDamage() {
        return 3.8 * partyState.heroStats.attack;
    },
	skillLevel: 1,
	gemCost: 1,
    tier: 1,
	description: "Deals a small amount of undead to rows of enemies based on skill level.",
	icon: "../../assets/images/icons/breath.png",
    unlocked: true,
	activate: function () {
    if (state.resources.gems < this.gemCost) {
        logMessage(`Cannot afford to cast ${this.name}`);
        return;
    }
    applyVisualEffect('dark-flash', 0.8);
    console.log('Activating Breath of Decay');
	const enemies = getEnemiesBasedOnSkillLevel(this.skillLevel);
    
        enemies.forEach(enemy => {
            console.log('Damaging enemy: ', enemy);
            const skillDamage = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage, enemy);
           // console.log(`Calculated skill damage: ${skillDamage.damage}`);
            damageEnemy(enemy, skillDamage.damage, this.resonance);
            //handleSkillAnimation("breathOfDecay", enemy.row, enemy.col);
            showFloatingDamage(enemy.position.row, enemy.position.col, skillDamage); // show floating text
            });
      spellHandState.lastHeroSpellResonance = "undead";
    },
},
{
  id: "earthquake",
  name: "Earthquake",
  resonance: "earth",
  tier: 4,
  gemCost: 4,
    get skillBaseDamage() {
        return 20 * partyState.heroStats.attack;
    },
  description: "Shuffles all enemies on the grid. Enemies that move take earth damage, increased by your Earth and Physical counters. Consumes all Earth counters.",
    icon: "../../assets/images/icons/earthquake.webp",
    unlocked: true,

  activate: function () {
    if (state.resources.gems < this.gemCost) {
      logMessage(`Cannot afford to cast ${this.name}`);
      return;
    }

    const grid = state.enemies;
    const activeEnemies = [];

    // Record starting positions
    const originalPositions = new Map();
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const enemy = grid[row][col];
        if (enemy && enemy.hp > 0) {
          activeEnemies.push(enemy);
          originalPositions.set(enemy, { row, col });
        }
      }
    }

    if (activeEnemies.length === 0) {
      logMessage("No enemies to affect with Earthquake!");
      return;
    }

    shakeScreen(1000, 10); // duration: 1000ms, intensity: 10px
    // Shuffle enemies randomly across the grid
    const shuffled = [...activeEnemies].sort(() => Math.random() - 0.5);

    // Clear grid and reassign
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        grid[row][col] = null;
      }
    }

    shuffled.forEach(enemy => {
      let placed = false;
      while (!placed) {
        const r = randInt(0, grid.length - 1);
        const c = randInt(0, grid[0].length - 1);
        if (!grid[r][c]) {
          grid[r][c] = enemy;
          placed = true;
        }
      }
    });

    // Get total bonus multipliers
    const earthBonus = state.heroCounters?.earth || 0;
    const physicalBonus = state.heroCounters?.physical || 0;
    const totalBonus = 1 + 0.2 * (earthBonus + physicalBonus);

    // Apply damage to enemies that moved
    shuffled.forEach(enemy => {
      const { row: oldRow, col: oldCol } = originalPositions.get(enemy);
      let newRow = null;
      let newCol = null;

      // Find new position
      for (let r = 0; r < grid.length; r++) {
        const idx = grid[r].indexOf(enemy);
        if (idx !== -1) {
          newRow = r;
          newCol = idx;
          break;
        }
      }

      // If position changed, apply damage
      if (newRow !== oldRow || newCol !== oldCol) {
        enemy.position.row = newRow;
        enemy.position.col = newCol;
        updateEnemiesGrid();
        renderAreaPanel();
        const dmgObject = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage * totalBonus, enemy);
        const dmg = dmgObject.damage;
        damageEnemy(enemy, dmg, this.resonance);
        handleSkillAnimation("earthquake", newRow, newCol);
        showFloatingDamage(newRow, newCol, dmg);
        delete enemy.counters["dark"];; // Consume all counters
      }
    });
    spellHandState.lastHeroSpellResonance = "earth";
    logMessage(`${this.name} shakes the battlefield!`);
  }
},
{
  id: "flush",
  name: "Flush",
  resonance: "physical",
  tier: 2,
  gemCost: 3,
    get skillBaseDamage() {
        return 20 * partyState.heroStats.attack;
    },
  description: "Deals physical damage to enemies aligned in rows or columns of three with matching types or elements. Double damage if both match.",
    icon: "../../assets/images/icons/brilliant.png",

  activate: function () {
    if (state.resources.gems < this.gemCost) {
      logMessage(`Cannot afford to cast ${this.name}`);
      return;
    }

    const grid = state.enemies;
    const matchedEnemies = new Set();

    // --- Helper: checks and marks a trio for matching ---
    function checkLine(enemiesInLine) {
      if (enemiesInLine.some(e => !e || e.hp <= 0)) return;

      const [a, b, c] = enemiesInLine;
      const sameType = (a.type === b.type && b.type === c.type);
      const sameElement = (a.elementType === b.elementType && b.elementType === c.elementType);

      if (!sameType && !sameElement) return;

      const dmgMultiplier = sameType && sameElement ? 2 : 1;
      enemiesInLine.forEach(enemy => matchedEnemies.add({ enemy, dmgMultiplier }));
    }

    // --- Check all rows ---
    for (let row = 0; row < 3; row++) {
      checkLine(grid[row]);
    }

    // --- Check all columns ---
    for (let col = 0; col < 3; col++) {
      checkLine([grid[0][col], grid[1][col], grid[2][col]]);
    }

    // --- Apply damage ---
    matchedEnemies.forEach(({ enemy, dmgMultiplier }) => {
      // Find position
      let row = null, col = null;
      for (let r = 0; r < grid.length; r++) {
        const c = grid[r].indexOf(enemy);
        if (c !== -1) {
          row = r;
          col = c;
          break;
        }
      }

      if (row !== null && col !== null) {
        const skillDamageObject = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage * dmgMultiplier, enemy);
        const dmg = skillDamageObject.damage;
        damageEnemy(enemy, dmg, this.resonance);
        handleSkillAnimation("flush", row, col);
        showFloatingDamage(row, col, dmg);
        renderAreaPanel();
      }
    });

    if (matchedEnemies.size === 0) {
      logMessage(`${this.name} found no aligned enemies.`);
    } else {
        shakeScreen(500, 5); // duration: 1000ms, intensity: 10px
        logMessage(`${this.name} strikes matched enemies with crushing force!`);
    }
    spellHandState.lastHeroSpellResonance = "physical";
  }
  
},
{
  id: "destroyUndead",
  name: "Destroy Undead",
  resonance: "light",
  tier: 3,
  gemCost: 3,
  icon: "../../assets/images/icons/brilliant.png",
  get skillBaseDamage() {
    return 50 * partyState.heroStats.attack;
  },
  description: "Smite the undead! If three undead line up in a row or column, they are struck by radiant light and take massive damage.",

  activate: function () {
    if (state.resources.gems < this.gemCost) {
      logMessage(`Cannot afford to cast ${this.name}`);
      return;
    }

    const grid = state.enemies;
    const undeadMatches = new Set();

    // Helper: finds undead trios
    function checkUndeadLine(enemiesInLine) {
      if (enemiesInLine.some(e => !e || e.hp <= 0)) return;
      if (enemiesInLine.every(e => e.type === "undead")) {
        enemiesInLine.forEach(e => undeadMatches.add(e));
      }
    }

    // Check all rows
    for (let row = 0; row < grid.length; row++) {
      checkUndeadLine(grid[row]);
    }

    // Check all columns
    for (let col = 0; col < grid[0].length; col++) {
      checkUndeadLine([grid[0][col], grid[1][col], grid[2][col]]);
    }

    if (undeadMatches.size === 0) {
      logMessage(`No undead formations to destroy. Spell replaced`);
      replaceSpell(); // cycle the spell out if no undead clusters found
      return;
    }

    // 🔸 Holy flash animation
    flashScreen("white", 700);
    shakeScreen(500, 5);

    // 🔹 Damage scaling
    const holyMultiplier = 2.5; // because it’s “Destroy Undead”, it *hurts*
    const base = this.skillBaseDamage * holyMultiplier;

    // Apply damage
    undeadMatches.forEach(enemy => {
      let row = null, col = null;
      for (let r = 0; r < grid.length; r++) {
        const c = grid[r].indexOf(enemy);
        if (c !== -1) {
          row = r;
          col = c;
          break;
        }
      }

      if (row !== null && col !== null) {
        const skillDamageObject = calculateHeroSpellDamage(this.resonance, base, enemy);
        const dmg = skillDamageObject.damage;
        damageEnemy(enemy, dmg, this.resonance);
        handleSkillAnimation("destroyUndead", row, col);
        showFloatingDamage(row, col, dmg, "#fffbe0"); // light glow
        console.log(`${this.name} deals ${dmg} to undead at (${row}, ${col})`);
        renderAreaPanel();
      }
    });
    spellHandState.lastHeroSpellResonance = "light";
    logMessage(`${this.name} incinerates the undead with divine light!`);
  }
},
{
  id: "haste",
  name: "Haste",
  resonance: "fire",
  tier: 1,
  gemCost: 1,
  description: "Maxes out all party members' attack speed for a short duration.",
  icon: "../../assets/images/icons/inferno.png",
  duration: 8, // seconds — base duration
  unlocked: true,
  active: false,
  remaining: 0,

  activate: function () {
    if (state.resources.gems < this.gemCost) {
      logMessage(`Not enough gems to cast ${this.name}`);
      return;
    }
    // Duration logic (double if previous spell was fire)
    let duration = this.duration;
    if (spellHandState.lastHeroSpellResonance === "fire") {
      duration *= 2;
      logMessage("🔥 Fire synergy! Haste duration doubled!");
    }

    // Track spell used
    spellHandState.lastHeroSpellResonance = this.resonance;

    // Apply visual
    applyVisualEffect("air-flash", 0.8);
    logMessage(`✨ ${this.name} activated!`);

    // Activate buff
    this.active = true;
    this.remaining = duration;

    // Apply buff to party
    partyState.party.forEach(member => {
      if (!member.stats) member.stats = {};
      member.stats._originalSpeed = member.stats.speed || 1;
      member.stats.speed = 9999; // effectively max speed
    });

    // Register buff for delta tracking
    if (!partyState.activeHeroBuffs) partyState.activeHeroBuffs = [];
    const existingBuff = partyState.activeHeroBuffs.find(b => b.id === this.id);
    if (!existingBuff) {
      partyState.activeHeroBuffs.push({
        id: this.id,
        remaining: this.remaining,
        onExpire: () => {
          // Restore original speed
          partyState.party.forEach(member => {
            if (member.stats && member.stats._originalSpeed != null) {
              member.stats.speed = member.stats._originalSpeed;
              delete member.stats._originalSpeed;
            }
          });
          this.active = false;
          logMessage("⚡ Haste has worn off.");
        },
      });
    }
    spellHandState.lastHeroSpellResonance = "fire";
  },
},


];

export function replaceSpell(){
        // Don’t overfill the hand
      if (spellHandState.hand.length >= spellHandState.maxHandSize) return;
    
      const libraryLevel = getBuildingLevel("library");
      const unlockedSpells = heroSpells.filter(spell => (spell.tier || 1) <= libraryLevel);
    
      if (unlockedSpells.length === 0) return;
      // --- Weighted tiers ---
      const tierWeights = {
        1: 60,
        2: 25,
        3: 10,
        4: 5,
      };
      // Normalize weights for currently unlocked tiers only
      const availableWeights = unlockedSpells.map(spell => tierWeights[spell.tier] || 1);
      const totalWeight = availableWeights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * totalWeight;
    
        let selectedSpell = null;
      for (let i = 0; i < unlockedSpells.length; i++) {
        roll -= availableWeights[i];
        if (roll <= 0) {
          selectedSpell = unlockedSpells[i];
          break;
        }
      }
    
      if (!selectedSpell) selectedSpell = unlockedSpells[0]; // fallback safety
    
      spellHandState.hand.push(selectedSpell.id);
        logMessage(`New hero spell acquired: ${selectedSpell.name}`);
    
      emit("spellHandUpdated");
      updateSpellDock();
}
