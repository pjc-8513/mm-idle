import { state } from "./state.js";
import { renderPartyPanel } from "./party.js";
import { renderBuildingPanel } from "./town.js";
import { renderAreaPanel, setupEnemyEffectsCanvas } from "./area.js";
import { renderQuestPanel } from "./questManager.js";
import { on } from "./events.js";
import { floatingTextManager } from "./systems/floatingtext.js";

export function initUI() {
  // panel switching
  const buttons = document.querySelectorAll("#sidePanel button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-panel");
      showPanel(target);
    });
  });

on("healTriggered", ({ amount }) => {
  if (state.activePanel !== "panelArea") return;
  const timerBar = document.getElementById("waveTimerBar");
  const canvas = document.getElementById("enemyEffectsCanvas");
  if (!timerBar || !canvas) return;

  const rect = timerBar.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // Position floating text above timer
  const x = (rect.left + rect.right) / 2 - canvasRect.left;
  const y = rect.top - canvasRect.top - 20;
  const color = "#7eff7e";

  floatingTextManager.addText(`+${amount}s`, x, y, color, 1200, 28, "normal");

  // 🔆 Add heal pulse animation to the timer bar
  timerBar.classList.add("heal-pulse");
  setTimeout(() => timerBar.classList.remove("heal-pulse"), 1200);
});

  // show default
  document.getElementById("game").classList.add("area-bg");
  showPanel("panelArea");

  // render Party Panel initially
  //  renderPartyPanel();
  // ✅ Toggle log visibility
  const toggle = document.getElementById('log-toggle');
  const log = document.getElementById('log');

  toggle.addEventListener('change', () => {
    console.log('Log toggle changed:', toggle.checked);
    log.style.display = toggle.checked ? 'block' : 'none';
  });
}

export function showPanel(panelId) {
  const panels = document.querySelectorAll(".panel");
  panels.forEach(panel => {
    panel.classList.remove("active");
  });
  document.getElementById(panelId).classList.add("active");

  // Re-render panels on open if needed
  if (panelId === "panelParty") {
    state.activePanel = "panelParty";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("party-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("party-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("party-bg");
    renderPartyPanel();
  }
  if (panelId === "panelTown") {
    state.activePanel = "panelTown";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("town-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("town-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("town-bg");
    renderBuildingPanel();
  }
  if (panelId === "panelArea") {
    state.activePanel = "panelArea";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("area-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("area-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("area-bg");
    if (document.getElementById("enemiesGrid")) return;
    renderAreaPanel();
    setupEnemyEffectsCanvas();

  }
    
  if (panelId === "panelSpellbook") {
    state.activePanel = "panelSpellbook";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("spellbook-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("spellbook-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("spellbook-bg");
  }

  if (panelId === "panelQuest") {
    state.activePanel = "panelQuest";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("spellbook-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("spellbook-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("spellbook-bg");
    renderQuestPanel();
  }
}


// Helper for finding and removing the background element
export function removeBackgroundElement(element) {
  const gameElement = document.getElementById(element);
    gameElement.classList.forEach((className) => {
    if (className.endsWith("-bg")) {
      gameElement.classList.remove(className);
    }
  });
}
