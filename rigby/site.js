// Rigby dataset site: a hash-routed static app over data/*.json (build_site.py), hf/ (the dataset) and media/ (videos).
"use strict";
const S = { clips: [], bodies: [], meta: null, recorded: [], byBody: {}, bodyOf: {}, sideCache: {} };
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nice = s => String(s ?? "").replace(/_/g, " ");
const fmt = (n, d = 0) => n == null ? "–" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
const label = b => (S.bodyOf[b] || {}).label || nice(b);
const ARM = { P: "Primitives", J: "Joint keyframes" };
const CHECK_NAMES = {
  joint_limits: "Joint limits", self_collision: "Self-collision", ground: "Floor penetration", foot_slip: "Planted feet stay put",
  support: "Centre of mass over support", reach: "Targets within reach", ik: "Targets reached (IK)", continuity: "Smooth joint motion",
  wheel_slip: "Wheels roll without slipping", arm_in_object: "Arm clear of objects", program: "Program compiles",
};
const SKILL_ORDER = ["wave", "point", "reach_forward", "trace_circle", "crouch", "turn_in_place", "bow", "twist", "lift_and_hold", "tap_twice", "kick_swing", "step_forward"];

// ------------------------------------------------------------------ video loading: only what is on screen plays
const io = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); }
  else if (!v.paused) v.pause();
}), { rootMargin: "200px" });
function vid(src, cls = "") {
  if (!src) return `<div class="media ${cls}" aria-hidden="true"></div>`;
  return `<div class="media ${cls}"><video data-src="media/${esc(src)}" muted loop playsinline preload="none"></video></div>`;
}
function wireVideos(root = document) { root.querySelectorAll("video[data-src]").forEach(v => io.observe(v)); }

