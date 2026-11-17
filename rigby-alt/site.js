// Rigby kinematic motion dataset site: hash routes over data/ (meta, bodies, summary, index, clips/<robot>.json, all written
// by build_site.py), hf/ (the dataset records) and media/ (renders). Each route loads only what it shows: the overview
// never reads the clip index, the clips page reads the slim index.json, a clip or robot page reads that robot's file.
"use strict";
// where data/, hf/ and media/ live: "" beside this page, or the main site's folder when this design is published next to it
const ROOT = window.RIGBY_ROOT || "";
const S = { meta: null, bodies: [], bodyOf: {}, cells: {}, best: {}, skills: [], samples: {}, perf: {}, order: {}, side: {}, prim: {}, files: {} };
const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CREDITS = [["Zane Beeai", "https://www.zanebeeai.com/"], ["Angelo Wei", "https://www.linkedin.com/in/angelo-wei-a638232a2/"], ["Tony Pan", "https://www.tony-pan.com/"], ["Jason Peng", "https://xbpeng.github.io/"], ["Russell Buchanan", "https://uwaterloo.ca/mechanical-mechatronics-engineering/profile/r6buchan"], ["Yi Zhou", "https://zhouyisjtu.github.io/"]];
const creditsHTML = () => '<p class="credits">Rigby was created by ' + CREDITS.map(([n, u], i) => (i ? (i === CREDITS.length - 1 ? " and " : ", ") : "") + '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(n) + "</a>").join("") + ".</p>";
const nice = s => String(s ?? "").replace(/_/g, " ");
const cap = s => { s = nice(s); return s.charAt(0).toUpperCase() + s.slice(1); };
const NF = {};
const fmt = (n, d = 0) => n == null || Number.isNaN(+n) ? "–" : (NF[d] ||= new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d })).format(Number(n));
const plural = (n, one, many) => fmt(n) + " " + (n === 1 ? one : many || one + "s");
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
// soft preferences only: which body plans and robots lead a line-up when they exist. Nothing depends on them existing.
const KIND_PREF = ["humanoid", "quadruped", "arm", "octopus", "multileg", "crane", "mobile_manipulator", "wheeled", "dual_arm"];
const PREFER = ["unitree_h1", "unitree_g1", "boston_dynamics_spot", "unitree_go2", "franka_emika_panda", "universal_robots_ur5e", "mobile_octopus", "v3_hexapod_s3101", "mobile_crane", "mobile_dog_arm_v2", "mobile_wheeled_biped", "zoo_dual_arm"];
const FIRST_SKILL = "wave";
const ARM = { P: "Primitives", J: "Joint keyframes" };
const CHECK_NAMES = {
  joint_limits: "Joint limits", self_collision: "Self-collision", ground: "Floor penetration", foot_slip: "Planted feet stay put",
  support: "Centre of mass over support", reach: "Targets within reach", ik: "Targets reached (IK)", continuity: "Smooth joint motion",
  wheel_slip: "Wheels roll without slipping", arm_in_object: "Arm clear of objects", program: "Program compiles",
};
const name = b => (S.bodyOf[b]?.label || nice(b)).replace(/\s*\(procedural\)$/, "");
const isProc = x => /procedural/i.test(x?.origin || "");
const kindLine = b => { const x = S.bodyOf[b]; if (!x) return ""; return isProc(x) ? "Procedural " + x.kind_label.toLowerCase() : x.kind_label; };
const joints = b => b.nq - (b.free_base ? 7 : 0);
const hfURL = () => "https://huggingface.co/datasets/" + S.meta.hf_repo;
const ARR = '<span class="arr" aria-hidden="true">→</span>';
const CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
// ------------------------------------------------------------------ video: lazy, only on screen, never more than 16 at once
const MAXPLAY = 16, visible = new Set();
const io = new IntersectionObserver(es => {
  for (const e of es) { if (e.isIntersecting) visible.add(e.target); else { visible.delete(e.target); e.target.pause(); } }
  schedule();
}, { rootMargin: "120px 0px" });
function load(v) {
  if (v.getAttribute("src") || !v.dataset.src) return;
  if (RM) v.preload = "metadata";
  v.src = v.dataset.src + (RM ? "#t=0.6" : "");
}
function schedule() {
  for (const v of visible) if (!v.isConnected) visible.delete(v);
  const list = [...visible].sort((a, b) => (a.compareDocumentPosition(b) & 2) ? 1 : -1);
  list.forEach((v, i) => {
    if (i < MAXPLAY) { load(v); if (!RM && v.dataset.hold !== "1" && v.paused) v.play().catch(() => {}); }
    else if (!v.paused) v.pause();
  });
}
function wire(root) { $$("video[data-src]", root).forEach(v => io.observe(v)); }
function unwire(root) { $$("video", root).forEach(v => { io.unobserve(v); visible.delete(v); v.pause(); v.removeAttribute("src"); v.load(); }); }
const vtag = (src, extra = "") => '<video data-src="' + ROOT + 'media/' + esc(src) + '" muted loop playsinline preload="none" ' + extra + "></video>";

function tile(c, sub, title) {
  const b = S.bodyOf[c.body] || {};
  const media = c.video ? vtag(c.video) : (b.still ? '<img src="' + ROOT + 'media/' + esc(b.still) + '" alt="" loading="lazy">' : "");
  return '<a class="tile" href="#/clip/' + esc(c.id) + '"><div class="frame">' + media + '</div><div class="cap"><b>' + esc(title ?? name(c.body)) + "</b><span>" + esc(sub ?? kindLine(c.body)) + "</span></div></a>";
}
function clipTitle(c) { return c.src === "skill" ? cap(c.skill) : c.src === "taskblind" ? "Task-blind take" : cap(c.arm) + " · " + nice(c.v); }
function clipSub(c) { return c.src === "skill" ? cap(c.skill) + " · " + (ARM[c.arm] || c.arm) + " v" + c.v : c.src === "taskblind" ? "Task-blind · v" + c.v : cap(c.arm) + " · " + nice(c.v); }

// summary.json: cells[body][skill] = [takes, label-check passes, best clip id]; best[id] = slim row
const cell = (body, skill) => S.cells[body]?.[skill];
const bestOf = (body, skill) => { const c = cell(body, skill); return c ? S.best[c[2]] : null; };
function performers(skill) {               // the best clip with a render, for every robot that has the skill
  return S.perf[skill] ||= S.bodies.map(b => bestOf(b.body, skill)).filter(c => c && c.video);
}
function kindOrder() {
  if (S.kindOrder) return S.kindOrder;
  const n = {};
  for (const b of S.bodies) n[b.kind] = (n[b.kind] || 0) + 1;
  const rest = Object.keys(n).filter(k => !KIND_PREF.includes(k)).sort((a, b) => n[b] - n[a] || a.localeCompare(b));
  return (S.kindOrder = [...KIND_PREF.filter(k => n[k]), ...rest]);
}
const prefIdx = b => { const i = PREFER.indexOf(b); return i < 0 ? 99 : i; };
function diverse(items, n = Infinity) {    // round-robin over body plans, so the most different bodies come first
  const byKind = {};
  for (const x of items) (byKind[S.bodyOf[x.body].kind] ||= []).push(x);
  for (const k in byKind) byKind[k].sort((a, b) => S.bodyOf[a.body].held_out - S.bodyOf[b.body].held_out || prefIdx(a.body) - prefIdx(b.body));
  const kinds = kindOrder(), out = [];
  for (let r = 0; out.length < n; r++) {
    let added = false;
    for (const k of kinds) { const a = byKind[k]; if (a && a[r]) { out.push(a[r]); added = true; if (out.length >= n) break; } }
    if (!added) break;
  }
  return out;
}
const lineupOrder = skill => S.order[skill] ||= diverse(performers(skill));
async function getJSON(url) { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; } }
async function sidecar(c) { if (!(c.id in S.side)) S.side[c.id] = await getJSON(ROOT + "hf/" + c.sidecar); return S.side[c.id]; }
async function primLib(b) { const p = b?.primitives; if (!p) return null; if (!(p in S.prim)) S.prim[p] = await getJSON(ROOT + "hf/" + p); return S.prim[p]; }
const BUILD = new URL(document.currentScript?.src || location.href).searchParams.get("v") || "";
const dataURL = f => ROOT + "data/" + f + (BUILD ? "?v=" + BUILD : "");
async function bodyFile(body) { if (!(body in S.files)) S.files[body] = await getJSON(dataURL("clips/" + encodeURIComponent(body) + ".json")); return S.files[body]; }
function usedPrims(p) {
  const u = [];
  for (const k of (p?.keyframes || [])) { for (const n of Object.keys(k.modes || {})) if (!u.includes(n)) u.push(n); if (k.gait?.name && !u.includes(k.gait.name)) u.push(k.gait.name); }
  return u;
}
function primAbout(b, pname) {
  const L = S.prim[b?.primitives]; if (!L) return "";
  const m = (L.modes || []).find(x => x.name === pname); if (m) return m.plus || "";
  const g = (L.gaits || []).find(x => x.name === pname); if (g) return g.cycle_s ? "Gait, " + fmt(g.cycle_s, 2) + " s cycle" : "Gait";
  return "";
}

