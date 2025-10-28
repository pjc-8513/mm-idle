import { state, partyState } from "../state.js";
import { emit, on } from "../events.js";
import { getActiveEnemies, getEnemiesInColumn, getEnemiesInRow, getRandomEnemy, calculateSkillDamage } from "../systems/combatSystem.js";
import { damageEnemy } from "../waveManager.js";
import { handleSkillAnimation } from "../systems/animations.js";
import { getEnemyCanvasPosition } from "../area.js";
import { floatingTextManager } from "../systems/floatingtext.js";
import { applyDOT } from "../systems/dotManager.js";
import { logMessage } from "../systems/log.js";
import { addWaveTime, addTimeShield } from "../area.js";
import { applyVisualEffect } from "../systems/effects.js";
//import { createVampireMist, createRadiantBurst, createRadiantPulse, spawnRadiantBurst } from "../systems/radiantEffect.js";
import { calculatePercentage } from "../systems/math.js";

on("summonExpired", handleSummonExpired);

function handleSummonExpired(summon){
  if (summon.name === "Vampire") {
    console.log("handling vampire expired"); 
    
    // ✅ Find the ability in the array first
    const feastOfAges = abilities.find(a => a.id === "feastOfAges");
    
    // ✅ Then call the function on that ability
    if (feastOfAges && feastOfAges.onVampireExpire) {
      feastOfAges.onVampireExpire(summon);
    }
  } else if (summon.name === "Ghost Dragon") {
    console.log("handling ghost dragon expired");
    const soulDetonation = abilities.find(a => a.id === "soulDetonation");
    if (soulDetonation && soulDetonation.onGhostDragonExpire){
      soulDetonation.onGhostDragonExpire(summon);
    }
  }
}

