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
        gemCost: 20,
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
            enemy.counters = {}; // Step 2: Clear all counters
            });

            // Step 3: Redistribute as dark counters
            for (let i = 0; i < totalCounters; i++) {
            const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
            randomEnemy.counters["dark"] = (randomEnemy.counters["dark"] || 0) + 1;
            }

            // Step 4: Deal damage and consume counters
            enemies.forEach(enemy => {
            const darkCount = enemy.counters["dark"] || 0;
            const skillDamage = this.skillBaseDamage * darkCount;

            if (darkCount > 0) {
                damageEnemy(enemy.row, enemy.col, skillDamage, this.resonance);
                handleSkillAnimation("moonbeam", enemy.row, enemy.col);
                showFloatingDamage(enemy.row, enemy.col, skillDamage);
            }

            enemy.counters = {}; // Step 5: Consume all counters
            });
            state.resources.gems -= this.gemCost;
            emit("gemChanged", state.resources.gems);
        }
    },
    {
        id: "brilliantLight",
        name: "Brilliant Light",
        resonance: "light",
        skillBaseDamage: 100,
        skillLevel: 1,
        gemCost: 20,
        description: "Convert all active counters to a random counter type, if it is light, consume all counters and deal light damage to all enemies for each light counter they have.",
        icon: "../../assets/images/icons/brilliant.png",
        activate: function () {
        if (state.resources.gems < this.gemCost) {
            logMessage(`Cannot afford to cast ${this.name}`);
            return;
        }
        const enemies = getActiveEnemies();
        const counterTypes = ["fire", "water", "poison", "light", "dark", "air", "undead", "physical"]; // define your game's counter types

        enemies.forEach(enemy => {
            const currentCounters = enemy.counters;
            const totalCounters = Object.values(currentCounters).reduce((sum, val) => sum + val, 0);

            // Convert all counters to a single random type
            const newType = counterTypes[Math.floor(Math.random() * counterTypes.length)];
            enemy.counters = { [newType]: totalCounters };

            // If the new type is "light", apply damage
            if (newType === "light") {
            const lightCount = enemy.counters["light"] || 0;
            const skillDamage = this.skillBaseDamage * lightCount;

            // Consume all counters
            enemy.counters = {};

            // Apply damage and animation
            damageEnemy(enemy.row, enemy.col, skillDamage, this.resonance);
            handleSkillAnimation("brilliantLight", enemy.row, enemy.col);
            showFloatingDamage(enemy.row, enemy.col, skillDamage);
            }
        });
        state.resources.gems -= this.gemCost;
        emit("gemChanged", state.resources.gems);
        },
    },
    {
	id: "breathOfDecay",
	name: "Breath of Decay",
	resonance: "undead",
	skillBaseDamage: 180,
	skillLevel: 1,
	gemCost: 5,
	description: "Deals a small amount of undead to rows of enemies based on skill level.",
	icon: "../../assets/images/icons/breath.png",
	activate: function () {
    if (state.resources.gems < this.gemCost) {
        logMessage(`Cannot afford to cast ${this.name}`);
        return;
    }
    applyVisualEffect('dark-flash', 0.8);
    console.log('Activating Breath of Decay');
	const enemies = getEnemiesBasedOnSkillLevel(this.skillLevel);
    
        enemies.forEach(enemy => {
           // console.log('Damaging enemy: ', enemy);
            const skillDamage = calculateHeroSpellDamage(this.resonance, this.skillBaseDamage, enemy);
           // console.log(`Calculated skill damage: ${skillDamage.damage}`);
            damageEnemy(enemy.row, enemy.col, skillDamage.damage, this.resonance);
            handleSkillAnimation("breathOfDecay", enemy.row, enemy.col);
            showFloatingDamage(enemy.row, enemy.col, skillDamage); // show floating text
            });
        state.resources.gems -= this.gemCost;
        emit("gemChanged", state.resources.gems);
    },
},

];
