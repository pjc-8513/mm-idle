import { calculateHeroSpellDamage, getActiveEnemies, getEnemiesBasedOnSkillLevel } from '../systems/combatSystem.js';
import { damageEnemy } from '../waveManager.js';
import { handleSkillAnimation } from '../systems/animations.js';
//import { floatingTextManager } from '../systems/floatingtext.js';
import { showFloatingDamage } from './abilities.js';
import { state, partyState } from '../state.js';
import { emit } from '../events.js';
import { logMessage } from '../systems/log.js';
import { applyVisualEffect } from '../systems/effects.js';

export const heroSpells = [
    {
        id: "moonbeam",
        name: "Moonbeam",
        resonance: "dark",
        skillBaseDamage: 80,
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
        }
    },
    {
        id: "brilliantLight",
        name: "Brilliant Light",
        resonance: "light",
        skillBaseDamage: 100,
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
        },
    },
    {
	id: "breathOfDecay",
	name: "Breath of Decay",
	resonance: "undead",
	skillBaseDamage: 180,
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
    },
},

];
