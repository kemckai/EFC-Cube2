import * as THREE from "./vendor/three.module.js";

const BASE = new URL(".", import.meta.url); // .../js/
const ROOT = new URL("../", BASE); // site root under /efc-cube/

function asset(path) {
  return new URL(path.replace(/^\//, ""), ROOT).href;
}

const FACES = [
  { id: "music", label: "Music", color: "#1a0812", accent: "#ff2d95" },
  { id: "photos", label: "Photos", color: "#140a12", accent: "#f5ebdc" },
  { id: "merch", label: "Merch", color: "#1a0810", accent: "#ff2d95" },
  { id: "gigs", label: "Gigs", color: "#100812", accent: "#f5ebdc" },
  { id: "bio", label: "Band", color: "#160810", accent: "#ff2d95" },
  { id: "connect", label: "Connect", color: "#0c0a0c", accent: "#f5ebdc" },
];

// BoxGeometry material order: +x, -x, +y, -y, +z, -z
const FACE_MAT_ORDER = ["merch", "gigs", "bio", "connect", "music", "photos"];

const TRACKS = [
  { id: "jwb", title: "John War Boots", file: "songs/jwb.mp3", n: "01" },
  { id: "sf", title: "Starfighter Song", file: "songs/Starfighter Song.mp3", n: "02" },
  { id: "ls", title: "Last Swerve", file: "songs/Last Swerve.mp3", n: "03" },
  { id: "mm", title: "Mr Menthol", file: "songs/Mr Menthol.mp3", n: "04" },
];

const PHOTOS = [
  "images/IMG_3083.jpeg",
  "images/IMG_3087.jpeg",
  "images/IMG_3172.jpeg",
  "images/IMG_3173.jpeg",
  "images/14.jpeg",
  "images/15.jpeg",
  "images/16.jpeg",
  "images/Keith.jpeg",
  "images/Bass.jpg",
  "images/drum.jpeg",
  "images/1.jpeg",
  "images/2.jpeg",
  "images/3.jpeg",
  "images/4.jpeg",
];

const prefersReduced =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  new URLSearchParams(location.search).has("list");

/* ---------- state ---------- */
const state = {
  soundOn: false,
  trackIndex: 0,
  playing: false,
  ready: false,
  faceId: "music",
  velX: 0,
  velY: 0,
  targetQuat: null,
  snapping: false,
  bass: 0,
  mid: 0,
  pointerDown: false,
  hintHidden: false,
};

/* ---------- DOM ---------- */
const canvas = document.getElementById("webgl");
const hint = document.getElementById("hint");
const faceLabel = document.getElementById("faceLabel");
const listNavBtn = document.getElementById("listNavBtn");
const fallback = document.getElementById("fallback");

function syncTrackUI(i) {
  // Music panel Play buttons reflect active track
  document.querySelectorAll("#musicPanelBody [data-play]").forEach((btn) => {
    const on = +btn.dataset.play === i;
    const playing = on && state.playing;
    btn.textContent = playing ? "Pause" : "Play";
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(playing));
  });
}

/* ---------- Audio ---------- */
let audioCtx, analyser, audioEl, sourceNode, freqData;

function ensureAudioGraph() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  audioEl = new Audio();
  audioEl.crossOrigin = "anonymous";
  audioEl.preload = "metadata";
  sourceNode = audioCtx.createMediaElementSource(audioEl);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  audioEl.addEventListener("ended", () => {
    state.playing = false;
    syncTrackUI(state.trackIndex);
  });
}

function setTrack(i, { autoplay = false } = {}) {
  state.trackIndex = i;
  syncTrackUI(i);
  ensureAudioGraph();
  const was = !audioEl.paused;
  audioEl.src = asset(TRACKS[i].file);
  audioEl.load();
  if (autoplay || was) play(true);
  else syncTrackUI(i);
}