// ------------------------------------------------------------------ boot and routes
const readJSON = n => fetch(dataURL(n + ".json")).then(r => { if (!r.ok) throw new Error(n + ".json: HTTP " + r.status); return r.json(); });
const NEEDS_SUMMARY = page => page !== "browse" && page !== "get";   // the clips and download pages never read the robot-by-skill summary
let summaryP = null;
function needSummary() {
  return summaryP ||= readJSON("summary").then(s => { S.cells = s.cells || {}; S.best = s.best || {}; S.samples = s.samples || {}; S.skills = (s.skills || S.skills).slice(); S.ready = true; });
}
async function boot() {
  if (NEEDS_SUMMARY(location.hash.replace(/^#\/?/, "").split("/")[0])) needSummary().catch(() => {});
  const [meta, bodies] = await Promise.all([readJSON("meta"), readJSON("bodies")]);
  S.meta = meta; S.bodies = bodies; S.skills = (meta.skills || []).slice();
  for (const b of bodies) S.bodyOf[b.body] = b;
  $("#top-hf").href = hfURL();
  addEventListener("hashchange", route);
  history.scrollRestoration = "manual";
  addEventListener("scroll", debounce(() => { if (!NAV.hold) history.replaceState({ ...(history.state || {}), y: scrollY }, ""); }, 120), { passive: true });
  addEventListener("scroll", () => $("#top").classList.toggle("scrolled", scrollY > 8), { passive: true });
  route();
}
let cleanup = [];
const NAV = { want: 0, hold: false };     // the scroll position of this history entry, put back once its page is drawn
function restoreScroll() { NAV.hold = false; scrollTo(0, NAV.want || 0); }
const TITLES = { browse: "Clips", robots: "Robots", get: "Download" };
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [page, ...rest] = h.split("/");
  const nav = page === "clip" ? "browse" : page === "robot" ? "robots" : page || "home";
  $$("[data-nav]").forEach(a => a.setAttribute("aria-current", a.dataset.nav === nav ? "page" : "false"));
  const app = $("#app");
  cleanup.forEach(f => f()); cleanup = [];
  unwire(app);
  NAV.want = history.state?.y || 0; NAV.hold = true;
  if (NEEDS_SUMMARY(page) && !S.ready) {
    const at = location.hash;
    app.innerHTML = '<div class="wrap loading" role="status">Loading the dataset index…</div>';
    needSummary().then(() => { if (location.hash === at) route(); }, e => { app.innerHTML = '<div class="wrap"><div class="empty"><h1>The dataset index could not be loaded.</h1><p>' + esc(e.message) + "</p></div></div>"; });
    return;
  }
  let later = true;
  if (page === "clip") clipPage(app, decodeURIComponent(rest[0] || ""), decodeURIComponent(rest.slice(1).join("/")));
  else if (page === "browse") browsePage(app, new URLSearchParams(rest.join("/")));
  else if (page === "robot") robotPage(app, decodeURIComponent(rest[0] || ""));
  else {
    later = false;
    if (page === "robots") robotsPage(app);
    else if (page === "get") getPage(app);
    else { app.innerHTML = homePage(); wireHome(app); }
  }
  document.title = (page === "clip" || page === "robot" ? name(decodeURIComponent(rest[0] || "")) + " · " : TITLES[page] ? TITLES[page] + " · " : "") + "Rigby · Kinematic motion dataset";
  wire(app);
  if (later) scrollTo(0, 0); else restoreScroll();
  schedule();
}

// ------------------------------------------------------------------ home
function homePage() {
  const st = S.meta.stats;
  return '<section class="hero wrap" id="hero">' +
    '<div class="hero-head"><h1 class="h1">Motion for ' + fmt(st.bodies) + ' robots,<br><span class="g">each in its own primitives.</span></h1>' +
    '<div class="hero-side"><p class="lede">' + fmt(st.clips) + ' kinematic motion clips across ' + fmt(S.skills.length) + ' skills, generated from nothing but each robot\'s model.<span class="more"> Every frame of every clip passes every physical check.</span></p>' +
    '<div class="actions"><a class="btn" href="' + esc(hfURL()) + '" target="_blank" rel="noopener">Download dataset ' + ARR + '</a><a class="btn ghost" href="#/browse">Browse clips</a></div></div></div>' +
    '<div class="lu auto" id="lu">' +
    '<div class="picker"><div class="pk-row" id="pk-row" role="tablist" aria-label="Skill"></div>' +
    '<div class="pk-all"><button class="pk-btn" id="pk-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="pk-pop">All ' + fmt(S.skills.length) + ' skills ' + CHEV + '</button>' +
    '<div class="pk-pop" id="pk-pop" role="dialog" aria-label="All skills" hidden><input class="pk-q" id="pk-q" type="search" placeholder="Find a skill or a word in its sentence" aria-label="Find a skill" autocomplete="off"><div class="pk-list" id="pk-list" role="listbox" aria-label="Skills"></div></div></div></div>' +
    '<div class="say"><p class="sent" id="lu-sent" aria-live="polite"></p><div class="say-r"><span id="lu-n"></span><span class="pager" id="lu-pager"><button type="button" class="pg" id="lu-prev" aria-label="Previous robots"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5 4 6l3.5 3.5"/></svg></button><button type="button" class="pg" id="lu-next" aria-label="Next robots"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5 8 6 4.5 9.5"/></svg></button></span></div></div>' +
    '<div class="lu-grid" id="lu-grid" role="tabpanel"></div></div></section>' +
    setSection() + makeSection() + matrixSection() + robotsSection() + getSection();
}

// ---- 1. the line-up: one sentence, a few very different bodies, the rest a page away
const LU = { skill: null, page: 0, per: 0 };
function luPer() {
  const g = $("#lu-grid"); if (!g) return 6;
  if (innerWidth < 640) return 6;
  const cols = Math.max(2, Math.min(4, Math.floor((g.clientWidth + 1) / 432)));
  g.style.setProperty("--cols", cols);
  return cols * 2;
}
function pkBuild() {
  const row = $("#pk-row");
  row.innerHTML = S.skills.map((s, j) => '<button class="pk-i" role="tab" type="button" id="pk-' + j + '" data-s="' + esc(s) + '" aria-controls="lu-grid">' + esc(cap(s)) + '<span class="pr" aria-hidden="true"></span></button>').join("");
  $$(".pk-i", row).forEach(t => {
    t.onclick = () => { manual(); luRender(t.dataset.s); };
    t.onkeydown = e => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
      e.preventDefault(); manual();
      const j = (S.skills.indexOf(LU.skill) + d + S.skills.length) % S.skills.length; luRender(S.skills[j], true);
    };
    t.querySelector(".pr").addEventListener("animationend", () => { const j = (S.skills.indexOf(LU.skill) + 1) % S.skills.length; luRender(S.skills[j]); });
  });
  const ov = () => { row.classList.toggle("ov", row.scrollWidth - row.clientWidth - row.scrollLeft > 4); row.classList.toggle("ol", row.scrollLeft > 4); };
  row.addEventListener("scroll", ov, { passive: true }); ov();
  // the full list: searchable, keyboard-reachable, built from the data
  const btn = $("#pk-btn"), pop = $("#pk-pop"), q = $("#pk-q"), list = $("#pk-list");
  const draw = () => {
    const t = q.value.trim().toLowerCase();
    const xs = S.skills.filter(s => !t || nice(s).includes(t) || (S.meta.skill_text[s] || "").toLowerCase().includes(t));
    list.innerHTML = xs.length ? xs.map(s => '<button type="button" role="option" class="pk-o" data-s="' + esc(s) + '" aria-selected="' + (s === LU.skill) + '"><b>' + esc(cap(s)) + '</b><span>' + plural(performers(s).length, "robot") + '</span><p>' + esc(S.meta.skill_text[s] || "") + "</p></button>").join("") : '<p class="pk-none">No skill matches “' + esc(q.value) + "”.</p>";
  };
  const open = v => {
    pop.hidden = !v; btn.setAttribute("aria-expanded", v); $("#lu").classList.toggle("held", v);
    if (v) { q.value = ""; draw(); q.focus(); }
  };
  btn.onclick = () => open(pop.hidden);
  q.oninput = draw;
  q.onkeydown = e => { if (e.key === "ArrowDown") { e.preventDefault(); $(".pk-o", list)?.focus(); } if (e.key === "Enter") { e.preventDefault(); const f = $(".pk-o", list); if (f) f.click(); } };
  list.onclick = e => { const o = e.target.closest(".pk-o"); if (!o) return; manual(); luRender(o.dataset.s); open(false); btn.focus(); };
  list.onkeydown = e => {
    const os = $$(".pk-o", list), i = os.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); os[Math.min(os.length - 1, i + 1)]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); i <= 0 ? q.focus() : os[i - 1].focus(); }
  };
  pop.onkeydown = e => { if (e.key === "Escape") { open(false); btn.focus(); } };
  const outside = e => { if (!pop.hidden && !e.target.closest(".pk-all")) open(false); };
  document.addEventListener("pointerdown", outside); cleanup.push(() => document.removeEventListener("pointerdown", outside));
}
function manual() { $("#lu")?.classList.remove("auto"); }
function luRender(skill, focus, page = 0) {
  if (!S.skills.includes(skill)) skill = S.skills[0];
  LU.skill = skill; LU.page = page; LU.per = luPer();
  const j = S.skills.indexOf(skill), row = $("#pk-row");
  $$(".pk-i", row).forEach((t, k) => { t.setAttribute("aria-selected", k === j); t.tabIndex = k === j ? 0 : -1; });
  const cur = $("#pk-" + j);
  if (focus) cur.focus({ preventScroll: true });
  const rr = row.getBoundingClientRect(), cr = cur.getBoundingClientRect();
  if (cr.left < rr.left || cr.right > rr.right - 40) row.scrollTo({ left: row.scrollLeft + cr.left - rr.left - 24, behavior: RM ? "auto" : "smooth" });
  const order = lineupOrder(skill), total = order.length, per = LU.per, pages = Math.max(1, Math.ceil(total / per));
  LU.page = ((page % pages) + pages) % pages;
  const pick = order.slice(LU.page * per, LU.page * per + per);
  $("#lu-sent").textContent = S.meta.skill_text[skill] || cap(skill);
  $("#lu-n").innerHTML = "<b>" + fmt(total) + "</b> of " + plural(S.bodies.length, "robot") + " perform it" + (total > per ? ' <span class="g">· ' + fmt(LU.page * per + 1) + "–" + fmt(LU.page * per + pick.length) + "</span>" : "");
  $("#lu-pager").hidden = total <= per;
  const grid = $("#lu-grid");
  grid.setAttribute("aria-labelledby", "pk-" + j);
  const swap = () => { unwire(grid); grid.innerHTML = pick.map(c => tile(c)).join("") || '<p class="note">No robot has a render of this skill yet.</p>'; wire(grid); schedule(); grid.classList.remove("swap"); };
  if (!grid.children.length || RM) swap();
  else { grid.classList.add("swap"); setTimeout(swap, 220); }
}

