/**
 * SIMULASI TERPADU LISTRIK STATIS - FISIKA FASE F (KELAS XII)
 * Refactored for p5.js Web Editor (Zero Console Error)
 */

const K = 9e9;
const PX = 100;
const W = 800;
const H = 480;
const QT = 1e-6;
const MT = 1e-3;

const MODES = [
  ["1. Gaya Listrik", "Seret muatan. Prediksi: jika jarak dua muatan dijadikan 2×, gaya menjadi berapa kali? Ubah q dan buktikan F ∝ q₁q₂ dan F ∝ 1/r²."],
  ["2. Medan Listrik", "Seret titik P (kuning) dan muatan. Prediksi: di mana E = 0 untuk dua muatan sejenis? Lepas muatan uji dan amati lintasannya mengikuti arah medan."],
  ["3. Potensial & Energi", "Merah = V positif, biru = V negatif, titik putih = garis ekipotensial. Lepas muatan uji: perhatikan U berkurang sementara Ek bertambah (energi mekanik tetap)."],
  ["4. Kapasitor", "Ubah A, d, κ dan amati C = κε₀A/d. Prediksi: apa yang terjadi pada C jika d diperbesar 2×? Isi dan kosongkan, lalu amati kurva V(t) dengan konstanta waktu τ = RC."]
];

let mode = 0;
let ch = [];
let sel = 0;
let P = { x: 400, y: 110 };
let drag = null;
let pt = { on: false, x: 0, y: 0, vx: 0, vy: 0, tr: [] };
const cap = { v: 0, target: 0, t: 0, hist: [] };

// UI Elements (p5.Element)
let tabButtons = [];
let row1Container, row2Container;
let sliderQ, txtQVal;
let sliderA, txtAVal;
let sliderD, txtDVal;
let sliderK, txtKVal;
let sliderV, txtVVal;
let sliderR, txtRVal;
let btnLaunch;
let hintDiv;

function setup() {
  let canvas = createCanvas(W, H);
  canvas.parent(document.body);
  textFont('system-ui');

  buildUI();
  resetQ();
  setMode(0);
}

function draw() {
  background(15, 20, 30);

  if (mode === 3) {
    drawCap();
    return;
  }

  if (mode === 2) heat();
  if (mode === 1) fieldVis();
  if (mode === 0) forceVis();
  if (mode > 0) drawP();

  ch.forEach(drawCh);
  stepPt();
}

