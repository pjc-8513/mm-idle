import { calculateHeroSpellDamage, getActiveEnemies, getEnemiesBasedOnSkillLevel, getEnemiesInColumn, getRandomEnemy } from '../systems/combatSystem.js';
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
import { applyDOT } from "../systems/dotManager.js";
import { spawnTornado } from "../systems/tornadoManager.js";
import { addWaveTime } from '../area.js';

export const heroSpells = [
    {
        id: "moonbeam",
        name: "Moonbeam",
        resonance: "dark",
            get skillBaseDamage() {
            return 3.8 * partyState.totalStats.attack || 90;
        },

        skillLevel: 1,
        gemCost: 3,
        tier: 3,
        unlocked: true,
        description: "Absorbs all counters from enemies, converts them to dark counters, redistributes them randomly, then deals dark damage based on how many each enemy has.",
        icon: "assets/images/icons/moonbeam.png",

        activate: function () {
            
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
                showFloatingDamage(enemy.position.row, enemy.position.col, skillDamageObject);
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
            return 15 * partyState.totalStats.attack || 250;
        },

        skillLevel: 1,
        gemCost: 3,
        tier: 3,
        unlocked: true,
        description: "Convert all active counters to a random counter type, then deals damage based on the type selected.",
        icon: "assets/images/icons/brilliant.png",
        activate: function () {
        
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
            showFloatingDamage(enemy.position.row, enemy.position.col, skillDamageObject);
        });
        spellHandState.lastHeroSpellResonance = "light";
        },
    },
    {
	id: "breathOfDecay",
	name: "Breath of Decay",
	resonance: "undead",
        get skillBaseDamage() {
        return 3.8 * partyState.totalStats.attack || 90;
    },
	skillLevel: 1,
	gemCost: 1,
    tier: 1,
	description: "Deals a small amount of undead to rows of enemies based on skill level.",
	icon: "assets/images/icons/breath.png",
    unlocked: true,
	activate: function () {
    
    applyVisualEffect('dark-flash', 0.8);
    //console.log('Activating Breath of Decay');
	const enemies = getEnemiesBasedOnSkillLevel(this.skillLevel);
    
        enemies.forEach(enemy => {
            //console.log('Damaging enemy: ', enemy);
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
	id: "flashOfSteel",
	name: "Flash of Steel",
	resonance: "physical",
  get skillBaseDamage() {
        return 3.8 * partyState.totalStats.attack || 90;
    },
  get dotDamage() {
      return 3.8 * partyState.totalStats.attack || 90;
  },  
	skillLevel: 1,
	gemCost: 1,
    tier: 1,
	description: "Deals a small amount of undead to rows of enemies based on skill level. Applies a DoT if the last spell cast was physical.",
	icon: "assets/images/icons/flash.png",
    unlocked: true,
	activate: function () {
    
    flashScreen('white', 600);
    
	const enemies = getEnemiesBasedOnSkillLevel(this.skillLevel);
    
        enemies.forEach(enemy => {
            //console.log('Damaging enemy: ', enemy);
            const skillDamage = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage, enemy);
           // console.log(`Calculated skill damage: ${skillDamage.damage}`);
            damageEnemy(enemy, skillDamage.damage, this.resonance);
            //handleSkillAnimation("breathOfDecay", enemy.row, enemy.col);
            showFloatingDamage(enemy.position.row, enemy.position.col, skillDamage); // show floating text
            if (spellHandState.lastHeroSpellResonance === "physical" && enemy.hp > 0) {
                applyDOT(enemy, this.resonance, this.dotDamage, 5);
            }
            if (enemy.hp <= 0) renderAreaPanel();
            });
      spellHandState.lastHeroSpellResonance = "physical";
    },
},
{
  id: "earthquake",
  name: "Earthquake",
  resonance: "earth",
  tier: 4,
  gemCost: 4,
    get skillBaseDamage() {
        return 20 * partyState.totalStats.attack || 300;
    },
  description: "Shuffles all enemies on the grid. Enemies that move take earth damage, increased by your Earth and Physical counters. Consumes all Earth counters.",
    icon: "assets/images/icons/earthquake.webp",
    unlocked: true,

  activate: function () {
    

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
        //handleSkillAnimation("earthquake", newRow, newCol);
        showFloatingDamage(newRow, newCol, dmgObject);
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
  resonance: "water",
  tier: 2,
  gemCost: 3,
    get skillBaseDamage() {
        return 20 * partyState.totalStats.attack || 300;
    },
  description: "Deals water damage to enemies aligned in rows or columns of three with matching types or elements. Double damage if both match.",
    icon: "assets/images/icons/brilliant.png",

  activate: function () {
    

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
        showFloatingDamage(row, col, skillDamageObject);
        renderAreaPanel();
      }
    });

    if (matchedEnemies.size === 0) {
      logMessage(`${this.name} found no aligned enemies.`);
    } else {
        shakeScreen(500, 5); // duration: 1000ms, intensity: 10px
        logMessage(`${this.name} strikes matched enemies with crushing force!`);
    }
    spellHandState.lastHeroSpellResonance = "water";
  }
  
},
{
  id: "destroyUndead",
  name: "Destroy Undead",
  resonance: "light",
  tier: 3,
  gemCost: 3,
  icon: "assets/images/icons/brilliant.png",
  get skillBaseDamage() {
    return 50 * partyState.totalStats.attack || 800;
  },
  description: "Smite the undead! If three undead line up in a row or column, they are struck by radiant light and take massive damage.",

  activate: function () {
    

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
        showFloatingDamage(row, col, skillDamageObject);
        //console.log(`${this.name} deals ${dmg} to undead at (${row}, ${col})`);
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
  icon: "assets/images/icons/inferno.png",
  duration: 8, // seconds — base duration
  unlocked: true,
  active: false,
  remaining: 0,

  activate: function () {
    
    // Duration logic (double if previous spell was fire)
    let duration = this.duration;
    if (spellHandState.lastHeroSpellResonance === "fire") {
      duration *= 2;
      logMessage("🔥 Fire synergy! Haste duration doubled!");
    }

    // Track spell used
    spellHandState.lastHeroSpellResonance = this.resonance;

    // Apply visual
    applyVisualEffect("light-flash", 0.8);
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
{
  id: "starFall",
  name: "Star Fall",
  resonance: "air",
  get skillBaseDamage() {
        return 10 * partyState.totalStats.attack || 150;
    },
  skillLevel: 1,
  gemCost: 5,
  tier: 4,
  unlocked: true,
  description: "Calls down 9 falling stars that each target a random grid position. Empty tiles result in misses.",
  icon: "assets/images/icons/starfall.webp",
  active: false,
  remainingDelay: 0,
  starsRemaining: 0,

  activate: function () {
    
    //applyVisualEffect("air-flash", 1.2);
    applyVisualEffect('light-flash', 0.8);
    logMessage("🌠 Casting Star Fall!");

    this.active = true;
    if (spellHandState.lastHeroSpellResonance === "air") {
      this.starsRemaining = 12;
      logMessage("💨 Air synergy! Star Fall summons 12 stars!");
    } else {
      this.starsRemaining = 9;
    }
    this.remainingDelay = 0.15; // seconds between each star

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);
    spellHandState.lastHeroSpellResonance = this.resonance;  
  },

  update: function (delta) {
    //console.log('Updating Star Fall spell:', this);
    if (!this.active) return;

    this.remainingDelay -= delta;
    if (this.remainingDelay <= 0 && this.starsRemaining > 0) {
      this.castStar();
      this.starsRemaining--;
      this.remainingDelay = 0.15; // next star delay
    }

    if (this.starsRemaining <= 0) {
      this.active = false;
      const idx = state.activeHeroSpells.indexOf(this);
      if (idx !== -1) state.activeHeroSpells.splice(idx, 1);
    }
  },

  castStar: function () {
    const randRow = randInt(0, state.enemies.length - 1);
    const randCol = randInt(0, state.enemies[randRow].length - 1);
    const enemy = state.enemies[randRow][randCol];

    if (enemy && enemy.hp > 0) {
      const tierMultiplier = Math.pow(1.2, this.tier);
      const skillDamage = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage * tierMultiplier, enemy);
      damageEnemy(enemy, skillDamage.damage, this.resonance);
      handleSkillAnimation("followThrough", randRow, randCol);
      showFloatingDamage(randRow, randCol, skillDamage);
      renderAreaPanel();
    } else {
      /*
      showFloatingText("Miss!", randRow, randCol, { color: "#b0c4de" });
      handleSkillAnimation("starFallMiss", randRow, randCol);
      */
      logMessage(`🌠 Star Fall missed at (${randRow}, ${randCol})`);
    }
  },
},
{
  id: "landslide",
  name: "Landslide",
  resonance: "earth",
  tier: 2,
  get skillBaseDamage() {
      return 10 * partyState.totalStats.attack || 150;
  },
  skillLevel: 1,
  gemCost: 3,
  unlocked: true,
  description: "Crushes enemies column by column. If it defeats an enemy, the landslide continues to the next column (max 3).",
  icon: "assets/images/icons/earthquake.webp",

  activate: function () {
    
    spellHandState.lastHeroSpellResonance = this.resonance;
    shakeScreen(500, 5); // duration: 1000ms, intensity: 10px
    logMessage("🌋 Casting Landslide!");

    let columnsChecked = 0;
    let currentColumn = 0;
    const maxColumns = 3;
    let defeatedSomething = false;

    // Find first column with enemies
    while (currentColumn < state.enemies[0].length && getEnemiesInColumn(currentColumn).length === 0) {
      currentColumn++;
    }

    // If we ran out of columns entirely
    if (currentColumn >= state.enemies[0].length) {
      logMessage("The ground rumbles, but there are no enemies to crush!");
      return;
    }

    // Process up to 3 columns
    while (columnsChecked < maxColumns && currentColumn < state.enemies[0].length) {
      const enemies = getEnemiesInColumn(currentColumn);

      if (enemies.length > 0) {
        logMessage(`🪨 Landslide hits column ${currentColumn + 1}!`);
        defeatedSomething = this.hitColumn(enemies) || defeatedSomething;
        columnsChecked++;
      }

      // Continue only if something died
      if (defeatedSomething) {
        currentColumn++;
        defeatedSomething = false;
      } else {
        break;
      }
    }
  },

  hitColumn: function (enemies) {
    let defeated = false;
    enemies.forEach(({ enemy, row, col }) => {
      const tierMultiplier = Math.pow(1.2, this.tier);
      const skillDamage = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage * tierMultiplier, enemy);

      // Apply visual and damage
      showFloatingDamage(row, col, skillDamage);
      const beforeHP = enemy.hp;
      damageEnemy(enemy, skillDamage.damage, this.resonance);

      if (beforeHP > 0 && enemy.hp <= 0) {
        defeated = true;
        renderAreaPanel();
      }
    });
    return defeated;
  },
},
{
  id: "fireball",
  name: "Fireball",
  resonance: "fire",
  get skillBaseDamage() {
    return 10 * partyState.totalStats.attack || 150;
  },
  get dotDamage() {
    return 10 * partyState.totalStats.attack || 150;
  },
  skillLevel: 1,
  gemCost: 3,
  tier: 3,
  unlocked: true,
  description: "Launches a fireball that explodes on impact, dealing fire damage to a 2x2 area around a random enemy.",
  icon: "assets/images/icons/inferno.png",

  activate: function () {
    

    const activeEnemies = getActiveEnemies();
    if (activeEnemies.length === 0) {
      logMessage(`No enemies available for ${this.name}`);
      return;
    }

    // Pick a random active enemy as the explosion origin
    const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    //console.log(`Fireball targets enemy at (${randomEnemy.position.row}, ${randomEnemy.position.col})`);
    let { row, col } = randomEnemy.position;
    //console.log(`Enemy position: row ${row}, col ${col}`);
    const numRows = state.enemies.length;
    const numCols = state.enemies[0].length;

    // Adjust the top-left corner of the 2x2 zone so it stays within bounds
    // The zone covers: (baseRow, baseCol), (baseRow+1, baseCol), (baseRow, baseCol+1), (baseRow+1, baseCol+1)
    let baseRow = row;
    let baseCol = col;

    if (baseRow === numRows - 1) baseRow--; // shift up if on bottom edge
    if (baseCol === numCols - 1) baseCol--; // shift left if on right edge

    // Collect enemies in that adjusted 2x2 zone
    const targets = [];
    for (let r = baseRow; r < baseRow + 2; r++) {
      for (let c = baseCol; c < baseCol + 2; c++) {
        const enemy = state.enemies[r][c];
        if (enemy && enemy.hp > 0) {
          targets.push({ enemy, row: r, col: c });
        }
      }
    }

    // Apply damage + effects
    targets.forEach(({ row, col }) => {
      const enemy = state.enemies[row][col];
      const skillDamageObject = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage, enemy);
      const damage = skillDamageObject.damage;
      damageEnemy(enemy, damage, this.resonance);
      if (spellHandState.lastHeroSpellResonance === "fire") {
        // Apply DOT for 5 seconds
        applyDOT(enemy, "fire", this.dotDamage, 5);
        logMessage(`🔥 Fire synergy! ${this.name} applies burn DOT!`);
      }
      handleSkillAnimation("flameArch", row, col);
      showFloatingDamage(row, col, skillDamageObject);
      if (enemy.hp <= 0) renderAreaPanel();
    });
  spellHandState.lastHeroSpellResonance = this.resonance;  
  },
},
{
  id: "ring_of_fire",
  name: "Ring of Fire",
  resonance: "fire",
  get skillBaseDamage() {
    return 8 * partyState.totalStats.attack || 120;
  },
  get dotDamage() {
    return 8 * partyState.totalStats.attack || 120;
  },
  skillLevel: 1,
  gemCost: 3,
  tier: 2,
  unlocked: true,
  description: "Engulfs the battlefield in flames, dealing fire damage to all enemies on the outer ring of the grid (not the center).",
  icon: "assets/images/icons/inferno.png",
  active: false,
  targets: [],
  currentTargetIndex: 0,
  remainingDelay: 0,

  activate: function () {
    

    const targets = getEnemiesOnOuterRing();

    if (targets.length === 0) {
      logMessage(`No enemies on the outer ring to hit.`);
      return;
    }

    this.targets = targets;
    this.currentTargetIndex = 0;
    this.remainingDelay = 0.2; // seconds between each flame hit
    this.active = true;

    logMessage("🔥 Casting Ring of Fire!");

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);
  },

  update: function (delta) {
    if (!this.active) return;

    this.remainingDelay -= delta;

    if (this.remainingDelay <= 0 && this.currentTargetIndex < this.targets.length) {
      const { row, col } = this.targets[this.currentTargetIndex];
      const enemy = state.enemies[row][col];

      if (enemy && enemy.hp > 0) {
        const skillDamageObject = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage, enemy);
        const damage = skillDamageObject.damage;
        damageEnemy(enemy, damage, this.resonance);
        handleSkillAnimation("flameArch", row, col);
        showFloatingDamage(row, col, skillDamageObject);
        if (spellHandState.lastHeroSpellResonance === "fire") {
          // Apply DOT for 5 seconds
          applyDOT(enemy, "fire", this.dotDamage, 5);
          logMessage(`🔥 Fire synergy! ${this.name} applies burn DOT!`);
        }
        if (enemy.hp <= 0) renderAreaPanel();
      } else {
        logMessage(`🔥 Ring of Fire missed at (${row}, ${col})`);
      }

      this.currentTargetIndex++;
      this.remainingDelay = 0.2;
    }

    if (this.currentTargetIndex >= this.targets.length) {
      this.active = false;
      spellHandState.lastHeroSpellResonance = this.resonance;
      const idx = state.activeHeroSpells.indexOf(this);
      if (idx !== -1) state.activeHeroSpells.splice(idx, 1);
    }
  },
},
{
  id: "reaper",
  name: "Reaper",
  resonance: "undead",
  tier: 4,
  gemCost: 4,
  get skillBaseDamage() {
    return 30 * partyState.totalStats.attack || 500;
  },
  skillLevel: 1,
  unlocked: true,
  description: "The Reaper hunts enemies marked by death. Deals damage to enemies with 5+ undead counters, one by one.",
  icon: "assets/images/icons/breath.png",
  active: false,
  targets: [],
  currentTargetIndex: 0,
  remainingDelay: 0,

  activate: function () {
    

    const activeEnemies = getActiveEnemies();
    const markedTargets = [];

    for (const enemy of activeEnemies) {
      const row = enemy.position.row;
      const col = enemy.position.col;

      //console.log(`Checking enemy at (${row}, ${col}) with undead counters: ${enemy?.counters?.undead || 0}`);

      if (enemy?.counters?.undead >= 5) {
       // console.log(`Reaper found marked enemy at (${row}, ${col}) with ${enemy.counters.undead} undead counters.`);
        markedTargets.push({ row, col });
      }
    }

    if (markedTargets.length === 0) {
      logMessage("💀 The Reaper found no souls marked for harvest. Replacing spell.");
      replaceSpell();
      return;
    }

    this.targets = markedTargets;
    this.currentTargetIndex = 0;
    this.remainingDelay = 0.25; // seconds between each execution
    this.active = true;

    logMessage("☠️ The Reaper begins its grim work...");

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);
    spellHandState.lastHeroSpellResonance = this.resonance;
  },

  update: function (delta) {
    if (!this.active) return;

    this.remainingDelay -= delta;

    if (this.remainingDelay <= 0 && this.currentTargetIndex < this.targets.length) {
      const { row, col } = this.targets[this.currentTargetIndex];
      const enemy = state.enemies[row][col];

      if (enemy && enemy.hp > 0) {
        const tierMultiplier = Math.pow(1.2, this.tier);
        const skillDamage = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage * tierMultiplier, enemy);
        const damage = skillDamage.damage;
        damageEnemy(enemy, damage, this.resonance);
        handleSkillAnimation("lifeDrain", row, col);
        showFloatingDamage(row, col, skillDamage);
        logMessage(`☠️ Reaper strikes enemy at (${row}, ${col})`);
        if (enemy.hp <= 0) renderAreaPanel();
      } else {
        logMessage(`☠️ Reaper missed at (${row}, ${col})`);
      }

      this.currentTargetIndex++;
      this.remainingDelay = 0.25;
    }

    if (this.currentTargetIndex >= this.targets.length) {
      this.active = false;
      const idx = state.activeHeroSpells.indexOf(this);
      if (idx !== -1) state.activeHeroSpells.splice(idx, 1);
    }
  },
},
  {
    id: "tornado",
    name: "Tornado",
    resonance: "air",
    get skillBaseDamage() {
      return 8 * partyState.totalStats.attack || 120;
    },
    skillLevel: 1,
    gemCost: 5,
    tier: 3,
    unlocked: true,
    description: "Summons a roaming tornado that drifts across the grid, spreading counters between enemies.",
    icon: "assets/images/icons/starfall.webp",

    activate: function () {
      

      const enemies = getActiveEnemies();
      if (enemies.length === 0) {
        logMessage("No enemies available to target.");
        return;
      }

      // Pick a random starting enemy
      const start = enemies[Math.floor(Math.random() * enemies.length)];
      
      logMessage(`🌪️ A Tornado begins swirling at (${start.position.row},${start.position.col})!`);
      const skillDamage = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage, start);
      spellHandState.activeTornado = true;
      spawnTornado({
        row: start.position.row,
        col: start.position.col,
        baseDamage: skillDamage.damage,
        duration: 10, // seconds total
        jumpInterval: 1.5, // seconds between jumps
      });

      handleSkillAnimation("tornado", start.position.row, start.position.col);
    },
  },
{
  id: "rot",
  name: "Rot",
  resonance: "undead",
  tier: 3,
  gemCost: 3,
  icon: "assets/images/icons/breath.png",
  get skillBaseDamage() {
      return 18 * partyState.totalStats.attack || 300;
  },
  description: "Attempts to corrupt non-undead enemies, turning them into undead with a 25% chance. Corrupted enemies suffer from a decaying DoT. Bosses are immune.",

  activate: function () {
    
    const grid = state.enemies;
    let infectedCount = 0;
    spellHandState.lastHeroSpellResonance = this.resonance;
    flashScreen("#552244", 600); // purple decay flash

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const enemy = grid[row][col];
        if (!enemy || enemy.hp <= 0) continue;

        // Skip undead and bosses entirely
        if (enemy.type === "undead" || enemy.isBoss) continue;

        // 25% or 35% chance to corrupt
        let corruptionChance = 0.25;
        const necromancer = partyState.party.find(c => c.id === "necromancer");
        if (necromancer) corruptionChance = 0.35;
        if (deterministicChance(corruptionChance)) {
          // Apply DoT *before* changing type
          const skillDamage = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage, enemy);
          applyDOT(enemy, "undead", skillDamage.damage, 5);
          enemy.type = "undead";
          infectedCount++;
          renderAreaPanel();

          //handleSkillAnimation("rot", row, col);
          //showFloatingText(row, col, "☠️", "#bb66ff");
        }
      }
    }

    if (infectedCount > 0) {
      logMessage(`${this.name} spreads corruption to ${infectedCount} enemy${infectedCount > 1 ? "ies" : "y"}!`);
    } else {
      logMessage(`${this.name} fizzles — no new hosts succumb to the rot.`);
    }
  }
},
{
  id: "cure",
  name: "Cure",
  resonance: "light",
  tier: 2,
  gemCost: 2,
  icon: "assets/images/icons/brilliant.png",
  get skillBaseAmount() {
      return 5;
  },
  description: "Recover 5 seconds. Double recovery if the last spell cast was light.",

  activate: function () {
    
    let recoveryAmount = this.skillBaseAmount;
    if (spellHandState.lastHeroSpellResonance === "light") {
      recoveryAmount *= 2;
      logMessage("🌟 Light synergy! Cure recovery doubled!");
    }
    addWaveTime(recoveryAmount);
    logMessage(`⏳ ${this.name} restores ${recoveryAmount} seconds to the wave timer.`);
    spellHandState.lastHeroSpellResonance = this.resonance;
    emit("healTriggered", { 
      amount: recoveryAmount,
      source: "heroSpell",
      sourceCharacter: null
    });
  }
},
{
  id: "sparks",
  name: "Sparks",
  resonance: "air",
  get skillBaseDamage() {
    return 7 * partyState.totalStats.attack || 100;
  },
  gemCost: 3,
  tier: 1,
  unlocked: true,
  description: "Releases 4 spark charges that each strike a random enemy. Consecutive Sparks increase damage.",
  icon: "assets/images/icons/chain.png",

  active: false,
  sparksRemaining: 0,
  remainingDelay: 0,

  activate: function () {
    applyVisualEffect('light-flash', 0.4);
    logMessage("⚡ Casting Spark!");

    // ===== COMBO STACK HANDLING =====
    if (spellHandState.lastHeroSpellId === this.id) {
      spellHandState.sparkComboCount = Math.min(spellHandState.sparkComboCount + 1, 5);
    } else {
      spellHandState.sparkComboCount = 1;
    }

    const comboMult = Math.pow(1.5, spellHandState.sparkComboCount - 1);
    this.currentComboMult = comboMult;

    if (spellHandState.sparkComboCount > 1) {
      logMessage(`⚡ Combo Spark x${spellHandState.sparkComboCount}! Damage ×${comboMult.toFixed(2)}`);
    }

    // Prepare spark volleys
    this.active = true;
    this.sparksRemaining = 4;
    this.remainingDelay = 0; // fire first spark immediately

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);

    spellHandState.lastHeroSpellId = this.id;
    spellHandState.lastHeroSpellResonance = this.resonance;
  },

  update: function (delta) {
    if (!this.active) return;

    this.remainingDelay -= delta;
    if (this.remainingDelay <= 0 && this.sparksRemaining > 0) {
      this.castSpark();
      this.sparksRemaining--;
      this.remainingDelay = 0.12; // delay between sparks
    }

    if (this.sparksRemaining <= 0) {
      this.active = false;
      const i = state.activeHeroSpells.indexOf(this);
      if (i !== -1) state.activeHeroSpells.splice(i, 1);
    }
  },

  castSpark: function () {
    const target = getRandomEnemy(); // your provided function
    if (!target) {
      logMessage("⚡ Spark fizzles — no enemies!");
      return;
    }

    const { enemy, row, col } = target;

    const tierMultiplier = Math.pow(1.2, this.tier);
    const baseDmg = this.skillBaseDamage * tierMultiplier;

    const skillDamageObject = calculateHeroSpellDamage(
      this.resonance,
      baseDmg * this.currentComboMult,
      enemy
    );

    damageEnemy(enemy, skillDamageObject.damage, this.resonance);
    handleSkillAnimation("sparks", row, col);
    showFloatingDamage(row, col, skillDamageObject);
    renderAreaPanel();
  },
},
{
  id: "poisonSpray",
  name: "Poison Spray",
  resonance: "poison",
  get dotDamage() {
    return 5.5 * partyState.totalStats.attack || 110;
  },
  skillLevel: 1,
  gemCost: 1,
  tier: 1,
  unlocked: true,
  description: "A weak poison spray effecting a 2x2 grid.",
  icon: "assets/images/icons/breath.png",

  activate: function () {
    
    const activeEnemies = getActiveEnemies();
    if (activeEnemies.length === 0) {
      logMessage(`No enemies available for ${this.name}`);
      return;
    }

    // Pick a random active enemy as the explosion origin
    const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    //console.log(`Fireball targets enemy at (${randomEnemy.position.row}, ${randomEnemy.position.col})`);
    let { row, col } = randomEnemy.position;
    //console.log(`Enemy position: row ${row}, col ${col}`);
    const numRows = state.enemies.length;
    const numCols = state.enemies[0].length;

    // Adjust the top-left corner of the 2x2 zone so it stays within bounds
    // The zone covers: (baseRow, baseCol), (baseRow+1, baseCol), (baseRow, baseCol+1), (baseRow+1, baseCol+1)
    let baseRow = row;
    let baseCol = col;

    if (baseRow === numRows - 1) baseRow--; // shift up if on bottom edge
    if (baseCol === numCols - 1) baseCol--; // shift left if on right edge

    // Collect enemies in that adjusted 2x2 zone
    const targets = [];
    for (let r = baseRow; r < baseRow + 2; r++) {
      for (let c = baseCol; c < baseCol + 2; c++) {
        const enemy = state.enemies[r][c];
        if (enemy && enemy.hp > 0) {
          targets.push({ enemy, row: r, col: c });
        }
      }
    }

    // Apply damage + effects
    targets.forEach(({ row, col }) => {
      const enemy = state.enemies[row][col];
      const skillDamageObject = calculateHeroSpellDamage(this.resonance, this.dotDamage, enemy);
      const damage = skillDamageObject.damage;
      applyDOT(enemy, "fire", this.dotDamage, 8);
      handleSkillAnimation("poisonFlask", row, col);
      if (enemy.hp <= 0) renderAreaPanel();
    });
  spellHandState.lastHeroSpellResonance = this.resonance;  
  },
},
{
  id: "falconer",
  name: "Falconer",
  resonance: "physical",
  get skillBaseDamage() {
    return 15 * partyState.totalStats.attack || 200;
  },
  get dotDamage() {
    return 8 * partyState.totalStats.attack || 120;
  },
  skillLevel: 1,
  gemCost: 2,
  tier: 2,
  unlocked: true,
  description: "Send a trained falcon to strike the weakest enemy.",
  icon: "assets/images/icons/moonbeam.png",

  activate: function () {
    //applyVisualEffect('slash-flash', 0.4);
    logMessage("🦅 Falconer strikes!");

    const enemies = getActiveEnemies();
    if (!enemies || enemies.length === 0) {
      logMessage("🦅 No enemies to strike.");
      return;
    }

    // Find lowest HP enemy
    const target = enemies.reduce((low, e) => (e.hp < low.hp ? e : low), enemies[0]);
    if (!target) return;

    const row = target.position.row;
    const col = target.position.col;

    const tierMultiplier = Math.pow(1.2, this.tier);
    const baseDamage = this.skillBaseDamage * tierMultiplier;

    const skillDamage = calculateHeroSpellDamage(
      this.resonance,
      baseDamage,
      target
    );

    damageEnemy(target, skillDamage.damage, this.resonance);
    handleSkillAnimation("falconer", row, col);
    showFloatingDamage(row, col, skillDamage);
    if (spellHandState.lastHeroSpellResonance === "physical" && target.hp > 0) {
      applyDOT(target, this.resonance, this.dotDamage, 5);
      }
    if (target.hp <=0) renderAreaPanel();

    spellHandState.lastHeroSpellResonance = this.resonance;
  }
},
{
  id: "frostbite",
  name: "Frostbite",
  resonance: "water",
  get skillBaseDamage() {
    return 15 * partyState.totalStats.attack || 200;
  },
  tier: 1,
  gemCost: 4,
  icon: "assets/images/icons/frostbite.webp",
  description: "Deals heavy water damage but is negated by fire type and fire counters.",

  activate: function () {
    if (state.resources.gems < this.gemCost) {
      logMessage(`Not enough gems to cast ${this.name}.`);
      return;
    }

    const enemies = getActiveEnemies().filter(e => e.elementType !== "fire"); // fire immune
    if (enemies.length === 0) {
      logMessage("No valid targets for Frostbite!");
      return;
    }

    flashScreen("#a0d8f0", 800); // icy blue flash

    enemies.forEach(enemy => {
      const waterCount = enemy.counters["water"] || 0;
      const fireCount = enemy.counters["fire"] || 0;

      // Fire cancels water
      const remaining = Math.max(0, waterCount - fireCount);

      
      const bonus = remaining * 2; // remaining chill intensifies
      const skillDamageObject = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage + bonus, enemy);
      const skillDamage = skillDamageObject.damage;
      damageEnemy(enemy, skillDamage, this.resonance);
      handleSkillAnimation("sparks", enemy.position.row, enemy.position.col);
      showFloatingDamage(enemy.position.row, enemy.position.col, skillDamageObject);
    

    });
    spellHandState.lastHeroSpellResonance = this.resonance;  
    logMessage("❄️ Frostbite chills the battlefield!");
  }
},
{
  id: "dragonsBreath",
  name: "Dragon's Breath",
  resonance: "dark",
  get skillBaseDamage() {
    return 70 * partyState.totalStats.attack || 70;
  },
  skillLevel: 1,
  gemCost: 6,
  tier: 4,
  unlocked: true,
  description: "Highest single target spell. Dragons are immune to its effects.",
  icon: "assets/images/icons/inferno.png",
  activate: function () {
    
    const activeEnemies = getActiveEnemies().filter(e => e.type !== "dragon");
    if (activeEnemies.length === 0) {
      logMessage(`No valid targets for ${this.name}`);
      return;
    }
    // Pick a random active enemy as the target
    const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    const { row, col } = randomEnemy.position;
    const skillDamageObject = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage, randomEnemy);
    damageEnemy(randomEnemy, skillDamageObject.damage, this.resonance);
    handleSkillAnimation("flameArch", row, col);
    showFloatingDamage(row, col, skillDamageObject);
    if (randomEnemy.hp <=0) renderAreaPanel();
    spellHandState.lastHeroSpellResonance = this.resonance;  
    logMessage(`🐉 Dragon's Breath scorches the enemy at (${row}, ${col})!`);
  }
}



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

// Get all enemies on the *outside edge* of the grid (but not center)
function getEnemiesOnOuterRing() {
  const enemies = [];
  const numRows = state.enemies.length;
  const numCols = state.enemies[0].length;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const isEdge = row === 0 || row === numRows - 1 || col === 0 || col === numCols - 1;
      const isCenter = row === Math.floor(numRows / 2) && col === Math.floor(numCols / 2);
      const enemy = state.enemies[row][col];

      if (isEdge && !isCenter && enemy && enemy.hp > 0) {
        enemies.push({ enemy, row, col });
      }
    }
  }
  return enemies;
}

let i = 0;
function deterministicChance(probability) {
  i = (i + 1) % 4; // 4 steps in the cycle
  return i === 0; // 25% chance
}
