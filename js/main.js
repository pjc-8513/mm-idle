// main.js
import { state, partyState, spellHandState } from "./state.js";
import { updateSpellDock } from "./systems/dockManager.js";
import { heroSpells } from "./content/heroSpells.js";
import { initState } from "./state.js";
import { emit } from "./events.js";
import { initUI } from "./ui.js";
import { startGameLoop } from "./loop.js";
import { initRender } from "./render.js";
import { initPartyPanel } from "./party.js";
import { initBuildingPanel } from "./town.js";
import { initAreaPanel } from "./area.js";
import { initWaveManager } from "./waveManager.js";
import { initMath } from "./systems/math.js";
import { initCombatSystem } from "./systems/combatSystem.js";
import { initAnimations } from "./systems/animations.js";
import { initQuestSystem, renderQuestPanel } from './questManager.js';
import { initSummonSystem } from "./systems/summonSystem.js";
import { initBuildingMenu } from "./content/buildingMenu.js";
import { initSpellbookPanel } from "./spellbookPanel.js";


window.addEventListener("DOMContentLoaded", () => {
  // Initialize all systems
  initState();
  initUI();
  initRender();
  initPartyPanel();
  initBuildingPanel();
  initAreaPanel();
  initSummonSystem();
  initWaveManager(); // Initialize wave management
  initMath(); // Initialize math system
  initCombatSystem(); // Initialize combat system
  initAnimations();
  initQuestSystem();
  initBuildingMenu();
  initSpellbookPanel();
  
  // Start the game loop
  startGameLoop();
  
  // Start the first wave after everything is initialized
  setTimeout(() => {
    emit("gameStarted");
  }, 100);
  
  console.log("Game initialized with event-based updates.");
});

// devHelper.js or near initialization code
window.giveSpell = function (spellId) {
  const spell = heroSpells.find(s => s.id === spellId);
  if (!spell) {
    console.warn(`❌ Spell ID not found: ${spellId}`);
    return;
  }

  if (spellHandState.hand.length >= spellHandState.maxHandSize) {
    console.warn(`⚠️ Hand is full (${spellHandState.maxHandSize})`);
    return;
  }

  spellHandState.hand.push(spell.id);
  console.log(`✨ Added spell to hand: ${spell.name} (Tier ${spell.tier})`);
  emit("spellHandUpdated");
  updateSpellDock();
};