// ==========================================
// P5 UI BUILDER & HANDLERS
// ==========================================
function buildUI() {
  // Title
  let title = createElement('h3', '⚡ Simulasi Terpadu Listrik Statis — Fisika Fase F');
  title.style('margin', '5px 0');
  title.style('color', 'black');

  // Tabs Container
  let tabContainer = createDiv();
  tabContainer.style('display', 'flex');
  tabContainer.style('gap', '6px');
  tabContainer.style('margin-bottom', '8px');

  MODES.forEach((m, i) => {
    let btn = createButton(m[0]);
    btn.parent(tabContainer);
    btn.style('padding', '6px 12px');
    btn.style('border-radius', '6px');
    btn.style('cursor', 'pointer');
    btn.mousePressed(() => setMode(i));
    tabButtons.push(btn);
  });

  // Row 1 (Modes 0, 1, 2)
  row1Container = createDiv();
  row1Container.style('display', 'flex');
  row1Container.style('gap', '8px');
  row1Container.style('align-items', 'center');
  row1Container.style('flex-wrap', 'wrap');
  row1Container.style('margin-bottom', '8px');
  row1Container.style('color', '#e6e9f0');

  createButton('+ Muatan positif').parent(row1Container).mousePressed(() => addQ(1));
  createButton('+ Muatan negatif').parent(row1Container).mousePressed(() => addQ(-1));
  createButton('Hapus terpilih').parent(row1Container).mousePressed(delQ);
  createButton('Reset').parent(row1Container).mousePressed(resetQ);

  createSpan('q terpilih: ').parent(row1Container);
  sliderQ = createSlider(-10, 10, 3, 0.5).parent(row1Container);
  txtQVal = createSpan('3').parent(row1Container);
  createSpan('µC').parent(row1Container);
  sliderQ.input(() => {
    if (ch[sel]) {
      ch[sel].q = sliderQ.value();
      txtQVal.html(sliderQ.value());
    }
  });

  btnLaunch = createButton('Lepas muatan uji (+1 µC)').parent(row1Container);
  btnLaunch.mousePressed(launch);

  // Row 2 (Capacitor Mode)
  row2Container = createDiv();
  row2Container.style('display', 'flex');
  row2Container.style('gap', '8px');
  row2Container.style('align-items', 'center');
  row2Container.style('flex-wrap', 'wrap');
  row2Container.style('margin-bottom', '8px');
  row2Container.style('color', '#e6e9f0');

  // A
  createSpan('A:').parent(row2Container);
  sliderA = createSlider(20, 200, 100).parent(row2Container);
  txtAVal = createSpan('100').parent(row2Container);
  createSpan('cm² |').parent(row2Container);

  // d
  createSpan('d:').parent(row2Container);
  sliderD = createSlider(0.5, 5, 1, 0.1).parent(row2Container);
  txtDVal = createSpan('1').parent(row2Container);
  createSpan('mm |').parent(row2Container);

  // k
  createSpan('κ:').parent(row2Container);
  sliderK = createSlider(1, 10, 1, 0.5).parent(row2Container);
  txtKVal = createSpan('1').parent(row2Container);
  createSpan('|').parent(row2Container);

  // V
  createSpan('V:').parent(row2Container);
  sliderV = createSlider(1, 30, 10).parent(row2Container);
  txtVVal = createSpan('10').parent(row2Container);
  createSpan('V |').parent(row2Container);

  // R
  createSpan('R:').parent(row2Container);
  sliderR = createSlider(0.5, 5, 1, 0.5).parent(row2Container);
  txtRVal = createSpan('1').parent(row2Container);
  createSpan('MΩ').parent(row2Container);

  createButton('Isi').parent(row2Container).mousePressed(() => capGo(1));
  createButton('Kosongkan').parent(row2Container).mousePressed(() => capGo(0));

  // Connect Slider Inputs for Capacitor
  const syncCapInputs = () => {
    txtAVal.html(sliderA.value());
    txtDVal.html(sliderD.value());
    txtKVal.html(sliderK.value());
    txtVVal.html(sliderV.value());
    txtRVal.html(sliderR.value());
    if (cap.target > 0) cap.target = sliderV.value();
    cap.hist = [];
    cap.t = 0;
  };

  sliderA.input(syncCapInputs);
  sliderD.input(syncCapInputs);
  sliderK.input(syncCapInputs);
  sliderV.input(syncCapInputs);
  sliderR.input(syncCapInputs);

  // Hint Box
  hintDiv = createDiv('');
  hintDiv.style('background', '#1a2030');
  hintDiv.style('border', '1px solid #2c3446');
  hintDiv.style('padding', '8px 12px');
  hintDiv.style('border-radius', '8px');
  hintDiv.style('font-size', '14px');
  hintDiv.style('color', '#9aa3b5');
  hintDiv.style('margin-top', '8px');
  hintDiv.style('max-width', W + 'px');
}

function setMode(i) {
  mode = i;
  tabButtons.forEach((b, j) => {
    if (i === j) {
      b.style('background', '#2563eb');
      b.style('color', '#ffffff');
    } else {
      b.style('background', '#1a2030');
      b.style('color', '#e6e9f0');
    }
  });

  if (i === 3) {
    row1Container.hide();
    row2Container.show();
  } else {
    row1Container.show();
    row2Container.hide();
  }

  if (i === 0) {
    btnLaunch.hide();
  } else {
    btnLaunch.show();
  }

  hintDiv.html(MODES[i][1]);
  pt.on = false;
}

// ==========================================
// LOGIC & SIMULATION FUNCTIONS
// ==========================================
function resetQ() {
  ch = [{ x: 300, y: 260, q: 3 }, { x: 500, y: 260, q: -3 }];
  sel = 0;
  pt.on = false;
  syncQ();
}

function addQ(s) {
  ch.push({ x: 150 + Math.random() * 500, y: 200 + Math.random() * 180, q: 3 * s });
  sel = ch.length - 1;
  syncQ();
}

function delQ() {
  if (ch.length) {
    ch.splice(sel, 1);
    sel = Math.max(0, ch.length - 1);
    syncQ();
  }
}

function syncQ() {
  if (ch[sel]) {
    sliderQ.value(ch[sel].q);
    txtQVal.html(ch[sel].q);
  }
}

function capGo(f) {
  cap.target = f ? sliderV.value() : 0;
}

function launch() {
  pt = { on: true, x: P.x / PX, y: P.y / PX, vx: 0, vy: 0, tr: [] };
}

