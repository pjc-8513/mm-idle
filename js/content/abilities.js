import { state } from "../state.js";
import { getEnemiesInColumn, calculateSkillDamage } from "../systems/combatSystem.js";
import { damageEnemy } from "../waveManager.js";
import { handleSkillAnimation } from "../systems/animations.js";
import { getEnemyCanvasPosition } from "../area.js";
import { floatingTextManager } from "../systems/floatingtext.js";

export const abilities = [
    {
        id: "pummel",
        name: "Pummel",
        type: "passive",
        class: "fighter",
        description: "Adds bonus damage % in physical damage per attack to base damage until target changes",
        spritePath: null,  // does not have an animation
        cooldown: null, // active skills do not have cooldown
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
        skillBaseDamage: 180,
        //description: `Deals ${skillBaseDamage}% of attack in physical damage to every enemy on the same column as target`,
        spritePath: '../../assets/images/sprites/follow_through.png',  // does not have an animation
        cooldown: 7000,
        class: "fighter",
        activate: function (attacker, target, context) {
            if (!target) return;
            console.log("[followThrough] target: ", target);
            // Deal damage to all enemies in target column
            const enemies = getEnemiesInColumn(target.position.col);
           // console.log("[followThrough] activated! target column: ", target.position.col);
           // console.log("[followThrough] enemies: ", enemies);
            enemies.forEach(({ enemy, row, col }) => {
                //console.log('[skill damage] skill base dmg: ', this.skillBaseDamge);
           //   console.log("[followThrough] damaging: ", enemy, attacker.stats.attack);
                const skillDamage = calculateSkillDamage(attacker, this.skillBaseDamage, enemy);
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
    

];


function showFloatingDamage(row, col, skillDamage){
    if (state.activePanel !== "panelArea") return;
    const pos = getEnemyCanvasPosition(row, col);
    //console.log('[skill] target: ', target);
    //console.log('[skill] pos: ', pos);
    if (pos) {
      //  console.log('[skill] showing floating damage');
        // Show damage number
        floatingTextManager.showDamage(
        skillDamage.damage,
        pos.x - 20,
        pos.y - 10, // Slightly above center
        skillDamage.isCritical
        );
        
        // Show elemental effectiveness below the damage
        if (skillDamage.elementalMatchup !== 'neutral') {
        floatingTextManager.showElementalFeedback(
            skillDamage.elementalMatchup,
            pos.x - 20,
            pos.y + 20 // Below the damage number
        );
        }
    }
}