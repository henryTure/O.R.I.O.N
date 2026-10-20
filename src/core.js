// Kärnan: 3D-sfär i canvas med tre lägen.
// VILA (turkos, lugn), LYSSNAR (bärnsten, sfären vibrerar som en ljudvåg) och ANALYSERAR (blåvit, snabbt).
// Färg och hastighet glider mjukt mellan lägena. Tryck = ANALYSERAR i 2,5 s.
// Rösten styr lägena utifrån med setMode(), se voice.js.

const TAU = Math.PI * 2;
const FLASH_MS = 2500;
const KEYS = ["spin", "signals", "speed", "shake", "pulse"];

// Målvärden per läge.
const MODES = {
  vila:      { color: "accent", spin: 0.16, signals: 0.6, speed: 0.35, shake: 0,     pulse: 3.6 },
  lyssnar:   { color: "warn",   spin: 0.35, signals: 1.3, speed: 0.6,  shake: 0.05,  pulse: 2.0 },
  analysera: { color: "ice",    spin: 2.0,  signals: 3.6, speed: 1.0,  shake: 0.012, pulse: 1.1 },
};

// Två lutande banor runt sfären, med en satellit var.
const ORBITS = [
  { tx: 0.55, tz: 0.4, speed: 0.45, off: 0 },
  { tx: -1.0, tz: -0.25, speed: -0.32, off: 2.4 },
];

function rgb(hex) {
  const n = parseInt(hex.trim().replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Deterministisk slump så att sfären ser likadan ut varje gång.
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

// Punkter på en sfär (radie 1) fördelade med en Fibonacci-spiral, plus kanter till närmaste grannar.
function shell(n, rnd, { jitter, links, reach, shrink }) {
  const g = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = g * i + (rnd() - 0.5) * jitter;
    const rr = 1 - rnd() * shrink;
    pts.push({ x: Math.cos(th) * rad * rr, y: y * rr, z: Math.sin(th) * rad * rr, ph: rnd() * TAU, big: rnd() < 0.12, sx: 0, sy: 0, d: 0, f: 1 });
  }
  const maxD2 = (reach * Math.sqrt((4 * Math.PI) / n)) ** 2;
  const deg = new Array(n).fill(0);
  const edges = [];
  for (let i = 0; i < n; i++) {
    const near = [];
    for (let j = i + 1; j < n; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < maxD2) near.push([d2, j]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, j] of near.slice(0, links)) {
      if (deg[i] < links + 1 && deg[j] < links + 1 && rnd() < 0.8) { edges.push([i, j]); deg[i]++; deg[j]++; }
    }
  }
  return { pts, edges };
}

// Position på en lutad bana (radie 1.3) för vinkeln phi.
function orbitXYZ(o, phi) {
  const x = Math.cos(phi) * 1.3, z = Math.sin(phi) * 1.3;
  const y1 = x * Math.sin(o.tz);
  return [x * Math.cos(o.tz), y1 * Math.cos(o.tx) - z * Math.sin(o.tx), y1 * Math.sin(o.tx) + z * Math.cos(o.tx)];
}