// ------------------------------------------------------------------ boot
async function boot() {
  const [clips, bodies, meta, recorded] = await Promise.all([...["clips", "bodies", "meta"].map(n => fetch(`data/${n}.json?v=${Date.now()}`).then(r => r.json())),
    fetch(`data/recorded.json?v=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => [])]);
  S.clips = clips; S.bodies = bodies; S.meta = meta; S.recorded = recorded || [];
  for (const b of bodies) S.bodyOf[b.body] = b;
  for (const c of clips) (S.byBody[c.body] ||= []).push(c);
  window.addEventListener("hashchange", route);
  route();
}
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [page, ...rest] = h.split("/");
  document.querySelectorAll("[data-nav]").forEach(a => a.setAttribute("aria-current", a.dataset.nav === (page || "home") ? "page" : "false"));
  window.removeEventListener("scroll", heroScroll);
  const app = $("#app");
  if (page === "browse") app.innerHTML = browsePage(new URLSearchParams(rest.join("/")));
  else if (page === "clip") return clipPage(app, rest[0], rest.slice(1).join("/"));
  else if (page === "robot") app.innerHTML = robotPage(rest[0]);
  else if (page === "robots") app.innerHTML = robotsPage();
  else if (page === "recorded") { app.innerHTML = rest.length > 1 ? recordedClipPage(rest.join("/")) : recordedPage(); window.scrollTo(0, 0); }
  else if (page === "get") app.innerHTML = getPage();
  else app.innerHTML = homePage();
  if (page === "browse") wireBrowse();
  if (!page) wireHome();
  wireVideos(app);
  if (!rest.length) window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ home
const PAPER_URL = "";   // the paper's address on arXiv. While this is empty the Paper button is shown dimmed and is not a link.
// First screen: every robot once, mixed, in no order of body plan or skill, all of one size and on one ground.
// g: a generated clip (robot, skill); r: a recorded clip (its id), shown in its light render. Three of the 40 are swimmers.
const FIRST = [
  { r: "astral_monkey/monkey_bars" }, { g: ["franka_emika_panda", "trace_circle"] }, { g: ["astral_kitsune", "wave"] }, { g: ["unitree_h1", "wave"] },
  { r: "astral_shark/bank_recover" }, { g: ["v3_hexapod_s3101", "step_forward"] }, { g: ["boston_dynamics_spot", "bow"] }, { r: "astral_prism_m/grasp_reposition" },
  { g: ["universal_robots_ur5e", "wave"] }, { r: "astral_octopus/arm_handover" }, { g: ["unitree_go2", "trace_circle"] }, { g: ["apptronik_apollo", "point"] },
  { r: "astral_crocodile/bite_release" }, { g: ["mobile_crane", "reach_forward"] }, { g: ["astral_weaver_s", "wave"] }, { g: ["kinova_gen3", "point"] },
  { r: "astral_jellyfish/capture_release" }, { g: ["unitree_g1", "kick_swing"] }, { g: ["astral_ember_f", "wave"] }, { g: ["ufactory_xarm7", "tap_twice"] },
  { g: ["anybotics_anymal_c", "turn_in_place"] }, { r: "astral_serpens_arbor/up_down" }, { g: ["mobile_wheeled_biped", "turn_in_place"] }, { g: ["astral_aegis_t", "wave"] },
  { g: ["mobile_dog_arm_v2", "lift_and_hold"] }, { g: ["astral_vanta_l", "wave"] }, { g: ["kuka_iiwa_14", "lift_and_hold"] }, { r: "astral_manta_ray/arch_passage" },
  { g: ["v3_six_arm_crawler_s3103", "wave"] }, { g: ["booster_t1", "twist"] }, { g: ["unitree_a1", "crouch"] }, { g: ["astral_iguana", "reach_forward"] },
  { g: ["mobile_octopus", "tap_twice"] }, { g: ["zoo_dual_arm", "trace_circle"] }, { g: ["astral_salamander", "lift_and_hold"] }, { g: ["v3_reverse_knee_quadruped_s3104", "kick_swing"] },
  { g: ["v3_hexapod_s20261104", "tap_twice"] }, { g: ["simple_dog", "twist"] }, { g: ["random_gripper_s41", "reach_forward"] }, { g: ["v3_reverse_knee_quadruped_s20261104", "step_forward"] },
];
// The authors, in the paper's order, each with the numbers of their affiliations.
const AFFILS = ["University of Waterloo", "University of Toronto", "NVIDIA", "Simon Fraser University"];
const AUTHORS = [["Zane Beeai", "https://www.zanebeeai.com/", [1]], ["Angelo Wei", "https://www.linkedin.com/in/angelo-wei-a638232a2/", [2]],
  ["Tony Pan", "https://www.tony-pan.com/", [1]], ["Xue Bin Peng", "https://xbpeng.github.io/", [3, 4]],
  ["Russell Buchanan", "https://uwaterloo.ca/mechanical-mechatronics-engineering/profile/r6buchan", [1]], ["Yi Zhou", "https://zhouyisjtu.github.io/", []]];
function authorsHTML() {
  return `<p class="authors">${AUTHORS.map(([n, u, a]) => `<span class="au"><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>${a.length ? `<sup>${a.join(",")}</sup>` : ""}</span>`).join("")}</p>
      <p class="affils">${AFFILS.map((x, i) => `<span><sup>${i + 1}</sup>${esc(x)}</span>`).join("")}</p>`;
}
// The organized grid: animal robots among the others, the livelier skills first.
const GRID_ROWS = ["astral_kitsune", "unitree_h1", "astral_monkey", "unitree_go2", "astral_prism_m", "mobile_dog_arm_v2", "astral_weaver_s", "boston_dynamics_spot"];
const GRID_COLS = ["wave", "kick_swing", "trace_circle", "step_forward", "turn_in_place", "twist", "bow", "lift_and_hold"];
function bestClip(body, skill) {
  const cs = (S.byBody[body] || []).filter(c => c.src === "skill" && c.skill === skill && c.video);
  const score = c => (c.valid ? 4 : 0) + (c.label ? 1 : 0) + (c.arm === "P" ? .5 : 0) - (c.v || 0) * .1;
  return cs.sort((a, b) => score(b) - score(a))[0];
}
const recFind = id => { for (const g of S.recorded) { const c = g.clips.find(k => k.id === id); if (c) return { g, c }; } return null; };
function firstTiles() {
  return FIRST.map((t, i) => {
    const seed = Math.sin((i + 1) * 12.9898 + 78.233) * 43758.5453, z = (seed - Math.floor(seed)).toFixed(3);
    if (t.r) {
      const x = recFind(t.r), v = x && (x.c.video_light || x.c.video); if (!v) return "";
      return `<a class="tile" href="#/recorded/${esc(x.c.id)}" data-z="${z}" aria-label="${esc(x.g.name)}: ${esc(x.c.title)}"><video data-src="media/${esc(v)}" muted loop playsinline preload="none"></video><span class="tl">${esc(x.g.name)}</span></a>`;
    }
    const k = bestClip(t.g[0], t.g[1]); if (!k) return "";
    return `<a class="tile" href="#/clip/${esc(k.id)}" data-z="${z}" aria-label="${esc(label(k.body))}: ${esc(nice(k.skill))}"><video data-src="media/${esc(k.video)}" muted loop playsinline preload="none"></video><span class="tl">${esc(label(k.body).replace(/\s*\(synthetic\)$/, ""))}</span></a>`;
  }).join("");
}
function paperButton() {
  const icon = `<img class="axi" src="arxiv-logo.svg" alt="">`;
  return PAPER_URL ? `<a class="btn ghost" href="${esc(PAPER_URL)}" target="_blank" rel="noopener">${icon}Paper</a>`
    : `<span class="btn ghost soon" aria-disabled="true" title="The paper is not on arXiv yet">${icon}Paper<small>soon</small></span>`;
}
function skillGrid() {
  const rows = GRID_ROWS.filter(b => S.bodyOf[b]), cols = GRID_COLS.filter(s => S.meta.skills.includes(s));
  let t = `<div class="ax corner"></div>` + cols.map(s => `<div class="ax top">${esc(nice(s))}</div>`).join("");
  for (const b of rows) {
    t += `<a class="ax side" href="#/robot/${esc(b)}">${esc(label(b))}</a>`;
    for (const sk of cols) {
      const k = bestClip(b, sk);
      t += k ? `<a class="tile" href="#/clip/${esc(k.id)}" aria-label="${esc(label(b))}, ${esc(nice(sk))}"><video data-src="media/${esc(k.video)}" muted loop playsinline preload="none"></video></a>`
        : `<div class="tile empty" aria-hidden="true"></div>`;
    }
  }
  return `<div class="mx-wrap"><div class="matrix flat" style="grid-template-columns:auto repeat(${cols.length}, minmax(84px, 1fr))">${t}</div></div>`;
}
function homePage() {
  const st = S.meta.stats;
  const valid = (100 * st.valid / Math.max(st.clips, 1)).toFixed(1);
  const only = S.recorded.filter(g => !g.body).length;
  return `
<section class="hero" id="hero">
  <div class="hero-stick">
    <div class="hero-copy wrap">
      <h1><b>Rigby:</b> Motion Primitives for <span class="nb">Cross-Embodiment</span> Skill Transfer</h1>
      ${authorsHTML()}
      <p class="sub"><b>${st.bodies} robots</b>, <b>${fmt(st.clips)} motion clips</b>, generated from nothing but each robot's model: a language model proposes the robot's primitives and composes them into motions. Every frame of every clip passes every physical check.</p>
      <div class="ctas"><a class="btn" href="https://huggingface.co/datasets/${esc(S.meta.hf_repo)}" target="_blank" rel="noopener"><img class="hfi" src="hf-logo.svg" alt="">Download dataset</a><a class="btn ghost" href="#/browse">Browse clips</a>${paperButton()}</div>
    </div>
    <div class="stage" id="stage">
      <div class="plane" id="plane">
        <div class="mosaic" id="matrix">${firstTiles()}</div>
      </div>
    </div>
  </div>
</section>
<section class="band dots">
  <div class="wrap">
    <h2 class="h2">How Rigby generates motions <b>with primitives</b></h2>
    <p class="lede">From the robot model to a checked motion in four steps: the robot's primitives, the program that composes them, and the checks every frame passes. Pick an example; each panel shows the real artefacts for that clip.</p>
    <div class="rail" id="rail"></div>
    <div class="pipe" id="pipe"></div>
  </div>
</section>
<section class="band">
  <div class="wrap">
    <h2 class="h2">One sentence, <b>every robot</b></h2>
    <p class="lede">A skill is asked for in one sentence, and each robot answers it in its own primitives. Click a tile to open the clip.</p>
    ${skillGrid()}
  </div>
</section>
<section class="band dark">
  <div class="wrap">
    <h2 class="h2">One pipeline, <b>every body plan</b></h2>
    <p class="lede">Arms, quadrupeds, humanoids, hexapods, octopuses, wheeled bodies, a crane and animal-inspired robots: each gets its own primitives, measured by forward kinematics, and every clip is composed from them.</p>
    <div class="stats">
      <div class="stat"><b class="num">${fmt(st.clips)}</b><span>motion clips (${fmt(st.skill_clips)} skill, ${fmt(st.taskblind_clips)} task-blind, ${fmt(st.procedural_clips)} procedural)</span></div>
      <div class="stat"><b class="num">${st.bodies}</b><span>robots; the paper's experiments ran on ${st.experiment_bodies} of them, ${st.held_out} held out for the transfer test</span></div>
      <div class="stat"><b class="num">${fmt(st.hours, 1)} h</b><span>of motion at 50 fps (${fmt(st.frames)} frames)</span></div>
      <div class="stat"><b class="num">${fmt(st.primitives)}</b><span>primitives and ${fmt(st.gaits)} gaits, written by the model before any motion is requested</span></div>
      <div class="stat"><b class="num">100%</b><span>of clips pass every physical check on every frame; failing takes were removed</span></div>
      <div class="stat"><b class="num">${st.skills}</b><span>skills, each asked for in one sentence</span></div>
    </div>
  </div>
</section>
<section class="band dots">
  <div class="wrap">
    <h2 class="h2">${st.bodies} robots, <b>one method</b></h2>
    <p class="lede">The pipeline wrote primitives and motions for all ${st.bodies}.${only ? ` Another ${only} robots, swimmers and snakes, are in the dataset with motions recorded in simulation only.` : ""}</p>
    ${robotCards()}
  </div>
</section>
${getSection()}
<footer><div class="wrap">Rigby kinematic motion dataset · built locally from the release folder · clips are kinematic (physically possible poses and contacts), not simulated dynamics · licence CC BY-NC 4.0; for commercial use, contact the authors.</div></footer>`;
}
function robotCards() {
  const gen = S.bodies.map(b => `
    <a class="rcard" href="#/robot/${esc(b.body)}">
      <div class="media">${b.still ? `<img src="media/${esc(b.still)}" alt="" loading="lazy">` : ""}</div>
      <div class="t"><span class="tag ${b.held_out ? "ho" : ""}">${esc(b.kind_label)}${b.held_out ? " · held out" : ""}</span><b>${esc(b.label)}</b>
      <span>${b.nq - (b.free_base ? 7 : 0)} joints · ${b.modes} primitives · ${fmt((b.counts.skill || 0) + (b.counts.taskblind || 0))} skill clips</span></div>
    </a>`);
  // robots that are in the dataset with recorded motions only: among the others, and marked
  const rec = S.recorded.filter(g => !g.body).map(g => { const c = g.clips.find(k => k.video); return `
    <a class="rcard" href="#/robot/${esc(g.page_body)}">
      <div class="media">${c ? `<video data-src="media/${esc(c.video)}" muted loop playsinline preload="none"></video>` : ""}</div>
      <div class="t"><span class="tag ho">recorded motions only</span><b>${esc(g.name)}</b>
      <span>${g.clips.length} motions recorded in simulation</span></div>
    </a>`; });
  return `<div class="robots">${gen.concat(rec).join("")}</div>`;
}
function getSection() {
  const repo = S.meta.hf_repo;
  return `<section class="band dark" id="get">
  <div class="wrap">
    <h2 class="h2">Get the data</h2>
    <p class="lede">Everything is on Hugging Face as plain files: NumPy arrays for the motion, JSON for everything else. Pull one robot or the whole set.</p>
    <div class="gs">
      <div class="stack">
<pre class="code">pip install huggingface_hub numpy

from huggingface_hub import snapshot_download
import json, numpy as np

root = snapshot_download("${esc(repo)}", repo_type="dataset",
    allow_patterns=["index/*", "bodies/unitree_go2.*",
                    "primitives/unitree_go2.json", "clips/unitree_go2/*"])
rows = [json.loads(l) for l in open(f"{root}/index/clips.jsonl")]
go2 = [r for r in rows if r["body"] == "unitree_go2" and r["valid"]]
clip = np.load(f"{root}/{go2[0]['npz']}")
qpos = clip["qpos"]    # (frames, nq) in bodies/unitree_go2.xml's qpos order
print(go2[0]["skill"], qpos.shape, clip["fps"])</pre>
        <a class="btn" style="background:var(--dark-ink);color:var(--dark);border-color:var(--dark-ink);align-self:flex-start" href="https://huggingface.co/datasets/${esc(repo)}" target="_blank" rel="noopener"><img class="hfi" src="hf-logo.svg" alt="">Download dataset</a>
        <p class="licence">Licence: <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">CC BY-NC 4.0</a>, free for non-commercial use with credit. For commercial use, contact the authors through the dataset's <a href="https://huggingface.co/datasets/${esc(repo)}/discussions" target="_blank" rel="noopener">Community tab</a>. Robot models derived from MuJoCo Menagerie keep their own licences.</p>
      </div>
      <div class="files-wrap"><table class="files">
        <tr><td>index/clips.jsonl</td><td>one row per clip: robot, skill, arm, checks, label check, model, tokens, cost, file paths</td></tr>
        <tr><td>clips/&lt;robot&gt;/&lt;skill&gt;_&lt;arm&gt;_v&lt;k&gt;.npz</td><td>qpos, qvel, tip positions, contacts, fps</td></tr>
        <tr><td>clips/…/*.json</td><td>the clip's program, every check with its worst value, repair history, model calls</td></tr>
        <tr><td>procedural/&lt;robot&gt;/*.npz</td><td>gait, balance, drive and random clips made without a model</td></tr>
        <tr><td>imported/&lt;robot&gt;/&lt;task&gt;.*</td><td>motions recorded in simulation, each with the scene it was made in (a separate subset, not pipeline output)</td></tr>
        <tr><td>primitives/&lt;robot&gt;.json</td><td>the robot's primitives and gaits, their coverage, the model that wrote them</td></tr>
        <tr><td>bodies/&lt;robot&gt;.xml, .json</td><td>the MuJoCo model each clip is in, and its measured description</td></tr>
        <tr><td>index/bodies.jsonl, primitives.jsonl</td><td>one row per robot and per primitive</td></tr>
      </table></div>
    </div>
  </div>
</section>`;
}
// hero: tiles start spread in depth with the plane tilted, and settle flat as the hero scrolls past
let heroEls = null;
function heroLayout() {
  const m = $("#matrix"); if (!m) return;
  const vw = window.innerWidth, small = vw < 760;
  const cols = small ? 4 : 8, rows = small ? 6 : 5;
  const w = Math.min(vw * 0.92, 1240), h = window.innerHeight - 56 - 64;
  const tw = Math.max(72, Math.min(216, (w - (cols - 1) * 8) / cols, ((h - (rows - 1) * 8) / rows) * 4 / 3));
  m.style.setProperty("--tw", tw + "px"); m.style.setProperty("--mc", cols);
  m.classList.toggle("small", small);            // a narrow screen: four columns, twenty-four tiles
  [...m.querySelectorAll(".tile")].forEach((t, i) => { t.hidden = small && i >= 24; });
}
function heroScroll() {
  if (!heroEls) return;
  const hero = $("#hero"); if (!hero) return;
  const r = hero.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
  const e = 1 - easeInOut(Math.min(1, p * 1.25));          // explode: 1 at the top, 0 when settled
  heroEls.plane.style.transform = `translateY(${((window.innerWidth < 760 ? 330 : 160) * e).toFixed(1)}px) rotateX(${(50 * e).toFixed(2)}deg) rotateZ(${(-30 * e).toFixed(2)}deg) scale(${(0.86 + 0.14 * (1 - e)).toFixed(3)})`;
  for (const t of heroEls.tiles) t.style.transform = `translateZ(${(e * (40 + t._z * 260)).toFixed(1)}px)`;
  heroEls.copy.style.opacity = String(Math.max(0, 1 - p * 2.2));
  for (const a of heroEls.axes) a.style.opacity = String(Math.max(0, 1 - e * 1.6).toFixed(2));
}
const easeInOut = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
function wireHome() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  heroLayout();
  heroEls = { plane: $("#plane"), copy: $(".hero-copy"), tiles: [...document.querySelectorAll("#matrix .tile")], axes: [...document.querySelectorAll("#matrix .ax")] };
  heroEls.tiles.forEach(t => { t._z = +t.dataset.z; });
  if (reduce) { $("#hero").style.height = "auto"; $(".hero-stick").style.position = "static"; $(".hero-stick").style.height = "auto"; heroEls = null; }
  else { window.addEventListener("scroll", heroScroll, { passive: true }); heroScroll(); }
  window.onresize = () => { heroLayout(); heroScroll(); };
  wireWave(reduce);
  pipeline();
}
function wireWave(reduce) {
  const m = $("#matrix");
  if (!m || reduce || !matchMedia("(hover: hover)").matches) return;
  const tiles = [...m.querySelectorAll(".tile")];
  let raf = 0, px = 0, py = 0;
  const apply = () => {
    raf = 0;
    for (const t of tiles) {
      if (t.hidden) continue;
      const r = t.getBoundingClientRect();
      const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2)) / Math.max(t.offsetWidth, 1);
      const k = Math.exp(-(d * d) / 1.25);                       // 1 under the cursor, about a half one tile away
      t.style.scale = (1 + 0.17 * k).toFixed(3);
      t.style.zIndex = String(Math.round(k * 100));
    }
  };
  m.addEventListener("pointermove", e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(apply); });
  m.addEventListener("pointerleave", () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } for (const t of tiles) { t.style.scale = ""; t.style.zIndex = ""; } });
}
// pipeline showcase
function showcaseClips() {
  const want = [["astral_kitsune", "wave"], ["unitree_h1", "wave"], ["astral_monkey", "trace_circle"], ["unitree_go2", "step_forward"], ["astral_prism_m", "reach_forward"], ["franka_emika_panda", "trace_circle"]];
  return want.map(([b, s]) => bestClip(b, s)).filter(c => c && c.arm === "P").concat(
    want.map(([b, s]) => bestClip(b, s)).filter(c => c && c.arm !== "P")).slice(0, 6);
}
async function pipeline(sel = 0) {
  const ex = showcaseClips(); if (!ex.length) return;
  const rail = $("#rail");
  rail.innerHTML = ex.map((c, i) => `<button class="pill" aria-pressed="${i === sel}" data-i="${i}">${esc(label(c.body))}<span class="c">${esc(nice(c.skill))}</span></button>`).join("");
  rail.querySelectorAll("button").forEach(b => b.onclick = () => pipeline(+b.dataset.i));
  const c = ex[sel], b = S.bodyOf[c.body];
  const side = await sidecar(c);
  const used = usedPrims(side?.program);
  const prims = (b.prims || []).filter(p => used.has(p.name)).concat((b.prims || []).filter(p => !used.has(p.name))).slice(0, 4);
  const checks = Object.entries(side?.filters || {}).filter(([k, v]) => v && typeof v === "object" && "pass" in v);
  $("#pipe").innerHTML = `
    <div class="step"><div class="n">1 · Robot model</div><h3>${esc(b.label)}</h3>
      <div class="media">${b.still ? `<img src="media/${esc(b.still)}" alt="">` : ""}</div>
      <p>${esc(b.origin)} · ${b.nq - (b.free_base ? 7 : 0)} joints · ${esc(b.kind_label.toLowerCase())}. The only input.</p></div>
    <div class="step"><div class="n">2 · Primitives</div><h3>${b.modes} modes, ${b.gaits} gaits</h3>
      <div class="minis">${prims.map(p => `<div class="mini">${vid(p.video)}<span>${esc(p.name)}</span></div>`).join("")}</div>
      <p>Written once per robot by the model, before any motion is requested, and each measured by forward kinematics.${used.size ? " Outlined: used by this clip." : ""}</p></div>
    <div class="step"><div class="n">3 · Program</div><h3>${esc(nice(c.skill))}, ${(side?.program?.keyframes || []).length} keyframes</h3>
      <pre class="code">${esc(programText(side?.program))}</pre>
      <p>The model wrote it from the skill's sentence and the primitive cards${c.repairs ? `, repaired ${c.repairs}×` : ""}.</p></div>
    <div class="step"><div class="n">4 · Checked clip</div><h3>${c.valid ? "Physically possible" : "Fails a check"}</h3>
      ${vid(c.video)}
      <div class="badges">${checks.map(([k, v]) => `<span class="badge ${v.pass ? "ok" : "bad"}">${esc(CHECK_NAMES[k] || nice(k))}</span>`).join("")}</div>
      <a class="btn small ghost" href="#/clip/${esc(c.id)}" style="align-self:flex-start">Open this clip</a></div>`;
  // mark used primitives
  $("#pipe").querySelectorAll(".mini").forEach((m, i) => { if (used.has(prims[i]?.name)) m.querySelector(".media").style.outline = "2px solid var(--accent)"; });
  wireVideos($("#pipe"));
}
function programText(p) {
  if (!p) return "(no program)";
  const kf = (p.keyframes || []).map(k => {
    const parts = [`t=${k.t}`];
    if (k.modes) parts.push(Object.entries(k.modes).map(([n, v]) => `${n}:${v}`).join(" "));
    if (k.joints) parts.push(Object.entries(k.joints).map(([n, v]) => `${n}:${v}`).join(" "));
    if (k.gait) parts.push(`gait ${k.gait.name} ${JSON.stringify(k.gait.cmd ?? "")}`);
    if (k.stance) parts.push(`stance [${k.stance.join(", ")}]`);
    if (k.base) parts.push(`base ${JSON.stringify(k.base)}`);
    return parts.join("  ");
  });
  return `duration ${p.duration_s} s\n` + kf.join("\n");
}
function usedPrims(p) {
  const u = new Set();
  for (const k of (p?.keyframes || [])) { Object.keys(k.modes || {}).forEach(n => u.add(n)); if (k.gait?.name) u.add(k.gait.name); }
  return u;
}
async function sidecar(c) {
  if (S.sideCache[c.id]) return S.sideCache[c.id];
  try { const r = await fetch(`hf/${c.sidecar}`); if (!r.ok) return null; return (S.sideCache[c.id] = await r.json()); } catch { return null; }
}

// ------------------------------------------------------------------ browse
const F = { src: "skill", skill: "", kind: "", body: "", arm: "", valid: "", label: "", q: "", n: 60 };
function browsePage(params) {
  for (const k of Object.keys(F)) if (params.has(k)) F[k] = k === "n" ? +params.get(k) : params.get(k);
  const kinds = [...new Set(S.bodies.map(b => b.kind_label))].sort();
  const skills = SKILL_ORDER.filter(s => S.meta.skills.includes(s));
  const pills = (key, opts) => opts.map(([v, t]) => `<button class="pill" data-k="${key}" data-v="${esc(v)}" aria-pressed="${F[key] === v}">${esc(t)}</button>`).join("");
  return `<div class="wrap page">
  <div class="bhead"><div><h1 class="h2">Every clip</h1></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="count" id="count"></span><button class="btn small ghost" id="rand">Random clip</button></div></div>
  <div class="facets" id="facets">
    <div class="frow"><span class="lab">Source</span>${pills("src", [["skill", "Skill clips"], ["taskblind", "Task-blind"], ["procedural", "Procedural"], ["", "All generated"], ["recorded", "Recorded in simulation"]])}</div>
    <div class="frow"><span class="lab">Skill</span>${pills("skill", [["", "Any"], ...skills.map(s => [s, nice(s)])])}</div>
    <div class="frow"><span class="lab">Body plan</span>${pills("kind", [["", "Any"], ...kinds.map(k => [k, k])])}</div>
    <div class="frow"><span class="lab">Made with</span>${pills("arm", [["", "Any"], ["P", "Primitives"], ["J", "Joint keyframes"]])}</div>
    <div class="frow"><span class="lab">Label check</span>${pills("label", [["", "Label: any"], ["1", "Passes label check"], ["0", "Fails label check"]])}</div>
    <div class="frow"><span class="lab">Robot</span><select class="sel" id="fbody"><option value="">Any robot</option>${S.bodies.map(b => `<option value="${esc(b.body)}" ${F.body === b.body ? "selected" : ""}>${esc(b.label)}</option>`).join("")}</select>
      <input class="search" id="fq" placeholder="Search robot or skill" value="${esc(F.q)}" aria-label="Search"></div>
  </div>
  <div class="grid" id="grid"></div>
  <div class="more"><button class="btn ghost" id="moreb">Show more</button></div>
</div>`;
}
function filtered() {
  const q = F.q.trim().toLowerCase();
  return S.clips.filter(c => (!F.src || c.src === F.src) && (!F.skill || c.skill === F.skill) && (!F.body || c.body === F.body)
    && (!F.kind || S.bodyOf[c.body]?.kind_label === F.kind) && (!F.arm || c.arm === F.arm)
    && (F.valid === "" || String(+!!c.valid) === F.valid) && (F.label === "" || (c.label != null && String(+c.label) === F.label))
    && (!q || `${label(c.body)} ${c.body} ${c.skill || ""} ${c.v ?? ""}`.toLowerCase().includes(q)));
}
function card(c) {
  const b = S.bodyOf[c.body] || {};
  const title = c.src === "skill" ? nice(c.skill) : c.src === "taskblind" ? "task-blind" : nice(String(c.v || "procedural").split(":")[0]);
  const sub = c.src === "procedural" ? nice(c.v) : `${ARM[c.arm] || c.arm} v${c.v}`;
  const badges = [`<span class="badge ${c.valid ? "ok" : "bad"}">${c.valid ? "possible" : (c.failed || [])[0] || "fails"}</span>`];
  if (c.label != null) badges.push(`<span class="badge ${c.label ? "ok" : "mid"}">label ${c.label ? "pass" : "fail"}</span>`);
  return `<a class="card" href="#/clip/${esc(c.id)}">${vid(c.video)}<div class="t"><div class="h"><b>${esc(b.label || c.body)}</b><span>${fmt(c.dur, 1)} s</span></div>
    <div class="h"><b style="font-weight:500">${esc(title)}</b><span>${esc(sub)}</span></div><div class="badges">${badges.join("")}</div></div></a>`;
}
function wireBrowse() {
  const recs = () => { const q = F.q.trim().toLowerCase(); return S.recorded.flatMap(g => g.clips.map(c => ({ g, c }))).filter(x => (!F.body || x.g.body === F.body) && (!q || `${x.g.name} ${x.c.title} ${x.c.task}`.toLowerCase().includes(q))); };
  const draw = () => {
    if (F.src === "recorded") {                  // recorded in simulation: not pipeline output, so the other filters do not apply
      const rs = recs(), g = $("#grid");
      $("#count").textContent = `${rs.length.toLocaleString()} recorded motions`;
      g.innerHTML = rs.length ? rs.slice(0, F.n).map(x => recCard(x.g, x.c)).join("") : `<div class="empty-state" style="grid-column:1/-1">No recorded motion matches. Clear the robot or the search to see more.</div>`;
      $("#moreb").hidden = rs.length <= F.n;
      wireVideos(g);
      return;
    }
    const xs = filtered();
    $("#count").textContent = `${xs.length.toLocaleString()} clips`;
    const g = $("#grid");
    g.innerHTML = xs.length ? xs.slice(0, F.n).map(card).join("") : `<div class="empty-state" style="grid-column:1/-1">No clips match these filters. Clear one of them to see more.</div>`;
    $("#moreb").hidden = xs.length <= F.n;
    wireVideos(g);
  };
  $("#facets").querySelectorAll(".pill").forEach(p => p.onclick = () => {
    F[p.dataset.k] = p.dataset.v; F.n = 60;
    $("#facets").querySelectorAll(`.pill[data-k="${p.dataset.k}"]`).forEach(x => x.setAttribute("aria-pressed", x === p ? "true" : "false"));
    draw();
  });
  $("#fbody").onchange = e => { F.body = e.target.value; F.n = 60; draw(); };
  let t; $("#fq").oninput = e => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; F.n = 60; draw(); }, 200); };
  $("#moreb").onclick = () => { F.n += 60; draw(); };
  $("#rand").onclick = () => {
    if (F.src === "recorded") { const rs = recs().filter(x => x.c.video); if (rs.length) location.hash = `#/recorded/${rs[Math.floor(Math.random() * rs.length)].c.id}`; return; }
    const xs = filtered().filter(c => c.video); if (xs.length) location.hash = `#/clip/${xs[Math.floor(Math.random() * xs.length)].id}`;
  };
  draw();
}

// ------------------------------------------------------------------ clip page
async function clipPage(app, body, stem) {
  const c = S.clips.find(x => x.id === `${body}/${stem}`);
  if (!c) { app.innerHTML = `<div class="wrap page"><div class="empty-state">No clip ${esc(body)}/${esc(stem)} in this release. <a href="#/browse">Browse clips</a></div></div>`; return; }
  const b = S.bodyOf[c.body] || {};
  const title = c.src === "skill" ? nice(c.skill) : c.src === "taskblind" ? "Task-blind take" : nice(String(c.v).split(":")[0]);
  app.innerHTML = `<div class="wrap page">
  <div class="crumbs"><a href="#/browse">Browse</a> / <a href="#/robot/${esc(c.body)}">${esc(b.label)}</a> / ${esc(stem)}</div>
  <div class="chead"><h1><b>${esc(title)}</b> on ${esc(b.label)}</h1>
    <div class="badges"><span class="badge ${c.valid ? "ok" : "bad"}">${c.valid ? "physically possible" : "fails " + (c.failed || []).join(", ")}</span>
    ${c.label != null ? `<span class="badge ${c.label ? "ok" : "mid"}">label check ${c.label ? "passes" : "fails"}</span>` : ""}
    ${c.src !== "procedural" ? `<span class="badge">${esc(ARM[c.arm] || c.arm)} · v${esc(c.v)}</span>` : `<span class="badge">${esc(c.v)}</span>`}</div></div>
  <p class="task">${esc(S.meta.skill_text[c.skill || (c.src === "taskblind" ? "taskblind" : "")] || (c.src === "procedural" ? "Made without a model: a gait, balance, drive or random motion over the robot's own primitives." : ""))}</p>
  <div class="cgrid">
    <div class="stack">
      <div class="player">${c.video ? `<video src="media/${esc(c.video)}" muted loop playsinline autoplay controls></video>` : ""}</div>
      <div class="panel"><h2>Program <small id="pg-n"></small></h2><div class="tl-wrap" id="timeline"></div><details style="margin-top:10px"><summary>Program as written</summary><pre class="code" id="prog" style="margin-top:8px">Loading…</pre></details></div>
      <div class="panel"><h2>Primitives <small>outlined: used in this clip</small></h2><div class="prims" id="prims"></div></div>
    </div>
    <div class="stack">
      <div class="panel"><h2>Robot <small><a href="#/robot/${esc(c.body)}">all of its clips</a></small></h2>${robotKV(b)}</div>
      <div class="panel"><h2>Physical checks <small id="ck-n"></small></h2><table class="checks" id="checks"></table></div>
      ${c.label != null ? `<div class="panel"><h2>Label check <small>${c.label ? "passes" : "fails"}</small></h2><dl class="kv" id="pred"></dl></div>` : ""}
      ${c.src !== "procedural" ? `<div class="panel"><h2>Generation</h2><dl class="kv" id="gen"></dl></div>` : ""}
      <div class="panel"><h2>Files</h2><dl class="kv">
        <dt>Motion</dt><dd class="mono">${esc(c.npz)}</dd><dt>Record</dt><dd class="mono">${esc(c.sidecar)}</dd>
        <dt>Model</dt><dd class="mono">bodies/${esc(c.body)}.xml</dd><dt>Frames</dt><dd>${fmt(c.frames)} at 50 fps (${fmt(c.dur, 2)} s)</dd></dl></div>
    </div>
  </div>
  ${relatedRows(c)}
</div>`;
  wireVideos(app);
  window.scrollTo(0, 0);
  const side = await sidecar(c);
  if (location.hash.replace(/^#\/?clip\//, "") !== `${body}/${stem}`) return;
  const prog = side?.program;
  $("#prog").textContent = prog ? JSON.stringify(prog, null, 1) : "No program: this clip was made without a model.";
  $("#pg-n").textContent = prog ? `${(prog.keyframes || []).length} keyframes · ${prog.duration_s} s` : "";
  $("#timeline").innerHTML = prog ? timeline(prog) : `<p class="note">${c.src === "procedural" ? "Procedural clips are generated directly from the robot's gaits and primitives." : "No program compiled."}</p>`;
  const used = usedPrims(prog);
  $("#prims").innerHTML = (b.prims || []).map(p => `<div class="prim ${used.has(p.name) ? "used" : ""}">${vid(p.video)}<b>${esc(p.name)}</b><span>${esc(p.type)}${p.joints ? ` · ${p.joints.length} joints` : ""}${p.cycle_s ? ` · ${p.cycle_s} s cycle` : ""}</span></div>`).join("") || `<p class="note">No primitives library for this robot.</p>`;
  wireVideos($("#prims"));
  const checks = Object.entries(side?.filters || {}).filter(([k, v]) => v && typeof v === "object" && "pass" in v);
  $("#ck-n").textContent = checks.length ? `${checks.filter(([, v]) => v.pass).length} of ${checks.length} pass` : "";
  $("#checks").innerHTML = checks.map(([k, v]) => `<tr><td class="n">${esc(CHECK_NAMES[k] || nice(k))}</td><td><span class="st ${v.pass ? "ok" : "bad"}">${v.pass ? "pass" : "fail"}</span></td><td class="r">${esc(worst(v))}</td></tr>`).join("") || `<tr><td class="note">No check record.</td></tr>`;
  if ($("#pred")) {
    const p = side?.predicate || {};
    $("#pred").innerHTML = Object.entries(p).filter(([k]) => !["skill", "pass", "applicable"].includes(k)).map(([k, v]) => `<dt>${esc(nice(k))}</dt><dd class="mono">${esc(typeof v === "number" ? fmt(v, 3) : JSON.stringify(v))}</dd>`).join("");
  }
  if ($("#gen") && side) {
    const calls = side.call_log || [];
    const tin = calls.reduce((a, x) => a + (x.prompt_tokens || 0), 0), tout = calls.reduce((a, x) => a + (x.completion_tokens || 0), 0);
    const att = (side.attempts || []).map(a => `round ${a.round}: ${a.filters?.pass ? "passed" : "failed " + (a.filters?.failed || []).join(", ")}`);
    $("#gen").innerHTML = `<dt>Calls</dt><dd>${fmt(side.calls)} · ${fmt(tin)} tokens in, ${fmt(tout)} out</dd>
      <dt>Cost</dt><dd>$${fmt(side.cost_usd, 4)}</dd>
      <dt>Repairs</dt><dd>${fmt(side.repair_rounds ?? 0)}${att.length ? `<br><span class="note">${esc(att.join(" · "))}</span>` : ""}</dd>
      <dt>Primitives</dt><dd class="mono">${esc(side.library || "–")}</dd>
      <dt>Made</dt><dd>${esc(side.at || "–")}</dd>`;
  }
}
function worst(v) {
  const k = Object.keys(v).find(x => x.startsWith("worst"));
  if (!k) return "";
  const lim = Object.keys(v).find(x => x.startsWith("limit"));
  const val = typeof v[k] === "number" ? fmt(v[k], 4) : JSON.stringify(v[k]);
  return `${nice(k.replace("worst_", "worst "))} ${val}${lim ? ` / limit ${typeof v[lim] === "number" ? fmt(v[lim], 4) : v[lim]}` : ""}`;
}
function robotKV(b) {
  return `<div class="media" style="margin-bottom:12px">${b.still ? `<img src="media/${esc(b.still)}" alt="">` : ""}</div><dl class="kv">
    <dt>Body plan</dt><dd>${esc(b.kind_label)}${b.held_out ? " · held out" : ""}</dd>
    <dt>Source model</dt><dd>${esc(b.origin)}${b.detail ? ` · ${esc(b.detail)}` : ""}${b.url ? ` · <a href="${esc(b.url)}" target="_blank" rel="noopener">link ↗</a>` : ""}</dd>
    <dt>Joints</dt><dd>${b.nq - (b.free_base ? 7 : 0)}${b.free_base ? " + floating base" : ""} · ${b.nu} actuators</dd>
    <dt>Size</dt><dd>${fmt(b.L_m, 3)} m (L) · ${fmt(b.mass_kg, 1)} kg · time scale ${fmt(b.T_s, 3)} s</dd>
    <dt>Tips</dt><dd class="mono" style="font-size:12px">${esc((b.tips || []).join(", "))}</dd>
    <dt>Primitives</dt><dd>${b.modes} modes, ${b.gaits} gaits${b.primitives_cost_usd != null ? ` · $${fmt(b.primitives_cost_usd, 3)}` : ""}</dd></dl>`;
}
function timeline(p) {
  const kfs = p.keyframes || [], T = p.duration_s || (kfs.at(-1)?.t ?? 1);
  const tracks = {};
  for (const k of kfs) for (const [n, v] of Object.entries({ ...(k.modes || {}), ...(k.joints || {}) })) (tracks[n] ||= []).push([k.t, +v]);
  const gaits = kfs.filter(k => k.gait).map(k => [k.t, k.gait.name]);
  const names = Object.keys(tracks).slice(0, 14);
  const W = 640, L = 150, rowH = 24, H = (names.length + (gaits.length ? 1 : 0)) * rowH + 24;
  const x = t => L + (W - L - 10) * (t / T);
  let s = `<svg class="tl" viewBox="0 0 ${W} ${H}" width="100%" style="min-width:520px" role="img" aria-label="Program timeline">`;
  for (const k of kfs) s += `<line x1="${x(k.t)}" x2="${x(k.t)}" y1="0" y2="${H - 18}" stroke="var(--line)"/>`;
  names.forEach((n, i) => {
    const y = i * rowH + rowH / 2, pts = tracks[n].sort((a, b) => a[0] - b[0]);
    const mx = Math.max(1e-6, ...pts.map(q => Math.abs(q[1])));
    const py = v => y - (v / mx) * (rowH * 0.4);
    s += `<text x="${L - 8}" y="${y + 3}" text-anchor="end">${esc(n.length > 22 ? n.slice(0, 21) + "…" : n)}</text>`;
    s += `<line x1="${L}" x2="${W - 10}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-dasharray="2 3"/>`;
    s += `<polyline fill="none" stroke="var(--accent)" stroke-width="1.6" points="${[[0, 0], ...pts, [T, pts.at(-1)[1]]].map(q => `${x(q[0]).toFixed(1)},${py(q[1]).toFixed(1)}`).join(" ")}"/>`;
    pts.forEach(q => { s += `<circle cx="${x(q[0]).toFixed(1)}" cy="${py(q[1]).toFixed(1)}" r="2.4" fill="var(--accent)"/>`; });
  });
  if (gaits.length) {
    const y = names.length * rowH + 4;
    s += `<text x="${L - 8}" y="${y + 12}" text-anchor="end">gaits</text>`;
    gaits.forEach(([t, n], i) => { const t2 = (kfs.find(k => k.t > t && !k.gait)?.t) ?? T; s += `<rect x="${x(t)}" y="${y}" width="${Math.max(3, x(t2) - x(t))}" height="14" rx="3" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="${x(t) + 4}" y="${y + 11}">${esc(n)}</text>`; });
  }
  s += `<text x="${L}" y="${H - 4}">0 s</text><text x="${W - 10}" y="${H - 4}" text-anchor="end">${T} s</text></svg>`;
  return s + (Object.keys(tracks).length > names.length ? `<p class="note">${Object.keys(tracks).length - names.length} more tracks in the program below.</p>` : "");
}
function relatedRows(c) {
  const same = c.skill ? S.clips.filter(x => x.skill === c.skill && x.body !== c.body && x.video && x.src === "skill" && x.v === 0 && x.arm === "P").slice(0, 16) : [];
  const other = S.clips.filter(x => x.body === c.body && x.id !== c.id && x.video && x.src !== "procedural").slice(0, 16);
  const row = (t, xs) => xs.length ? `<div style="margin-top:28px"><div class="eyebrow" style="margin-bottom:10px">${t}</div><div class="rowclips">${xs.map(card).join("")}</div></div>` : "";
  return row(`${nice(c.skill || "")} on other robots`, same) + row(`Other clips of ${label(c.body)}`, other);
}

// ------------------------------------------------------------------ recorded motions, each in the scene it was made in
const hfFile = p => `https://huggingface.co/datasets/${S.meta.hf_repo}/blob/main/${p}`;
function recCard(g, c) {
  return `<a class="card" href="#/recorded/${esc(c.id)}" title="${esc(c.title)}">${vid(c.video)}<div class="t"><div class="h"><b>${esc(g.name)}</b><span>${fmt(c.dur, 1)} s</span></div>
    <div class="rt">${esc(c.title)}</div><div class="badges"><span class="badge mid">recorded in simulation</span></div></div></a>`;
}
function recordedPage() {
  if (!S.recorded.length) return `<div class="wrap page"><div class="empty-state">This build has no recorded motions.</div></div>`;
  const st = S.meta.stats;
  return `<div class="wrap page"><h1 class="h2">Recorded motions, each in its own scene</h1>
    <p class="lede">${st.recorded_clips} motions of ${st.recorded_robots} robots, about ${st.recorded_minutes} minutes in all. Each was recorded in physics simulation in a scene built for it, and is shown in that scene: its surroundings and the objects the robot works with move as they did in the recording. These motions were not generated by the pipeline and are not counted in the dataset's figures.</p>
    ${S.recorded.map(g => `<div style="margin-top:30px"><div class="chead" style="margin-top:0"><b>${esc(g.name)}</b><a class="btn small ghost" href="#/robot/${esc(g.page_body)}">The robot</a></div>
      <div class="grid">${g.clips.map(c => recCard(g, c)).join("")}</div></div>`).join("")}
  </div>`;
}
function recordedClipPage(id) {
  const hit = recFind(id);
  if (!hit) return `<div class="wrap page"><div class="empty-state">No recorded motion ${esc(id)}.</div></div>`;
  const { g, c } = hit, f = c.files || {};
  const file = (k, t) => f[k] ? `<a href="${esc(hfFile(f[k]))}" target="_blank" rel="noopener">${t}</a>` : "";
  return `<div class="wrap page">
  <div class="crumbs"><a href="#/browse/src=recorded">Recorded motions</a> / <a href="#/robot/${esc(g.page_body)}">${esc(g.name)}</a></div>
  <div class="chead"><h1><b>${esc(c.title)}</b></h1><span class="tag">${esc(g.name)}</span></div>
  <div class="cgrid">
    <div class="stack"><div class="player">${c.video ? `<video src="media/${esc(c.video)}" muted loop playsinline autoplay controls></video>` : ""}</div></div>
    <div class="stack"><div class="panel"><h2>Recording</h2><dl class="kv">
      <dt>Robot</dt><dd><a href="#/robot/${esc(g.page_body)}">${esc(g.name)}</a></dd>
      <dt>How it was made</dt><dd>recorded in physics simulation; not generated by the pipeline</dd>
      <dt>Scene</dt><dd>${c.own_scene ? "the scene built for this motion, with its surroundings and objects" : "a bare floor"}</dd>
      <dt>Length</dt><dd>${fmt(c.dur, 1)} s</dd>
      ${c.kind ? `<dt>Kind</dt><dd>${esc(nice(c.kind))}</dd>` : ""}
      <dt>Files</dt><dd>${[file("npz", "motion (.npz)"), file("scene", "scene (.xml)"), file("program", "program"), file("sidecar", "record")].filter(Boolean).join(" · ")}</dd>
    </dl></div></div>
  </div>
  <div style="margin-top:28px"><div class="eyebrow" style="margin-bottom:10px">Other recorded motions of this robot</div><div class="rowclips">${g.clips.filter(k => k.id !== c.id).map(k => recCard(g, k)).join("")}</div></div>
</div>`;
}
function recordedOf(body) {
  const g = S.recorded.find(x => x.body === body);
  return g ? `<div style="margin-top:28px"><div class="eyebrow" style="margin-bottom:10px">Recorded in simulation, in its own scenes (not generated by the pipeline)</div><div class="grid">${g.clips.map(c => recCard(g, c)).join("")}</div></div>` : "";
}

// ------------------------------------------------------------------ robots
function robotsPage() {
  return `<div class="wrap page"><h1 class="h2">Robots</h1>
    <p class="lede">Each robot's primitives were written once from its model alone, before any motion is requested, and every generated clip on that robot is composed from them.</p>${robotCards()}</div>`;
}
function robotPage(body) {
  const b = S.bodyOf[body];
  if (!b) {                                       // a robot that is in the dataset with recorded motions only
    const g = S.recorded.find(x => x.page_body === body);
    if (!g) return `<div class="wrap page"><div class="empty-state">No robot ${esc(body)}.</div></div>`;
    return `<div class="wrap page">
  <div class="crumbs"><a href="#/robots">Robots</a> / ${esc(g.name)}</div>
  <div class="chead"><h1><b>${esc(g.name)}</b></h1><span class="tag ho">recorded motions only</span></div>
  <p class="lede">This robot is in the dataset with ${g.clips.length} motions recorded in physics simulation, each in a scene built for it. They were not generated by the pipeline, which has written no primitives for this robot.</p>
  <div class="grid">${g.clips.map(c => recCard(g, c)).join("")}</div>
</div>`;
  }
  const cs = (S.byBody[body] || []);
  const skillClips = cs.filter(c => c.src !== "procedural" && c.video);
  const proc = cs.filter(c => c.src === "procedural" && c.video);
  return `<div class="wrap page">
  <div class="crumbs"><a href="#/robots">Robots</a> / ${esc(b.label)}</div>
  <div class="chead"><h1><b>${esc(b.label)}</b></h1><span class="tag ${b.held_out ? "ho" : ""}">${esc(b.kind_label)}${b.held_out ? " · held out" : ""}</span></div>
  <div class="cgrid">
    <div class="stack"><div class="panel"><h2>Primitives <small>${b.modes} modes · ${b.gaits} gaits · each a sweep of the mode</small></h2>
      <div class="prims">${(b.prims || []).map(p => `<div class="prim">${vid(p.video)}<b>${esc(p.name)}</b><span>${esc(p.type)}${p.joints ? ` · ${esc(p.joints.slice(0, 4).join(", "))}${p.joints.length > 4 ? "…" : ""}` : ""}</span></div>`).join("")}</div></div></div>
    <div class="stack"><div class="panel"><h2>Robot</h2>${robotKV(b)}</div>
      <div class="panel"><h2>Clips</h2><dl class="kv"><dt>Skill</dt><dd>${fmt(b.counts.skill || 0)} (${fmt(b.counts.valid_skill || 0)} physically possible)</dd>
      <dt>Task-blind</dt><dd>${fmt(b.counts.taskblind || 0)}</dd><dt>Procedural</dt><dd>${fmt(b.counts.procedural || 0)} (${fmt(b.counts.valid_procedural || 0)} possible)</dd></dl>
      <a class="btn small ghost" style="margin-top:12px" href="#/browse/src=&body=${esc(body)}">Browse all of them</a></div></div>
  </div>
  <div style="margin-top:28px"><div class="eyebrow" style="margin-bottom:10px">Skill and task-blind clips</div><div class="grid">${skillClips.map(card).join("")}</div></div>
  ${proc.length ? `<div style="margin-top:28px"><div class="eyebrow" style="margin-bottom:10px">Procedural sample</div><div class="grid">${proc.map(card).join("")}</div></div>` : ""}
  ${recordedOf(body)}
</div>`;
}
function getPage() {
  return `<div class="page" style="padding:0">${getSection()}</div>`;
}

boot().catch(e => { $("#app").innerHTML = `<div class="wrap page"><div class="empty-state">The dataset index could not be loaded (${esc(e.message)}). Run build_site.py on the release folder, then serve that folder.</div></div>`; });