export const abilities = [
    {
        id: "pummel",
        name: "Pummel",
        type: "passive",
        class: "fighter",
        description: "Adds bonus damage % in physical damage per attack to base damage until target changes",
        spritePath: null,  // does not have an animation
        cooldown: null, // passive skills do not have cooldown
        defaultBonus: 1,
        perLevelBonus: 0.10,
        applyPassive: function (attacker, target, context) {
            // e.g. increase damage if same target
            if (context.sameTargetStreak > 0) {
                const finalBonus = this.defaultBonus + (attacker.level * this.perLevelBonus);
                context.damage *= Math.round(1 + context.sameTargetStreak * finalBonus);
            }
        }        
    },
    {
        id: "followThrough",
        name: "Follow Through",
        type: "active",
        resonance: "physical",
        skillBaseDamage: 180,
        //description: `Deals ${skillBaseDamage}% of attack in physical damage to every enemy on the same column as target`,
        spritePath: '../../assets/images/sprites/follow_through.png',
        cooldown: 7000,
        class: "fighter",
        activate: function (attacker, target, context) {
            if (!target) return;
            //console.log(`[followThrough] ${Date.now()}`);
            // Deal damage to all enemies in target column
            const enemies = getEnemiesInColumn(target.position.col);
           // console.log("[followThrough] activated! target column: ", target.position.col);
           // console.log("[followThrough] enemies: ", enemies);
            enemies.forEach(({ enemy, row, col }) => {
                //console.log('[skill damage] skill base dmg: ', this.skillBaseDamge);
           //   console.log("[followThrough] damaging: ", enemy, attacker.stats.attack);
                const skillDamage = calculateSkillDamage(attacker, this.resonance, this.skillBaseDamage, enemy);
                damageEnemy(enemy, skillDamage.damage, this.resonance);
                handleSkillAnimation("followThrough", row, col);
                showFloatingDamage(row, col, skillDamage); // show floating text
            });
        }
          
    },    
    {
        id: "speedBoost",
        name: "Speed Boost",
        type: "passive",
        description: "Gains 10% attack speed after 3 attacks on the same target",
        spritePath: null,
        cooldown: null,
        defaultBonus: 0.10,
        class: "fighter"        
    },
    {
        id: "weakSpot",
        name: "Weak Spot",
        type: "passive",
        class: "rogue",
        description: "Adds bonus damage to critical hits per physical counter on enemy",
        spritePath: null,  // does not have an animation
        cooldown: null, // passive skills do not have cooldown
        defaultBonus: 5,
        perLevelBonus: 0.10,
        applyPassive: function (attacker, target, context) {
            // Ensure counters and level are valid
            const physicalCounters = target.counters.physical || 0;
            if (context.isCrit && target.counters && attacker.level !== undefined &&
                physicalCounters > 0) {                
                const finalBonus = (this.defaultBonus * (attacker.level * this.perLevelBonus)) * physicalCounters;
                context.damage *= finalBonus;
                console.log(`[Rogue weak spot] Physical counters: ${physicalCounters} finalBonus: ${finalBonus} context.damage: ${context.damage}`);
                // Reset physical counters
                target.counters.physical = 0; // Or delete target.counters.physical;
            }
        }        
    },

{
  id: "poisonFlask",
  name: "Poison Flask",
  type: "active",
  resonance: "poison",
  skillBaseDamage: 700,
  spritePath: "../../assets/images/sprites/poison_flask.png",
  cooldown: 8500,
  class: "rogue",
  activate: function (attacker, target, context) {
    if (!target) return;

    const randomEnemyObject = getRandomEnemy();
    if (!randomEnemyObject) return;

    const { enemy, row, col } = randomEnemyObject;

    const skillDamage = calculateSkillDamage(
      attacker,
      this.resonance,
      this.skillBaseDamage,
      enemy
    );

    applyDOT(enemy, "poison", skillDamage, 6, attacker);

    // 🧩 Apply all linked utility effects automatically
    applyUtilityEffects(attacker, this.id, enemy, row, col);

    handleSkillAnimation("poisonFlask", row, col);
  }
},

{
  id: "lethalDose",
  name: "Lethal Dose",
  type: "utility",
  class: "rogue",
  affects: ["poisonFlask"], // 💡 declares its target skills
  description: "Adds % of enemy's total health to poison flask skill as instant damage.",
  resonance: "poison",
  spritePath: null,
  cooldown: null,
  defaultBonus: 20,
  perLevelBonus: 0.10,
    applyUtility(enemy, attacker) {
        if (!enemy || !attacker) return { bonusPercent: 0, resonance: this.resonance };

        // Step 1: Calculate total percent damage
        // Example: at level 50 -> 20 + (0.1 * 50) = 25%
        const totalPercent = partyState.elementalDmgModifiers.poison + this.defaultBonus + (this.perLevelBonus * attacker.level);

        // Step 2: Convert to HP-based damage
        // e.g. 25% of enemy max HP
        const bonusDamage = enemy.maxHp * (totalPercent / 100);

        return { 
            bonusDamage,             // absolute HP-based damage
            percent: totalPercent,   // for reference/logging
            resonance: this.resonance
        };
    }
},

{
    id: "leadership",
    name: "Leadership",
    type: "passive",
    class: "knight",
    description: "Reduces all skill cooldowns by a small amount on autoattack.",
    spritePath: null,
    cooldown: null,
    defaultBonus: 200, // milliseconds reduced per auto-attack
    perLevelBonus: 10, // additional ms per level
    applyPassive: function (attacker) {
        const amount = this.defaultBonus + (attacker.level * this.perLevelBonus);
        // Simply reduce cooldowns - let updateSkills handle the rest
        partyState.party.forEach(member => {
            if (!member.skills) return;
            
            for (const skillId in member.skills) {
                const skillDef = abilities.find(a => a.id === skillId);
                const skillState = member.skills[skillId];

                // ✅ Add defensive check
                if (!skillDef) {
                    console.warn(`[leadership] Skill definition not found for: ${skillId}`);
                    continue;
                }
                
                if (skillDef.type === "active" && skillDef.cooldown) {
                    // Only reduce the cooldown, don't trigger or reset
                    // Only reduce if cooldown is still active (> 0)
                    // This prevents interfering with updateSkills' transition detection
                    if (skillState.cooldownRemaining > 0) {
                       // console.log('[leadership] ', skillId, 'before: ', skillState.cooldownRemaining);
                        skillState.cooldownRemaining = Math.max(0, skillState.cooldownRemaining - amount);
                       // console.log('[leadership]: ', skillId, 'after: ', skillState.cooldownRemaining);
                    }
                
                }
            }
        });
    }
    },
    {
        id: "flameArch",
        name: "Flame Arch",
        type: "active",
        resonance: "fire",
        skillBaseDamage: 200,
        //description: `Deals ${skillBaseDamage}% of attack in fire damage to every enemy on the same row as target`,
        spritePath: '../../assets/images/sprites/flame_arch.png',
        cooldown: 6500,
        class: "knight",
        activate: function (attacker, target, context) {
            if (!target) return;
            
            // Deal damage to all enemies in target column
            const enemies = getEnemiesInRow(target.position.row);
           // console.log("[followThrough] activated! target column: ", target.position.col);
           // console.log("[followThrough] enemies: ", enemies);
            enemies.forEach(({ enemy, row, col }) => {
                //console.log('[skill damage] skill base dmg: ', this.skillBaseDamge);
           //   console.log("[followThrough] damaging: ", enemy, attacker.stats.attack);
                const skillDamage = calculateSkillDamage(attacker, this.resonance, this.skillBaseDamage, enemy);
                damageEnemy(enemy, skillDamage.damage, this.resonance);
                handleSkillAnimation("flameArch", row, col);
                showFloatingDamage(row, col, skillDamage); // show floating text
            });
        }
    },
    {
        id: "zombieAmbush",
        name: "Zombie Ambush",
        type: "active",
        resonance: "undead",
        skillBaseDamage: 180,
        //description: `Deals ${skillBaseDamage}% of attack in undead damage to every enemy on the same column as target`,
        spritePath: '../../assets/images/sprites/zombie_ambush.png',
        cooldown: 3500,
        class: "zombie",
        activate: function (attacker, target, context) {
            const randomEnemyObject = getRandomEnemy();
            if (!randomEnemyObject) return;
            const { enemy, enemyRow, enemyCol } = randomEnemyObject;
            //console.log(`[followThrough] ${Date.now()}`);
            // Deal damage to all enemies in target column
           // console.log('[zombieAmbush] enemy: ', enemy);
            const enemies = getEnemiesInColumn(enemy.position.col);
           // console.log("[zombieAmbush] activated! target column: ", enemy.position.col);
           // console.log("[zombieAmbush] enemies: ", enemies);
            enemies.forEach(({ enemy, row, col }) => {
                //console.log('[skill damage] skill base dmg: ', this.skillBaseDamge);
           //   console.log("[followThrough] damaging: ", enemy, attacker.stats.attack);
                const skillDamage = calculateSkillDamage(attacker, this.resonance, this.skillBaseDamage, enemy);
                damageEnemy(enemy, skillDamage.damage, this.resonance);
                handleSkillAnimation("zombieAmbush", row, col);
                showFloatingDamage(row, col, skillDamage); // show floating text
                applyUtilityEffects(attacker, this.id, enemy, row, col);
            });
        }
          
    },
  {
    id: "plague",
    name: "Plague",
    type: "utility",
    class: "zombie",
    affects: ["zombieAmbush"],
    description: "Has a chance to apply poison DOT to enemies hit by Zombie Ambush.",
    spritePath: null,
    cooldown: null,
    defaultBonus: 200,
    perLevelBonus: 0.25,
    resonance: "poison",
    applyUtility(enemy, attacker) {
      if (!enemy || !attacker) return { bonusDamage: 0, resonance: this.resonance };

      const chancePercent = 10 + attacker.level; // 10% base + 1% per level
      const roll = Math.random() * 100;

      if (roll <= chancePercent) {
        const bonusPercent = partyState.elementalDmgModifiers.poison + this.defaultBonus + (this.perLevelBonus * attacker.level);
        const finalDamage = Math.round((bonusPercent / 100) * partyState.heroStats.attack);
        const skillDamage = calculateSkillDamage(attacker, this.resonance, finalDamage, enemy);

        applyDOT(enemy, this.resonance, skillDamage, 8, attacker);

        logMessage(`${attacker.name}'s ${this.name} infects ${enemy.name} with poison!`, "info");
      //  console.log(`[Plague] DOT applied to ${enemy.name}: ${finalDamage} poison over 8s`);
      }

      // Return zero bonusDamage to avoid triggering extra damage logic
      return { bonusDamage: 0, resonance: this.resonance };
    }
},
// content/abilities.js
{
  id: "heal",
  name: "Heal",
  type: "passive",
  class: "cleric",
  description: "Restores 5 secs + 1 sec per class level (max 40 secs) to the clock the first time a column is cleared during a wave. Deals radiant damage to all enemies whenever any heal is performed.",
  resonance: "light",
  spritePath: null,
  cooldown: null,
  defaultRestore: 5,
  perLevelBonus: 1,
  skillBaseDamage: 250,
  triggeredThisWave: false, // track per wave

  // Triggered ONLY on column clear (once per wave)
  triggerOnColumnClear: function (context) {
    if (this.triggeredThisWave) return; // only once per wave
    console.log('[cleric] column cleared, triggering heal');
    const cleric = partyState.party.find(c => c.id === "cleric");
    if (!cleric) return;
    
    const restoreAmount = Math.min(this.defaultRestore + cleric.level * this.perLevelBonus, 40);
    addWaveTime(restoreAmount);
    this.triggeredThisWave = true;
    
    // Emit the heal event - this will trigger the damage
    emit("healTriggered", { 
      amount: restoreAmount,
      source: "cleric",
      sourceCharacter: cleric
    });
  },

  // Triggered ANY TIME a heal happens (no wave limit)
  triggerOnHeal: function(healEvent) {
    const cleric = partyState.party.find(c => c.id === "cleric");
    if (!cleric) return;
    
    /*
    // Create radiant pulse effect
    if (state.activePanel === "panelArea"){
      //createRadiantPulse();
      spawnRadiantBurst()
    }
    */

    // Apply light flash effect to all enemies
    if (state.activePanel === 'panelArea') {
      //console.log('light flash');
      applyVisualEffect('light-flash', 0.6);
    }

    // Deal damage to all enemies
    for (let row = 0; row < state.enemies.length; row++) {
      for (let col = 0; col < state.enemies[row].length; col++) {
        const enemy = state.enemies[row][col];
        if (!enemy || enemy.hp <= 0) continue;
        
        const skillDamage = calculateSkillDamage(cleric, this.resonance, this.skillBaseDamage, enemy);
        damageEnemy(enemy, skillDamage.damage, this.resonance);
        
        // Trigger twice on undead
        if (enemy.type === "undead"){
          damageEnemy(enemy, skillDamage.damage, this.resonance);
        }
        //console.log(`[soul cleric] healEvent dealt ${skillDamage.damage}`);      
        showFloatingDamage(row, col, skillDamage);
        enemy.strobeEffect = { duration: 0.4, elapsed: 0 };
        // Radiant burst effect
        /*
        if (state.activePanel === 'panelArea'){
          const pos = getEnemyCanvasPosition(row, col);
          if (pos) {
            createRadiantBurst(pos.x, pos.y);
          }
        }
        */
      }
    }
    
    console.log('[cleric] Radiant damage triggered by heal from:', healEvent.source);
  },
},

    {
        id: "feastOfAges",
        name: "Feast of Ages",
        type: "active",
        resonance: "undead",
        skillBaseDamage: 180,
        //description: `Deals ${skillBaseDamage}% of attack in undead damage to every enemy on the same column as target`,
        spritePath: '../../assets/images/sprites/life_drain.png',
        cooldown: 5000,
        storedHP: 0,
        class: "vampire",
        activate: function (attacker, target, context) {
            const enemies = getActiveEnemies();
            if (!enemies.length) return;
            let totalDrained = 0;
            enemies.forEach(enemy => {
              // Drain 5% of each enemy's current HP
              const drained = (enemy.hp * 0.05) + attacker.stats.attack;
              //console.log(`[vampire] drained each enemy for ${drained}`);
              damageEnemy(enemy, drained, this.resonance);
              totalDrained += drained;
              handleSkillAnimation("feastOfAges", enemy.position.row, enemy.position.col);
              //showFloatingDamage(enemy.position.row, enemy.position.col, skillDamage); // show floating text
              });
          // Store drained HP for later conversion
          //if (!attacker.storedHP) return;
          this.storedHP += totalDrained;

          // Small visual/log feedback
          logMessage(`🩸 Vampire feasts, draining ${Math.round(totalDrained)} HP total.`);
        },

      onVampireExpire: function(summon){
        //console.log("💀 Vampire expires: releasing stored essence.");
          // Convert stored HP into time (e.g., 1s per 500 HP drained)
        const secondsRestored = Math.floor(this.storedHP / 500);
        //console.log(`Vampire returns ${secondsRestored}s of stolen time using ${this.storedHP} worth of storedHP.`);
        if (secondsRestored > 0) {
          addWaveTime(secondsRestored);
          logMessage(`⏳ Vampire returns ${secondsRestored}s of stolen time.`);

          // 🧛 Create the spooky mist effect
          /*
          if (state.activePanel === 'panelArea') {
            createVampireMist(secondsRestored);
          }
          */

          // Emit the heal event - this will trigger the damage
          emit("healTriggered", { 
            amount: secondsRestored,
            source: "vampire",
            sourceCharacter: summon
          });
        }
        this.storedHP = 0;
      }
          
    },
    {
      id: "soulDetonation",
      name: "Soul Detonation",
      type: "onExpire",
      class: "ghostDragon",
      description: "When Ghost Dragon expires, it explodes, dealing undead damage to all enemies based on their undead counters.",
      spritePath: null,
      cooldown: null,
      resonance: "undead",
      defaultBonus: 300, // base % damage per counter
      perLevelBonus: 50, // extra % per level
      onGhostDragonExpire: function (summon) {
        const attacker = summon;
        const resonance = this.resonance;
        const basePercent = this.defaultBonus + (this.perLevelBonus * (attacker.level || 1));
        applyVisualEffect('strobe-flash', 0.8);  // Ghost dragon
        //applyVisualEffect('dark-flash', 0.8);

        for (let row = 0; row < state.enemies.length; row++) {
          for (let col = 0; col < state.enemies[row].length; col++) {
            const enemy = state.enemies[row][col];
            if (!enemy || enemy.hp <= 0) continue;

            const undeadStacks = enemy.counters["undead"] || 0;
            if (undeadStacks <= 0) continue;

            const damagePayload = calculateSkillDamage(attacker, resonance, basePercent * undeadStacks, enemy);
            damageEnemy(enemy, damagePayload.damage, resonance);
            //console.log(`[Soul Detonation] Triggered by ${attacker.name}, dealt ${damagePayload.damage} damage based on undead counters.`);
            // Reset undead counters
            enemy.counters["undead"] = 0;
          }
        }

        //console.log(`[Soul Detonation] Triggered by ${attacker.name}, dealt damage based on undead counters.`);
      }
  },
  {
  id: "blindingLight",
  name: "Blinding Light",
  type: "passive",
  class: "templar",
  description: "Creates a time shield whenever any heal is performed.",
  resonance: "light",
  spritePath: null,
  cooldown: null,
  perLevelBonus: 0.5,

  // Triggered ANY TIME a heal happens (no wave limit)
  triggerOnHeal: function(healEvent) {
    const templar = partyState.party.find(c => c.id === "templar");
    if (!templar) return;
    // Apply time shield
    const shieldAmount = Math.min(Math.floor(5 + (this.perLevelBonus * templar.level)), 10); // max 10s
    addTimeShield(shieldAmount);
    //console.log(`[templar] added time shield of ${shieldAmount}s on heal.`);
    
    logMessage(`⏳ Templar gains ${shieldAmount}s time shield from Blinding Light.`, "info");
    }
  },
        
];


