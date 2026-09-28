// The browser example. Plain ES modules, straight from the built package.

import {
  blendFaces,
  faceStateInfo,
  faceStates,
  mountFace,
  mountIdleFace,
  mountRingingFace,
  renderFaceSvg,
  ringingStyleInfo,
  ringingStyles,
} from "../../dist/index.js";

const $ = (id) => document.getElementById(id);
let palette = "light";
let live;
let idle;
let ringing;

function option(value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

// All 36 faces.
function drawGallery() {
  const gallery = $("gallery");
  gallery.replaceChildren();
  for (const state of faceStates) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.innerHTML = renderFaceSvg(state, { size: 96, palette, padding: 0.15 });
    const label = document.createElement("span");
    label.textContent = faceStateInfo(state).label;
    cell.append(label);
    gallery.append(cell);
  }
}

// The blend slider.
for (const state of faceStates) {
  $("morph-from").append(option(state, faceStateInfo(state).label));
  $("morph-to").append(option(state, faceStateInfo(state).label));
}
$("morph-from").value = "calm";
$("morph-to").value = "alarmed";

function drawMorph() {
  const t = Number($("morph-t").value);
  const shape = blendFaces($("morph-from").value, $("morph-to").value, t);
  $("morph").innerHTML = renderFaceSvg(shape, {
    size: 160,
    palette,
    padding: 0.15,
    state: t < 0.5 ? $("morph-from").value : $("morph-to").value,
  });
  $("morph-value").textContent = `t = ${t.toFixed(2)}`;
}
for (const id of ["morph-from", "morph-to", "morph-t"]) $(id).addEventListener("input", drawMorph);

// The live face and its state buttons.
function mountLive(state = "calm") {
  live?.destroy();
  live = mountFace($("live"), { state, size: 160, palette });
}
for (const state of faceStates) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = faceStateInfo(state).label;
  b.dataset.state = state;
  b.setAttribute("aria-pressed", String(state === "calm"));
  b.addEventListener("click", () => {
    live.setState(state);
    for (const other of $("live-states").children) {
      other.setAttribute("aria-pressed", String(other === b));
    }
  });
  $("live-states").append(b);
}

// The idle face.
function mountIdle() {
  idle?.destroy();
  idle = mountIdleFace($("idle"), { size: 160, palette });
}

// Ringing.
$("ringing-style").append(option("shuffle", "Shuffle"));
for (const style of ringingStyles) {
  $("ringing-style").append(option(style, ringingStyleInfo(style).label));
}
$("ringing-style").value = "classic";
function mountRinging() {
  ringing?.destroy();
  ringing = mountRingingFace($("ringing"), { style: $("ringing-style").value, size: 220, palette });
}
$("ringing-style").addEventListener("input", () => ringing.setStyle($("ringing-style").value));

// Light and dark.
function drawAll() {
  const state = live?.state ?? "calm";
  document.body.classList.toggle("dark", palette === "dark");
  $("theme").textContent = palette === "dark" ? "Light palette" : "Dark palette";
  drawGallery();
  drawMorph();
  mountLive(state);
  mountIdle();
  mountRinging();
}
$("theme").addEventListener("click", () => {
  palette = palette === "dark" ? "light" : "dark";
  drawAll();
});

drawAll();
