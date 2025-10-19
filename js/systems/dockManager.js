import { BUILDING_MENUS } from "../content/buildingMenu.js";
import { AREA_MENUS } from "../area.js";

/*
export const DOCK_TYPES = {
  BUILDING: "building",
  PARTY: "party",
  AREA: "area", // new universal grid context dock
};


export function openDock(type, data) {
  const dock = document.getElementById("mainDock");
  let contentHTML = "";

  switch (type) {
    case DOCK_TYPES.BUILDING:
       // console.log(`building ${type}`);
      //  console.log('data: ', data);
      contentHTML = getBuildingMenu(data);
      break;

    case DOCK_TYPES.PARTY:
      contentHTML = getPartyMenu(data);
      break;

    case DOCK_TYPES.AREA:
      contentHTML = getAreaMenu(data);
      break;

    default:
      contentHTML = `<p>No dock available for this type.</p>`;
  }

  dock.innerHTML = contentHTML;
  dock.classList.add("visible");
  console.log('dock element: ', dock);
}
*/

export const DOCK_TYPES = {
  BUILDING: "building",
  PARTY: "party",
  AREA: "area",
};

const dock = document.getElementById("mainDock");

const state = {
  open: false,
  type: null,
  context: null,         // payload (e.g. { type: "enemy", data: enemy })
  sourcePanel: null,     // e.g. "panelTown"
  sourceEl: null,        // DOM element that opened the dock (so clicks on it won't close)
  persist: false,        // if true, dock doesn't auto-close on panel switch
};

function renderContent() {
  if (!state.type) return `<p>No dock available.</p>`;

  switch (state.type) {
    case DOCK_TYPES.BUILDING:
      return getBuildingMenu(state.context);
    case DOCK_TYPES.PARTY:
      return BUILDING_MENUS.party ? BUILDING_MENUS.party(state.context) : `<p>No party menu</p>`;
    case DOCK_TYPES.AREA:
      return getAreaMenu(state.context);
    default:
      return `<p>No dock available for this type.</p>`;
  }
}

export function openDock(type, context = {}, opts = {}) {
  // opts: { sourcePanel: "panelTown", sourceEl: HTMLElement, persist: false }
  state.type = type;
  state.context = context;
  state.sourcePanel = opts.sourcePanel || null;
  state.sourceEl = opts.sourceEl || null;
  state.persist = !!opts.persist;

  dock.innerHTML = renderContent();
  dock.classList.remove("hidden");
  dock.classList.add("visible");
  dock.setAttribute("data-dock-type", type);
  if (state.sourcePanel) dock.setAttribute("data-source-panel", state.sourcePanel);
  else dock.removeAttribute("data-source-panel");
  state.open = true;
}

function getAreaMenu(context) {
    const dock = document.getElementById("mainDock");
    //console.log('dock element: ', dock);
    //console.log('context: ', context);
  if (context.type === "enemy"){ 
    dock.classList.remove("hidden");
    return AREA_MENUS.enemy(context.data);}
//  if (context.type === "party") return AREA_MENUS.party(context.data);
  if (context.type === "quickSpells") return AREA_MENUS.quickSpells(context.data);
  return `<p>No area context available.</p>`;
}


export function getBuildingMenu(building) {
    //console.log('context: ', building);
  const dock = document.getElementById("mainDock");
  const renderer = BUILDING_MENUS[building.id];
    //console.log(renderer);
  if (renderer) {
    dock.setAttribute("data-building-id", building.id); // ✅ track open building
   // dock.innerHTML = renderer(building);
    dock.classList.remove("hidden");
    // ✅ Prevent clicks inside the dock from closing it
    dock.onclick = (e) => e.stopPropagation();
    return renderer(building);
  } else {
    //dock.innerHTML = `<h3>${building.name}</h3><p>No actions available.</p>`;
    dock.classList.remove("hidden");
    return `<h3>${building.name}</h3><p>No actions available.</p>`;
  }
}

export function closeDock() {
  if (state.sourcePanel === "panelArea"){ 
    openDock(DOCK_TYPES.AREA, { type: "quickSpells"});
    // Add event delegation for quick spell buttons
document.addEventListener('click', (e) => {
  const spellBtn = e.target.closest('.quick-spell-btn');
  if (spellBtn) {
    const spellId = spellBtn.dataset.spellId;
    const spell = heroSpells.find(s => s.id === spellId);
    console.log(`added listener for ${spell.id}`);
    
    if (spell) {
      spell.activate();
      // Optionally refresh the UI after casting
      // updateQuickSpellsUI();
    }
  }
});
  } else {
    console.log(state.sourcePanel);
    state.open = false;
    state.type = null;
    state.context = null;
    state.sourcePanel = null;
    state.sourceEl = null;
    state.persist = false;
    dock.classList.remove("visible");
    dock.classList.add("hidden");
    dock.removeAttribute("data-dock-type");
    dock.innerHTML = "";
  }
}

export function updateDockIfEnemyChanged(updatedEnemy) {
  const dock = document.getElementById("mainDock");

  // Is the dock currently showing an enemy?
  const currentType = dock.getAttribute("data-dock-type");
  if (currentType !== "area") return;

  const areaMenu = dock.querySelector(".area-menu[data-enemy-id]");
  if (!areaMenu) return;

  const currentEnemyId = areaMenu.getAttribute("data-enemy-id");
  if (currentEnemyId !== updatedEnemy.uniqueId) return;

  // Re-render with the new enemy data
  dock.innerHTML = AREA_MENUS.enemy(updatedEnemy);
}


export function toggleDock(type, context = {}, opts = {}) {
  // simple toggle logic: if same dock open - close; else open new
  if (state.open && state.type === type && JSON.stringify(state.context) === JSON.stringify(context)) {
    closeDock();
  } else {
    openDock(type, context, opts);
  }
}

/* ---------- ESC key closes dock ---------- */
document.addEventListener("keydown", (e) => {
  if (!state.open) return;
  if (e.key === "Escape" || e.key === "Esc") {
    closeDock();
  }
});

/* ---------- Click-away handler (single global) ---------- */
/* Logic:
   - If dock not open -> do nothing
   - If click is inside dock -> do nothing
   - If click is on the sourceEl -> do nothing (so repeated clicks on opener don't close immediately)
   - If click is inside the sourcePanel DOM subtree -> do nothing (so interacting with same panel doesn't close)
   - Otherwise close dock.
*/
document.addEventListener("click", (e) => {
  if (!state.open) return;

  const clickEl = e.target;

  // inside dock -> keep open
  if (dock.contains(clickEl)) return;

  // click on opener element -> keep open
  if (state.sourceEl && (state.sourceEl === clickEl || state.sourceEl.contains(clickEl))) return;

  // click inside source panel -> keep open
  if (state.sourcePanel) {
    const panelEl = document.getElementById(state.sourcePanel);
    if (panelEl && panelEl.contains(clickEl)) return;
  }

  // otherwise close
  closeDock();
});