async function play(force) {
  await unlockAudio();
  ensureAudioGraph();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  if (!force && !audioEl.paused) {
    audioEl.pause();
    state.playing = false;
    syncTrackUI(state.trackIndex);
    return;
  }
  try {
    await audioEl.play();
    state.playing = true;
    state.soundOn = true;
    syncSoundChip();
    syncTrackUI(state.trackIndex);
  } catch (e) {
    console.warn("play blocked", e);
  }
}

function syncSoundChip() {
  if (audioEl) audioEl.muted = !state.soundOn;
}

function sampleAudio() {
  if (!analyser || !state.playing || !state.soundOn) {
    state.bass *= 0.9;
    state.mid *= 0.9;
    return;
  }
  analyser.getByteFrequencyData(freqData);
  let bass = 0,
    mid = 0;
  const n = freqData.length;
  for (let i = 0; i < n; i++) {
    if (i < n * 0.15) bass += freqData[i];
    else if (i < n * 0.5) mid += freqData[i];
  }
  state.bass = bass / (n * 0.15) / 255;
  state.mid = mid / (n * 0.35) / 255;
}




/* Unlock AudioContext on first user gesture (autoplay policy) */
let audioUnlocked = false;
async function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    ensureAudioGraph();
    if (audioCtx.state === "suspended") await audioCtx.resume();
  } catch (e) {
    console.warn("audio unlock", e);
  }
}
["pointerdown", "keydown", "touchstart"].forEach((ev) => {
  window.addEventListener(ev, () => { unlockAudio(); }, { once: true, passive: true });
});