// ---- 2. what is in the set
function setSection() {
  const st = S.meta.stats;
  return '<section class="sec wrap" id="set"><p class="stmt"><b>' + fmt(st.clips) + ' clips, ' + fmt(st.hours, 2) + ' hours of motion.</b> For ' + plural(st.bodies, "robot") + ', from three sources.</p>' +
    '<div class="stmt-sub"><p>' + fmt(st.skill_clips) + ' skill clips across ' + plural(S.skills.length, "skill") + ', ' + fmt(st.taskblind_clips) + ' task-blind and ' + fmt(st.procedural_clips) + ' procedural, with ' + fmt(st.held_out) + ' of the robots held out for transfer tests. ' + fmt(st.frames) + ' frames at ' + st.fps.map(f => fmt(f)).join(", ") + ' fps. The model wrote ' + fmt(st.primitives) + ' primitives and ' + fmt(st.gaits) + ' gaits for these bodies. People rated ' + fmt(st.human_rated) + ' clips by eye and judged ' + fmt(st.human_yes) + ' to look right.</p></div>' +
    '<div class="sec-body panel split" id="src"><div class="vlist" role="tablist" aria-label="Source" aria-orientation="vertical" id="src-tabs"></div><div class="src-grid" id="src-grid" role="tabpanel"></div></div></section>';
}
const SOURCES = () => {
  const st = S.meta.stats;
  return [
    { k: "skill", n: st.skill_clips, t: "skill clips", p: "Answers to a one-sentence skill, composed by the model from the robot's own primitives, or written as joint keyframes." },
    { k: "taskblind", n: st.taskblind_clips, t: "task-blind clips", p: S.meta.skill_text.taskblind || "" },
    { k: "procedural", n: st.procedural_clips, t: "procedural clips", p: "Made without a model: a gait, balance, drive or random motion over the robot's own primitives." },
  ];
};
function srcPick(k) {
  let items;
  if (k === "skill") {
    // one robot per body plan first, each answering a different skill: touches at most a few cells per robot
    const order = diverse(S.bodies.map(b => ({ body: b.body })), 6), used = new Set();
    items = order.map(({ body }) => {
      const sk = Object.keys(S.cells[body] || {});
      const s = sk.find(x => !used.has(x) && bestOf(body, x)?.video) || sk.find(x => bestOf(body, x)?.video);
      if (s) used.add(s);
      return s ? bestOf(body, s) : null;
    }).filter(Boolean);
  } else items = diverse((S.samples[k] || []).filter((c, i, a) => c.video && a.findIndex(x => x.body === c.body) === i), 6);
  return items.map(c => tile(c, clipSub(c)));
}
function srcRender(i, focus) {
  const src = SOURCES(), tabs = $("#src-tabs");
  if (!tabs.children.length) {
    tabs.innerHTML = src.map((s, j) => '<button class="vitem" role="tab" type="button" id="src-t' + j + '" data-i="' + j + '"><span class="n">' + fmt(s.n) + '</span><span class="t">' + esc(cap(s.t)) + '</span><p>' + esc(s.p) + "</p></button>").join("");
    $$(".vitem", tabs).forEach(t => {
      t.onclick = () => srcRender(+t.dataset.i);
      t.onkeydown = e => { const d = ["ArrowDown", "ArrowRight"].includes(e.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(e.key) ? -1 : 0; if (d) { e.preventDefault(); srcRender((+t.dataset.i + d + 3) % 3, true); } };
    });
  }
  $$(".vitem", tabs).forEach((t, j) => { t.setAttribute("aria-selected", j === i); t.tabIndex = j === i ? 0 : -1; });
  if (focus) $("#src-t" + i).focus();
  const g = $("#src-grid"); g.setAttribute("aria-labelledby", "src-t" + i);
  unwire(g); g.innerHTML = srcPick(src[i].k).join(""); wire(g); schedule();
}

// ---- 3. how a clip is made: six examples, chosen from the data for variety of body plan and skill
function showcase() {
  if (S.show) return S.show;
  const used = new Set(), out = [];
  for (const { body } of diverse(S.bodies.filter(b => !b.held_out).map(b => ({ body: b.body })), 24)) {
    const rows = Object.keys(S.cells[body] || {}).map(s => bestOf(body, s)).filter(c => c && c.video && c.arm === "P");
    const score = c => (c.human === "yes" ? 2 : 0) + (c.label ? 1 : 0) + (used.has(c.skill) ? -10 : 0) + (out.length === 0 && c.skill === FIRST_SKILL ? 5 : 0);
    const c = rows.sort((a, b) => score(b) - score(a))[0];
    if (!c) continue;
    used.add(c.skill); out.push(c);
    if (out.length === 6) break;
  }
  return (S.show = out);
}
function makeSection() {
  return '<section class="sec wrap" id="make"><p class="stmt"><b>Every clip is a program.</b> Written in the robot\'s own primitives, then checked on every frame.</p><div class="stmt-sub"><p>A language model reads the robot\'s model, writes its primitives once, and composes them into a program for each skill sentence. The program compiles to joint motion, and takes that fail a physical check were removed.</p></div>' +
    '<div class="sec-body panel" id="mk"><div class="bar"><div class="tabs" role="tablist" aria-label="Example clip" id="mk-ex"></div></div>' +
    '<div class="steps-body auto" id="mk-body"><ol class="steps" role="tablist" aria-label="Step" aria-orientation="vertical" id="mk-steps"></ol><div class="stage" id="mk-stage" role="tabpanel"></div></div></div></section>';
}
const MK = { ex: 0, step: 0, tl: null, raf: 0 };
const STEPS = [
  ["Robot model", "The only input: the robot's MuJoCo model, its joints, limits and tips."],
  ["Primitives", "The model writes the robot's own motion primitives once, each measured by forward kinematics."],
  ["Program", "For a skill sentence, it composes them into keyframes over time."],
  ["Checked clip", "The program compiles to joint motion and every frame passes every physical check."],
];
function mkInit() {
  const ex = showcase();
  if (!ex.length) { $("#mk").hidden = true; return; }
  $("#mk-ex").innerHTML = ex.map((c, j) => '<button class="tab" role="tab" type="button" data-i="' + j + '">' + esc(name(c.body)) + ' <span class="g">' + esc(nice(c.skill)) + "</span></button>").join("");
  $$("#mk-ex .tab").forEach(t => t.onclick = () => { $("#mk-body").classList.remove("auto"); mkRender(+t.dataset.i, 0); });
  $("#mk-steps").innerHTML = STEPS.map((s, j) => '<li><button class="step" role="tab" type="button" id="mk-s' + j + '" data-i="' + j + '"><span class="k">0' + (j + 1) + '</span><span class="t">' + s[0] + "</span><p>" + s[1] + '</p><span class="pr" aria-hidden="true"></span></button></li>').join("");
  $$("#mk-steps .step").forEach(t => {
    t.onclick = () => { $("#mk-body").classList.remove("auto"); mkRender(MK.ex, +t.dataset.i); };
    t.onkeydown = e => { const d = ["ArrowDown", "ArrowRight"].includes(e.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(e.key) ? -1 : 0; if (d) { e.preventDefault(); $("#mk-body").classList.remove("auto"); mkRender(MK.ex, (MK.step + d + 4) % 4); $("#mk-s" + MK.step).focus(); } };
    t.querySelector(".pr").addEventListener("animationend", () => { const n = MK.step + 1; n < 4 ? mkRender(MK.ex, n) : mkRender((MK.ex + 1) % ex.length, 0); });
  });
  mkRender(0, 0);
}
async function mkRender(exI, step) {
  const ex = showcase(), c = ex[exI], b = S.bodyOf[c.body];
  MK.ex = exI; MK.step = step;
  $$("#mk-ex .tab").forEach((t, j) => t.setAttribute("aria-selected", j === exI));
  $$("#mk-steps .step").forEach((t, j) => { t.setAttribute("aria-selected", j === step); t.tabIndex = j === step ? 0 : -1; });
  const stage = $("#mk-stage"); stage.setAttribute("aria-labelledby", "mk-s" + step);
  const [side] = await Promise.all([sidecar(c), primLib(b)]);
  if (MK.ex !== exI || MK.step !== step) return;
  const prog = side?.program, used = usedPrims(prog);
  cancelAnimationFrame(MK.raf);
  let h = "";
  if (step === 0) {
    h = '<div class="stage-h"><h3>' + esc(b.label) + '</h3><span class="mono">' + esc(b.model || "") + '</span></div><div class="robot-art"><div class="frame"><img src="' + ROOT + 'media/' + esc(b.still) + '" alt="' + esc(b.label) + '"></div>' +
      '<dl class="kv"><dt>Body plan</dt><dd>' + esc(b.kind_label) + (b.held_out ? " · held out" : "") + '</dd><dt>Source</dt><dd>' + esc(b.origin) + (b.detail ? ' <span class="g">· ' + esc(b.detail) + "</span>" : "") + "</dd>" +
      "<dt>Joints</dt><dd>" + joints(b) + (b.free_base ? " + floating base" : "") + "</dd><dt>Actuators</dt><dd>" + b.nu + "</dd><dt>Size</dt><dd>" + fmt(b.L_m, 2) + " m · " + fmt(b.mass_kg, 1) + ' kg</dd><dt>Tips</dt><dd class="mono">' + esc((b.tips || []).join(", ")) + "</dd></dl></div>";
  } else if (step === 1) {
    const ps = (b.prims || []).slice().sort((x, y) => (used.includes(y.name) - used.includes(x.name)) || (used.indexOf(x.name) - used.indexOf(y.name))).slice(0, 8);
    h = '<div class="stage-h"><h3>' + plural(b.modes, "mode") + ", " + plural(b.gaits, "gait") + '</h3><span>written by ' + esc(b.primitives_model || "the model") + (b.primitives_cost_usd != null ? " for $" + fmt(b.primitives_cost_usd, 3) : "") + '</span></div><div class="prim-grid">' +
      ps.map(p => '<div class="prim ' + (used.includes(p.name) ? "" : "unused") + '"><div class="frame">' + (p.video ? vtag(p.video) : "") + "</div><b>" + esc(p.name) + "</b><span>" + esc(primAbout(b, p.name) || p.type) + "</span>" + (used.includes(p.name) ? '<em class="use">Used in this clip</em>' : "") + "</div>").join("") + "</div>";
  } else if (step === 2) {
    const calls = side?.calls ?? (side?.call_log || []).length;
    h = '<div class="stage-h"><h3>' + esc(cap(c.skill)) + ", " + plural((prog?.keyframes || []).length, "keyframe") + " over " + fmt(prog?.duration_s, 1) + ' s</h3><span>' + esc(side?.model || "") + " · " + plural(calls, "call") + " · $" + fmt(side?.cost_usd, 4) + '</span></div><p class="foot-note" style="margin:-8px 0 20px">“' + esc(S.meta.skill_text[c.skill] || "") + '”</p><div id="mk-tl"></div><pre class="pexcerpt">' + esc(programText(prog, 4)) + "</pre>";
  } else {
    const checks = Object.entries(side?.filters || {}).filter(([, v]) => v && typeof v === "object" && "pass" in v);
    const ok = side?.filters?.pass ?? checks.every(([, v]) => v.pass);
    h = '<div class="stage-h"><h3>' + (ok ? "Physically possible" : "Fails a check") + '</h3><span>' + checks.filter(([, v]) => v.pass).length + " of " + checks.length + ' checks pass on all ' + fmt(c.frames) + ' frames</span></div><div class="checked"><div><div class="frame">' + vtag(c.video) + '</div><p class="foot-note"><a class="link" href="#/clip/' + esc(c.id) + '">Open this clip ' + ARR + "</a></p></div>" +
      '<table class="cks">' + checks.map(([k, v]) => '<tr><td>' + esc(CHECK_NAMES[k] || nice(k)) + '</td><td class="r">' + esc(worstShort(v)) + '</td><td class="r ' + (v.pass ? "pass" : "fail") + '">' + (v.pass ? "Pass" : "Fail") + "</td></tr>").join("") + "</table></div>";
  }
  const swap = () => {
    unwire(stage); stage.innerHTML = h; wire(stage); schedule(); stage.classList.remove("swap");
    if (step === 2 && prog) {
      const T = prog.duration_s, t0 = performance.now();
      const tl = Timeline($("#mk-tl"), prog, { max: 7, compact: true });
      const tick = now => { tl.set(((now - t0) / 1000) % T); MK.raf = requestAnimationFrame(tick); };
      if (!RM) MK.raf = requestAnimationFrame(tick); else tl.set(0);
    }
  };
  if (!stage.children.length || RM) swap(); else { stage.classList.add("swap"); setTimeout(swap, 220); }
}
function programText(p, n) {
  if (!p) return "";
  const kf = (p.keyframes || []).slice(0, n).map(k => {
    const parts = ["t=" + k.t];
    for (const [a, v] of Object.entries({ ...(k.modes || {}), ...(k.joints || {}) })) parts.push(a + ":" + v);
    if (k.gait) parts.push("gait " + k.gait.name);
    return parts.join("  ");
  });
  const more = (p.keyframes || []).length - n;
  return kf.join("\n") + (more > 0 ? "\n… " + more + " more keyframes" : "");
}
function unitVal(v, key) {
  if (typeof v !== "number") return String(v);
  if (/_m$/.test(key)) return fmt(v * 1000, v * 1000 < 10 ? 1 : 0) + " mm";
  if (/_rad$/.test(key)) return fmt(v, 3) + " rad";
  return fmt(v, 3);
}
function worstKeys(v) {
  const wk = Object.keys(v).find(x => /^(worst|max)_/.test(x) && typeof v[x] === "number");
  const lk = Object.keys(v).find(x => /^limit/.test(x));
  return [wk, lk];
}
function worstShort(v) { const [wk, lk] = worstKeys(v); if (!wk) return ""; return unitVal(v[wk], wk) + (lk ? " / " + unitVal(v[lk], lk) : ""); }


// ---- 4. robots by skills: body-plan groups that fold to a total row, sticky edges, name search, rows built on open
const MX = { open: new Set(), q: "", pvTok: 0 };
function groups() {
  return S.groups ||= kindOrder().map(k => {
    const bs = S.bodies.filter(b => b.kind === k).sort((a, b) => a.held_out - b.held_out || prefIdx(a.body) - prefIdx(b.body));
    return { k, label: bs[0].kind_label, bodies: bs };
  });
}
const BIG = () => S.bodies.length > 40;
function mxCell(p, t, attrs) { return '<td><a ' + attrs + ' style="--p:' + (t ? p / t : 0).toFixed(2) + '">' + p + '<span class="g">/' + t + "</span></a></td>"; }
function mxRows(bs) {
  let h = "";
  for (const b of bs) {
    h += '<tr><th scope="row"><span class="rn">' + esc(name(b.body)) + "</span>" + (b.held_out ? "<small>held out</small>" : "") + "</th>";
    for (const s of S.skills) {
      const c = cell(b.body, s);
      h += c ? mxCell(c[1], c[0], 'href="#/clip/' + esc(c[2]) + '" data-b="' + esc(b.body) + '" data-s="' + esc(s) + '" aria-label="' + esc(name(b.body)) + ", " + esc(nice(s)) + ": " + c[1] + " of " + c[0] + ' takes pass the label check"') : '<td class="none"><span aria-label="no clips">–</span></td>';
    }
    h += "</tr>";
  }
  return h;
}
function mxGroup(g, bodies, forceOpen) {
  const open = forceOpen || MX.open.has(g.k);
  let h = '<tbody data-k="' + esc(g.k) + '"><tr class="grp"><th scope="rowgroup"><button type="button" class="gt" data-k="' + esc(g.k) + '" aria-expanded="' + open + '"' + (forceOpen ? " disabled" : "") + ">" + CHEV + esc(g.label) + ' <span>' + fmt(bodies.length) + "</span></button></th>";
  if (open) h += '<td colspan="' + S.skills.length + '"></td>';
  else for (const s of S.skills) {
    let t = 0, p = 0;
    for (const b of g.bodies) { const c = cell(b.body, s); if (c) { t += c[0]; p += c[1]; } }
    h += t ? '<td class="sum"><span style="--p:' + (p / t).toFixed(2) + '">' + fmt(p) + '<span class="g">/' + fmt(t) + "</span></span></td>" : '<td class="none"><span aria-label="no clips">–</span></td>';
  }
  return h + "</tr>" + (open ? mxRows(bodies) : "") + "</tbody>";
}
function mxBody() {
  const q = MX.q.trim().toLowerCase();
  if (!q) { MX.note = BIG() ? "Open a body plan to see its robots." : ""; return groups().map(g => mxGroup(g, g.bodies)).join(""); }
  const CAP = 60; let n = 0, shown = 0, h = "";
  for (const g of groups()) {
    const m = g.bodies.filter(b => (b.label + " " + b.body + " " + g.label).toLowerCase().includes(q));
    n += m.length;
    const take = m.slice(0, Math.max(0, CAP - shown)); shown += take.length;
    if (take.length) h += mxGroup(g, take, true);
  }
  MX.note = n ? (n > shown ? "Showing " + fmt(shown) + " of " + plural(n, "match", "matches") + "." : plural(n, "robot") + " match.") : "";
  return h || '<tbody><tr><th scope="row" class="mx-empty">No robot matches “' + esc(MX.q) + '”.</th></tr></tbody>';
}
function matrixSection() {
  MX.open = new Set(BIG() ? [] : groups().map(g => g.k)); MX.q = "";
  const body = mxBody();
  return '<section class="sec wrap" id="cover"><p class="stmt"><b>' + plural(S.skills.length, "skill") + ', one sentence each.</b> The same sentence goes to robots of every body plan.</p><div class="stmt-sub"><p>Each cell counts one robot\'s takes of one skill that pass the label check, out of all its takes: 2/3 is two of three. A closed body plan shows its totals. The label check is a strict automatic test of the skill\'s definition, and many correct clips fail it. Point at a cell to watch it; click to open it.</p></div>' +
    '<div class="sec-body mx-tools"><label class="find"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3 3"/></svg><input id="mx-q" type="search" placeholder="Find a robot" aria-label="Find a robot by name" autocomplete="off"></label><span class="mx-note" id="mx-note" aria-live="polite">' + esc(MX.note) + '</span><span class="mx-dims">' + plural(S.bodies.length, "robot") + " · " + plural(groups().length, "body plan") + " · " + plural(S.skills.length, "skill") + "</span></div>" +
    '<div class="mx-layout"><div class="mx-box" id="mx-box" tabindex="0" role="region" aria-label="Robots by skills, scrolls in both directions"><table class="mx" id="mx"><thead><tr><th class="corner" scope="col">Robot</th>' + S.skills.map(s => '<th scope="col" data-s="' + esc(s) + '"><span>' + esc(cap(s)) + "</span></th>").join("") + "</tr></thead>" + body + '</table></div><aside class="pv" id="pv" aria-live="polite"></aside></div></section>';
}
function mxWire() {
  const mx = $("#mx");
  const on = a => {
    if (!a || !a.dataset.s) return;
    $$("#mx a.on").forEach(x => x.classList.remove("on")); a.classList.add("on");
    $$("#mx thead th.on").forEach(th => th.classList.remove("on"));
    mx.querySelector('thead th[data-s="' + CSS.escape(a.dataset.s) + '"]')?.classList.add("on");
    pvRender(a.dataset.b, a.dataset.s);
  };
  mx.addEventListener("mouseover", e => on(e.target.closest("a[data-s]")));
  mx.addEventListener("focusin", e => on(e.target.closest("a[data-s]")));
  mx.addEventListener("click", e => {
    const t = e.target.closest(".gt"); if (!t || t.disabled) return;
    const k = t.dataset.k, g = groups().find(x => x.k === k);
    MX.open.has(k) ? MX.open.delete(k) : MX.open.add(k);
    const tb = mx.querySelector('tbody[data-k="' + CSS.escape(k) + '"]');
    tb.outerHTML = mxGroup(g, g.bodies);
    mx.querySelector('tbody[data-k="' + CSS.escape(k) + '"] .gt').focus();
  });
  const q = $("#mx-q");
  q.addEventListener("input", debounce(() => { MX.q = q.value; $$("#mx tbody").forEach(t => t.remove()); mx.insertAdjacentHTML("beforeend", mxBody()); $("#mx-note").textContent = MX.note; }, 140));
  MX.seen = new Promise(res => { const vio = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { vio.disconnect(); res(); } }); vio.observe($("#pv")); cleanup.push(() => vio.disconnect()); });
  const first = lineupOrder(S.skills.includes(FIRST_SKILL) ? FIRST_SKILL : S.skills[0])[0];
  if (first) pvRender(first.body, first.skill);
}
async function pvRender(body, skill) {
  const pv = $("#pv"); if (!pv) return;
  const best = bestOf(body, skill); if (!best) return;
  const tok = ++MX.pvTok, c = cell(body, skill);
  unwire(pv);
  pv.innerHTML = '<a class="tile" href="#/clip/' + esc(best.id) + '" tabindex="-1"><div class="frame">' + (best.video ? vtag(best.video) : '<img src="' + ROOT + 'media/' + esc(S.bodyOf[body].still) + '" alt="">') + '</div></a><h3>' + esc(cap(skill)) + ' <span class="g">on ' + esc(name(body)) + "</span></h3><p>" + esc(S.meta.skill_text[skill] || "") + '</p><p class="g pv-n">' + plural(c[0], "take") + ", " + fmt(c[1]) + ' pass the label check</p><div class="takes" id="pv-takes"></div>';
  wire(pv); schedule();
  await Promise.all([MX.seen, new Promise(r => setTimeout(r, 250))]);   // only once the preview is on screen and the pointer has settled
  if (tok !== MX.pvTok) return;
  const rows = await bodyFile(body);   // the individual takes live in that robot's own file
  if (tok !== MX.pvTok || !rows) return;
  const cs = rows.filter(x => x.src === "skill" && x.skill === skill).sort((a, b) => (a.arm > b.arm ? -1 : a.arm < b.arm ? 1 : a.v - b.v));
  $("#pv-takes").innerHTML = cs.map(x => '<a href="#/clip/' + esc(x.id) + '"><b>' + esc(ARM[x.arm] || x.arm) + " v" + x.v + '</b><span class="' + (x.label ? "pass" : "g") + '">' + (x.label ? "Label check passes" : "Label check fails") + "</span></a>").join("");
}