function Ef(x, y) {
  let ex = 0, ey = 0;
  for (const c of ch) {
    let dx = (x - c.x) / PX, dy = (y - c.y) / PX;
    let r2 = Math.max(dx * dx + dy * dy, 0.01), r = Math.sqrt(r2);
    let e = K * c.q * 1e-6 / r2;
    ex += e * dx / r;
    ey += e * dy / r;
  }
  return [ex, ey];
}

function Vf(x, y) {
  let v = 0;
  for (const c of ch) {
    let r = Math.max(Math.hypot(x - c.x, y - c.y) / PX, 0.1);
    v += K * c.q * 1e-6 / r;
  }
  return v;
}

function fmt(x, u) {
  const a = Math.abs(x);
  const p = [[1e-12, 'p'], [1e-9, 'n'], [1e-6, 'µ'], [1e-3, 'm'], [1, ''], [1e3, 'k']];
  let s = p[0];
  for (const q of p) if (a >= q[0]) s = q;
  return (x / s[0]).toFixed(2) + ' ' + s[1] + u;
}

function arrow(x1, y1, x2, y2, c, w = 2) {
  stroke(c);
  strokeWeight(w);
  line(x1, y1, x2, y2);
  const a = atan2(y2 - y1, x2 - x1);
  fill(c);
  noStroke();
  push();
  translate(x2, y2);
  rotate(a);
  triangle(0, 0, -8, -4, -8, 4);
  pop();
}

function drawCh(c, i) {
  const r = 10 + Math.abs(c.q) * 1.5;
  noStroke();
  fill(c.q >= 0 ? '#ef4444' : '#3b82f6');
  circle(c.x, c.y, r * 2);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(c.q >= 0 ? '+' : '−', c.x, c.y - 1);
  if (i == sel) {
    noFill();
    stroke(255);
    strokeWeight(2);
    circle(c.x, c.y, r * 2 + 8);
  }
}

function forceVis() {
  fill(230);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(13);
  let ty = 10;
  ch.forEach((c, i) => {
    let fx = 0, fy = 0;
    ch.forEach((d, j) => {
      if (i != j) {
        const [ex, ey] = Ef2(d, c.x, c.y);
        fx += c.q * 1e-6 * ex;
        fy += c.q * 1e-6 * ey;
      }
    });
    const F = Math.hypot(fx, fy) * 1000;
    if (F > 1e-6) {
      const L = Math.min(140, 14 * F);
      arrow(c.x, c.y, c.x + fx / (F / 1000) * L / 1000, c.y + fy / (F / 1000) * L / 1000, '#facc15', 3);
    }
    noStroke();
    fill(230);
    text(`F${i + 1} = ${F.toFixed(2)} mN`, 10, ty);
    ty += 18;
  });

  if (ch.length >= 2) {
    const a = ch[0], b = ch[1], r = Math.hypot(a.x - b.x, a.y - b.y) / PX;
    stroke(120);
    strokeWeight(1);
    drawingContext.setLineDash([5, 5]);
    line(a.x, a.y, b.x, b.y);
    drawingContext.setLineDash([]);
    noStroke();
    fill(230);
    textAlign(CENTER);
    text(`r = ${r.toFixed(2)} m`, (a.x + b.x) / 2, (a.y + b.y) / 2 - 14);
    textAlign(LEFT);
    let forceType = a.q * b.q > 0 ? 'tolak' : 'tarik';
    text(`F = k·q₁q₂/r² = ${(K * Math.abs(a.q * b.q) * 1e-12 / (r * r) * 1000).toFixed(2)} mN  (${forceType}-menolak)`, 10, H - 24);
  }
}

function Ef2(d, x, y) {
  let dx = (x - d.x) / PX, dy = (y - d.y) / PX;
  let r2 = Math.max(dx * dx + dy * dy, 0.01), r = Math.sqrt(r2);
  let e = K * d.q * 1e-6 / r2;
  return [e * dx / r, e * dy / r];
}