/* ---------- Panels / data ---------- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function openPanel(id) {
  unlockAudio();
  closePanels();
  const el = document.getElementById("panel-" + id);
  if (!el) return;
  el.classList.add("open");
  document.body.classList.add("panel-open");
  // focus close
  el.querySelector("[data-close]")?.focus();
}

function closePanels() {
  document.querySelectorAll(".panel.open").forEach((p) => p.classList.remove("open"));
  document.body.classList.remove("panel-open");
}

document.querySelectorAll("[data-close]").forEach((b) =>
  b.addEventListener("click", closePanels)
);
document.querySelectorAll(".panel").forEach((p) =>
  p.addEventListener("click", (e) => {
    if (e.target === p) closePanels();
  })
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const panelOpen = document.body.classList.contains("panel-open");
    const lightOpen = document.getElementById("lightbox")?.classList.contains("open");
    if (panelOpen || lightOpen) {
      closePanels();
      closeLightbox();
    } else if (document.body.classList.contains("reduced") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Leave forced list view; don't override OS reduced-motion preference auto mode
      enableFallback(false);
    }
  }
  if (document.body.classList.contains("panel-open")) return;
  if (e.key >= "1" && e.key <= "6") {
    const id = FACES[+e.key - 1]?.id;
    if (id) {
      snapToFace(id);
      hideHint();
    }
  }
  if (e.key === "Enter" && state.faceId) openPanel(state.faceId);
});

function populateMusicPanel() {
  const body = document.getElementById("musicPanelBody");
  if (!body) return;
  body.innerHTML = TRACKS.map(
    (t, i) => `<div class="gig-card" style="border-left-color:#ff2d95">
      <div class="when">Track ${t.n}</div>
      <h3>${esc(t.title)}</h3>
      <button type="button" class="buy live" data-play="${i}" style="margin-top:10px">Play</button>
    </div>`
  ).join("");
  body.querySelectorAll("[data-play]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const i = +btn.dataset.play;
      if (state.trackIndex === i && state.playing) {
        play(false); // pause
      } else {
        setTrack(i, { autoplay: true });
      }
    })
  );
  syncTrackUI(state.trackIndex || 0);
}

function populatePhotos() {
  const g = document.getElementById("photoGallery");
  if (!g) return;
  g.innerHTML = PHOTOS.map(
    (src) =>
      `<button type="button" data-src="${esc(src)}"><img src="${esc(asset(src))}" alt="Eugene Fight Club photo" loading="lazy" /></button>`
  ).join("");
  g.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-src]");
    if (b) openLightbox(asset(b.dataset.src));
  });
}

function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  document.getElementById("lightboxImg").src = src;
  lb.classList.add("open");
}
function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
}
document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
document.getElementById("lightbox").addEventListener("click", (e) => {
  if (e.target.id === "lightbox") closeLightbox();
});

async function loadGigs() {
  const up = document.getElementById("gigsUpcoming");
  const pastEl = document.getElementById("gigsPast");
  try {
    const data = await fetch(asset("data/gigs.json")).then((r) => r.json());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const gigs = (data.gigs || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const upcoming = gigs.filter((g) => new Date(g.date + "T23:59:59") >= today);
    const past = gigs.filter((g) => new Date(g.date + "T23:59:59") < today).reverse();
    const card = (g) => {
      const d = new Date(g.date + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return `<article class="gig-card">
        <div class="when">${esc(d)}${g.time ? " · " + esc(g.time) : ""}</div>
        <h3>${esc(g.title || g.venue)}</h3>
        <div><strong>${esc(g.venue)}</strong> · ${esc(g.city)}${g.country ? ", " + esc(g.country) : ""}</div>
        ${g.address ? `<div style="color:var(--muted);font-size:.85rem">${esc(g.address)}</div>` : ""}
        ${g.notes ? `<div style="color:var(--muted);font-size:.85rem;margin-top:4px">${esc(g.notes)}</div>` : ""}
        <div class="source">Source: ${
          g.sourceUrl
            ? `<a href="${esc(g.sourceUrl)}" target="_blank" rel="noopener">${esc(g.source)}</a>`
            : esc(g.source)
        }</div>
        ${
          g.ticketUrl
            ? `<a class="buy live" href="${esc(g.ticketUrl)}" target="_blank" rel="noopener">Listing / tickets</a>`
            : ""
        }
      </article>`;
    };
    if (!upcoming.length) {
      const f = data.follow || {};
      up.innerHTML = `<div class="section-label">Upcoming</div>
        <div class="gigs-empty">
          <strong>No upcoming shows right now</strong>
          Follow for the next Budapest date.
          <div class="follow">
            ${f.ampwall ? `<a href="${esc(f.ampwall)}" target="_blank" rel="noopener">Ampwall</a>` : ""}
            ${f.facebook ? `<a href="${esc(f.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ""}
            ${f.site ? `<a href="${esc(f.site)}" target="_blank" rel="noopener">Site</a>` : ""}
          </div>
        </div>`;
    } else {
      up.innerHTML = `<div class="section-label">Upcoming</div>` + upcoming.map(card).join("");
    }
    pastEl.innerHTML = past.length
      ? `<div class="section-label">Past shows</div>` + past.map(card).join("")
      : "";
  } catch (e) {
    up.innerHTML = `<div class="gigs-empty"><strong>Couldn’t load gigs</strong>${esc(e.message)}</div>`;
  }
}

/** Shopify Buy Button hook stub — wire domain/token/ids later; until then Coming soon */
window.EFC_SHOPIFY = {
  enabled: false,
  domain: "", // e.g. "your-store.myshopify.com"
  storefrontAccessToken: "",
  productIds: {}, // { "tee-mmm": "gid://shopify/Product/..." }
  mount(productId, node) {
    if (!this.enabled || !this.domain || !this.storefrontAccessToken) return false;
    node.dataset.shopifyProduct = productId;
    node.textContent = "Shopify Buy Button placeholder";
    return true;
  },
};