// ---- 5. robots: one shelf, grouped by body plan, packed into rows; capped per group once the set is large
const RB = { open: new Set(), q: "", cols: 0, all: false };
function rbTile(b) {
  const c = bestOf(b.body, FIRST_SKILL)?.video ? bestOf(b.body, FIRST_SKILL) : Object.keys(S.cells[b.body] || {}).map(s => bestOf(b.body, s)).find(x => x?.video);
  const n = (b.counts?.skill || 0) + (b.counts?.taskblind || 0) + (b.counts?.procedural || 0);
  return '<a class="robot tile" href="#/robot/' + esc(b.body) + '" data-v="' + esc(c?.video || "") + '"><div class="frame"><img src="' + ROOT + 'media/' + esc(b.still) + '" alt="" loading="lazy" decoding="async"></div><div class="cap"><b>' + esc(name(b.body)) + "</b><span>" + joints(b) + " joints · " + plural(n, "clip") + "</span>" + (b.held_out ? '<span class="ho">Held out for transfer tests</span>' : "") + "</div></a>";
}
function pack(items, cols) {             // first-fit decreasing into rows of cols; returns items in row order and the row count
  const rows = [];
  for (const it of items.slice().sort((a, b) => b.span - a.span)) {
    const r = rows.find(r => r.free >= it.span);
    if (r) { r.items.push(it); r.free -= it.span; } else rows.push({ free: cols - it.span, items: [it] });
  }
  return { order: rows.flatMap(r => r.items), rows: rows.length };
}
function rbLayout(gs, cols, target, phone) {
  const full = pack(gs.map(g => ({ g, span: Math.min(g.bodies.length, cols) })), cols);
  const wraps = gs.reduce((a, g) => a + Math.max(0, Math.ceil(g.bodies.length / cols) - 1), 0);
  if (full.rows + wraps <= target) return { cols, cap: Infinity, order: full.order };
  for (let per = phone ? 1 : 2; per <= cols; per++) {
    const capN = Math.floor(cols / per), c2 = capN * per;
    const p = pack(gs.map(g => ({ g, span: Math.min(g.bodies.length, capN) })), c2);
    if (p.rows <= target || capN === 1 || phone) return { cols: c2, cap: capN, order: p.order };
  }
  return { cols, cap: 1, order: full.order };
}
function robotsSection(page) {
  Object.assign(RB, { page: !!page, q: "", all: false }); RB.open.clear();
  const st = S.meta.stats, gs = groups();
  const menag = S.bodies.filter(b => /menagerie/i.test(b.origin || "")).length, proc = S.bodies.filter(isProc).length, atlas = S.bodies.filter(b => /animal atlas/i.test(b.origin || "")).length;
  return '<section class="' + (page ? "wrap page" : "sec wrap") + '" id="robots"><' + (page ? "h1" : "p") + ' class="stmt"><b>' + plural(S.bodies.length, "robot") + ", " + plural(gs.length, "body plan") + ".</b> " + fmt(menag) + " from MuJoCo Menagerie, " + fmt(proc) + " generated procedurally" + (atlas ? ", " + fmt(atlas) + " animal robots by Yi Zhou" : "") + ".</" + (page ? "h1" : "p") + '><div class="stmt-sub"><p>' + fmt(S.bodies.filter(b => b.held_out).length) + ' are held out for transfer tests. Each robot\'s primitives were written once, from its model alone, and every clip on that robot is composed from them.</p>' + (page ? "" : '<a class="link" href="#/robots">All robots ' + ARR + "</a>") + "</div>" +
    (S.bodies.length > 30 ? '<div class="sec-body mx-tools"><label class="find"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3 3"/></svg><input id="rb-q" type="search" placeholder="Find a robot" aria-label="Find a robot by name" autocomplete="off"></label><span class="mx-note" id="rb-note" aria-live="polite"></span></div>' : "") +
    '<div class="sec-body rgroups" id="rg"></div></section>';
}
function rbRender() {
  const box = $("#rg"); if (!box) return;
  const phone = innerWidth < 640;
  const cols = phone ? 3 : Math.max(4, Math.min(7, Math.floor(box.clientWidth / 180)));
  RB.cols = cols;
  const q = RB.q.trim().toLowerCase();
  let h = "";
  if (q) {
    const m = S.bodies.filter(b => (b.label + " " + b.body + " " + b.kind_label).toLowerCase().includes(q)), CAP = cols * 3;
    $("#rb-note").textContent = m.length > CAP ? "Showing " + CAP + " of " + plural(m.length, "match", "matches") + "." : plural(m.length, "robot") + " match.";
    box.style.setProperty("--cols", cols);
    h = m.length ? '<div class="rgroup" style="--n:' + cols + '"><div class="rgrid">' + m.slice(0, CAP).map(rbTile).join("") + "</div></div>" : '<p class="note">No robot matches “' + esc(RB.q) + "”.</p>";
  } else {
    if ($("#rb-note")) $("#rb-note").textContent = "";
    const gs = groups(), G = RB.page ? (phone ? 16 : 60) : phone ? 8 : 24, cut = !RB.all && gs.length > G + 2; RB.G = G;
    const L = rbLayout(cut ? gs.slice(0, G) : gs, cols, RB.page ? (phone ? 20 : 12) : phone ? 10 : 6, phone);
    box.style.setProperty("--cols", L.cols);
    h = L.order.map(({ g, span }) => {
      const open = RB.open.has(g.k), n = g.bodies.length, show = open ? g.bodies : g.bodies.slice(0, L.cap === Infinity ? n : L.cap);
      const s = open ? L.cols : span;
      const more = n > Math.min(n, L.cap) ? '<button type="button" class="more-btn" data-k="' + esc(g.k) + '" aria-expanded="' + open + '">' + (open ? "Show fewer" : "Show all " + fmt(n)) + "</button>" : "";
      return '<div class="rgroup' + (open ? " open" : "") + '" data-k="' + esc(g.k) + '" style="--n:' + s + ";--m:" + Math.min(s, L.cols) + '"><h3>' + esc(g.label) + " <span>" + fmt(n) + "</span>" + more + '</h3><div class="rgrid">' + show.map(rbTile).join("") + "</div></div>";
    }).join("") + (cut ? '<p class="rg-more"><button type="button" class="btn ghost" id="rb-all">Show all ' + plural(gs.length, "body plan") + "</button></p>" : "");
  }
  box.innerHTML = h;
}
function rbWire() {
  rbRender();
  const box = $("#rg");
  box.addEventListener("click", e => {
    if (e.target.closest("#rb-all")) { const k = groups()[RB.G]?.k || ""; RB.all = true; rbRender(); box.querySelector('.rgroup[data-k="' + CSS.escape(k) + '"] a')?.focus(); return; }
    const t = e.target.closest(".more-btn"); if (!t) return;
    const k = t.dataset.k; RB.open.has(k) ? RB.open.delete(k) : RB.open.add(k);
    rbRender(); box.querySelector('.more-btn[data-k="' + CSS.escape(k) + '"]')?.focus();
  });
  // hover or focus plays the robot's clip in place of its still
  const start = r => {
    if (!r || !r.dataset.v || RM) return;
    let v = r.querySelector("video");
    if (!v) { v = document.createElement("video"); v.muted = true; v.loop = true; v.playsInline = true; v.src = ROOT + "media/" + r.dataset.v; r.querySelector(".frame").appendChild(v); v.addEventListener("playing", () => v.classList.add("on")); }
    v.play().catch(() => {}); v.classList.add("on");
  };
  const stop = r => { const v = r?.querySelector("video"); if (v) { v.pause(); v.classList.remove("on"); } };
  box.addEventListener("mouseover", e => { const r = e.target.closest(".robot"); if (r && !r.contains(e.relatedTarget)) start(r); });
  box.addEventListener("mouseout", e => { const r = e.target.closest(".robot"); if (r && !r.contains(e.relatedTarget)) stop(r); });
  box.addEventListener("focusin", e => start(e.target.closest(".robot")));
  box.addEventListener("focusout", e => stop(e.target.closest(".robot")));
  const q = $("#rb-q");
  if (q) q.addEventListener("input", debounce(() => { RB.q = q.value; rbRender(); }, 140));
}

function wireHome(app) {
  pkBuild();
  luRender(S.skills.includes(FIRST_SKILL) ? FIRST_SKILL : S.skills[0]);
  $("#lu-prev").onclick = () => { manual(); luRender(LU.skill, false, LU.page - 1); };
  $("#lu-next").onclick = () => { manual(); luRender(LU.skill, false, LU.page + 1); };
  srcRender(0);
  mkInit();
  mxWire();
  rbWire();
  const onResize = debounce(() => {
    if (luPer() !== LU.per) luRender(LU.skill, false, 0);
    const box = $("#rg"); if (box && (innerWidth < 640 ? 3 : Math.max(4, Math.min(7, Math.floor(box.clientWidth / 180)))) !== RB.cols) rbRender();
  }, 150);
  addEventListener("resize", onResize); cleanup.push(() => removeEventListener("resize", onResize));
  // the auto-advancing panels pause while they are off screen
  const pio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle("paused", !e.isIntersecting)), { threshold: .25 });
  [$("#lu"), $("#mk-body")].forEach(el => { el.classList.add("paused"); pio.observe(el); });
  cleanup.push(() => { pio.disconnect(); cancelAnimationFrame(MK.raf); });
  if (RM) { $("#lu").classList.remove("auto"); $("#mk-body").classList.remove("auto"); }
  $("#copy").onclick = copyCode;
}
function getSection(page) {
  const repo = S.meta.hf_repo;
  const code = '<span class="c"># pip install huggingface_hub numpy</span>\n<span class="k">from</span> huggingface_hub <span class="k">import</span> snapshot_download\n<span class="k">import</span> json, numpy <span class="k">as</span> np\n\nroot = snapshot_download(\n    <span class="s">"' + esc(repo) + '"</span>, repo_type=<span class="s">"dataset"</span>,\n    allow_patterns=[<span class="s">"index/*"</span>, <span class="s">"bodies/unitree_go2.*"</span>,\n                    <span class="s">"primitives/unitree_go2.json"</span>, <span class="s">"clips/unitree_go2/*"</span>])\nrows = [json.loads(l) <span class="k">for</span> l <span class="k">in</span> open(f<span class="s">"{root}/index/clips.jsonl"</span>)]\ngo2 = [r <span class="k">for</span> r <span class="k">in</span> rows\n       <span class="k">if</span> r[<span class="s">"body"</span>] == <span class="s">"unitree_go2"</span> <span class="k">and</span> r[<span class="s">"valid"</span>]]\nclip = np.load(f<span class="s">"{root}/{go2[0][\'npz\']}"</span>)\n<span class="c"># (frames, nq) in bodies/unitree_go2.xml\'s qpos order</span>\nqpos = clip[<span class="s">"qpos"</span>]\n<span class="k">print</span>(go2[0][<span class="s">"skill"</span>], qpos.shape, clip[<span class="s">"fps"</span>])';
  const files = [["index/clips.jsonl", "One row per clip: robot, skill, arm, checks, label check, model, tokens, cost, file paths."], ["clips/<robot>/<skill>_<arm>_v<k>.npz", "qpos, qvel, tip positions, contacts, fps."], ["clips/…/*.json", "The clip's program, every check with its worst value, repair history, model calls."], ["procedural/<robot>/*.npz", "Gait, balance, drive and random clips made without a model."], ["primitives/<robot>.json", "The robot's primitives and gaits, their coverage, the model that wrote them."], ["bodies/<robot>.xml, .json", "The MuJoCo model each clip is in, and its measured description."], ["index/bodies.jsonl, primitives.jsonl", "One row per robot and per primitive."]];
  return '<section class="dark' + (page ? " dark-page" : "") + '" id="get"><div class="wrap"><' + (page ? "h1" : "p") + ' class="stmt"><b>Plain files on Hugging Face.</b> Pull one robot or the whole set.</' + (page ? "h1" : "p") + ">" +
    '<div class="stmt-sub"><div class="sub-ps"><p>NumPy arrays for the motion, JSON for everything else. The clips are kinematic: poses, contacts and support are physically possible, but no dynamics were simulated.</p>' + licenceHTML() + '</div><div class="actions"><a class="btn" href="' + esc(hfURL()) + '" target="_blank" rel="noopener">Download dataset ' + ARR + '</a></div></div>' +
    '<div class="get"><div class="code"><div class="bar"><span>load_go2.py</span><button class="btn sm" type="button" id="copy">Copy</button></div><pre id="code">' + code + '</pre></div><table class="files"><tbody>' + files.map(f => "<tr><td>" + esc(f[0]) + "</td><td>" + esc(f[1]) + "</td></tr>").join("") + "</tbody></table></div>" +
    footHTML(true) + "</div></section>";
}

