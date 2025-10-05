import { state } from "../state.js";
import { getEnemiesInColumn, getRandomEnemy, calculateSkillDamage } from "../systems/combatSystem.js";
import { damageEnemy } from "../waveManager.js";
import { handleSkillAnimation } from "../systems/animations.js";
import { getEnemyCanvasPosition } from "../area.js";
import { floatingTextManager } from "../systems/floatingtext.js";
import { applyDOT } from "../systems/dotManager.js";
import { logMessage } from "../systems/log.js";

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
        spritePath: '../../assets/images/sprites/follow_through.png',  // does not have an animation
        cooldown: 7000,
        class: "fighter",
        activate: function (attacker, target, context) {
            if (!target) return;
            console.log(`[followThrough] ${Date.now()}`);
            // Deal damage to all enemies in target column
            const enemies = getEnemiesInColumn(target.position.col);
           // console.log("[followThrough] activated! target column: ", target.position.col);
           // console.log("[followThrough] enemies: ", enemies);
            enemies.forEach(({ enemy, row, col }) => {
                //console.log('[skill damage] skill base dmg: ', this.skillBaseDamge);
           //   console.log("[followThrough] damaging: ", enemy, attacker.stats.attack);
                const skillDamage = calculateSkillDamage(attacker, this.resonance, this.skillBaseDamage, enemy);
                damageEnemy(row, col, skillDamage.damage);
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
  spritePath: null,
  cooldown: null,
  defaultBonus: 10,
  perLevelBonus: 0.10,
  applyUtility(enemy, attacker) {
    if (!enemy || !attacker) return 0;
    const bonusPercent = this.defaultBonus + (this.perLevelBonus * attacker.level);
    return Math.floor((enemy.maxHp * bonusPercent) / 100);
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
            state.party.forEach(member => {
                if (!member.skills) return;
                
                for (const skillId in member.skills) {
                    const skillDef = abilities.find(a => a.id === skillId);
                    const skillState = member.skills[skillId];
                    
                    if (skillDef.type === "active" && skillDef.cooldown) {
                        // Only reduce the cooldown, don't trigger or reset
                        // Only reduce if cooldown is still active (> 0)
                        // This prevents interfering with updateSkills' transition detection
                        if (skillState.cooldownRemaining > 0) {
                            console.log('[leadership] ', skillId, 'before: ', skillState.cooldownRemaining);
                            skillState.cooldownRemaining = Math.max(0, skillState.cooldownRemaining - amount);
                            console.log('[leadership]: ', skillId, 'after: ', skillState.cooldownRemaining);
                        }
                    
                    }
                }
            });
        }
    }
];


function showFloatingDamage(row, col, skillDamage) {
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
        const bonusDamage = ability.applyUtility(enemy, attacker);
        if (bonusDamage > 0) {
          const bonusSkillDamage = {
            damage: bonusDamage,
            isCritical: false,
            elementalMatchup: "neutral",
          };

          damageEnemy(row, col, bonusDamage);
          showFloatingDamage(row, col, bonusSkillDamage);

          logMessage(
            `${attacker.name}'s ${ability.name} triggers for ${bonusDamage} bonus damage!`,
            "success"
          );
        }
      }
    }
  });
}