async function loadMerch() {
  const grid = document.getElementById("merchGrid");
  const bar = document.getElementById("merchStoreBar");
  try {
    const data = await fetch(asset("data/merch.json")).then((r) => r.json());
    if (data.storeUrl) {
      bar.style.display = "block";
      bar.innerHTML = `Store: <a href="${esc(data.storeUrl)}" target="_blank" rel="noopener">${esc(data.storeUrl)}</a>`;
    }
    grid.innerHTML = (data.products || [])
      .map((p) => {
        const live = !!(p.productUrl && String(p.productUrl).trim());
        const sizes = (p.sizes || [])
          .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
          .join("");
        const btn = live
          ? `<a class="buy live" href="${esc(p.productUrl)}" target="_blank" rel="noopener">Buy</a>`
          : `<button type="button" class="buy" data-notify="${esc(p.id)}">Coming soon · Notify me</button>`;
        return `<article class="merch-card">
          <img src="${esc(asset(p.image))}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${esc(asset(p.imageFallback || p.image))}';" />
          <div class="body">
            <h3>${esc(p.name)}</h3>
            <div class="meta">${esc(p.type)} · ${(p.colors || []).map(esc).join(" / ")}</div>
            <div class="price">$${Number(p.price).toFixed(2)}</div>
            <p class="meta">${esc(p.description || "")}</p>
            <label class="meta">Size<select>${sizes}</select></label>
            ${btn}
            <div data-shopify-slot="${esc(p.id)}"></div>
          </div>
        </article>`;
      })
      .join("");
    grid.querySelectorAll("[data-notify]").forEach((b) =>
      b.addEventListener("click", () => {
        alert(
          "Merch is print-on-demand and almost ready.\n\nOnce the Fourthwall/Shopify store is live, Buy links in data/merch.json will light up here."
        );
      })
    );
    // Attempt Shopify stub mount (no-op until enabled)
    grid.querySelectorAll("[data-shopify-slot]").forEach((node) => {
      window.EFC_SHOPIFY.mount(node.dataset.shopifySlot, node);
    });
  } catch (e) {
    grid.innerHTML = `<p>Couldn’t load merch (${esc(e.message)})</p>`;
  }
}

/* ---------- Three.js cube ---------- */
let renderer, scene, camera, cube, particles, clock;
let raycaster, pointer, drag = { active: false, lx: 0, ly: 0 };

function drawFaceLabel(ctx, face, size) {
  const S = size || ctx.canvas.width;
  const plateH = Math.round(S * 0.16);
  const plateY = S - plateH - Math.round(S * 0.04);
  const padX = Math.round(S * 0.08);
  // small solid plate — does not veil the photo
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(padX, plateY, S - padX * 2, plateH);
  ctx.strokeStyle = face.accent;
  ctx.lineWidth = Math.max(2, S / 400);
  ctx.strokeRect(padX + 1, plateY + 1, S - padX * 2 - 2, plateH - 2);
  // thin outer edge only
  ctx.strokeStyle = face.accent;
  ctx.lineWidth = Math.max(3, S / 280);
  ctx.strokeRect(Math.round(S * 0.02), Math.round(S * 0.02), Math.round(S * 0.96), Math.round(S * 0.96));
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${Math.round(S * 0.055)}px Segoe UI, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fillText(face.label.toUpperCase(), S / 2, plateY + plateH * 0.42);
  ctx.fillStyle = face.accent;
  ctx.font = `600 ${Math.round(S * 0.022)}px Segoe UI, Helvetica, sans-serif`;
  ctx.fillText("EUGENE FIGHT CLUB", S / 2, plateY + plateH * 0.72);
}

function configureFaceTexture(tex, renderer) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 16;
  tex.needsUpdate = true;
  return tex;
}

function makeFaceTextureFallback(face) {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const ctx = c.getContext("2d");
  ctx.fillStyle = face.color;
  ctx.fillRect(0, 0, S, S);
  drawFaceLabel(ctx, face, S);
  const tex = new THREE.CanvasTexture(c);
  configureFaceTexture(tex, renderer);
  return tex;
}

function loadFaceTexture(face) {
  return new Promise((resolve) => {
    const url = asset(`images/faces/${face.id}.jpg`);
    let settled = false;
    const done = (tex) => {
      if (settled) return;
      settled = true;
      resolve(tex);
    };
    const fail = () => done(makeFaceTextureFallback(face));
    const timer = setTimeout(fail, 4000);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        // WebGL face atlas capped at 1024 for GPU; CSS still uses full-res JPG
        const S = 1024;
        const c = document.createElement("canvas");
        c.width = S; c.height = S;
        const ctx = c.getContext("2d", { alpha: false });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, S, S);
        const scale = Math.max(S / img.width, S / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
        drawFaceLabel(ctx, face, S);
        const out = new THREE.CanvasTexture(c);
        configureFaceTexture(out, renderer);
        clearTimeout(timer);
        done(out);
      } catch (e) {
        console.warn("[EFC] face texture build failed", face.id, e);
        clearTimeout(timer);
        fail();
      }
    };
    img.onerror = () => { clearTimeout(timer); fail(); };
    img.src = url;
  });
}