// ------------------------------------------------------------------ shared page parts
const LIC_URL = "https://creativecommons.org/licenses/by-nc/4.0/";
const licenceHTML = () => '<p class="lic">Licence: <a href="' + LIC_URL + '" target="_blank" rel="noopener">CC BY-NC 4.0</a>, free for non-commercial use with credit. For commercial use, contact the authors through the dataset\'s <a href="' + esc(hfURL()) + '/discussions" target="_blank" rel="noopener">Community tab</a>. Robot models derived from MuJoCo Menagerie keep their own licences.</p>';
function footHTML(dark) {
  const built = new Date(S.meta.built);
  return '<footer class="' + (dark ? "foot" : "light-foot") + '">' + creditsHTML() + '<span><b>Rigby</b> kinematic motion dataset · ' + esc(S.meta.hf_repo) + ' · licence <a href="' + LIC_URL + '" target="_blank" rel="noopener">CC BY-NC 4.0</a>; for commercial use, contact the authors</span>' +
    "<span>" + (dark ? "Release built " + (Number.isNaN(+built) ? "" : built.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })) : "Clips are kinematic: physically possible poses and contacts, not simulated dynamics.") + "</span></footer>";
}
const S_CAP = {};                       // which capped lists the reader opened, by key
function capped(key, xs, cap, render, cls, unit) {
  const open = S_CAP[key], show = open ? xs : xs.slice(0, cap);
  return '<div class="' + cls + '" data-cap="' + esc(key) + '">' + show.map(render).join("") + "</div>" +
    (xs.length > cap ? '<p class="cap-more"><button type="button" class="more-btn" data-capk="' + esc(key) + '" aria-expanded="' + !!open + '">' + (open ? "Show fewer" : "Show all " + plural(xs.length, unit)) + "</button></p>" : "");
}
function wireCapped(root, redraw) {
  root.addEventListener("click", e => {
    const t = e.target.closest("[data-capk]"); if (!t) return;
    const k = t.dataset.capk; S_CAP[k] = !S_CAP[k];
    redraw(k); root.querySelector('[data-capk="' + CSS.escape(k) + '"]')?.focus();
  });
}
function pageHead(h, sub, right = "") {
  return '<header class="phead"><h1 class="stmt">' + h + "</h1>" + (sub || right ? '<div class="stmt-sub">' + (sub ? "<p>" + sub + "</p>" : "<span></span>") + right + "</div>" : "") + "</header>";
}

// ------------------------------------------------------------------ clips: every clip, filtered; a slim index read only on this route
const IX = { rows: null, text: null };
const F0 = { src: "skill", skill: "", kind: "", body: "", arm: "", valid: "", label: "", human: "", q: "", n: 24 };
const F = { ...F0 };
const PAGE = 24;
async function loadIndex() {
  if (IX.rows) return IX;
  const x = await getJSON(dataURL("index.json"));
  if (!x || !Array.isArray(x.rows)) throw new Error("data/index.json could not be read");
  Object.assign(IX, x);
  IX.bi = Object.fromEntries(IX.bodies.map((b, i) => [b, i]));
  return IX;
}
function rowClip(r) {                    // one index row as the clip fields a card needs
  const body = IX.bodies[r[0]], src = IX.srcs[r[1]], skill = r[2] < 0 ? null : IX.skills[r[2]], arm = r[3] < 0 ? null : IX.arms[r[3]], v = r[4];
  const stem = r[7] === "" ? (skill || src) + "_" + arm + "_v" + v : r[7][0] === "~" ? body + "__" + r[7].slice(1) : r[7];
  const fl = r[5], human = fl & 16 ? "yes" : fl & 32 ? "no" : fl & 64 ? "unsure" : null;
  return { id: body + "/" + stem, body, src, skill, arm, v, dur: r[6], valid: !!(fl & 1), label: fl & 2 ? true : fl & 4 ? false : null, human,
    failed: r[8] < 0 ? [] : [IX.checks[r[8]]], video: r[9] === 0 ? null : r[9] === 1 ? (src === "procedural" ? "procedural" : "clips") + "/" + body + "/" + stem + ".mp4" : r[9] };
}
function kindMatch(k) { k = k.toLowerCase(); return b => b.kind === k || (b.kind_label || "").toLowerCase() === k; }
function tests(except) {                 // one predicate per active filter, over raw index rows
  const t = [];
  const on = k => k !== except && F[k] !== "";
  if (on("src")) { const i = IX.srcs.indexOf(F.src); t.push(r => r[1] === i); }
  if (on("skill")) { const i = IX.skills.indexOf(F.skill); t.push(r => r[2] === i); }
  if (on("body")) { const i = IX.bi[F.body] ?? -2; t.push(r => r[0] === i); }
  if (on("kind")) { const m = kindMatch(F.kind), ok = new Set(IX.bodies.map((b, i) => m(S.bodyOf[b] || {}) ? i : -1)); t.push(r => ok.has(r[0])); }
  if (on("arm")) { const i = IX.arms.indexOf(F.arm); t.push(r => r[3] === i); }
  if (on("valid")) { const w = F.valid === "1"; t.push(r => !!(r[5] & 1) === w); }
  if (on("label")) { const bit = F.label === "1" ? 2 : 4; t.push(r => !!(r[5] & bit)); }
  if (on("human")) { const bit = F.human === "yes" ? 16 : F.human === "no" ? 32 : 112; t.push(r => !!(r[5] & bit)); }
  if (on("q") && F.q.trim()) {
    const q = F.q.trim().toLowerCase();
    IX.text ||= IX.rows.map(r => (name(IX.bodies[r[0]]) + " " + IX.bodies[r[0]] + " " + (r[2] < 0 ? "" : nice(IX.skills[r[2]])) + " " + IX.srcs[r[1]] + " " + nice(String(r[4] ?? ""))).toLowerCase());
    t.push((r, i) => IX.text[i].includes(q));
  }
  return t;
}
function shelfOrder(xs) {               // renders first, then one clip per robot in turn, robots in body-plan variety order
  const pos = S.bodyPos ||= Object.fromEntries(diverse(S.bodies.map(b => ({ body: b.body }))).map((x, i) => [x.body, i]));
  const NB = IX.bodies.length, n = new Map(), seen = new Map(), key = new Map(), g = r => r[0] * 2 + (r[9] === 0 ? 1 : 0);
  for (const r of xs) n.set(g(r), (n.get(g(r)) || 0) + 1);
  for (const r of xs) {
    const k = g(r), j = seen.get(k) || 0, p = pos[IX.bodies[r[0]]] ?? r[0];
    seen.set(k, j + 1);
    key.set(r, (r[9] === 0 ? 1e9 : 0) + ((j + p * 5) % n.get(k)) * NB + p);   // each robot starts at a different clip of its own
  }
  return xs.slice().sort((a, b) => key.get(a) - key.get(b));
}
function filtered(except) { const t = tests(except); return t.length ? IX.rows.filter((r, i) => t.every(f => f(r, i))) : IX.rows; }
function facet(key) {                    // the options of one filter, each with how many clips it would show beside the others
  const rows = filtered(key), n = new Map(), inc = v => n.set(v, (n.get(v) || 0) + 1);
  const opts = [["", key === "body" ? "Any robot" : "Any", rows.length]];
  if (key === "src") { rows.forEach(r => inc(r[1])); return [["skill", "Skill clips"], ["taskblind", "Task-blind"], ["procedural", "Procedural"]].map(([v, t]) => [v, t, n.get(IX.srcs.indexOf(v)) || 0]).concat([["", "All", rows.length]]); }
  if (key === "skill") { rows.forEach(r => r[2] >= 0 && inc(r[2])); return opts.concat(S.skills.map(s => [s, cap(s), n.get(IX.skills.indexOf(s)) || 0])); }
  if (key === "body") { rows.forEach(r => inc(r[0])); return opts.concat(groups().flatMap(g => g.bodies).map(b => [b.body, name(b.body), n.get(IX.bi[b.body]) || 0, b.kind_label])); }
  if (key === "kind") { rows.forEach(r => inc((S.bodyOf[IX.bodies[r[0]]] || {}).kind)); return opts.concat(groups().map(g => [g.label, g.label, n.get(g.k) || 0])); }
  if (key === "arm") { rows.forEach(r => r[3] >= 0 && inc(r[3])); return opts.concat(IX.arms.map((a, i) => [a, ARM[a] || cap(a), n.get(i) || 0]).filter(o => o[2] || o[0] === F.arm)); }
  const bits = key === "valid" ? [["1", "Physically possible", 1], ["0", "Fails a check", -1]] : key === "label" ? [["1", "Passes", 2], ["0", "Fails", 4]] : [["yes", "Looks right", 16], ["no", "Looks wrong", 32], ["rated", "Rated", 112]];
  return opts.concat(bits.map(([v, t, bit]) => [v, t, rows.reduce((a, r) => a + (bit < 0 ? !(r[5] & 1) : !!(r[5] & bit)), 0)]));
}
const FILTERS = [["skill", "Skill"], ["kind", "Body plan"], ["body", "Robot"], ["arm", "Made with"], ["label", "Label check"], ["human", "Human rating"], ["valid", "Physics"]];
function fLabel(key) {
  const v = F[key]; if (v === "") return "";
  if (key === "skill") return cap(v);
  if (key === "body") return name(v);
  if (key === "kind") { const b = S.bodies.find(kindMatch(v)); return b ? b.kind_label : v; }
  if (key === "arm") return ARM[v] || cap(v);
  if (key === "label") return v === "1" ? "Passes" : "Fails";
  if (key === "valid") return v === "1" ? "Physically possible" : "Fails a check";
  return v === "yes" ? "Looks right" : v === "no" ? "Looks wrong" : "Rated";
}
function browseHash() {
  const p = [];
  for (const k of Object.keys(F0)) if (k === "src" ? F.src !== F0.src : k === "n" ? F.n !== PAGE : F[k] !== "") p.push(encodeURIComponent(k) + "=" + encodeURIComponent(F[k]));
  return "#/browse" + (p.length ? "/" + p.join("&") : "");
}
function browsePage(app, params) {
  Object.assign(F, F0);
  for (const k of Object.keys(F0)) if (params.has(k)) F[k] = k === "n" ? Math.min(600, Math.max(PAGE, Math.ceil((+params.get(k) || PAGE) / PAGE) * PAGE)) : params.get(k);
  app.innerHTML = '<div class="wrap page br">' +
    pageHead("<b>Every clip in the release.</b> Filter by robot, skill, source or check, then open any one.", "", '<div class="br-r"><span class="br-n" id="br-n" aria-live="polite"></span><button class="btn sm ghost" type="button" id="br-rand">Random clip</button></div>') +
    '<div class="br-src" role="group" aria-label="Source" id="br-src"></div>' +
    '<div class="br-f" id="br-f"><label class="find"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3 3"/></svg><input id="br-q" type="search" placeholder="Search robot or skill" aria-label="Search clips by robot or skill" autocomplete="off" value="' + esc(F.q) + '"></label>' +
    FILTERS.map(([k, t]) => '<div class="dd" data-k="' + k + '"><button type="button" class="fbtn" id="dd-' + k + '" aria-haspopup="dialog" aria-expanded="false" aria-controls="ddp-' + k + '"><span class="fl">' + t + '</span><span class="fv"></span>' + CHEV + '</button><div class="pk-pop dd-pop" id="ddp-' + k + '" role="dialog" aria-label="' + t + '" hidden></div></div>').join("") +
    '<button type="button" class="more-btn br-clear" id="br-clear" hidden>Clear filters</button></div>' +
    '<div class="br-grid" id="br-grid"><p class="note">Loading the clip index…</p></div>' +
    '<div class="br-more" id="br-more" hidden><button class="btn ghost" type="button" id="br-moreb">Show more</button><span class="g" id="br-shown"></span></div>' +
    footHTML(false) + "</div>";
  return loadIndex().then(() => { if (location.hash.startsWith("#/browse")) wireBrowse(); }, e => { $("#br-grid").innerHTML = '<p class="note">' + esc(e.message) + "</p>"; restoreScroll(); });
}
function card(c) {
  const b = S.bodyOf[c.body] || {};
  const title = c.src === "skill" ? cap(c.skill) : c.src === "taskblind" ? "Task-blind" : cap(c.arm);
  const sub = c.src === "procedural" ? nice(c.v) : (ARM[c.arm] || c.arm) + " v" + c.v;
  const marks = ['<span class="' + (c.valid ? "pass" : "fail") + '">' + (c.valid ? "Possible" : "Fails " + esc(nice(c.failed[0] || "a check"))) + "</span>"];
  if (c.src === "skill" && c.label != null) marks.push('<span class="' + (c.label ? "pass" : "fail") + '">Label ' + (c.label ? "passes" : "fails") + "</span>");
  if (c.human) marks.push('<span class="' + (c.human === "yes" ? "pass" : c.human === "no" ? "fail" : "") + '">' + (c.human === "yes" ? "Looks right" : c.human === "no" ? "Looks wrong" : "Rated " + esc(c.human)) + "</span>");
  return '<a class="card tile" href="#/clip/' + esc(c.id) + '"><div class="frame">' + (c.video ? vtag(c.video) : b.still ? '<img src="' + ROOT + 'media/' + esc(b.still) + '" alt="" loading="lazy" decoding="async"><span class="nr">No render</span>' : "") + "</div>" +
    '<div class="ccap"><div class="r1"><b>' + esc(name(c.body)) + "</b><span>" + fmt(c.dur, 1) + ' s</span></div><div class="r2">' + esc(title) + ' <span class="g">· ' + esc(sub) + '</span></div><div class="r3">' + marks.join("") + "</div></div></a>";
}
function wireBrowse() {
  const grid = $("#br-grid"), q = $("#br-q");
  const sync = () => history.replaceState(history.state, "", browseHash());
  const drawControls = () => {
    $("#br-src").innerHTML = facet("src").map(([v, t, n]) => '<button type="button" class="pk-i" data-v="' + v + '" aria-pressed="' + (F.src === v) + '">' + esc(t) + ' <span class="g">' + fmt(n) + '</span><span class="pr" aria-hidden="true"></span></button>').join("");
    $$(".dd", $("#br-f")).forEach(d => {
      const k = d.dataset.k, v = fLabel(k), b = $(".fbtn", d);
      d.hidden = k === "valid" && F.valid === "" && !IX.rows.some(r => !(r[5] & 1));
      b.classList.toggle("on", !!v); $(".fv", b).textContent = v ? v : "";
      b.setAttribute("aria-label", FILTERS.find(f => f[0] === k)[1] + ": " + (v || "any"));
    });
    $("#br-clear").hidden = !Object.keys(F0).some(k => k !== "n" && k !== "src" && F[k] !== "");
  };
  const draw = (keep) => {
    const xs = F.body ? filtered() : shelfOrder(filtered());
    $("#br-n").innerHTML = "<b>" + fmt(xs.length) + "</b> of " + plural(IX.rows.length, "clip");
    unwire(grid);
    grid.innerHTML = xs.length ? xs.slice(0, F.n).map(r => card(rowClip(r))).join("") : '<div class="br-none"><p>No clips match these filters.</p><button type="button" class="btn ghost" id="br-none">Clear filters</button></div>';
    wire(grid); schedule();
    $("#br-more").hidden = xs.length <= F.n;
    $("#br-shown").textContent = "Showing " + fmt(Math.min(F.n, xs.length)) + " of " + fmt(xs.length);
    if (!keep) drawControls();
    sync();
  };
  const set = (k, v) => { F[k] = v; F.n = PAGE; draw(); };
  $("#br-src").addEventListener("click", e => { const t = e.target.closest("[data-v]"); if (t) set("src", t.dataset.v); });
  q.addEventListener("input", debounce(() => { F.q = q.value; F.n = PAGE; draw(); }, 160));
  const clear = () => { for (const k of Object.keys(F0)) if (k !== "src") F[k] = F0[k]; q.value = ""; draw(); };
  $("#br-clear").onclick = () => { clear(); q.focus(); };
  grid.addEventListener("click", e => { if (e.target.closest("#br-none")) { clear(); F.src = ""; draw(); q.focus(); } });
  $("#br-moreb").onclick = () => {
    const first = F.n; F.n = Math.min(600, F.n + PAGE); draw(true);
    grid.children[first]?.focus({ preventScroll: true });
  };
  $("#br-rand").onclick = () => {
    const xs = filtered(), withV = xs.filter(r => r[9] !== 0), pool = withV.length ? withV : xs;
    if (pool.length) location.hash = "#/clip/" + rowClip(pool[Math.floor(Math.random() * pool.length)]).id;
  };
  // each filter: a button with a popover list, searchable once it is long, with the count each option would give
  $$(".dd", $("#br-f")).forEach(d => {
    const k = d.dataset.k, btn = $(".fbtn", d), pop = $(".dd-pop", d);
    const open = v => {
      $$(".dd-pop").forEach(p => { if (p !== pop && !p.hidden) { p.hidden = true; p.previousElementSibling.setAttribute("aria-expanded", "false"); } });
      const vw = document.documentElement.clientWidth;   // measured while closed: an open list must never widen the page
      if (v) pop.style.left = Math.min(0, vw - 20 - d.getBoundingClientRect().left - Math.min(360, vw - 40)) + "px";
      pop.hidden = !v; btn.setAttribute("aria-expanded", v);
      if (!v) return;
      const opts = facet(k), long = opts.length > 10;
      pop.innerHTML = (long ? '<input class="pk-q" type="search" placeholder="Find ' + (k === "body" ? "a robot" : k === "skill" ? "a skill" : "an option") + '" aria-label="Find" autocomplete="off">' : "") + '<div class="pk-list" role="listbox" aria-label="' + esc(FILTERS.find(f => f[0] === k)[1]) + '"></div>';
      const list = $(".pk-list", pop), fq = $(".pk-q", pop);
      const fill = () => {
        const t = (fq?.value || "").trim().toLowerCase();
        const xs = opts.filter(o => !t || (o[1] + " " + o[0] + " " + (o[3] || "")).toLowerCase().includes(t));
        list.innerHTML = xs.length ? xs.slice(0, 400).map(o => '<button type="button" role="option" class="pk-o dd-o" data-v="' + esc(o[0]) + '" aria-selected="' + (F[k] === o[0]) + '"' + (o[2] || o[0] === "" ? "" : ' data-zero="1"') + "><b>" + esc(o[1]) + "</b><span>" + fmt(o[2]) + "</span>" + (o[3] ? "<p>" + esc(o[3]) + "</p>" : "") + "</button>").join("") + (xs.length > 400 ? '<p class="pk-none">' + fmt(xs.length - 400) + " more; type to narrow.</p>" : "") : '<p class="pk-none">Nothing matches “' + esc(fq.value) + "”.</p>";
      };
      fill();
      if (fq) { fq.oninput = fill; fq.focus(); } else ($(".pk-o[aria-selected=true]", list) || $(".pk-o", list))?.focus();
      if (fq) fq.onkeydown = e => { if (e.key === "ArrowDown") { e.preventDefault(); $(".pk-o", list)?.focus(); } if (e.key === "Enter") { e.preventDefault(); $(".pk-o", list)?.click(); } };
      list.onkeydown = e => {
        const os = $$(".pk-o", list), i = os.indexOf(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); os[Math.min(os.length - 1, i + 1)]?.focus(); }
        if (e.key === "ArrowUp") { e.preventDefault(); i <= 0 ? (fq || os[0])?.focus() : os[i - 1].focus(); }
      };
      list.onclick = e => { const o = e.target.closest(".pk-o"); if (!o) return; open(false); set(k, o.dataset.v); $("#dd-" + k).focus(); };
    };
    btn.onclick = () => open(pop.hidden);
    pop.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); open(false); btn.focus(); } });
  });
  const outside = e => { if (!e.target.closest(".dd")) $$(".dd-pop").forEach(p => { if (!p.hidden) { p.hidden = true; p.previousElementSibling.setAttribute("aria-expanded", "false"); } }); };
  document.addEventListener("pointerdown", outside); cleanup.push(() => document.removeEventListener("pointerdown", outside));
  draw();
  restoreScroll();
}