export function showFloatingDamage(row, col, skillDamage) {
  if (state.activePanel !== "panelArea") return;
  const pos = getEnemyCanvasPosition(row, col);
  if (!pos) return;

  // 🧩 Normalize: allow passing a number or a full skillDamage object
  const dmgObj = typeof skillDamage === "number"
    ? { damage: skillDamage, isCritical: false, elementalMatchup: "neutral" }
    : skillDamage;

  floatingTextManager.showDamage(
    dmgObj.damage,
    pos.x - 20,
    pos.y - 10,
    dmgObj.isCritical
  );

  if (dmgObj.elementalMatchup !== "neutral") {
    floatingTextManager.showElementalFeedback(
      dmgObj.elementalMatchup,
      pos.x - 20,
      pos.y + 20
    );
  }
}

/*
// utilities.js - if you want to move it to its own module
import { abilities } from "./abilities.js"; // wherever your abilities array lives
import { damageEnemy } from "./combatSystem.js";
import { showFloatingDamage } from "./effects.js";
import { logMessage } from "./log.js";
*/
/**
 * Checks and applies any utility abilities that affect the given skill.
 * @param {object} attacker - The character using the skill.
 * @param {string} skillId - The ID of the skill being activated (e.g. "poisonFlask").
 * @param {object} enemy - The targeted enemy.
 * @param {number} row - Grid row of the enemy.
 * @param {number} col - Grid column of the enemy.
 */
export function applyUtilityEffects(attacker, skillId, enemy, row, col) {
  if (!attacker.skills) return;

  abilities.forEach(ability => {
    if (ability.type === "utility" && ability.affects?.includes(skillId)) {
      const utilityState = attacker.skills[ability.id];
      if (utilityState?.active && typeof ability.applyUtility === "function") {
        const response = ability.applyUtility(enemy, attacker);
        const bonusDamage = response.bonusDamage;
        const resonance = response.resonance;

        if (bonusDamage > 0) {
            /*
          const bonusSkillDamage = {
            damage: bonusDamage,
            isCritical: false,
            elementalMatchup: "neutral",
          };
          */
          const finalDamage = calculateSkillDamage(attacker, resonance, bonusDamage, enemy);
          damageEnemy(enemy, finalDamage.damage);
          showFloatingDamage(row, col, finalDamage);

          logMessage(
            `${attacker.name}'s ${ability.name} triggers for ${finalDamage.damage} bonus damage!`,
            "success"
          );
         // console.log(
         //   `${attacker.name}'s ${ability.name} triggers for ${finalDamage.damage} bonus damage!`);
        }
      }
    }
  });
}