async function initThree() {
  console.info("[EFC] initThree start");
  // Ensure canvas has layout size before GL init (Safari can report 0 briefly)
  if (!canvas.style.width) canvas.style.width = "100%";
  if (!canvas.style.height) canvas.style.height = "100%";
  const w = Math.max(window.innerWidth, 1);
  const h = Math.max(window.innerHeight, 1);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if ("toneMapping" in renderer) renderer.toneMapping = THREE.NoToneMapping;


  scene = new THREE.Scene();
  scene.fog = null; // keep face photos crisp — no fog wash

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.15, 5.2);
  fitCubeToViewport();

  const amb = new THREE.AmbientLight(0xffffff, 1.05);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(3, 5, 4);
  scene.add(key);
  // soft pink rim for edge accent only — not washing faces
  const rim = new THREE.PointLight(0xff2d95, 0.55, 18);
  rim.position.set(-3, -1, 4);
  scene.add(rim);

  // Create cube immediately (placeholders), then upgrade face maps in background
  const mats = FACE_MAT_ORDER.map((id) => {
    const face = FACES.find((f) => f.id === id);
    return new THREE.MeshBasicMaterial({
      map: makeFaceTextureFallback(face),
      toneMapped: false,
    });
  });
  cube = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), mats);
  scene.add(cube);
  // Non-blocking photo upgrade — never gate interactivity on texture IO
  FACE_MAT_ORDER.forEach((id, i) => {
    const face = FACES.find((f) => f.id === id);
    loadFaceTexture(face).then((map) => {
      const m = mats[i];
      const old = m.map;
      m.map = map;
      m.needsUpdate = true;
      old?.dispose?.();
    }).catch((e) => console.warn("[EFC] face map", id, e));
  });

  // edge glow wire
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cube.geometry),
    new THREE.LineBasicMaterial({ color: 0xff2d95, transparent: true, opacity: 0.35 })
  );
  cube.add(edges);

  // particles
  const count = 600;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 28;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  particles = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xf5ebdc, size: 0.03, transparent: true, opacity: 0.45 })
  );
  scene.add(particles);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  clock = new THREE.Clock();

  window.addEventListener("resize", onResize);
  bindPointer();
  animate();
  console.info("[EFC] initThree done");
}


function fitCubeToViewport() {
  if (!camera) return;
  const h = Math.max(window.innerHeight, 1);
  const w = Math.max(window.innerWidth, 1);
  // No bottom dock — keep cube larger / closer
  let z = 4.8;
  if (h < 560) z = 5.6;
  if (w < 700) z = Math.max(z, 5.2);
  camera.position.z = z;
  if (cube) {
    const s = h < 560 ? 0.92 : 1;
    cube.userData.baseScale = s;
  }
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = Math.max(window.innerWidth, 1) / Math.max(window.innerHeight, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(Math.max(window.innerWidth, 1), Math.max(window.innerHeight, 1));
  fitCubeToViewport();
}

function bindPointer() {
  const el = canvas;
  const down = (x, y) => {
    drag.active = true;
    drag.lx = x;
    drag.ly = y;
    state.pointerDown = true;
    state.snapping = false;
    el.classList.add("grabbing");
    hideHint();
  };
  const move = (x, y) => {
    if (!drag.active) return;
    const dx = x - drag.lx;
    const dy = y - drag.ly;
    drag.lx = x;
    drag.ly = y;
    state.velY += dx * 0.005;
    state.velX += dy * 0.005;
  };
  const up = () => {
    drag.active = false;
    state.pointerDown = false;
    el.classList.remove("grabbing");
  };

  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    down(e.clientX, e.clientY);
  });
  el.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
  el.addEventListener("pointerup", (e) => {
    const dx = Math.abs(e.clientX - (drag.startX ?? e.clientX));
    up();
  });
  el.addEventListener("pointercancel", up);

  el.addEventListener("pointerdown", (e) => {
    drag.startX = e.clientX;
    drag.startY = e.clientY;
  });
  el.addEventListener("pointerup", (e) => {
    const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    if (dist < 6) onClickFace(e.clientX, e.clientY);
  });

  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      state.velX += e.deltaY * 0.0008;
      state.velY += e.deltaX * 0.0008;
      hideHint();
    },
    { passive: false }
  );
}

