// main.js
import { state } from "./state.js";
import { emit } from "./events.js";
import { initUI } from "./ui.js";
import { startGameLoop } from "./loop.js";
import { initRender } from "./render.js";
import { initPartyPanel } from "./party.js";
import { initBuildingPanel } from "./town.js";
import { initAreaPanel } from "./area.js";
import { initWaveManager } from "./waveManager.js";
import { initMath } from "./systems/math.js";
import {  initCombatSystem } from "./systems/combatSystem.js";
import { initAnimations } from "./systems/animations.js";
import { initQuestSystem, renderQuestPanel } from './questManager.js';
import { initSummonSystem } from "./systems/summonSystem.js";


window.addEventListener("DOMContentLoaded", () => {
  // Initialize all systems
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
  
  // Start the game loop
  startGameLoop();
  
  // Start the first wave after everything is initialized
  setTimeout(() => {
    emit("gameStarted");
  }, 100);
  
  console.log("Game initialized with event-based updates.");
});