function fieldVis() {
  for (let x = 20; x < W; x += 40) {
    for (let y = 20; y < H; y += 40) {
      const [ex, ey] = Ef(x, y), E = Math.hypot(ex, ey);
      if (E < 1) continue;
      const L = 28 * (1 - Math.exp(-E / 2e4));
      arrow(x - ex / E * L / 2, y - ey / E * L / 2, x + ex / E * L / 2, y + ey / E * L / 2, color(80, 140, 255, 150), 1.5);
    }
  }

  ch.forEach(c => {
    const s = c.q > 0 ? 1 : -1;
    if (!c.q) return;
    for (let k = 0; k < 12; k++) {
      let a = k / 12 * TWO_PI, x = c.x + Math.cos(a) * 14, y = c.y + Math.sin(a) * 14;
      stroke(250, 204, 21, 170);
      strokeWeight(1.2);
      noFill();
      beginShape();
      vertex(x, y);
      for (let n = 0; n < 400; n++) {
        const [ex, ey] = Ef(x, y), E = Math.hypot(ex, ey);
        if (E < 1e-3) break;
        x += s * ex / E * 4;
        y += s * ey / E * 4;
        vertex(x, y);
        if (x < 0 || x > W || y < 0 || y > H || ch.some(d => d != c && d.q * c.q < 0 && Math.hypot(x - d.x, y - d.y) < 12)) break;
      }
      endShape();
    }
  });

  const [ex, ey] = Ef(P.x, P.y), E = Math.hypot(ex, ey);
  if (E > 1) {
    const L = 60 * (1 - Math.exp(-E / 2e4)) + 10;
    arrow(P.x, P.y, P.x + ex / E * L, P.y + ey / E * L, '#22c55e', 3);
  }
  noStroke();
  fill(230);
  textAlign(LEFT, TOP);
  textSize(13);
  text(`Di P: E = ${fmt(E, 'N/C')}  (Ex=${fmt(ex, '')}, Ey=${fmt(-ey, '')} ke atas)`, 10, 10);
}

function heat() {
  const g = 10, nx = W / g, ny = H / g, V = [];
  noStroke();
  for (let i = 0; i <= nx; i++) {
    V[i] = [];
    for (let j = 0; j <= ny; j++) V[i][j] = Vf(i * g + g / 2, j * g + g / 2);
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const v = V[i][j], t = Math.tanh(v / 2e4);
      fill(t > 0 ? color(40 + 215 * t, 40, 50) : color(40, 50, 40 - 215 * t));
      rect(i * g, j * g, g, g);
    }
  }
  fill(255);
  const st = 5000;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const a = Math.floor(V[i][j] / st);
      if (a != Math.floor(V[i + 1][j] / st) || a != Math.floor(V[i][j + 1] / st)) rect(i * g + 3, j * g + 3, 3, 3);
    }
  }

  const v = Vf(P.x, P.y);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(13);
  text(`Di P: V = ${fmt(v, 'V')}   U (muatan uji +1 µC) = ${fmt(v * QT, 'J')}`, 10, 10);

  if (pt.on || pt.tr.length) {
    const U = Vf(pt.x * PX, pt.y * PX) * QT;
    const Kk = 0.5 * MT * (pt.vx * pt.vx + pt.vy * pt.vy);
    text(`U = ${fmt(U, 'J')}   Ek = ${fmt(Kk, 'J')}   U + Ek = ${fmt(U + Kk, 'J')}`, 10, 30);
  }
}

function drawP() {
  noStroke();
  fill('#facc15');
  circle(P.x, P.y, 12);
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(10);
  text('P', P.x, P.y);
}

