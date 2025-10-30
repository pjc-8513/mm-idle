import { state, partyState, spellHandState } from "./state.js";
import { renderResourceBar } from "./render.js";
import { emit } from "./events.js";
import { renderPartyPanel } from "./party.js";
import { classes } from "./content/classes.js";
import { buildings } from "./content/buildingDefs.js";
import { abilities } from "./content/abilities.js";
import { combatState, executeAttack, calculateAttackInterval, stopAutoAttack, startAutoAttack } from "./systems/combatSystem.js";
import { floatingTextManager } from './systems/floatingtext.js';
import { renderQuestPanelAnimations } from "./questManager.js";
import { updateDOTs } from "./systems/dotManager.js";
import { updateSummons } from "./systems/summonSystem.js";
import { uiAnimations } from './systems/animations.js';
import { updateSummonTimers, updateWaveTimer } from "./area.js";
import { updateVisualEffects } from "./systems/effects.js";
import { updateTornados } from "./systems/tornadoManager.js";
//import { updateRadiantEffects } from "./systems/radiantEffect.js";
//import { calculateGemIncome } from "./incomeSystem.js";


// Game loop timing

let lastUpdate = Date.now();

export function startGameLoop() {
  function loop() {
    const now = Date.now();
    const delta = (now - lastUpdate) / 1000; // seconds passed
    lastUpdate = now;
    // Initialize floating text manager
    floatingTextManager.initialize('enemyEffectsCanvas');

    update(delta);
    if (state.activeWave) updateSkills(delta);
    render(delta); // Make sure this is called!
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function update(delta) {
  const gemIncome = calculateGemIncome();
 
  if (gemIncome > 0) {
    state.resources.gems += state.resources.gemIncomePerSecond * delta;
    emit("gemsChanged", state.resources.gems);
  }
  // combat updates

  if (combatState.isAutoAttacking) {
    partyState.party.forEach(member => {
      member.attackCooldown -= delta;

      if (member.hasAutoAttack && member.attackCooldown <= 0) {
        executeAttack(member); // Your existing attack logic
        member.attackCooldown = calculateAttackInterval(member) / 1000; // convert ms to seconds
      }
    });
  }
  // Update summons - ADD THIS LINE
  if (state.activeWave) updateSummons(delta);
  
  // update DOTs
  updateDOTs(delta);
  updateVisualEffects(delta); // ADD THIS LINE
  if (partyState.party.length !== 0) updateWaveTimer(delta); // ✅ add this line
    // ✅ Track hero buffs by delta
  if (partyState.activeHeroBuffs && partyState.activeHeroBuffs.length > 0) {
    for (let i = partyState.activeHeroBuffs.length - 1; i >= 0; i--) {
      const buff = partyState.activeHeroBuffs[i];
      buff.remaining -= delta;

      if (buff.remaining <= 0) {
        if (buff.onExpire) buff.onExpire();
        partyState.activeHeroBuffs.splice(i, 1);
      }
    }
  }
  if (state.activeHeroSpells && state.activeHeroSpells.length > 0) {
    for (let i = state.activeHeroSpells.length - 1; i >= 0; i--) {
      const spell = state.activeHeroSpells[i];
      if (spell.update) spell.update(delta);
    }
  }
  
  if (spellHandState.activeTornado) updateTornados(delta);

  // Update sprite animations
  if (state.ui?.spriteAnimations) {
    state.ui.spriteAnimations.update();
  }

  // Update floating text animations
  floatingTextManager.update(delta);

  // UI animations
  //updateRadiantEffects(delta);
  uiAnimations.update(delta);

}

function updateSkills(delta) {
  partyState.party.forEach(member => {
    if (!member.skills) return;

    for (const skillId in member.skills) {
      const skillDef = abilities.find(a => a.id === skillId);
      const skillState = member.skills[skillId];
      //console.log("[loop skill]", member.id, ' ', skillState);
      //console.log("[loop skill update]", member.id, skillId, skillState.cooldownRemaining);
      if (skillDef.type === "active" && skillDef.cooldown &&
        (skillState.active === true)
      ) {
        const previousRemaining = skillState.cooldownRemaining;
        skillState.cooldownRemaining = Math.max(0, skillState.cooldownRemaining - delta * 1000);
        
        // Check if we just crossed zero (was positive, now is zero)
        if ((previousRemaining > 0 && skillState.cooldownRemaining <= 0) || previousRemaining <= 0) {
        //  console.log("[loop skill]", member, skillDef);
          stopAutoAttack();
          emit("skillReady", {member: partyState.party.find(p => p.id === member.id), skillId: skillDef.id});
          skillState.cooldownRemaining = skillDef.cooldown; // reset cooldown
          startAutoAttack();
        }
      }
    }
  });
}


function render(delta) {
  renderResourceBar();
  // If we wanted: auto-refresh Party buttons when gold changes
  // (efficient approach would be event-based, but for now this is fine)
  const activePanel = document.querySelector(".panel.active");
  if (activePanel && activePanel.id === "panelParty") {
    renderPartyPanel();
  }  

  // Update summon timers/bars in area panel (efficient, no full re-render)
  if (activePanel && activePanel.id === "panelArea") {
    updateSummonTimers();
  }

  renderQuestPanelAnimations();

  const canvas = document.getElementById('enemyEffectsCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw everything
  if (state.ui?.spriteAnimations) {
    state.ui.spriteAnimations.draw();
  }

  
  floatingTextManager.render();
}

function calculateGemIncome() {
  let total = 0;
  let lastTotal = state.resources.gemIncomePerSecond || 0;
  
  // Calculate gem income from party members
  partyState.party.forEach(id => {
    const cls = classes.find(c => c.id === id);
    if (cls) total += cls.gemPerSecond || 0;
  });
  
  // Calculate gem income from buildings (multiply by level!)
  state.buildings.forEach(b => {
    const building = buildings.find(bld => bld.id === b.id);
    if (building) {
      total += (building.gemPerSecond || 0) * b.level; // This line too!
    }
  });
  const formattedTotal = parseFloat((Math.floor(total * 100) / 100).toFixed(3));
  state.resources.gemIncomePerSecond = formattedTotal;
  if (formattedTotal !== lastTotal) {
    emit("gemIncomeChanged", total);
  }
  return total;
}