function onClickFace(cx, cy) {
  pointer.x = (cx / window.innerWidth) * 2 - 1;
  pointer.y = -(cy / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(cube, false);
  if (!hits.length) return;
  const faceIdx = hits[0].face.materialIndex;
  const id = FACE_MAT_ORDER[faceIdx];
  snapToFace(id, () => openPanel(id));
}

function faceNormalWorld(id) {
  const idx = FACE_MAT_ORDER.indexOf(id);
  const locals = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];
  return locals[idx].clone();
}

function snapToFace(id, done) {
  state.faceId = id;
  faceLabel.innerHTML = `<span>${FACES.find((f) => f.id === id).label}</span>`;
  if (cssMode) {
    const map = { music: [ -18, 0 ], photos: [ -18, 180 ], merch: [ -18, -90 ], gigs: [ -18, 90 ], bio: [ -90, 0 ], connect: [ 90, 0 ] };
    const [x, y] = map[id] || [-18, 32];
    cssRot.x = x; cssRot.y = y; setCssTransform();
    if (done) setTimeout(done, 180);
    return;
  }
  // rotate cube so face normal points toward camera (0,0,1 in view roughly)
  const local = faceNormalWorld(id);
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(local, new THREE.Vector3(0, 0, 1));
  state.targetQuat = q;
  state.snapping = true;
  state.velX = 0;
  state.velY = 0;
  if (done) state._snapDone = done;
}

