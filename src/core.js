// Kärnan: roterande 3D-sfär av ljuspunkter i canvas.
// Lutar efter mus/finger, snurrar snabbare och "analyserar" vid tryck.

const TAU = Math.PI * 2;

function rgb(hex) {
  const n = parseInt(hex.trim().replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Deterministisk slump så att sfären ser likadan ut varje gång.
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export function createCore(canvas, { reduced = false, onState = () => {}, onNodes = () => {} } = {}) {
  const ctx = canvas.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const A = rgb(css.getPropertyValue("--accent") || "#46D6C6");
  const RED = rgb(css.getPropertyValue("--alarm") || "#E5484D");
  const LINE = rgb(css.getPropertyValue("--line-hi") || "#24393E");
  const col = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  let W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0, N = 0;
  let nodes = [], edges = [], beacons = [];
  let ang = 0.6, spin = 0.16, tilt = 0, tiltT = 0, yaw = 0, yawT = 0;
  let busyUntil = 0, busy = false, last = 0, running = false, visible = true, raf = 0;
  const pts = [];

  function build(n) {
    const r = rng(42);
    nodes = [];
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) / n) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = g * i + (r() - 0.5) * 0.35;
      const rr = 0.84 + r() * 0.16;
      nodes.push({ x: Math.cos(th) * rad * rr, y: y * rr, z: Math.sin(th) * rad * rr, ph: r() * TAU, big: r() < 0.12 });
    }
    // Förbind varje punkt med sina närmaste grannar (glest, som en stjärnkarta).
    edges = [];
    const deg = new Array(n).fill(0);
    const maxD = 3.0 / Math.sqrt(n);
    for (let i = 0; i < n; i++) {
      const near = [];
      for (let j = i + 1; j < n; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < maxD) near.push([d, j]);
      }
      near.sort((a, b) => a[0] - b[0]);
      for (const [, j] of near.slice(0, 3)) {
        if (deg[i] < 4 && deg[j] < 4 && r() < 0.85) { edges.push([i, j]); deg[i]++; deg[j]++; }
      }
    }
    beacons = [];
    while (beacons.length < 6) {
      const k = Math.floor(r() * n);
      if (!beacons.includes(k)) beacons.push(k);
    }
    onNodes(n);
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
    R = Math.min(W, H) * 0.375;
    const n = rect.width < 600 ? 150 : 230;
    if (n !== N) { N = n; build(n); }
    if (!running) draw(performance.now());
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

  function draw(t) {
    const s = t / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "butt";
    const heat = busy ? 1 : 0;

    // Glödande centrum
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.78);
    glow.addColorStop(0, col(A, 0.24 + heat * 0.14));
    glow.addColorStop(0.45, col(A, 0.08 + heat * 0.05));
    glow.addColorStop(1, col(A, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, 0, TAU); ctx.fill();

    // Skanningslinjer i centrum
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, TAU); ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = cy - R * 0.5; y < cy + R * 0.5; y += 3 * dpr) ctx.fillRect(cx - R * 0.5, y, R, dpr);
    ctx.restore();

    // Fasta ringar
    ring(R * 1.24, col(A, 0.16), 1, [1 * dpr, 7 * dpr]);
    ring(R * 1.08, col(LINE, 0.9), 1);
    ring(R * 0.5, col(A, 0.22), 1);
    // Markeringar vänster/höger
    ctx.strokeStyle = col(A, 0.3); ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(cx - R * 1.32, cy); ctx.lineTo(cx - R * 1.2, cy);
    ctx.moveTo(cx + R * 1.2, cy); ctx.lineTo(cx + R * 1.32, cy);
    ctx.stroke();

    // Roterande bågar
    const a1 = s * (0.22 + heat * 1.4);
    arc(R * 1.08, -1.35 + a1, 0.5, col(A, 0.7), 2);
    arc(R * 1.08, 1.75 + a1, 0.62, col(A, 0.55), 2);
    arc(R * 1.15, -0.75 - s * (0.12 + heat * 0.9), 0.3, col(RED, 0.75), 1.4);
    arc(R * 0.5, s * -0.6, 0.9, col(A, 0.35 + heat * 0.4), 1.5);

    // Pulsvåg från centrum
    const period = busy ? 1.1 : 3.6;
    const p = (s % period) / period;
    ring(R * (0.2 + p * 1.0), col(A, (1 - p) * (0.35 + heat * 0.2)), 1.2);

    // Lutande 3D-omloppsring
    const ca = Math.cos(ang * 0.7), sa = Math.sin(ang * 0.7);
    const tiltRing = 1.15 + tilt;
    for (let i = 0; i < 72; i++) {
      const u0 = (i / 72) * TAU, u1 = ((i + 1) / 72) * TAU;
      const seg = [u0, u1].map((u) => {
        let x = Math.cos(u) * 1.14, z = Math.sin(u) * 1.14;
        const x2 = x * ca - z * sa; z = x * sa + z * ca; x = x2;
        const y = z * Math.sin(tiltRing); const zz = z * Math.cos(tiltRing);
        const k = 3.4 / (3.4 - zz);
        return [cx + x * R * k, cy + y * R * k * 0.98, zz];
      });
      const d = (seg[0][2] + 1.14) / 2.28;
      if (i % 3 === 2) continue;
      ctx.strokeStyle = col(A, 0.05 + d * 0.3);
      ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.moveTo(seg[0][0], seg[0][1]); ctx.lineTo(seg[1][0], seg[1][1]); ctx.stroke();
    }

    // Sfären
    const cy1 = Math.cos(ang + yaw), sy1 = Math.sin(ang + yaw);
    const tx = 0.32 + tilt, ct = Math.cos(tx), st = Math.sin(tx);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const x1 = n.x * cy1 - n.z * sy1;
      const z1 = n.x * sy1 + n.z * cy1;
      const y2 = n.y * ct - z1 * st;
      const z2 = n.y * st + z1 * ct;
      const k = 3.2 / (3.2 - z2);
      const o = pts[i] || (pts[i] = {});
      o.x = cx + x1 * R * k;
      o.y = cy + y2 * R * k;
      o.d = (z2 + 1) / 2;
    }
    ctx.lineWidth = dpr * 0.8;
    for (const [i, j] of edges) {
      const a = pts[i], b = pts[j];
      const d = (a.d + b.d) / 2;
      ctx.strokeStyle = col(A, 0.05 + d * d * (0.4 + heat * 0.25));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let i = 0; i < nodes.length; i++) {
      const o = pts[i], n = nodes[i];
      const tw = 0.75 + 0.25 * Math.sin(s * 1.6 + n.ph);
      const sz = (n.big ? 2.4 : 1.3) * (0.6 + o.d * 0.9) * dpr;
      ctx.fillStyle = col(A, Math.min(1, (0.18 + o.d * 0.82) * tw + heat * 0.15));
      ctx.fillRect(o.x - sz / 2, o.y - sz / 2, sz, sz);
    }
    // Fyrar: mjuka cirklar runt några punkter
    for (const b of beacons) {
      const o = pts[b], n = nodes[b];
      if (o.d < 0.35) continue;
      const pr = (0.6 + 0.4 * Math.sin(s * 1.2 + n.ph)) * (10 + o.d * 10) * dpr;
      ctx.fillStyle = col(A, 0.09 * o.d + heat * 0.05);
      ctx.beginPath(); ctx.arc(o.x, o.y, pr, 0, TAU); ctx.fill();
      ctx.strokeStyle = col(A, 0.12 * o.d);
      ctx.lineWidth = dpr;
      ctx.stroke();
    }

    // Ljuspunkt i mitten
    const c = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10 * dpr);
    c.addColorStop(0, "rgba(240,255,252,1)");
    c.addColorStop(0.35, col(A, 0.8));
    c.addColorStop(1, col(A, 0));
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(cx, cy, 10 * dpr, 0, TAU); ctx.fill();
  }

  function frame(t) {
    raf = 0;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    const nowBusy = t < busyUntil;
    if (nowBusy !== busy) { busy = nowBusy; onState(busy ? "analyze" : "idle"); }
    const target = busy ? 2.2 : 0.16;
    spin += (target - spin) * Math.min(1, dt * (busy ? 4 : 1.2));
    ang += spin * dt;
    tilt += (tiltT - tilt) * Math.min(1, dt * 3);
    yaw += (yawT - yaw) * Math.min(1, dt * 3);
    draw(t);
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
    if (reduced) { yaw = yawT; tilt = tiltT; draw(performance.now()); }
  }
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || e.target === canvas) aim(e);
  }, { passive: true });
  canvas.addEventListener("pointerleave", (e) => { if (e.pointerType !== "mouse") { yawT = 0; tiltT = 0; } });
  canvas.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") { yawT = 0; tiltT = 0; } });

  function analyze(ms = 2800) {
    busyUntil = performance.now() + ms;
    if (reduced) {
      busy = true; onState("analyze"); draw(performance.now());
      setTimeout(() => { busy = false; onState("idle"); draw(performance.now()); }, ms);
    }
  }
  canvas.addEventListener("pointerdown", (e) => { aim(e); analyze(); });

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  resize();
  start();
  return { analyze };
}