// ------------------------------------------------------------------ robots and one robot
function robotsPage(app) {
  app.innerHTML = robotsSection(true) + '<div class="wrap">' + footHTML(false) + "</div>";
  rbWire();
}
async function robotPage(app, body) {
  const b = S.bodyOf[body];
  if (!b) { app.innerHTML = '<div class="wrap"><div class="empty"><h1>No robot <span class="g">' + esc(body) + '</span></h1><p>This robot is not in the release.</p><p style="margin-top:28px"><a class="btn" href="#/robots">All robots</a></p></div></div>'; restoreScroll(); return; }
  const n = b.counts || {}, all = (n.skill || 0) + (n.taskblind || 0) + (n.procedural || 0);
  const skills = S.skills.filter(s => cell(body, s)).map(s => bestOf(body, s)).filter(Boolean);
  const browse = q => "#/browse/" + q + "&body=" + encodeURIComponent(body);
  app.innerHTML = '<article class="wrap rpage">' +
    '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/robots">Robots</a><span aria-hidden="true">/</span><span>' + esc(name(body)) + "</span></nav>" +
    '<h1 class="ctitle">' + esc(name(body)) + ' <span class="g">' + esc(kindLine(body)) + "</span></h1>" +
    '<p class="csent">' + esc(b.kind_label) + " from " + esc(b.origin) + ", " + joints(b) + " joints" + (b.free_base ? " and a floating base" : "") + ". Its " + plural(b.modes, "primitive") + " and " + plural(b.gaits, "gait") + " were written once from the model alone" + (b.primitives_model ? " by " + esc(b.primitives_model) : "") + ", and every clip on it is composed from them." + (b.held_out ? ' <span class="fail">Held out for transfer tests.</span>' : "") + "</p>" +
    '<dl class="facts"><div><dt>Clips</dt><dd>' + fmt(all) + "</dd></div><div><dt>Skill clips</dt><dd>" + fmt(n.skill || 0) + ' <span class="g">· ' + fmt(n.valid_skill || 0) + " possible</span></dd></div><div><dt>Task-blind</dt><dd>" + fmt(n.taskblind || 0) + "</dd></div><div><dt>Procedural</dt><dd>" + fmt(n.procedural || 0) + ' <span class="g">· ' + fmt(n.valid_procedural || 0) + " possible</span></dd></div><div><dt>Skills</dt><dd>" + fmt(skills.length) + ' <span class="g">of ' + fmt(S.skills.length) + "</span></dd></div></dl>" +
    '<p class="r-act"><a class="btn" href="' + esc(browse("src=")) + '">Browse all ' + plural(all, "clip") + " " + ARR + "</a></p>" +
    '<div class="cstage rtop"><div class="frame rstill">' + (b.still ? '<img src="' + ROOT + 'media/' + esc(b.still) + '" alt="' + esc(b.label) + '">' : "") + '</div><dl class="kv">' +
    "<dt>Body plan</dt><dd>" + esc(b.kind_label) + (b.held_out ? ' · <span class="fail">held out for transfer tests</span>' : "") + "</dd>" +
    "<dt>Source model</dt><dd>" + esc(b.origin) + (b.detail ? ' <span class="g">· ' + esc(b.detail) + "</span>" : "") + (b.url ? ' · <a href="' + esc(b.url) + '" target="_blank" rel="noopener">source ↗</a>' : "") + "</dd>" +
    "<dt>Joints</dt><dd>" + joints(b) + (b.free_base ? " + floating base" : "") + " · " + b.nu + " actuators</dd>" +
    "<dt>Size</dt><dd>" + fmt(b.L_m, 3) + " m (L) · " + fmt(b.mass_kg, 1) + " kg · time scale " + fmt(b.T_s, 3) + " s</dd>" +
    "<dt>Primitives</dt><dd>" + b.modes + " modes, " + b.gaits + " gaits · " + esc(b.primitives_model || "–") + (b.primitives_cost_usd != null ? " · $" + fmt(b.primitives_cost_usd, 3) : "") + "</dd>" +
    '<dt>Tips</dt><dd class="mono">' + esc((b.tips || []).join(", ")) + "</dd>" +
    '<dt>Files</dt><dd class="mono">' + esc(b.model || "") + (b.primitives ? "<br>" + esc(b.primitives) : "") + "</dd></dl></div>" +
    '<section class="more" id="r-skills"></section><section class="more" id="r-prims"></section><section class="more" id="r-tb"></section><section class="more" id="r-proc"></section>' +
    footHTML(false) + "</article>";
  const head = (h, total, unit, link) => '<div class="more-h"><h2>' + h + '</h2><span class="g">' + plural(total, unit) + (link ? ' · <a class="link" href="' + esc(link) + '">Browse them ' + ARR + "</a>" : "") + "</span></div>";
  const sec = (id, h, xs, unit, render, cls, link, total = xs.length) => {
    const el = $("#" + id); if (!el) return;
    unwire(el); el.hidden = !xs.length;
    el.innerHTML = xs.length ? head(h, total, unit, link) + capped(body + id, xs, 8, render, cls, unit) : "";
    wire(el); schedule();
  };
  const drawSkills = () => sec("r-skills", "Skills", skills, "skill", c => { const [t, p] = cell(body, c.skill); return tile(c, plural(t, "take") + " · " + fmt(p) + " pass the label check", cap(c.skill)); }, "row4", browse("src=skill"));
  let lib = null, rows = null;
  const drawPrims = () => sec("r-prims", "Primitives and gaits", b.prims || [], "primitive", p => '<div class="prim"><div class="frame">' + (p.video ? vtag(p.video) : "") + "</div><b>" + esc(p.name) + "</b><span>" + esc((lib ? primAbout(b, p.name) : "") || (p.type === "gait" ? "Gait" : "Mode") + (p.joints ? " · " + p.joints.slice(0, 3).join(", ") + (p.joints.length > 3 ? "…" : "") : "")) + "</span></div>", "prim-grid rprims");
  const drawClips = () => {
    if (!rows) return;
    const tb = rows.filter(c => c.src === "taskblind"), pr = rows.filter(c => c.src === "procedural");
    const vfirst = xs => xs.filter(c => c.video).concat(xs.filter(c => !c.video));
    sec("r-tb", "Task-blind clips", vfirst(tb), "clip", c => tile(c, fmt(c.dur, 1) + " s" + (c.video ? "" : " · no render"), clipTitle(c)), "row4", browse("src=taskblind"));
    sec("r-proc", "Procedural clips", vfirst(pr), "clip", c => tile(c, fmt(c.dur, 1) + " s" + (c.video ? "" : " · no render"), clipTitle(c)), "row4", browse("src=procedural"));
  };
  const redraw = k => { if (k.endsWith("r-skills")) drawSkills(); else if (k.endsWith("r-prims")) drawPrims(); else drawClips(); };
  wireCapped($(".rpage"), redraw);
  drawSkills(); drawPrims();
  [lib, rows] = await Promise.all([primLib(b), bodyFile(body)]);
  if (decodeURIComponent(location.hash.replace(/^#\/?robot\//, "")) !== body) return;
  drawPrims(); drawClips();
  restoreScroll();
}

// ------------------------------------------------------------------ download
function getPage(app) {
  app.innerHTML = getSection(true);
  $("#copy").onclick = copyCode;
}
async function copyCode() {
  const b = $("#copy");
  try { await navigator.clipboard.writeText($("#code").textContent); b.textContent = "Copied"; } catch { b.textContent = "Select and copy"; const r = document.createRange(); r.selectNodeContents($("#code")); getSelection().removeAllRanges(); getSelection().addRange(r); }
  setTimeout(() => { if ($("#copy")) $("#copy").textContent = "Copy"; }, 1600);
}

// ------------------------------------------------------------------ program timeline (shared): one track per primitive, keyframes marked, a playhead
function Timeline(el, prog, opt = {}) {
  const kfs = prog.keyframes || [], T = prog.duration_s || (kfs.at(-1)?.t ?? 1);
  const tracks = {};
  const add = (n, t, v) => { if (typeof v === "number" && Number.isFinite(v)) (tracks[n] ||= []).push([t, v]); };
  for (const k of kfs) {
    for (const [n, v] of Object.entries({ ...(k.modes || {}), ...(k.joints || {}) })) add(n, k.t, +v);
    const b = k.base || {}, rpy = b.rpy_deg ?? k.rpy;
    add("base_height", k.t, b.dz_L ?? k.dz_L);
    if (Array.isArray(rpy)) ["base_roll", "base_pitch", "base_yaw"].forEach((n, i) => add(n, k.t, rpy[i]));
  }
  for (const n in tracks) { tracks[n].sort((a, b) => a[0] - b[0]); if (n.startsWith("base_") && tracks[n].every(q => q[1] === 0)) delete tracks[n]; }
  const gaits = kfs.filter(k => k.gait).map(k => ({ t: k.t, n: k.gait.name || String(k.gait), t2: (kfs.find(q => q.t > k.t)?.t) ?? T }));
  const allNames = Object.keys(tracks), names = opt.max ? allNames.slice(0, opt.max) : allNames;
  const rowH = opt.compact ? 32 : 42, top = 26, pad = opt.compact ? 6 : 7;
  let W = 0, L = 0, R = 12;
  const draw = () => {
    W = el.clientWidth || 600; L = W < 520 ? 118 : opt.compact ? 172 : 196;
    const H = top + (names.length + (gaits.length ? 1 : 0)) * rowH + 4;
    const x = t => L + (W - L - R) * (t / T);
    let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Program timeline: ' + names.length + ' tracks over ' + T + ' seconds">';
    const step = T > 9 || W < 520 ? (T > 6 ? 2 : 1) : T > 4 ? 1 : .5;
    for (let t = 0; t <= T + 1e-6; t += step) s += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + (top - 6) + '" y2="' + (top - 2) + '" stroke="#c9c9ce"/><text class="tick" x="' + x(t) + '" y="' + (top - 12) + '" text-anchor="' + (t === 0 ? "start" : "middle") + '">' + (+t.toFixed(1)) + (t === 0 && W >= 520 ? " s" : "") + "</text>";
    for (const k of kfs) s += '<line x1="' + x(k.t) + '" x2="' + x(k.t) + '" y1="' + top + '" y2="' + H + '" stroke="#efeff2"/>';
    names.forEach((n, i) => {
      const y0 = top + i * rowH, pts = tracks[n];
      const mx = Math.max(1e-6, ...pts.map(q => Math.abs(q[1])));
      const pos = pts.every(q => q[1] >= 0), neg = pts.every(q => q[1] <= 0);
      const y = pos ? y0 + rowH - pad : neg ? y0 + pad : y0 + rowH / 2;
      const amp = (pos || neg ? rowH - 2 * pad : rowH / 2 - pad) / mx;
      const py = v => y - v * amp, ly = y0 + rowH / 2;
      if (i % 2 === 0) s += '<rect x="' + L + '" y="' + y0 + '" width="' + (W - L - R) + '" height="' + rowH + '" fill="#fafafb"/>';
      s += '<text class="lab" x="0" y="' + (ly + 4) + '">' + esc(n.length > (W < 520 ? 15 : 24) ? n.slice(0, W < 520 ? 14 : 23) + "…" : n) + "</text>";
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#dedee3" stroke-dasharray="2 3"/>';
      const P = pts.map(q => [x(q[0]), py(q[1])]);
      if (pts[pts.length - 1][0] < T) P.push([x(T), P[P.length - 1][1]]);
      const line = P.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
      s += '<polygon points="' + P[0][0].toFixed(1) + "," + y + " " + line + " " + P[P.length - 1][0].toFixed(1) + "," + y + '" fill="#0b0b0d" fill-opacity=".07"/>';
      s += '<polyline points="' + line + '" fill="none" stroke="#0b0b0d" stroke-width="1.4" stroke-linejoin="round"/>';
      pts.forEach(q => { s += '<rect x="' + (x(q[0]) - 3).toFixed(1) + '" y="' + (py(q[1]) - 3).toFixed(1) + '" width="6" height="6" transform="rotate(45 ' + x(q[0]).toFixed(1) + " " + py(q[1]).toFixed(1) + ')" fill="#fff" stroke="#0b0b0d" stroke-width="1.2"/>'; });
    });
    if (gaits.length) {
      const y0 = top + names.length * rowH;
      s += '<text class="lab" x="0" y="' + (y0 + rowH / 2 + 4) + '">gait</text>';
      gaits.forEach(g => { s += '<rect x="' + x(g.t) + '" y="' + (y0 + 7) + '" width="' + Math.max(3, x(g.t2) - x(g.t)) + '" height="' + (rowH - 14) + '" rx="5" fill="#0b0b0d" fill-opacity=".08" stroke="#0b0b0d" stroke-opacity=".5"/><text class="lab" x="' + (x(g.t) + 8) + '" y="' + (y0 + rowH / 2 + 4) + '">' + esc(g.n) + "</text>"; });
    }
    s += '<rect class="hit" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent"/></svg><div class="ph" aria-hidden="true"><i>0.00 s</i></div>';
    el.innerHTML = s + (allNames.length > names.length ? '<p class="tl-more">' + (allNames.length - names.length) + " more tracks in the program.</p>" : "");
    el.classList.add("tl");
    const ph = $(".ph", el); ph.style.height = H + "px"; ph.style.bottom = "auto";
    $(".hit", el).addEventListener("pointerdown", e => {
      if (!opt.onSeek) return;
      const r = el.getBoundingClientRect();
      const seek = ev => opt.onSeek(Math.min(T, Math.max(0, (ev.clientX - r.left - L) / (W - L - R) * T)));
      seek(e);
      const mv = ev => seek(ev), up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
      addEventListener("pointermove", mv); addEventListener("pointerup", up);
    });
    if (!opt.onSeek) $(".hit", el).style.cursor = "default";
    api.set(api.t || 0);
  };
  const api = {
    t: 0, T, tracks, names: allNames,
    set(t) { api.t = t; const ph = $(".ph", el); if (!ph) return; ph.style.transform = "translateX(" + (L + (W - L - R) * Math.min(1, t / T)).toFixed(1) + "px)"; ph.firstChild.textContent = t.toFixed(2) + " s"; },
    value(n, t) { const p = tracks[n]; if (!p) return 0; if (t <= p[0][0]) return p[0][1]; for (let i = 1; i < p.length; i++) if (t <= p[i][0]) { const [t0, v0] = p[i - 1], [t1, v1] = p[i]; return v0 + (v1 - v0) * ((t - t0) / Math.max(1e-6, t1 - t0)); } return p[p.length - 1][1]; },
  };
  draw();
  const ro = new ResizeObserver(() => { if (Math.abs((el.clientWidth || 0) - W) > 2) draw(); });
  ro.observe(el); cleanup.push(() => ro.disconnect());
  return api;
}

// ------------------------------------------------------------------ clip page
async function clipPage(app, body, stem) {
  const b0 = S.bodyOf[body];
  app.innerHTML = '<div class="wrap clip"><p class="note">Loading the clip…</p></div>';
  const rows = b0 ? await bodyFile(body) : null;
  if (decodeURIComponent(location.hash.replace(/^#\/?clip\//, "")) !== body + "/" + stem) return;
  const c = (rows || []).find(x => x.id === body + "/" + stem);
  if (!c) { app.innerHTML = '<div class="wrap"><div class="empty"><h1>No clip <span class="g">' + esc(body) + "/" + esc(stem) + '</span></h1><p>This clip is not in the release.</p><p style="margin-top:28px"><a class="btn" href="#/browse">All clips</a></p></div></div>'; restoreScroll(); return; }
  const b = S.bodyOf[c.body] || {};
  const human = c.human ? (c.human.verdict === "yes" ? "Looks right" : c.human.verdict === "no" ? "Looks wrong" : "Unsure") : "Not rated";
  const sentence = c.src === "skill" ? S.meta.skill_text[c.skill] : c.src === "taskblind" ? S.meta.skill_text.taskblind : "Made without a model: a gait, balance, drive or random motion over the robot's own primitives.";
  const labelTxt = c.src !== "skill" ? "Not applicable" : c.label ? "Passes" : "Fails";
  app.innerHTML = '<article class="clip wrap">' +
    '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/browse">Clips</a><span aria-hidden="true">/</span><a href="#/robot/' + esc(c.body) + '">' + esc(name(c.body)) + '</a><span aria-hidden="true">/</span><span class="mono">' + esc(stem) + "</span></nav>" +
    '<h1 class="ctitle">' + esc(clipTitle(c)) + ' <span class="g">on ' + esc(name(c.body)) + "</span></h1>" +
    '<p class="csent">' + esc(sentence) + "</p>" +
    '<dl class="facts"><div><dt>Physics</dt><dd class="' + (c.valid ? "pass" : "fail") + '" id="f-phys">' + (c.valid ? "Physically possible" : "Fails " + esc((c.failed || []).map(nice).join(", "))) + "</dd></div>" +
    '<div><dt>Label check</dt><dd class="' + (c.src !== "skill" ? "" : c.label ? "pass" : "fail") + '">' + labelTxt + "</dd></div>" +
    "<div><dt>Human rating</dt><dd>" + human + (c.human?.rank ? ' <span class="g">· ranked ' + c.human.rank + " of " + c.human.group_size + "</span>" : "") + "</dd></div>" +
    "<div><dt>Made with</dt><dd>" + (c.src === "procedural" ? esc(cap(c.arm)) + ' <span class="g">· ' + esc(nice(c.v)) + "</span>" : esc(ARM[c.arm] || c.arm) + ' <span class="g">· v' + esc(c.v) + "</span>") + "</dd></div>" +
    "<div><dt>Length</dt><dd>" + fmt(c.dur, 2) + ' s <span class="g">· ' + fmt(c.frames) + " frames</span></dd></div></dl>" +
    '<div class="cstage"><div class="player">' +
    (c.video ? '<div class="frame" id="pf"><video id="pv-v" src="' + ROOT + 'media/' + esc(c.video) + '" muted loop playsinline preload="auto"' + (RM ? "" : " autoplay") + "></video></div>" +
      '<div class="controls"><button class="pp" id="pp" type="button" aria-label="Pause"></button><input class="scrub" id="scrub" type="range" min="0" max="1000" value="0" step="1" aria-label="Scrub"><span class="time" id="time">0.00 / ' + fmt(c.dur, 2) + ' s</span><div class="speed" role="group" aria-label="Speed">' + [1, .5, .25].map(r => '<button type="button" data-r="' + r + '" aria-pressed="' + (r === 1) + '">' + (r === 1 ? "1" : r === .5 ? "0.5" : "0.25") + "×</button>").join("") + "</div></div>"
      : '<div class="frame"><img src="' + ROOT + 'media/' + esc(b.still) + '" alt=""></div><p class="note">This clip has no render; the robot is shown at rest.</p>') +
    '</div><div class="uses" id="uses"><h2>Primitives in this clip<span>Loading…</span></h2></div></div>' +
    '<section class="panel prog" aria-label="Program"><div class="bar"><h2>Program<span id="pg-n"></span></h2></div><div class="prog-body"><div id="ctl"></div></div><details class="json"><summary>Program as written</summary><pre id="pjson">Loading…</pre></details></section>' +
    '<div class="recs">' +
    '<section class="rec"><h2>Physical checks<span id="ck-n"></span></h2><div><table class="cktab" id="cktab"><thead><tr><th>Check</th><th class="num">Worst</th><th class="num">Limit</th><th class="bar2"><span class="g" style="font-weight:400">Worst against limit</span></th><th class="num">Result</th></tr></thead><tbody></tbody></table></div></section>' +
    '<section class="rec"><h2>Label check<span>' + labelTxt + '</span></h2><div id="pred"></div></section>' +
    (c.human ? '<section class="rec"><h2>Human rating<span>' + human + '</span></h2><div><p style="margin:0;font-size:15px">' + (c.human.source === "blind" ? "Rated blind, without knowing how the clip was made." : "Rated in review.") + (c.human.rank ? " Ranked " + c.human.rank + " of " + c.human.group_size + " takes." : "") + "</p>" + (c.human.note ? '<p class="quote">' + esc(c.human.note) + "</p>" : "") + "</div></section>" : "") +
    (c.src !== "procedural" ? '<section class="rec"><h2>Generation<span>' + esc(c.model || "") + '</span></h2><div><dl class="kv" id="gen"></dl></div></section>' : "") +
    '<section class="rec"><h2>Files<span>In the dataset on Hugging Face</span></h2><div><dl class="kv"><dt>Motion</dt><dd class="mono">' + esc(c.npz) + '</dd><dt>Record</dt><dd class="mono"><a href="' + ROOT + 'hf/' + esc(c.sidecar) + '" target="_blank" rel="noopener">' + esc(c.sidecar) + '</a></dd><dt>Robot model</dt><dd class="mono">' + esc(b.model || "") + "</dd><dt>Frames</dt><dd>" + fmt(c.frames) + " at " + S.meta.stats.fps.map(f => fmt(f)).join(", ") + " fps</dd></dl></div></section>" +
    '<section class="rec"><h2>The robot<span>' + esc(b.label) + '</span></h2><div class="rb"><div class="frame"><img src="' + ROOT + 'media/' + esc(b.still) + '" alt="' + esc(b.label) + '"></div><dl class="kv"><dt>Body plan</dt><dd>' + esc(b.kind_label) + (b.held_out ? ' · <span class="fail">held out for transfer tests</span>' : "") + "</dd><dt>Source model</dt><dd>" + esc(b.origin) + (b.detail ? ' <span class="g">· ' + esc(b.detail) + "</span>" : "") + (b.url ? ' · <a href="' + esc(b.url) + '" target="_blank" rel="noopener">source ↗</a>' : "") + "</dd><dt>Joints</dt><dd>" + joints(b) + (b.free_base ? " + floating base" : "") + " · " + b.nu + " actuators</dd><dt>Size</dt><dd>" + fmt(b.L_m, 3) + " m · " + fmt(b.mass_kg, 1) + " kg</dd><dt>Primitives</dt><dd>" + b.modes + " modes, " + b.gaits + " gaits · " + esc(b.primitives_model || "–") + '</dd><dt>Tips</dt><dd class="mono">' + esc((b.tips || []).join(", ")) + "</dd></dl></div></section>" +
    "</div>" + moreRows(c, rows) +
    footHTML(false) + "</article>";
  wire(app);
  const v = $("#pv-v");
  P.tl = null; P.meters = []; P.update = () => {};
  if (v) wirePlayer(v, c);
  const [side] = await Promise.all([sidecar(c), primLib(b)]);
  if (decodeURIComponent(location.hash.replace(/^#\/?clip\//, "")) !== c.id) return;
  const prog = side?.program, used = usedPrims(prog);
  $("#pg-n").textContent = "";
  $("#pjson").textContent = prog ? JSON.stringify(prog, null, 1) : "No program: this clip was made without a model.";
  let tl = null;
  if (prog) tl = Timeline($("#ctl"), prog, { onSeek: t => { if (v) { v.currentTime = Math.min(t, (v.duration || c.dur) - .01); P.update(); } } });
  else $("#ctl").innerHTML = '<p class="note" style="margin:0">' + (c.src === "procedural" ? "Procedural clips are generated directly from the robot's gaits and primitives, without a program." : "No program compiled.") + "</p>";
  P.tl = tl; P.update();
  if (prog) $("#pg-n").textContent = (prog.keyframes || []).length + " keyframes · " + prog.duration_s + " s · " + tl.names.length + " tracks";
  // primitives used, each with a live meter of its amount at the playhead
  const prims = (b.prims || []).filter(p => used.includes(p.name)).sort((x, y) => used.indexOf(x.name) - used.indexOf(y.name));
  const uses = $("#uses");
  uses.innerHTML = '<h2>Primitives in this clip<span>' + (prims.length ? prims.length + " of the robot's " + (b.prims || []).length + ", with their amount at the playhead" : prog ? "None: this program is written as joint and base keyframes" : "None: no program") + '</span></h2><div class="prim-grid">' +
    prims.map(p => '<div class="prim" data-n="' + esc(p.name) + '"><div class="frame">' + (p.video ? vtag(p.video) : "") + "</div><b>" + esc(p.name) + "</b>" + (p.type === "mode" ? '<div class="meter"><i></i></div>' : "<span>" + esc(primAbout(b, p.name) || "gait") + "</span>") + "</div>").join("") + "</div>";
  if (!prims.length && prog) uses.insertAdjacentHTML("beforeend", '<p class="note" style="margin-top:4px">The robot\'s own primitives, for reference:</p><div class="prim-grid" style="margin-top:14px">' + (b.prims || []).slice(0, 6).map(p => '<div class="prim unused"><div class="frame">' + (p.video ? vtag(p.video) : "") + "</div><b>" + esc(p.name) + "</b><span>" + esc(p.type) + "</span></div>").join("") + "</div>");
  wire(uses); schedule();
  P.meters = $$(".prim[data-n]", uses).map(el => ({ n: el.dataset.n, i: el.querySelector(".meter i") })).filter(m => m.i);
  P.update();
  // checks
  const checks = Object.entries(side?.filters || {}).filter(([, x]) => x && typeof x === "object" && "pass" in x);
  $("#ck-n").textContent = checks.length ? checks.filter(([, x]) => x.pass).length + " of " + checks.length + " pass on every frame" : "No check record";
  $("#cktab tbody").innerHTML = checks.map(([k, x]) => {
    const [wk, lk] = worstKeys(x);
    const r = wk && lk && x[lk] ? Math.min(1, Math.abs(x[wk]) / x[lk]) : null;
    return "<tr><td>" + esc(CHECK_NAMES[k] || nice(k)) + '</td><td class="num">' + (wk ? esc(unitVal(x[wk], wk)) : "–") + '</td><td class="num g">' + (lk ? esc(unitVal(x[lk], lk)) : "–") + '</td><td class="bar2">' + (r != null ? '<div class="ratio ' + (x.pass ? "" : "bad") + '"><i style="width:' + (r * 100).toFixed(1) + '%"></i></div>' : "") + '</td><td class="num ' + (x.pass ? "pass" : "fail") + '">' + (x.pass ? "Pass" : "Fail") + "</td></tr>";
  }).join("");
  // label check
  const p = side?.predicate;
  $("#pred").innerHTML = c.src !== "skill" || !p ? '<p class="note" style="margin:0">' + (c.src === "skill" ? "No label check record." : "The label check tests a skill's definition, so it applies only to skill clips.") + "</p>"
    : '<dl class="kv">' + Object.entries(p).filter(([k]) => !["skill", "pass", "applicable"].includes(k)).map(([k, x]) => "<dt>" + esc(cap(k)) + '</dt><dd class="mono">' + esc(typeof x === "number" ? fmt(x, Number.isInteger(x) ? 0 : 3) : x == null ? "–" : typeof x === "object" ? JSON.stringify(x) : String(x)) + "</dd>").join("") + '</dl><p class="note">A strict automatic test of the skill\'s definition, measured on the clip. Many correct clips fail it.</p>';
  // generation
  if ($("#gen") && side) {
    const calls = side.call_log || [];
    const tin = calls.reduce((a, x) => a + (x.prompt_tokens || 0), 0), tout = calls.reduce((a, x) => a + (x.completion_tokens || 0), 0);
    const att = (side.attempts || []).map(a => "round " + a.round + ": " + (a.filters?.pass ? "passed" : "failed " + (a.filters?.failed || []).join(", ")));
    $("#gen").innerHTML = '<dt>Language model</dt><dd>' + esc(side.model || "–") + (side.reasoning ? ' <span class="g">· reasoning ' + esc(side.reasoning) + "</span>" : "") + "</dd><dt>Calls</dt><dd>" + fmt(side.calls ?? calls.length) + " · " + fmt(tin) + " tokens in, " + fmt(tout) + " out</dd><dt>Cost</dt><dd>$" + fmt(side.cost_usd, 4) + (side.seconds != null ? ' <span class="g">· ' + fmt(side.seconds, 1) + " s</span>" : "") + "</dd><dt>Repairs</dt><dd>" + fmt(side.repair_rounds ?? 0) + (att.length > 1 ? ' <span class="g">· ' + esc(att.join(" · ")) + "</span>" : "") + '</dd><dt>Primitives</dt><dd class="mono">' + esc(side.library || "–") + "</dd><dt>Made</dt><dd>" + esc((side.at || "–").replace("T", " ")) + "</dd>";
  }
  restoreScroll();
}
const P = { tl: null, meters: [], v: null, raf: 0, update() {} };
function wirePlayer(v, c) {
  P.v = v; P.tl = null; P.meters = [];
  const pp = $("#pp"), scrub = $("#scrub"), time = $("#time");
  const ICON = { play: '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9.5-5.5z"/></svg>', pause: '<svg viewBox="0 0 14 14"><rect x="2.5" y="1.5" width="3.2" height="11" rx="1"/><rect x="8.3" y="1.5" width="3.2" height="11" rx="1"/></svg>' };
  const paint = () => { pp.innerHTML = v.paused ? ICON.play : ICON.pause; pp.setAttribute("aria-label", v.paused ? "Play" : "Pause"); };
  paint();
  P.update = () => {
    const d = v.duration || c.dur, t = v.currentTime || 0;
    if (document.activeElement !== scrub || !scrub.dataset.drag) { scrub.value = Math.round(1000 * t / d); }
    scrub.style.setProperty("--v", (100 * t / d).toFixed(2) + "%");
    time.textContent = t.toFixed(2) + " / " + fmt(d, 2) + " s";
    if (P.tl) {
      const tt = Math.min(P.tl.T, t * (P.tl.T / d));
      P.tl.set(tt);
      for (const m of P.meters) { const a = Math.max(-1, Math.min(1, P.tl.value(m.n, tt))); m.i.style.left = (a < 0 ? 50 + a * 50 : 50) + "%"; m.i.style.width = Math.abs(a) * 50 + "%"; }
    }
  };
  const loop = () => { P.update(); P.raf = requestAnimationFrame(loop); };
  P.raf = requestAnimationFrame(loop);
  cleanup.push(() => cancelAnimationFrame(P.raf));
  const toggle = () => { v.paused ? v.play().catch(() => {}) : v.pause(); };
  pp.onclick = toggle; $("#pf").onclick = toggle;
  v.addEventListener("play", paint); v.addEventListener("pause", paint);
  scrub.addEventListener("input", () => { scrub.dataset.drag = "1"; const d = v.duration || c.dur; v.currentTime = Math.min(d - .01, scrub.value / 1000 * d); P.update(); });
  scrub.addEventListener("change", () => { delete scrub.dataset.drag; });
  $$(".speed button").forEach(btn => btn.onclick = () => { v.playbackRate = +btn.dataset.r; $$(".speed button").forEach(x => x.setAttribute("aria-pressed", x === btn)); });
  const key = e => { if (e.target.matches("input,textarea,button,select,summary,a")) return; if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); } };
  addEventListener("keydown", key); cleanup.push(() => removeEventListener("keydown", key));
}
function moreRows(c, rows) {
  const same = c.skill ? lineupOrder(c.skill).filter(x => x.body !== c.body) : [];
  const mine = Object.keys(S.cells[c.body] || {}).filter(s => s !== c.skill).map(s => bestOf(c.body, s)).filter(x => x && x.video)
    .concat(rows.filter(x => x.src === "taskblind" && x.video)).filter(x => x.id !== c.id);
  const CAP = 8;
  const row = (h, xs, total, unit, sub) => xs.length ? '<section class="more"><div class="more-h"><h2>' + h + '</h2><span class="g">' + (total > Math.min(CAP, xs.length) ? "Showing " + fmt(Math.min(CAP, xs.length)) + " of " + plural(total, unit) : plural(total, unit)) + '</span></div><div class="row4">' + xs.slice(0, CAP).map(x => tile(x, sub(x))).join("") + "</div></section>" : "";
  return row(esc(cap(c.skill || "")) + ' <span class="g">on other robots</span>', same, same.length, "robot", x => kindLine(x.body)) +
    row('More of <span class="g">' + esc(name(c.body)) + "</span>", mine, Math.max(mine.length, rows.length - 1), "clip", x => clipSub(x));
}

boot().catch(e => { $("#app").innerHTML = '<div class="wrap"><div class="empty"><h1>The dataset index could not be loaded.</h1><p>' + esc(e.message) + "</p></div></div>"; });