function updateFaceFromOrientation() {
  // which face points most toward camera
  const camDir = new THREE.Vector3(0, 0, 1);
  let best = -1,
    bestId = state.faceId;
  FACE_MAT_ORDER.forEach((id, i) => {
    const n = faceNormalWorld(id).applyQuaternion(cube.quaternion);
    const d = n.dot(camDir);
    if (d > best) {
      best = d;
      bestId = id;
    }
  });
  if (bestId !== state.faceId) {
    state.faceId = bestId;
    faceLabel.innerHTML = `<span>${FACES.find((f) => f.id === bestId).label}</span>`;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  sampleAudio();

  if (!prefersReduced && cube) {
    if (state.snapping && state.targetQuat) {
      cube.quaternion.slerp(state.targetQuat, 1 - Math.pow(0.001, dt));
      if (cube.quaternion.angleTo(state.targetQuat) < 0.01) {
        cube.quaternion.copy(state.targetQuat);
        state.snapping = false;
        const cb = state._snapDone;
        state._snapDone = null;
        if (cb) setTimeout(cb, 120);
      }
    } else if (!state.pointerDown) {
      // inertia
      cube.rotation.y += state.velY;
      cube.rotation.x += state.velX;
      state.velY *= 0.94;
      state.velX *= 0.94;
      // gentle auto spin when nearly still
      if (Math.abs(state.velX) + Math.abs(state.velY) < 0.002) {
        cube.rotation.y += dt * 0.15;
      }
      updateFaceFromOrientation();
    } else {
      cube.rotation.y += state.velY;
      cube.rotation.x += state.velX;
      state.velY *= 0.85;
      state.velX *= 0.85;
    }

    // audio reactive pulse
    const base = cube.userData.baseScale || 1;
    const pulse = base * (1 + state.bass * 0.12 + state.mid * 0.04);
    cube.scale.setScalar(pulse);
    // no emissive pulse — keeps face photos crisp

    if (particles) {
      particles.rotation.y += dt * 0.02;
      particles.material.opacity = 0.3 + state.mid * 0.4;
    }

    renderer.render(scene, camera);
  }
}

listNavBtn?.addEventListener("click", () => enableFallback(true));
document.getElementById("backToCube")?.addEventListener("click", () => enableFallback(false));

function enableFallback(on) {
  document.body.classList.toggle("reduced", !!on);
  if (fallback) fallback.hidden = !on;
  if (listNavBtn) {
    listNavBtn.classList.toggle("active", !!on);
    listNavBtn.setAttribute("aria-pressed", String(!!on));
  }
  if (on && fallback) {
    fallback.querySelectorAll("[data-open]").forEach((b) => {
      b.onclick = () => openPanel(b.dataset.open);
    });
    document.getElementById("backToCube")?.focus();
  } else {
    // restore cube visibility / interaction
    closePanels();
    listNavBtn?.focus();
  }
}

function hideHint() {
  if (state.hintHidden) return;
  state.hintHidden = true;
  hint.classList.add("hide");
}

/* ---------- CSS-3D fallback cube ---------- */
const cssStage = document.getElementById("cssCubeStage");
const cssCube = document.getElementById("cssCube");
let cssRot = { x: -18, y: 32 };
let cssMode = false;

function setCssTransform() {
  if (!cssCube) return;
  const tr = `rotateX(${cssRot.x}deg) rotateY(${cssRot.y}deg)`;
  cssCube.style.transform = tr;
  cssCube.style.webkitTransform = tr;
}

function enableCssCube(reason) {
  cssMode = true;
  state.renderMode = "css3d";
  document.body.classList.add("css-mode");
  if (cssStage) {
    cssStage.hidden = false;
    cssStage.setAttribute("aria-hidden", "false");
  }
  if (canvas) canvas.style.visibility = "hidden";
  setCssTransform();
  bindCssPointer();
  console.warn("[EFC] Using CSS-3D cube:", reason || "fallback");
}

function bindCssPointer() {
  if (!cssStage || cssStage.dataset.bound) return;
  cssStage.dataset.bound = "1";
  let dragging = false, lx = 0, ly = 0;
  cssStage.addEventListener("pointerdown", (e) => {
    dragging = true;
    lx = e.clientX; ly = e.clientY;
    cssStage.setPointerCapture(e.pointerId);
    hideHint();
  });
  cssStage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    cssRot.y += dx * 0.4;
    cssRot.x -= dy * 0.4;
    cssRot.x = Math.max(-80, Math.min(80, cssRot.x));
    setCssTransform();
  });
  cssStage.addEventListener("pointerup", () => { dragging = false; });
  cssStage.addEventListener("click", (e) => {
    const face = e.target.closest(".face");
    if (face?.dataset.face) {
      state.faceId = face.dataset.face;
      faceLabel.innerHTML = `<span>${FACES.find((f) => f.id === face.dataset.face).label}</span>`;
      openPanel(face.dataset.face);
    }
  });
  // auto spin
  (function spin() {
    if (cssMode && !dragging && !document.body.classList.contains("panel-open")) {
      cssRot.y += 0.25;
      setCssTransform();
    }
    requestAnimationFrame(spin);
  })();
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/* ---------- boot ---------- */
function softPreload() {
  // Non-blocking: photos + JSON only. Never wait on MP3 (Safari stalls).
  const files = [
    ...PHOTOS.slice(0, 4).map((p) => asset(p)),
    asset("data/gigs.json"),
    asset("data/merch.json"),
  ];
  files.forEach((url) => {
    if (url.endsWith(".json")) {
      fetch(url).catch(() => {});
    } else {
      const img = new Image();
      img.src = url;
    }
  });
}

async function startRenderer() {
  if (prefersReduced) {
    enableFallback(true);
    return "list";
  }
  if (!webglAvailable()) {
    enableCssCube("WebGL unavailable");
    return "css3d";
  }
  try {
    await initThree();
    // Probe: if context lost immediately, fall back
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      enableCssCube("no GL context after init");
      return "css3d";
    }
    state.renderMode = "webgl";
    return "webgl";
  } catch (e) {
    console.error(e);
    enableCssCube(e.message || "Three.js init failed");
    return "css3d";
  }
}