function stepPt() {
  if (mode === 0 || (!pt.on && !pt.tr.length)) return;

  if (pt.on) {
    for (let s = 0; s < 4; s++) {
      const [ex, ey] = Ef(pt.x * PX, pt.y * PX);
      const a = QT / MT, dt = 0.004;
      pt.vx += ex * a * dt;
      pt.vy += ey * a * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
    pt.tr.push([pt.x * PX, pt.y * PX]);
    if (pt.tr.length > 600) pt.tr.shift();

    if (pt.x < 0 || pt.x > W / PX || pt.y < 0 || pt.y > H / PX || ch.some(c => Math.hypot(pt.x * PX - c.x, pt.y * PX - c.y) < 14)) {
      pt.on = false;
    }
  }

  noFill();
  stroke(34, 197, 94);
  strokeWeight(2);
  beginShape();
  pt.tr.forEach(p => vertex(p[0], p[1]));
  endShape();

  noStroke();
  fill('#22c55e');
  circle(pt.x * PX, pt.y * PX, 9);
}

function mousePressed() {
  if (mouseX < 0 || mouseX > W || mouseY < 0 || mouseY > H || mode === 3) return;

  for (let i = ch.length - 1; i >= 0; i--) {
    if (Math.hypot(mouseX - ch[i].x, mouseY - ch[i].y) < 22) {
      sel = i;
      drag = ch[i];
      syncQ();
      return;
    }
  }

  if (mode > 0 && Math.hypot(mouseX - P.x, mouseY - P.y) < 18) {
    drag = P;
  }
}

function mouseDragged() {
  if (drag) {
    drag.x = constrain(mouseX, 10, W - 10);
    drag.y = constrain(mouseY, 10, H - 10);
  }
}

function mouseReleased() {
  drag = null;
}

function drawCap() {
  const A = sliderA.value();
  const d = sliderD.value();
  const k = sliderK.value();
  const Vs = sliderV.value();
  const R = sliderR.value();

  const C = k * 8.854e-12 * A * 1e-4 / (d * 1e-3);
  const tau = R * 1e6 * C;

  cap.v += (cap.target - cap.v) * (1 - Math.exp(-0.6 / 60));
  if (cap.t < 6) {
    cap.t += 0.6 / 60;
    cap.hist.push([cap.t, cap.v]);
  }

  const gap = 30 + d * 30, w = 60 + A * 0.9, cx = 210, cy = 250, top = cy - gap / 2, bot = cy + gap / 2;

  noStroke();
  if (k > 1) {
    fill(250, 190, 40, 40 + k * 12);
    rect(cx - w / 2, top, w, gap);
  }

  fill(200);
  rect(cx - w / 2, top - 8, w, 8);
  rect(cx - w / 2, bot, w, 8);

  const n = Math.round(cap.v / 30 * 12);
  textAlign(CENTER, CENTER);
  textSize(14);
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + (i + 0.5) * w / Math.max(n, 1);
    fill('#ef4444');
    text('+', x, top + 8);
    fill('#3b82f6');
    text('−', x, bot - 8);
  }

  if (cap.v > 0.1) {
    for (let i = 0; i < 6; i++) {
      const x = cx - w / 2 + (i + 0.5) * w / 6;
      arrow(x, top + 18, x, bot - 18, color(250, 204, 21, 200), 1.5);
    }
  }

  stroke(150);
  strokeWeight(1.5);
  line(cx, top - 8, cx, top - 60);
  line(cx, bot + 8, cx, bot + 60);

  noStroke();
  fill(230);
  textSize(13);
  textAlign(LEFT, TOP);

  const Q = C * cap.v;
  const Wn = 0.5 * C * cap.v * cap.v;

  text(`C = κε₀A/d = ${fmt(C, 'F')}`, 20, 20);
  text(`V kapasitor = ${cap.v.toFixed(2)} V (sumber ${Vs} V)`, 20, 40);
  text(`Q = CV = ${fmt(Q, 'C')}`, 20, 60);
  text(`W = ½CV² = ${fmt(Wn, 'J')}`, 20, 80);
  text(`τ = RC = ${fmt(tau, 's')}`, 20, 100);
  text(`E antar keping = V/d = ${fmt(cap.v / (d * 1e-3), 'V/m')}`, 20, 120);
  text(`d = ${d} mm`, cx + w / 2 + 10, cy - 6);

  const gx = 450, gy = 70, gw = 320, gh = 240;
  stroke(90);
  strokeWeight(1);
  noFill();
  rect(gx, gy, gw, gh);

  noStroke();
  fill(200);
  textAlign(CENTER);
  text('V(t)  — sumbu t dalam satuan τ', gx + gw / 2, gy - 16);
  textAlign(RIGHT);
  text(Vs + ' V', gx - 4, gy);
  text('0', gx - 4, gy + gh);

  textAlign(CENTER);
  for (let i = 0; i <= 6; i += 2) text(i + 'τ', gx + i / 6 * gw, gy + gh + 12);

  stroke(90);
  drawingContext.setLineDash([4, 4]);
  line(gx, gy + gh * (1 - 0.632), gx + gw, gy + gh * (1 - 0.632));
  drawingContext.setLineDash([]);
  noStroke();
  fill(150);
  textAlign(LEFT);
  text('63%', gx + 4, gy + gh * (1 - 0.632) - 12);

  noFill();
  stroke('#22c55e');
  strokeWeight(2);
  beginShape();
  cap.hist.forEach(p => vertex(gx + p[0] / 6 * gw, gy + gh - p[1] / Vs * gh));
  endShape();

  noStroke();
  fill(230);
  textAlign(LEFT);
  text('Seri/paralel: gunakan C total = C₁+C₂ (paralel), 1/C = 1/C₁+1/C₂ (seri).', 20, H - 24);
}