export function createCore(canvas, { reduced = false, mode = "vila", onMode = () => {}, onNodes = () => {} } = {}) {
  const ctx = canvas.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const COLOR = {
    accent: rgb(css.getPropertyValue("--accent")),
    warn: rgb(css.getPropertyValue("--warn")),
    ice: rgb(css.getPropertyValue("--ice")),
  };
  const RED = rgb(css.getPropertyValue("--alarm"));
  const LINE = rgb(css.getPropertyValue("--line-hi"));
  const HOT = [240, 255, 252];
  const col = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  const cur = { ...MODES[mode] };
  const rgbNow = [...COLOR[MODES[mode].color]];
  let base = mode, shown = null, flashUntil = 0;
  let W = 0, H = 0, dpr = 1, R = 1, cx = 0, cy = 0, nOuter = 0, mobile = false;
  let outer = { pts: [], edges: [] }, inner = { pts: [], edges: [] };
  let dots = [], signals = [], beacons = [];
  const orbits = ORBITS.map((o) => ({
    ...o,
    phase: o.off,
    ring: Array.from({ length: 96 }, () => ({ sx: 0, sy: 0, d: 0, f: 1 })),
    trail: Array.from({ length: 14 }, () => ({ sx: 0, sy: 0, d: 0, f: 1 })),
  }));
  const ticks = Array.from({ length: 120 }, (_, i) => ({ a: (i / 120) * TAU, long: i % 10 === 0 }));
  let ang = 0.6, innerAng = 0.2, tilt = 0, tiltT = 0, yaw = 0, yawT = 0;
  let dial = 0, s = 0, pulse = 0, sigAcc = 0, last = 0, raf = 0, running = false, visible = true;

  // Läget som visas just nu. Tryck ger ANALYSERAR en stund, annars gäller det valda läget.
  function refresh() {
    const m = performance.now() < flashUntil ? "analysera" : base;
    if (m !== shown) { shown = m; onMode(m); }
    return m;
  }

  function build() {
    const r = rng(42);
    outer = shell(nOuter, r, { jitter: 0.35, links: 3, reach: 1.6, shrink: 0.06 });
    inner = shell(90, rng(7), { jitter: 0.2, links: 2, reach: 1.8, shrink: 0 });
    beacons = outer.pts.map((p, i) => (p.big ? i : -1)).filter((i) => i >= 0).slice(0, 6);
    dots = Array.from({ length: mobile ? 36 : 64 }, () => ({
      a: r() * TAU, r: 1.08 + r() * 0.45, sp: (r() - 0.5) * 0.18, sz: 0.6 + r() * 1.5, ph: r() * TAU, sx: 0, sy: 0, d: 0, f: 1,
    }));
    signals = [];
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(rect.width * dpr));
    H = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = W;
    canvas.height = H;
    cx = W / 2;
    cy = H / 2;
    // Allt ryms inom panelen: yttersta ringen ligger på 1,42 R
    R = Math.min(W, H) * 0.3;
    mobile = rect.width < 600;
    const n = mobile ? 170 : 260;
    if (n !== nOuter) { nOuter = n; build(); onNodes(n + 90); }
    if (!running) draw();
  }

  // Roterar och projicerar en punkt. Skriver sx, sy (skärm), d (djup, -1 bakom till 1 framför) och f (perspektiv).
  function project(p, x, y, z, ry, rx) {
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const f = 3.2 / (3.2 - z2);
    p.sx = cx + x1 * R * f;
    p.sy = cy + y2 * R * f;
    p.d = z2;
    p.f = f;
    return p;
  }

  function layout(shake) {
    const rx = 0.32 + tilt;
    const ry = ang + yaw;
    for (const p of outer.pts) {
      // Ljudvåg: radien svänger efter höjden, så vågen löper uppåt genom sfären
      const w = shake ? 1 + shake * Math.sin(p.y * 9 - s * 11) : 1;
      project(p, p.x * w, p.y * w, p.z * w, ry, rx);
    }
    for (const p of inner.pts) project(p, p.x * 0.55, p.y * 0.55, p.z * 0.55, innerAng + yaw * 0.6, rx);
    for (const o of orbits) {
      o.ring.forEach((p, i) => { const [x, y, z] = orbitXYZ(o, (i / o.ring.length) * TAU); project(p, x, y, z, ry, rx); });
      const dir = Math.sign(o.speed);
      o.trail.forEach((p, k) => { const [x, y, z] = orbitXYZ(o, o.phase - k * 0.06 * dir); project(p, x, y, z, ry, rx); });
    }
  }

  function ring(r, a, w = 1, dash) {
    ctx.beginPath();
    ctx.setLineDash(dash || []);
    ctx.strokeStyle = a;
    ctx.lineWidth = w * dpr;
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function arc(r, from, len, a, w) {
    ctx.beginPath();
    ctx.strokeStyle = a;
    ctx.lineWidth = w * dpr;
    ctx.arc(cx, cy, r, from, from + len);
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "butt";
    const c = rgbNow;
    const rx = 0.32 + tilt;
    layout(reduced ? 0 : cur.shake);

    // Glöd i mitten
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15);
    glow.addColorStop(0, col(c, 0.2 + cur.signals * 0.04));
    glow.addColorStop(0.5, col(c, 0.07));
    glow.addColorStop(1, col(c, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, TAU); ctx.fill();

    // Pulsvågor från centrum
    for (const off of [0, 0.5]) {
      const q = (pulse + off) % 1;
      ring(R * (0.12 + q * 1.2), col(c, (1 - q) * 0.32), 1.2);
    }

    // Skanningslinjer inne i sfären
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = cy - R; y < cy + R; y += 3 * dpr) ctx.fillRect(cx - R, y, 2 * R, dpr);
    ctx.restore();

    // Gradskiva med streck, roterar långsamt
    ctx.beginPath();
    ctx.lineWidth = dpr;
    for (const t of ticks) {
      const a = t.a + dial;
      const r1 = R * (t.long ? 1.33 : 1.38), r2 = R * 1.42;
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    ctx.strokeStyle = col(c, 0.25);
    ctx.stroke();
    ring(R * 1.42, col(LINE, 0.9), 1);

    // Roterande bågar
    const sp = cur.spin;
    arc(R * 1.12, -1.35 + s * (0.22 + sp), 0.5, col(c, 0.7), 2);
    arc(R * 1.12, 1.75 + s * (0.22 + sp), 0.62, col(c, 0.55), 2);
    arc(R * 1.26, -0.75 - s * (0.12 + sp * 0.5), 0.3, col(RED, 0.75), 1.4);
    arc(R * 0.5, -s * (0.6 + sp), 0.9, col(c, 0.35 + sp * 0.12), 1.5);

    // Yttre skal: linjer, längre bak är svagare
    ctx.lineWidth = dpr * 0.8;
    for (const [i, j] of outer.edges) {
      const a = outer.pts[i], b = outer.pts[j];
      const dn = (a.d + b.d + 2) / 4;
      ctx.strokeStyle = col(c, 0.03 + 0.4 * dn * dn);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
    // Inre kärna: tätare punkter och egna linjer
    ctx.lineWidth = dpr * 0.7;
    for (const [i, j] of inner.edges) {
      const a = inner.pts[i], b = inner.pts[j];
      const dn = (a.d + b.d + 2) / 4;
      ctx.strokeStyle = col(c, 0.08 + 0.5 * dn * dn);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }

    for (const p of outer.pts) {
      const dn = (p.d + 1) / 2;
      const tw = 0.8 + 0.2 * Math.sin(s * 1.6 + p.ph);
      const sz = (p.big ? 2.6 : 1.4) * (0.5 + 0.5 * p.f) * dpr;
      ctx.fillStyle = col(c, Math.min(1, (0.1 + 0.9 * dn * dn) * tw));
      ctx.fillRect(p.sx - sz / 2, p.sy - sz / 2, sz, sz);
    }
    for (const p of inner.pts) {
      const dn = (p.d + 1) / 2;
      const sz = 1.6 * (0.6 + 0.4 * p.f) * dpr;
      ctx.fillStyle = col(c, 0.3 + 0.7 * dn);
      ctx.fillRect(p.sx - sz / 2, p.sy - sz / 2, sz, sz);
    }

    // Fyrar: mjuka halos runt några stora punkter
    for (const b of beacons) {
      const p = outer.pts[b];
      const dn = (p.d + 1) / 2;
      if (dn < 0.35) continue;
      const pr = (0.7 + 0.3 * Math.sin(s * 1.2 + p.ph)) * (9 + 8 * dn) * dpr;
      ctx.fillStyle = col(c, 0.07 * dn);
      ctx.beginPath(); ctx.arc(p.sx, p.sy, pr, 0, TAU); ctx.fill();
    }

    // Signaler som färdas längs linjerna, med svans
    for (const g of signals) {
      const a = g.inner ? inner : outer;
      const [i, j] = a.edges[g.e];
      const from = g.dir > 0 ? a.pts[i] : a.pts[j];
      const to = g.dir > 0 ? a.pts[j] : a.pts[i];
      const hx = from.sx + (to.sx - from.sx) * g.p, hy = from.sy + (to.sy - from.sy) * g.p;
      const q = Math.max(0, g.p - 0.16);
      const tx = from.sx + (to.sx - from.sx) * q, ty = from.sy + (to.sy - from.sy) * q;
      const alpha = 0.25 + 0.75 * ((from.d + to.d + 2) / 4);
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, col(c, 0));
      grad.addColorStop(1, col(HOT, alpha * 0.9));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6 * dpr;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = col(HOT, alpha);
      ctx.beginPath(); ctx.arc(hx, hy, 1.8 * dpr, 0, TAU); ctx.fill();
    }

    // Lutande banor med satelliter
    for (const o of orbits) {
      ctx.lineWidth = dpr;
      for (let i = 0; i < o.ring.length; i++) {
        const a = o.ring[i], b = o.ring[(i + 1) % o.ring.length];
        const dn = ((a.d + b.d) / 2 + 1.3) / 2.6;
        ctx.strokeStyle = col(c, 0.04 + 0.3 * dn);
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      }
      for (let k = 0; k < o.trail.length - 1; k++) {
        const a = o.trail[k], b = o.trail[k + 1];
        ctx.strokeStyle = col(HOT, (1 - k / o.trail.length) * 0.45);
        ctx.lineWidth = 1.4 * dpr;
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      }
      const h = o.trail[0];
      ctx.fillStyle = col(c, 0.18);
      ctx.beginPath(); ctx.arc(h.sx, h.sy, 6 * dpr, 0, TAU); ctx.fill();
      ctx.fillStyle = col(HOT, 0.95);
      ctx.fillRect(h.sx - 1.5 * dpr, h.sy - 1.5 * dpr, 3 * dpr, 3 * dpr);
    }

    // Svävande partiklar runt sfären
    for (const q of dots) {
      const a = q.a + s * q.sp;
      const y = Math.sin(q.ph + s * 0.4) * 0.35 * q.r;
      project(q, Math.cos(a) * q.r, y, Math.sin(a) * q.r, ang * 0.3, rx);
      const dn = (q.d + 1.5) / 3;
      const tw = 0.5 + 0.5 * Math.sin(s * 2 + q.ph * 3);
      const sz = q.sz * dpr;
      ctx.fillStyle = col(c, (0.1 + 0.4 * dn) * tw);
      ctx.fillRect(q.sx, q.sy, sz, sz);
    }

    // Glödande centrum
    const hot = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16 * dpr);
    hot.addColorStop(0, "rgba(240,255,252,1)");
    hot.addColorStop(0.3, col(c, 0.85));
    hot.addColorStop(1, col(c, 0));
    ctx.fillStyle = hot;
    ctx.beginPath(); ctx.arc(cx, cy, 16 * dpr, 0, TAU); ctx.fill();
  }

  // Tar ett steg: glider mot målvärdena och rör på allt. Vid reducerad rörelse hoppar den direkt till målet.
  function update(dt) {
    const k = reduced ? 1 : Math.min(1, dt * 2.5);
    const tgt = MODES[refresh()];
    for (const key of KEYS) cur[key] += (tgt[key] - cur[key]) * k;
    const goal = COLOR[tgt.color];
    for (let i = 0; i < 3; i++) rgbNow[i] += (goal[i] - rgbNow[i]) * k;
    if (reduced) return;

    s += dt;
    ang += cur.spin * dt;
    innerAng -= cur.spin * 1.5 * dt;
    dial -= (0.03 + cur.spin * 0.1) * dt;
    tilt += (tiltT - tilt) * Math.min(1, dt * 3);
    yaw += (yawT - yaw) * Math.min(1, dt * 3);
    pulse = (pulse + dt / cur.pulse) % 1;
    for (const o of orbits) o.phase += o.speed * (0.7 + cur.spin) * dt;

    // Fler och snabbare signaler när kärnan arbetar
    sigAcc = Math.min(1, sigAcc + cur.signals * dt);
    while (sigAcc >= 1 && signals.length < 80) { sigAcc -= 1; spawn(); }
    for (const g of signals) g.p += g.v * dt;
    signals = signals.filter((g) => g.p < 1);
  }

  function spawn() {
    const useInner = Math.random() < 0.35;
    const a = useInner ? inner : outer;
    if (!a.edges.length) return;
    signals.push({
      inner: useInner,
      e: (Math.random() * a.edges.length) | 0,
      dir: Math.random() < 0.5 ? 1 : -1,
      p: 0,
      v: cur.speed * (0.7 + Math.random() * 0.6),
    });
  }

  function frame(t) {
    raf = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    update(dt);
    draw();
    if (running) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduced || running || !visible || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // Lutning efter mus (hela fönstret) eller finger (på kärnan)
  function aim(e) {
    const r = canvas.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    yawT = nx * 0.55;
    tiltT = ny * 0.45;
    if (reduced) { yaw = yawT; tilt = tiltT; draw(); }
  }
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || e.target === canvas) aim(e);
  }, { passive: true });
  canvas.addEventListener("pointerleave", (e) => { if (e.pointerType !== "mouse") { yawT = 0; tiltT = 0; } });
  canvas.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") { yawT = 0; tiltT = 0; } });

  // Tryck = ANALYSERAR i 2,5 sekunder
  function analyze() {
    flashUntil = performance.now() + FLASH_MS;
    refresh();
    if (reduced) {
      update(0); draw();
      setTimeout(() => { refresh(); update(0); draw(); }, FLASH_MS);
    }
  }
  canvas.addEventListener("pointerdown", (e) => { aim(e); analyze(); });

  // Läge från rösten (VILA, LYSSNAR, ANALYSERAR). Ligger kvar tills nästa anrop.
  function setMode(m) {
    if (!MODES[m]) return;
    base = m;
    refresh();
    if (reduced) { update(0); draw(); }
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  refresh();
  resize();
  start();
  return { analyze, setMode };
}