/* ---------- Contact form ---------- */
function bindContactForm() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");
  if (!form || !status) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.hidden = false;
    status.className = "contact-status";
    status.textContent = "Sending…";
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      subject: String(fd.get("subject") || "").trim(),
      message: String(fd.get("message") || "").trim(),
      company: String(fd.get("company") || "").trim(),
    };
    const btn = form.querySelector(".contact-submit");
    if (btn) btn.disabled = true;
    try {
      const res = await fetch(new URL("api/contact", ROOT).href, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      let data = {};
      try { data = await res.json(); } catch (_) {}
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Send failed (${res.status})`);
      }
      status.className = "contact-status ok";
      status.textContent = "Got it — message saved. We’ll get back to you.";
      form.reset();
    } catch (err) {
      status.className = "contact-status err";
      status.textContent = err.message || "Could not send. Email eugenefightclub@gmail.com instead.";
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

async function boot() {
  populateMusicPanel();
  bindContactForm();
  populatePhotos();
  softPreload();
  loadGigs().catch(console.error);
  loadMerch().catch(console.error);

  // Straight into the cube — no intro gate. Mark ready immediately so UI is never blocked.
  state.ready = true;
  state.soundOn = false;
  syncSoundChip();
  console.info("[EFC] boot start");

  let mode = "css3d";
  try {
    // Don't let a stuck GL init hang the page forever
    mode = await Promise.race([
      startRenderer(),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 6000)),
    ]);
    if (mode === "timeout") {
      console.warn("[EFC] renderer timeout — CSS-3D fallback");
      enableCssCube("renderer timeout");
      mode = "css3d";
    }
  } catch (e) {
    console.error("[EFC] startRenderer", e);
    try { enableCssCube("startRenderer throw"); } catch (_) {}
    mode = "css3d";
  }
  console.info("[EFC] render mode:", mode);
  if (mode === "webgl") {
    // Conservative blank check: only fall back if TWO consecutive center samples are nearly empty.
    // Do not fall back on a single racey read (Safari/Mac can false-positive).
    let blanks = 0;
    const check = (attempt) => {
      if (cssMode) return;
      try {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) { if (attempt >= 1) enableCssCube("gl lost"); return; }
        renderer.render(scene, camera);
        const w = 48, h = 48;
        const px = new Uint8Array(w * h * 4);
        gl.readPixels(Math.floor(canvas.width/2 - w/2), Math.floor(canvas.height/2 - h/2), w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let lit = 0, maxV = 0;
        for (let i = 0; i < px.length; i += 4) {
          const v = px[i] + px[i+1] + px[i+2];
          if (v > maxV) maxV = v;
          if (v > 50) lit++;
        }
        // Require almost totally blank (lit < 3 of 2304) AND max channel sum tiny
        if (lit < 3 && maxV < 25) blanks++;
        else blanks = 0;
        console.info("[EFC] WebGL sample", { attempt, lit, maxV, blanks });
        if (blanks >= 2) enableCssCube("blank WebGL buffer x2 (lit=" + lit + ")");
        else if (attempt < 1) setTimeout(() => check(attempt + 1), 700);
      } catch (e) {
        console.warn("[EFC] buffer check error (keeping WebGL):", e);
        // Do NOT fall back on check exceptions — WebGL may still be fine
      }
    };
    setTimeout(() => check(0), 1000);
  }

}

boot().catch((e) => {
  console.error(e);
  state.ready = true;
  try { enableCssCube("boot failure"); } catch (_) {}
});

// Expose for playwright tests
window.__EFC = {
  snapToFace,
  openPanel,
  closePanels,
  setTrack,
  play,
  FACES,
  TRACKS,
  enableCssCube,
  get state() {
    return state;
  },
  get renderMode() {
    return state.renderMode || (cssMode ? "css3d" : "webgl");
  },
};
