import { state } from "./state.js";
import { on } from "./events.js";
import { logMessage, logSuccess } from "./systems/log.js";
import { formatNumber } from "./systems/math.js";

export function initRender() {
  // Subscribe to resource updates
  on("goldChanged", () => renderResourceBar());
  on("gemsChanged", () => renderResourceBar());

    // Subscribe to recruitment events and log them
  on("classRecruited", (cls) => {
    logSuccess(`You recruited ${cls.name} into your party!`);
    // You could also use cls.name if you prefer:
    // logSuccess(`You recruited ${cls.name} into your party!`);
  });
  on("goldIncomeChanged", (newIncome) => {
    logMessage(`Gold income per second updated: ${newIncome}`);
  });
  on("gemIncomeChanged", (newIncome) => {
    logMessage(`Gem income per second updated: ${newIncome}`);
  });

  // Initial draw
  renderResourceBar();
}

export function renderResourceBar() {
  let displayGold = Math.floor(state.resources.gold);
  displayGold = formatNumber(displayGold);
  document.getElementById("heroLevelResource").textContent = `Hero Level: ${state.heroLevel}`;
  document.getElementById("gold").textContent = `Gold: ${displayGold.text}`;
  document.getElementById("gems").textContent = `Gems: ${state.resources.gems.toFixed(0)}`;
}
