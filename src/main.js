// 箭头挪出核玩工具 —— 主程序：游戏循环 / 镜头 / 渲染 / 输入 / 自动通关（参考序列 + 求解）/ 关卡编辑器 / 录制 / AE·H5 导出 / 设置面板
import { GROUPS, DEFS, loadSettings, saveSettings, migrate, exportJSON, APP_ID, APP_VERSION } from './settings.js';
import { Game, levelFromSettings, solveLevel, normalizeLevel, levelFromImage, REF_LEVEL } from './game.js';
import * as R from './render.js';
import { Sfx } from './audio.js';
import { REF_TAPS, REF_CAM, REF_GRID, REF_HAND0, REF_HAND, REF_HAND_DT } from './refseq.js';
import { createAERecorder } from './ae/recorder.js';
import { DEFAULT_HAND } from './default_hand.js';
import { exportH5PlayableFromPage, applyPlayableMode, isPlayableNoHand, applyH5DevicePresetToSettings, markH5DeviceCustomIfSizeEdited, bindEditorDevicePreview } from './h5/index.js';

const DW = 720, DH = 1280;
const H5_NO_HAND = isPlayableNoHand();
let S = loadSettings();
const cv = document.getElementById('stage'); const ctx = cv.getContext('2d');
const sfx = new Sfx();
const now = () => window.__vclock != null ? window.__vclock : performance.now();
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const easeIO = t => { t = clamp01(t); return -(Math.cos(Math.PI * t) - 1) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const status = t => { const el = document.getElementById('status'); if (el) el.textContent = t; };
let G, level, view, K = 1, lastT = 0, acc = 0, grid = { x: 0, y: 0, p: 13.64 };
let cam = { s: 1, tx: 0, ty: 0 }, camAnim = null, camUser = false;
let auto = null, autoToken = 0;
const hand = { x: REF_HAND0.x, y: REF_HAND0.y, press: 0, pressT0: null, img: null, visible: false, follow: null };
const ripples = []; let voicePlayed = false, winSfx = false;
let editor = null, vig = null;
window.__finished = false;

// ---------- 画面 / 视口 ----------
function computeView() { const cw = S.canvasW, ch = S.canvasH; K = Math.min(cw / DW, ch / DH); const w = cw / K, h = ch / K; view = { x0: DW / 2 - w / 2, y0: DH / 2 - h / 2, w, h }; }
function computeGrid() {
  if (S.gridAuto) { const c = Math.max(1, level.cols - 1), r = Math.max(1, level.rows - 1), p = Math.min(650 / c, 690 / r); grid = { x: 360 - p * c / 2, y: 712 - p * r / 2, p }; }
  else grid = { x: S.gridX, y: S.gridY, p: S.gridPitch };
}
const isRefLevel = () => !(S.levelJson && S.levelJson.trim()) && level.lines.length === REF_LEVEL.lines.length;
const RX = c => grid.x + c * grid.p, RY = r => grid.y + r * grid.p; // 格 → 参考坐标
const toDesign = (rx, ry, C = cam) => [C.s * rx + C.tx, C.s * ry + C.ty];
const toRef = (dx, dy, C = cam) => [(dx - C.tx) / C.s, (dy - C.ty) / C.s];
const cellToDesign = (c, r, C = cam) => toDesign(RX(c), RY(r), C);
function viewCells(C = cam) { const [ax, ay] = toRef(view.x0, view.y0, C), [bx, by] = toRef(view.x0 + view.w, view.y0 + view.h, C); return { x0: (ax - grid.x) / grid.p, y0: (ay - grid.y) / grid.p, x1: (bx - grid.x) / grid.p, y1: (by - grid.y) / grid.p }; }
// 参考镜头关键帧 → 当前网格（网格位置/间距被改时等效换算）
function refCamAdjust(s, tx, ty) { const A = grid.p / REF_GRID.pitch, Bx = grid.x - REF_GRID.x * A, By = grid.y - REF_GRID.y * A; return { s: s / A, tx: tx - s * Bx / A, ty: ty - s * By / A }; }
const CAM_FIT = () => ({ s: 1, tx: 0, ty: 0 });
function clampCam(C) {
  const m = 4, bx0 = RX(-m), bx1 = RX(level.cols - 1 + m), by0 = RY(-m), by1 = RY(level.rows - 1 + m);
  const vw = view.w / C.s, vh = view.h / C.s; let [cx, cy] = toRef(view.x0 + view.w / 2, view.y0 + view.h / 2, C);
  cx = vw >= bx1 - bx0 ? (bx0 + bx1) / 2 : Math.max(bx0 + vw / 2, Math.min(bx1 - vw / 2, cx));
  cy = vh >= by1 - by0 ? (by0 + by1) / 2 : Math.max(by0 + vh / 2, Math.min(by1 - vh / 2, cy));
  return { s: C.s, tx: view.x0 + view.w / 2 - C.s * cx, ty: view.y0 + view.h / 2 - C.s * cy };
}
function camCenteredOn(rx, ry, s = S.camZoom) { return clampCam({ s, tx: view.x0 + view.w / 2 - s * rx, ty: view.y0 + view.h / 2 - s * ry }); }
function introTarget() { if (isRefLevel() && !S.gridAuto) { const k = REF_CAM[0]; return refCamAdjust(k[2], k[3], k[4]); } return camCenteredOn(RX(level.cols * 0.206), RY(level.rows * 0.213)); }
function panTo(C, dur = S.camPanDur) { camAnim = { from: { ...cam }, to: C, t0: G.t, dur: Math.max(0.01, dur / (auto ? S.autoSpeed : 1)) }; }
function updateCamera() {
  if (editor) { cam = CAM_FIT(); return; }
  if (G.winT != null && S.winZoomOut && S.winShow && !(camAnim && camAnim.win)) { camAnim = { from: { ...cam }, to: CAM_FIT(), t0: G.t, dur: 0.9, win: true }; }
  if (auto && auto.mode === 'ref' && auto.refCam && !camAnim) { // 参考序列：镜头按参考视频的关键帧
    const tau = (G.t - auto.t0) * S.autoSpeed; let C = CAM_FIT();
    for (const k of REF_CAM) { const to = refCamAdjust(k[2], k[3], k[4]); if (tau >= k[1]) C = to; else if (tau > k[0]) { const u = easeIO((tau - k[0]) / (k[1] - k[0])); C = { s: lerp(C.s, to.s, u), tx: lerp(C.tx, to.tx, u), ty: lerp(C.ty, to.ty, u) }; break; } else break; }
    cam = C; return;
  }
  if (camAnim) { const u = (G.t - camAnim.t0) / camAnim.dur, e = easeIO(u); cam = { s: lerp(camAnim.from.s, camAnim.to.s, e), tx: lerp(camAnim.from.tx, camAnim.to.tx, e), ty: lerp(camAnim.from.ty, camAnim.to.ty, e) }; if (u >= 1) { cam = { ...camAnim.to }; if (!camAnim.win) camAnim = null; else camAnim.done = true; } return; }
  if (S.camMode === 'fit') { cam = CAM_FIT(); return; }
  if (!camUser && !G.introDone) { // 开场：全景停留 → 放大
    if (G.t < S.introHold) cam = CAM_FIT(); else { const u = (G.t - S.introHold) / S.introZoomDur, to = introTarget(), e = easeIO(u); cam = { s: lerp(1, to.s, e), tx: lerp(0, to.tx, e), ty: lerp(0, to.ty, e) }; if (u >= 1) G.introDone = true; }
  }
}
function rebuild() {
  if (cv.width !== S.canvasW || cv.height !== S.canvasH) { cv.width = S.canvasW; cv.height = S.canvasH; }
  if (!document.documentElement.classList.contains('h5-playable')) cv.style.aspectRatio = `${S.canvasW}/${S.canvasH}`;
  computeView();
}
function newGame() {
  stopAuto(); rebuild(); level = levelFromSettings(S); computeGrid();
  G = new Game(level, S); lastT = now(); acc = 0; ripples.length = 0; vig = null; cam = CAM_FIT(); camAnim = null; camUser = false; voicePlayed = false; winSfx = false;
  hand.x = REF_HAND0.x; hand.y = REF_HAND0.y; window.__finished = false; sfx.stopVoice();
  const sv = solveLevel(level); G.solvable = sv.solvable;
  status(`v${APP_VERSION} · ${level.name || '自定义关卡'} · ${level.cols}×${level.rows} 格 · ${level.lines.length} 条线 · ${sv.solvable ? '可全部挪出' : `⚠ 不可解（${sv.stuck.length} 条卡死）`}`);
}
const ended = () => !!(G && G.winT != null);
const winU = () => (G && G.winT != null && S.winShow) ? (G.t - G.winT - S.winDelay) / 0.6 : 0;

// ---------- 游戏推进（固定 120Hz 步长，确定性） ----------
function step(t) {
  let dt = Math.min(0.25, (t - lastT) / 1000); lastT = t; if (dt <= 0) return;
  acc += dt; const h = 1 / 120;
  while (acc >= h) { acc -= h; if (editor) continue; directorStep(); G.update(h, viewCells()); updateCamera(); handleEvents(); }
}
function handleEvents() {
  for (const e of G.events) {
    if (e.type === 'slide') sfx.play('slide', S, { delay: S.sfxDelay });
    else if (e.type === 'block') { sfx.play('block', S, { delay: S.sfxDelay }); G.nBlocked = (G.nBlocked || 0) + 1; const REFV = [[0, 0.12, 0.18], [0, 0.12, 0.11], [0, 0.1, 0]], k = G.nBlocked - 1; if (S.blockVig === 'always') vig = { t0: G.t, hold: S.blockVigDur * 0.4, fade: S.blockVigDur * 0.6 }; else if (S.blockVig === 'ref' && REFV[k]) vig = { t0: G.t + REFV[k][0], hold: REFV[k][1], fade: REFV[k][2] }; }
    else if (e.type === 'win') { window.__finished = true; status(`全部挪出！用时 ${G.t.toFixed(1)} 秒`); onFinish(); }
  }
  G.events.length = 0;
  if (!voicePlayed && G.t >= S.voiceAt) { voicePlayed = true; if (sfx.ctx && (sfx.ctx.state === 'running' || window.__vclock != null) && (G.t - S.voiceAt) < 0.5) sfx.play('voice', S); }
  if (!winSfx && G.winT != null && S.winShow && G.t >= G.winT + S.winDelay) { winSfx = true; sfx.play('win', S); }
  if (S.autoPanEmpty && !auto && !editor && !camUser && G.introDone && !camAnim && G.winT == null && S.camMode !== 'fit') {
    const v = viewCells(), any = G.lines.some(l => l.state !== 'gone' && l.p.some(q => q[0] > v.x0 && q[0] < v.x1 && q[1] > v.y0 && q[1] < v.y1));
    if (!any) { const l = G.lines.find(l => l.state === 'idle'); if (l) { const h = l.p[l.n]; panTo(camCenteredOn(RX(h[0]), RY(h[1]), cam.s)); } }
  }
}

// ---------- 自动通关：参考序列（含被挡点击）→ 求解；确定性调度（按游戏时间） ----------
let rngS = 1; const rnd = (a = 0, b = 1) => { rngS = (rngS * 16807) % 2147483647; return a + (rngS / 2147483647) * Math.max(0, b - a); };
function startAuto() {
  newGame(); const tok = ++autoToken; rngS = 12345;
  const refOk = S.autoMode === 'ref' && isRefLevel();
  auto = { tok, mode: refOk ? 'ref' : 'solver', refCam: refOk && !S.gridAuto && S.camMode !== 'fit', t0: G.t, refIdx: 0, plan: null, lastTapT: 0, taps: 0, blocked: 0 };
  if (auto.mode === 'solver' && S.camMode !== 'fit') G.introDone = false;
  hand.visible = true; hand.x = REF_HAND0.x; hand.y = REF_HAND0.y; updAutoBtn(); sfx.resume();
  if (S.autoRec && !rec) startRec();
}
function stopAuto() { if (!auto) return; auto = null; autoToken++; hand.visible = false; hand.follow = null; hand.pressT0 = null; updAutoBtn(); }
function autoSolve() { if (auto) { stopAuto(); return; } startAuto(); }
function headRef(l) { const h = l.p[l.n]; return [RX(h[0] + l.dir[0] * 0.15), RY(h[1] + l.dir[1] * 0.15)]; }
function pickSolver() {
  const free = G.freeIds(); if (!free.length) return null;
  let cand = free;
  if (S.autoMode === 'solverMiss' && rnd() < S.missChance) { const blocked = G.idleIds().filter(i => !free.includes(i)); if (blocked.length) cand = blocked; }
  if (S.autoPick === 'random') return cand[Math.floor(rnd() * cand.length)];
  const vc = viewCells(), inView = cand.filter(i => { const h = G.lines[i].p[G.lines[i].n]; return h[0] > vc.x0 + 1 && h[0] < vc.x1 - 1 && h[1] > vc.y0 + 1 && h[1] < vc.y1 - 1; });
  const pool = inView.length ? inView : cand;
  if (S.autoPick === 'scan') return pool.slice().sort((a, b) => G.lines[a].p[G.lines[a].n][1] - G.lines[b].p[G.lines[b].n][1] || G.lines[a].p[G.lines[a].n][0] - G.lines[b].p[G.lines[b].n][0])[0];
  const [hx, hy] = toRef(hand.x, hand.y); return pool.slice().sort((a, b) => { const A = headRef(G.lines[a]), B = headRef(G.lines[b]); return Math.hypot(A[0] - hx, A[1] - hy) - Math.hypot(B[0] - hx, B[1] - hy); })[0];
}
function directorStep() {
  if (!auto) return; const sp = S.autoSpeed, tau = (G.t - auto.t0);
  if (G.winT != null) { if (auto.plan) auto.plan = null; if (S.endCard && endAlpha() <= 0) return; if (!auto.doneT) auto.doneT = G.t; return; }
  if (auto.pend && G.t >= auto.pend.t) { const r = G.lines[auto.pend.id].state === 'idle' ? G.tap(auto.pend.id) : null; if (r && !r.ok) auto.blocked++; auto.pend = null; }
  if (!auto.plan) {
    let id = null, at = null, pt = null, jit = [(rnd() - 0.5) * S.jitter, (rnd() - 0.5) * S.jitter];
    if (auto.mode === 'ref') {
      if (auto.refIdx < REF_TAPS.length) { const [tt, li, pc, pr] = REF_TAPS[auto.refIdx]; id = li; if (pc != null) pt = [RX(pc), RY(pr)]; at = tt / sp; jit = [0, 0]; }
      else { auto.mode = 'solver'; auto.refCam = false; }
    }
    if (auto.mode === 'solver') {
      if (auto.pend) return; id = pickSolver(); if (id == null) return; // 没有可点的线（都在滑动中）→ 等
      const gap = (rnd(S.delayMin, S.delayMax) + (rnd() < S.thinkChance ? rnd(0, S.thinkMax) : 0)) / 1000 / sp;
      at = Math.max(tau + 0.05, auto.lastTapT + gap, auto.taps === 0 ? S.autoStartDelay / 1000 / sp : 0);
      // 目标不在安全区 → 先平移镜头
      if (S.camMode !== 'fit') { const [x, y] = toDesign(...headRef(G.lines[id])), m = S.camMargin; if (x < view.x0 + view.w * m || x > view.x0 + view.w * (1 - m) || y < view.y0 + view.h * m || y > view.y0 + view.h * (1 - m) - 60) { const h = G.lines[id].p[G.lines[id].n]; panTo(camCenteredOn(RX(h[0]), RY(h[1]), Math.max(cam.s, S.camZoom))); camUser = true; at = Math.max(at, tau + S.camPanDur / sp + 0.1 / sp); } }
    }
    const gapAll = at - Math.max(tau, auto.lastTapT + 0.12 / sp), md = Math.max(0.12 / sp, Math.min(rnd(S.moveMin, S.moveMax) / 1000 / sp, gapAll - 0.05 / sp));
    auto.plan = { id, at, pt, moveT0: Math.max(tau, at - md), moveDur: md, from: null, jit, bend: [(rnd() - 0.5) * 50, 10 + rnd() * 25] };
  }
  const P = auto.plan; const l = G.lines[P.id];
  const tgt = toDesign(...(P.pt || headRef(l))); tgt[0] += P.jit[0]; tgt[1] += P.jit[1];
  const track = auto.mode === 'ref' && auto.refCam && S.autoHandTrack && Math.abs(grid.p - REF_GRID.pitch) < 1e-6 && Math.abs(grid.x - REF_GRID.x) < 1e-6 && Math.abs(grid.y - REF_GRID.y) < 1e-6;
  if (track) { const u = tau * sp / REF_HAND_DT, n = REF_HAND.length / 2 - 1, i = Math.max(0, Math.min(n - 1, Math.floor(u))), f = Math.max(0, Math.min(1, u - i)), e = f * f * (3 - 2 * f); hand.x = lerp(REF_HAND[i * 2], REF_HAND[i * 2 + 2], e); hand.y = lerp(REF_HAND[i * 2 + 1], REF_HAND[i * 2 + 3], e); auto.lastTrack = true; }
  else if (tau >= P.moveT0) { if (!P.from) P.from = [hand.x, hand.y]; const u = clamp01((tau - P.moveT0) / P.moveDur), e = easeIO(u), [x0, y0] = P.from, cx = (x0 + tgt[0]) / 2 + P.bend[0], cy = (y0 + tgt[1]) / 2 + P.bend[1]; hand.x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * tgt[0]; hand.y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * tgt[1]; }
  if (S.pressEnabled && hand.pressT0 == null && tau >= P.at - 0.06 / sp) hand.pressT0 = G.t;
  if (tau >= P.at) {
    if (!track) { hand.x = tgt[0]; hand.y = tgt[1]; }
    if (l.state === 'idle') { const [rx, ry] = toRef(hand.x, hand.y); doTap(null, rx, ry); auto.pend = { id: P.id, t: G.t + S.autoTapLatency / sp }; }
    auto.lastTapT = tau; auto.taps++; auto.plan = null; if (auto.mode === 'ref') auto.refIdx++;
  }
}
function doTap(id, rx, ry) {
  if (S.tapRipple) ripples.push({ x: rx, y: ry, t0: G.t, id: ++ripples.n });
  if (S.sfxTap) sfx.play('tap', S);
  return id == null ? null : G.tap(id);
}
ripples.n = 0;
function onFinish() { if (rec && S.autoStop && auto) { const ms = (S.winShow ? S.winDelay * 1000 + 600 : 0) + (S.endCard ? S.endDelay + 400 : 0) + S.tailSec * 1000; finishStopT = G.t + ms / 1000; } }
let finishStopT = null;
function updAutoBtn() { const b = document.getElementById('btnAuto'); if (b) { b.textContent = auto ? '■ 停止' : '▶ 自动通关'; b.classList.toggle('on', !!auto); } }

// ---------- 渲染 ----------
function boardTransform(g) { g.setTransform(K * cam.s, 0, 0, K * cam.s, K * (cam.tx - view.x0), K * (cam.ty - view.y0)); }
function drawBoard(g) {
  boardTransform(g); const p = grid.p;
  R.drawDots(g, S, G.dots, RX, RY, p);
  const moving = [];
  for (const l of G.lines) { if (l.state === 'gone') continue; if (l.state !== 'idle') { moving.push(l); continue; } drawOne(g, l); }
  for (const l of moving) {
    if (l.state === 'out' && S.pathPreview) { const h = G.poly(l).pts.slice(-1)[0], x = RX(h[0]), y = RY(h[1]), L = 120 * p, gr = g.createLinearGradient(x, y, x + l.dir[0] * L, y + l.dir[1] * L); const [a, b, c] = R.hexRGB(S.pathPreviewColor); gr.addColorStop(0, `rgba(${a},${b},${c},${S.pathPreviewAlpha})`); gr.addColorStop(1, `rgba(${a},${b},${c},0)`); g.strokeStyle = gr; g.lineWidth = S.lineWidth * p * 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l.dir[0] * L, y + l.dir[1] * L); g.stroke(); }
    drawOne(g, l);
  }
}
// 边框红光（世界坐标矩形，随镜头移动；参考视频里是包住整张关卡的矩形内发光）
function vigAlpha() { if (!vig || !G) return 0; const d = G.t - vig.t0; if (d < 0) return 0; if (d < vig.hold) return 1; const f = vig.fade > 0 ? 1 - (d - vig.hold) / vig.fade : 0; return Math.max(0, f); }
function vigRect() { if (isRefLevel() && !S.gridAuto) { const A = grid.p / REF_GRID.pitch, ox = grid.x - REF_GRID.x * A, oy = grid.y - REF_GRID.y * A; return [ox - 10.3 * A, oy + 133 * A, 739 * A, 1012 * A]; } const m = 3.6 * grid.p; return [RX(0) - m, RY(0) - m, (level.cols - 1) * grid.p + 2 * m, (level.rows - 1) * grid.p + 2 * m]; }
function drawVig(g, a) { if (a <= 0) return; const [x, y, w, h] = vigRect(), W = Math.min(S.blockVigWidth, w / 2, h / 2), [r, gg, b] = R.hexRGB(S.blockVigColor), c = k => `rgba(${r},${gg},${b},${k * a})`;
  const side = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = g.createLinearGradient(x0, y0, x1, y1); [[0, 1], [0.25, 0.6], [0.5, 0.33], [0.75, 0.14], [1, 0]].forEach(([o, k]) => gr.addColorStop(o, c(k))); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); };
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); side(x, 0, x + W, 0, x, y, W, h); side(x + w, 0, x + w - W, 0, x + w - W, y, W, h); side(0, y, 0, y + W, x, y, w, W); side(0, y + h, 0, y + h - W, x, y + h - W, w, W); g.restore(); }
function drawOne(g, l) { const P = G.poly(l); R.drawLineShape(g, S, P.pts.map(q => [RX(q[0]), RY(q[1])]), P.dir, R.lineColor(S, G, l), grid.p); }
function draw() {
  const g = ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = S.bgColor; g.fillRect(0, 0, cv.width, cv.height);
  drawBoard(g);
  if (editor) drawEditor(g);
  boardTransform(g); drawVig(g, vigAlpha());
  boardTransform(g); for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i], u = (G.t - r.t0) / S.rippleDur; if (u > 1) { ripples.splice(i, 1); continue; } g.save(); g.translate(r.x, r.y); g.scale(1 / cam.s, 1 / cam.s); R.drawRipple(g, S, 0, 0, u); g.restore(); }
  g.setTransform(K, 0, 0, K, -view.x0 * K, -view.y0 * K);
  R.drawDisclaimer(g, S, view);
  const wu = winU(); if (wu > 0) R.drawWin(g, S, view, wu);
  const ea = endAlpha(); if (ea > 0) R.drawEnd(g, S, view, ea);
  const hs = handState(); if (hs) drawHand(g, hs);
}
function endAlpha() { if (!G || G.winT == null || !S.endCard) return 0; const d = (G.t - G.winT - (S.winShow ? S.winDelay + 0.6 : 0)) * 1000 - S.endDelay; return d > 0 ? Math.min(1, d / 400) : 0; }

// ---------- 手指 ----------
let cartoon = null;
function handAnchor() { const im = hand.img; return im && im._cartoon && !S.handImage ? [im._ax, im._ay] : [S.handAnchorX, S.handAnchorY]; }
function handScaleOf() { return hand.img ? S.handSize * DW / hand.img.width : 1; }
const handHidden = () => (!S.endCardHand && endAlpha() > 0) || winU() > 0.3;
function handState() { if (H5_NO_HAND || editor || !S.handShow || !hand.img || !hand.visible || handHidden()) return null; if (!auto && !S.manualHand) return null; return { x: hand.x, y: hand.y, s: handScaleOf() * (1 - S.pressDepth * hand.press) }; }
function drawHand(g, h) { const im = hand.img, w = im.width * h.s, hh = im.height * h.s, [ax, ay] = handAnchor(); g.save(); g.translate(h.x, h.y); g.rotate(S.handRotation * Math.PI / 180); if (S.handFlip) g.scale(-1, 1); g.drawImage(im, -ax * w, -ay * hh, w, hh); g.restore(); }
function handCursorHidden() { return !H5_NO_HAND && !editor && !!(S.hideCursor && S.handShow && hand.img && !handHidden() && (auto ? hand.visible : S.manualHand && hand.visible)); }
function updateCursor() { const c = editor ? 'crosshair' : handCursorHidden() ? 'none' : 'pointer'; if (cv.style.cursor !== c) cv.style.cursor = c; }
function updPress() { if (!S.pressEnabled || hand.pressT0 == null) { hand.press = 0; return; } const p = (G.t - hand.pressT0) / 0.2; hand.press = p < 0 || p > 1 ? (hand.follow ? 1 : 0) : (hand.follow && p > 0.5 ? 1 : Math.sin(Math.PI * p)); if (p > 1 && !hand.follow) hand.pressT0 = null; }
function loadHand() {
  if (!S.handImage) { if (S.handStyle === 'cartoon') { if (!cartoon) cartoon = R.cartoonHand(); hand.img = cartoon; return; } if (S.handStyle === 'none') { hand.img = null; return; } }
  const im = new Image(); im.onload = () => { hand.img = im; }; im.onerror = () => { hand.img = null; }; im.src = S.handImage || DEFAULT_HAND;
}

// ---------- 输入（点线 / 拖动平移 / 滚轮缩放 / 编辑器） ----------
function evtDesign(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.width / K + view.x0, (e.clientY - r.top) / r.height * cv.height / K + view.y0]; }
function designToCell(dx, dy) { const [rx, ry] = toRef(dx, dy); return [(rx - grid.x) / grid.p, (ry - grid.y) / grid.p]; }
function tapDesign(dx, dy) {
  sfx.resume();
  if (endAlpha() > 0) { const b = R.endButton(); if (dx > b.x && dx < b.x + b.w && dy > b.y && dy < b.y + b.h && window.__h5Install) window.__h5Install(); return null; }
  if (ended()) { if (window.__h5Install && document.documentElement.classList.contains('h5-playable')) window.__h5Install(); return null; }
  const [c, r] = designToCell(dx, dy), id = G.hitTest(c, r, S.hitR);
  const [rx, ry] = toRef(dx, dy);
  if (!voicePlayed && G.t < 3) { voicePlayed = false; }
  return doTap(id, rx, ry);
}
let pd = null;
cv.addEventListener('pointerdown', e => {
  sfx.resume(); const [x, y] = evtDesign(e);
  if (editor) { editorDown(x, y); try { cv.setPointerCapture(e.pointerId); } catch (_) { } return; }
  if (auto) return;
  if (!voicePlayed && G.t < 2.5 && S.sfxVoice) { voicePlayed = true; sfx.play('voice', S); }
  hand.x = x; hand.y = y; hand.visible = true; hand.follow = 1; if (S.pressEnabled) hand.pressT0 = G.t;
  pd = { x, y, cam: { ...cam }, moved: false, id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (_) { }
});
cv.addEventListener('pointermove', e => {
  const [x, y] = evtDesign(e);
  if (editor) { editorMove(x, y); return; }
  if (auto) return; hand.x = x; hand.y = y; hand.visible = true;
  if (pd && S.dragPan && S.camMode !== 'fit' && !ended()) { const dx = x - pd.x, dy = y - pd.y; if (pd.moved || Math.hypot(dx, dy) > 12) { pd.moved = true; camUser = true; G.introDone = true; camAnim = null; cam = clampCam({ s: pd.cam.s, tx: pd.cam.tx + dx, ty: pd.cam.ty + dy }); } }
});
cv.addEventListener('pointerup', e => {
  if (editor) { editorUp(); return; }
  if (auto) return; hand.follow = null; hand.pressT0 = null;
  if (pd && !pd.moved) tapDesign(pd.x, pd.y);
  pd = null;
});
cv.addEventListener('pointercancel', () => { pd = null; hand.follow = null; });
cv.addEventListener('pointerleave', () => { if (!auto && !pd) hand.visible = false; });
cv.addEventListener('wheel', e => { if (editor || auto || !S.wheelZoom || S.camMode === 'fit') return; e.preventDefault(); const [x, y] = evtDesign(e), [rx, ry] = toRef(x, y), s = Math.max(0.6, Math.min(5, cam.s * Math.exp(-e.deltaY * 0.0015))); camUser = true; G.introDone = true; camAnim = null; cam = clampCam({ s, tx: x - s * rx, ty: y - s * ry }); }, { passive: false });

// ---------- 关卡编辑器 ----------
function openEditor() {
  stopAuto(); newGame(); editor = { tool: 'draw', color: 'c', draw: null, stuck: [], lines: level.lines.map(l => ({ c: l.c, p: l.p.map(q => q.slice()) })), cols: level.cols, rows: level.rows };
  buildEditBar(); toast('关卡编辑器：拖动画线（从尾到头，最后一格为箭头），点线删除/改色/反向', 3000);
}
function closeEditor(save = true) {
  if (!editor) return; if (save) { S.levelJson = JSON.stringify({ name: level.name && level.name !== '图片生成' ? '自定义关卡' : (level.name || '自定义关卡'), cols: editor.cols, rows: editor.rows, lines: editor.lines.filter(l => l.p.length >= 2) }); saveSettings(S); }
  editor = null; const bar = document.getElementById('editBar'); if (bar) bar.remove(); buildPanel(); newGame();
}
function edLevel() { return { cols: editor.cols, rows: editor.rows, lines: editor.lines.filter(l => l.p.length >= 2) }; }
function edRefresh() { level = normalizeLevel(edLevel()); computeGrid(); G = new Game(level, S); cam = CAM_FIT(); const n = document.getElementById('edInfo'); if (n) { const s = solveLevel(level); editor.stuck = s.stuck; n.textContent = `${level.lines.length} 条线 · ${s.solvable ? '✔ 可全部挪出' : `✖ 不可解：${s.stuck.length} 条卡死（红框）`}`; } }
function edCell(x, y) { const [c, r] = designToCell(x, y); return [Math.round(c), Math.round(r)]; }
function edOcc() { const m = new Map(); editor.lines.forEach((l, i) => l.p.forEach(q => m.set(q[0] * 4096 + q[1], i))); return m; }
function edHit(x, y) { const [c, r] = designToCell(x, y); let best = -1, bd = 0.6; editor.lines.forEach((l, i) => l.p.forEach(q => { const d = Math.hypot(q[0] - c, q[1] - r); if (d < bd) { bd = d; best = i; } })); return best; }
function editorDown(x, y) {
  const T = editor.tool;
  if (T === 'draw') { const [c, r] = edCell(x, y); if (c < 0 || r < 0 || c >= editor.cols || r >= editor.rows || edOcc().has(c * 4096 + r)) return; editor.draw = [[c, r]]; return; }
  const i = edHit(x, y); if (i < 0) return; const l = editor.lines[i];
  if (T === 'erase') editor.lines.splice(i, 1); else if (T === 'color') l.c = editor.color; else if (T === 'reverse') l.p.reverse();
  edRefresh();
}
function editorMove(x, y) {
  if (!editor.draw) return; const [c, r] = edCell(x, y), d = editor.draw, last = d[d.length - 1];
  if (c === last[0] && r === last[1]) return;
  if (d.length > 1 && c === d[d.length - 2][0] && r === d[d.length - 2][1]) { d.pop(); return; }
  if (Math.abs(c - last[0]) + Math.abs(r - last[1]) !== 1 || c < 0 || r < 0 || c >= editor.cols || r >= editor.rows) return;
  if (d.some(q => q[0] === c && q[1] === r) || edOcc().has(c * 4096 + r)) return; d.push([c, r]);
}
function editorUp() { if (editor && editor.draw) { if (editor.draw.length >= 2) editor.lines.push({ c: editor.color, p: editor.draw }); editor.draw = null; edRefresh(); } }
function drawEditor(g) {
  boardTransform(g); const p = grid.p; g.fillStyle = 'rgba(255,255,255,0.13)';
  for (let r = 0; r < editor.rows; r++) for (let c = 0; c < editor.cols; c++) g.fillRect(RX(c) - p * 0.06, RY(r) - p * 0.06, p * 0.12, p * 0.12);
  g.strokeStyle = 'rgba(255,214,74,0.5)'; g.lineWidth = 1 / cam.s; g.strokeRect(RX(-0.5), RY(-0.5), editor.cols * p, editor.rows * p);
  for (const i of editor.stuck) { const l = level.lines[i]; if (!l) continue; g.strokeStyle = '#ff3b4f'; g.lineWidth = 0.12 * p; g.beginPath(); l.p.forEach((q, k) => k ? g.lineTo(RX(q[0]), RY(q[1])) : g.moveTo(RX(q[0]), RY(q[1]))); g.stroke(); }
  if (editor.draw && editor.draw.length) { const d = editor.draw; if (d.length >= 2) R.drawLineShape(g, S, d.map(q => [RX(q[0]), RY(q[1])]), [Math.sign(d[d.length - 1][0] - d[d.length - 2][0]), Math.sign(d[d.length - 1][1] - d[d.length - 2][1])], R.baseColor(S, editor.color), p, 0.85); else { g.fillStyle = R.baseColor(S, editor.color); g.beginPath(); g.arc(RX(d[0][0]), RY(d[0][1]), p * 0.2, 0, 7); g.fill(); } }
}
function buildEditBar() {
  let bar = document.getElementById('editBar'); if (bar) bar.remove(); bar = document.createElement('div'); bar.id = 'editBar';
  bar.innerHTML = `<b>✏ 关卡编辑</b> <span class="seg" id="edTools"><button data-t="draw" class="on">画线</button><button data-t="erase">删除</button><button data-t="color">改色</button><button data-t="reverse">反向</button></span>
  <span class="seg" id="edCols"><button data-c="c" class="on" style="color:${S.col_c}">青</button><button data-c="g" style="color:${S.col_g}">绿</button><button data-c="w" style="color:${S.col_w}">白</button></span>
  列<input id="edW" type="number" min="4" max="120" value="${editor.cols}" style="width:52px"> 行<input id="edH" type="number" min="4" max="160" value="${editor.rows}" style="width:52px">
  <button id="edClear">清空</button><button id="edDone" class="primary">✔ 完成并试玩</button><button id="edCancel">取消</button><div id="edInfo"></div>`;
  document.getElementById('stageWrap').append(bar);
  bar.querySelectorAll('#edTools button').forEach(b => b.onclick = () => { editor.tool = b.dataset.t; bar.querySelectorAll('#edTools button').forEach(x => x.classList.toggle('on', x === b)); });
  bar.querySelectorAll('#edCols button').forEach(b => b.onclick = () => { editor.color = b.dataset.c; bar.querySelectorAll('#edCols button').forEach(x => x.classList.toggle('on', x === b)); if (editor.tool === 'erase' || editor.tool === 'reverse') { editor.tool = 'color'; bar.querySelectorAll('#edTools button').forEach(x => x.classList.toggle('on', x.dataset.t === 'color')); } });
  const sz = () => { editor.cols = Math.max(4, +bar.querySelector('#edW').value | 0); editor.rows = Math.max(4, +bar.querySelector('#edH').value | 0); editor.lines = editor.lines.filter(l => l.p.every(q => q[0] < editor.cols && q[1] < editor.rows)); edRefresh(); };
  bar.querySelector('#edW').onchange = sz; bar.querySelector('#edH').onchange = sz;
  bar.querySelector('#edClear').onclick = () => { if (confirm('清空所有线？')) { editor.lines = []; edRefresh(); } };
  bar.querySelector('#edDone').onclick = () => closeEditor(true); bar.querySelector('#edCancel').onclick = () => closeEditor(false);
  edRefresh();
}
function levelCheck() { const L = levelFromSettings(S), s = solveLevel(L); toast(s.solvable ? `✔ 可全部挪出（${L.lines.length} 条线，求解顺序已验证）` : `✖ 不可解：${s.stuck.length} 条线互相卡死（打开编辑器可看到红框）`, 3000); return s; }
function levelExport() { const L = levelFromSettings(S); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: APP_ID, level: { name: L.name, cols: L.cols, rows: L.rows, lines: L.lines } }, null, 1)], { type: 'application/json' })); a.download = 'arrow-escape-level.json'; a.click(); }
function levelImport() { const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json'; f.onchange = () => { const file = f.files[0]; if (!file) return; file.text().then(t => { const j = JSON.parse(t), L = normalizeLevel(j.level || j); if (!L.lines.length) throw new Error('没有有效的线'); S.levelJson = JSON.stringify({ name: L.name || file.name, cols: L.cols, rows: L.rows, lines: L.lines }); if (!S.gridAuto && (L.cols !== REF_LEVEL.cols || L.rows !== REF_LEVEL.rows)) S.gridAuto = true; saveSettings(S); buildPanel(); newGame(); toast(`已导入 ${L.lines.length} 条线${L.errors.length ? `（忽略 ${L.errors.length} 条无效线）` : ''}`); }).catch(e => toast('导入失败：' + e.message)); }; f.click(); }
function levelImage() { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = () => { const file = f.files[0]; if (!file) return; const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const L = levelFromImage(im, S); S.levelJson = JSON.stringify({ name: '图片生成：' + file.name, cols: L.cols, rows: L.rows, lines: L.lines }); S.gridAuto = true; saveSettings(S); buildPanel(); newGame(); toast(`已生成 ${L.lines.length} 条线（${solveLevel(L).solvable ? '可解' : '⚠ 未能完全修复为可解'}）`, 3000); }; im.src = fr.result; }; fr.readAsDataURL(file); }; f.click(); }
// 🎲 换一局：随机形状（圆 / 心 / 菱形 / 圆角方块）+ 随机三色分区 → 生成可解关卡
function randomLevel() {
  const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d'), k = Math.floor(Math.random() * 4);
  g.fillStyle = '#000'; g.beginPath();
  if (k === 0) g.arc(100, 100, 96, 0, 7); else if (k === 1) { g.moveTo(100, 190); g.bezierCurveTo(-60, 80, 40, -30, 100, 50); g.bezierCurveTo(160, -30, 260, 80, 100, 190); } else if (k === 2) { g.moveTo(100, 2); g.lineTo(198, 100); g.lineTo(100, 198); g.lineTo(2, 100); } else g.roundRect(4, 4, 192, 192, 40);
  g.fill(); g.globalCompositeOperation = 'source-atop'; const cols = ['#36c8e6', '#28f2b6', '#eefcf9'];
  g.fillStyle = cols[0]; g.fillRect(0, 0, 200, 200); for (let i = 0; i < 6; i++) { g.fillStyle = cols[1 + (Math.random() < 0.3 ? 1 : 0)]; g.beginPath(); g.arc(Math.random() * 200, Math.random() * 200, 20 + Math.random() * 40, 0, 7); g.fill(); }
  const L = levelFromImage(c, { ...S, genCols: 18 + Math.floor(Math.random() * 14), genColors: 'palette' });
  S.levelJson = JSON.stringify({ name: '随机关卡', cols: L.cols, rows: L.rows, lines: L.lines }); S.gridAuto = true; saveSettings(S); buildPanel(); newGame();
  toast(`随机关卡：${L.lines.length} 条线（「画布与关卡」里可恢复参考关卡）`, 2200);
}
function levelRef() { S.levelJson = ''; S.gridAuto = false; saveSettings(S); buildPanel(); newGame(); toast('已恢复参考关卡'); }

// ---------- 录制（仅“⏺ 开始录制”按钮或 autoRec）----------
let rec = null, recChunks = [], recT0 = 0;
function pickMime() {
  const mp4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4'], webm = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const list = S.recFormat === 'webm' ? webm : S.recFormat === 'mp4' ? mp4 : mp4.concat(webm);
  return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function startRec() {
  if (!window.MediaRecorder) { status('浏览器不支持录制'); return; }
  sfx.ensure(); const vs = cv.captureStream(S.recFps), tracks = [...vs.getVideoTracks()];
  if (sfx.recDest) tracks.push(...sfx.recDest.stream.getAudioTracks());
  const mime = pickMime();
  rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime || undefined, videoBitsPerSecond: S.recBitrate * 1e6 });
  recChunks = []; rec.ondataavailable = e => e.data.size && recChunks.push(e.data);
  rec.onstop = () => {
    const type = rec.mimeType || mime || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm', blob = new Blob(recChunks, { type });
    download(blob, `arrow-escape_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`); window.__lastRec = { size: blob.size, type }; rec = null; updRecBtn();
    if (aeByRec && aeActive()) aeStopAndExport().catch(e => console.error(e)); aeByRec = false;
  };
  rec.start(250); recT0 = now(); updRecBtn(); aeByRec = false; if (S.aeWithRec && !aeActive()) { recStart(); aeByRec = true; }
}
function stopRec() { finishStopT = null; if (rec && rec.state !== 'inactive') rec.stop(); }
function updRecBtn() { const b = document.getElementById('btnRec'); if (!b) return; b.textContent = rec ? '■ 停止录制' : '⏺ 开始录制'; b.classList.toggle('on', !!rec); }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.textContent = `⬇ ${name} (${(blob.size / 1e6).toFixed(1)}MB)`; const l = document.getElementById('recList'); if (l) l.prepend(a); a.click(); }

// ---------- AE 导出：形状图层 + 修剪路径（每条线独立图层）、镜头空对象、手指/波纹/文字/胜利页 ----------
function frameState() {
  return { t: G.t, cam: { ...cam }, lines: G.lines.map(l => l.state === 'gone' ? null : { s: l.s, col: R.lineColor(S, G, l), shake: l.state === 'shake' ? G.poly(l).pts[0] : null, sh0: l.state === 'shake' ? G.at(l, l.s) : null }),
    hand: handState() ? { x: hand.x, y: hand.y, sc: 1 - S.pressDepth * hand.press } : null, ripples: ripples.map(r => ({ id: r.id, x: r.x, y: r.y, u: (G.t - r.t0) / S.rippleDur })), win: Math.max(0, winU()), end: endAlpha(), vig: vigAlpha() };
}
const aeRec = createAERecorder({ sfx, now, version: APP_VERSION, env: () => ({ vigRect: vigRect(), drawVig, S, view, K, grid, level, G, frame: frameState(), handImg: hand.img, handAnchor: handAnchor(), canvas: cv, R }) });
let recClosed = false, aeLastRec = null, aeByRec = false;
function recStart() { aeRec.start(); recClosed = false; updateAEButtons(); toast('开始记录 AE 时间轴'); }
function aeActive() { return !!aeRec.rec && !recClosed; }
function aeStop() { const r = aeRec.rec; recClosed = true; updateAEButtons(); if (r && r.frames > 1) aeLastRec = r; return r && r.frames > 1 ? r : null; }
async function aeStopAndExport() { const r = aeStop(); if (!r) { toast('没有记录到内容'); return null; } return doExportAE(true, r); }
const curRec = () => aeActive() ? aeRec.rec : aeLastRec;
function updateAEButtons() { const b = document.getElementById('btn_aeToggle'); if (!b) return; b.textContent = aeActive() ? `■ 停止并导出（${((now() - (aeRec.rec.t0 || now())) / 1000).toFixed(1)}s）` : '● 开始记录'; b.classList.toggle('on', aeActive()); }
async function doExportAE(save = true, r0 = curRec()) {
  if (!r0) { toast('请先用“● 开始记录”记录一段（自动通关或手动游玩）'); return null; }
  status('正在生成 AE 工程…'); const r = await aeRec.exportZip(r0); window.__aeLast = r;
  if (save) download(r.blob, r.name); status(`AE 工程：${r.stats.layers} 图层，${r.stats.keys} 关键帧`); return r;
}
async function doExportH5() { try { return await exportH5PlayableFromPage({ toolId: APP_ID, S, stripDataUrls: [DEFAULT_HAND], status, toast }); } catch (e) { status('H5 导出失败：' + e.message); console.error(e); return null; } }
const PANEL_ACTIONS = { aeToggle: () => aeActive() ? aeStopAndExport() : recStart(), aeExport: () => doExportAE(), exportH5: () => doExportH5(), levelEdit: openEditor, levelCheck, levelExport, levelImport, levelImage, levelRef };

// ---------- 主循环 ----------
function frameTick(t) {
  step(t); updPress(); draw();
  if (aeActive()) { aeRec.sample(t); }
  if (finishStopT != null && G.t >= finishStopT) { finishStopT = null; stopRec(); }
}
function loop() {
  updateCursor();
  if (window.__vclock != null) { requestAnimationFrame(loop); return; }
  const t = now(); frameTick(t);
  if (aeActive() && t - (loop.aeBtnT || 0) > 250) { loop.aeBtnT = t; updateAEButtons(); }
  const ri = document.getElementById('recInfo'); if (ri) ri.textContent = rec ? `录制中 ${((t - recT0) / 1000).toFixed(1)}s` : '';
  requestAnimationFrame(loop);
}

// ---------- 设置面板 ----------
const NEWGAME_KEYS = /^(canvas|levelJson|grid|camMode)/;
function applyChange(k) {
  if (k === 'h5DeviceW' || k === 'h5DeviceH') markH5DeviceCustomIfSizeEdited(S);
  if (k === 'h5Device' || k === 'h5DeviceW' || k === 'h5DeviceH') { try { if (window.__h5EditorDeviceFit) window.__h5EditorDeviceFit(); } catch (e) { } }
  saveSettings(S);
  if (/^hand/.test(k)) loadHand();
  if (NEWGAME_KEYS.test(k)) newGame();
}
function buildPanel() {
  const body = document.getElementById('panelBody'); if (!body) return;
  const openTitles = new Set([...body.querySelectorAll('details[open] summary')].map(s => s.textContent));
  body.innerHTML = '';
  GROUPS.forEach(([title, items], gi) => {
    const det = document.createElement('details'); if (gi < 1 || openTitles.has(title)) det.open = true; det.innerHTML = `<summary>${title}</summary>`;
    items.forEach(([k, label, type, def, a, b, step2]) => {
      const row = document.createElement('div'); row.className = 'row'; row.innerHTML = `<label title="${k}">${label}</label>`;
      if (type === 'range') {
        const r = document.createElement('input'); r.type = 'range'; r.min = a; r.max = b; r.step = step2; r.value = S[k]; r.id = 'rng_' + k;
        const n = document.createElement('input'); n.type = 'number'; n.className = 'val'; n.step = step2; n.value = S[k];
        r.oninput = () => { S[k] = +r.value; n.value = r.value; applyChange(k); }; n.onchange = () => { S[k] = +n.value; r.value = n.value; applyChange(k); };
        row.append(r, n);
      } else if (type === 'color') { const c = document.createElement('input'); c.type = 'color'; c.value = S[k]; c.id = 'col_' + k; c.oninput = () => { S[k] = c.value; applyChange(k); }; row.append(c); }
      else if (type === 'bool') { row.classList.add('t-switch'); const l = document.createElement('label'); l.className = 'switch'; l.innerHTML = `<input type="checkbox" class="switch-input" id="chk_${k}" ${S[k] ? 'checked' : ''}><span class="slider"></span>`; l.querySelector('input').onchange = e => { S[k] = e.target.checked; applyChange(k); }; row.append(l); }
      else if (type === 'select') { const s = document.createElement('select'); s.id = 'sel_' + k; a.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); }); s.value = S[k]; s.onchange = () => { S[k] = s.value; if (k === 'h5Device') { applyH5DevicePresetToSettings(S); buildPanel(); } applyChange(k); }; row.append(s); }
      else if (type === 'text') { const t = document.createElement('input'); t.type = 'text'; t.value = S[k]; t.id = 'txt_' + k; t.onchange = () => { S[k] = t.value; applyChange(k); }; row.append(t); }
      else if (type === 'textarea') { const t = document.createElement('textarea'); t.rows = 3; t.value = S[k]; t.id = 'txt_' + k; t.placeholder = k === 'levelJson' ? '留空 = 内置参考关卡（哆啦A梦）。格式：{"cols":48,"rows":50,"lines":[{"c":"c","p":[[0,0],[1,0]]}]}，p 从尾到头，c = c/g/w 或 #RRGGBB' : ''; t.style.fontFamily = 'monospace'; t.style.fontSize = '11px'; t.onchange = () => { S[k] = t.value; applyChange(k); }; row.append(t); }
      else if (type === 'button') { const bt = document.createElement('button'); bt.id = 'btn' + k; bt.textContent = a; bt.onclick = () => Promise.resolve(PANEL_ACTIONS[def] && PANEL_ACTIONS[def]()).catch(e => { status('操作失败：' + e.message); console.error(e); }); row.append(bt); }
      else if (type === 'file') {
        const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/webp,image/jpeg,image/*'; f.id = 'file_' + k;
        f.onchange = () => { const file = f.files[0]; if (!file) return; const fr = new FileReader(); fr.onload = () => { S[k] = fr.result; applyChange(k); }; fr.readAsDataURL(file); };
        const x = document.createElement('button'); x.textContent = k === 'handImage' ? '清除已上传手指（用手指样式）' : '清除'; if (k === 'handImage') x.id = 'btnClearHand'; x.onclick = () => { S[k] = ''; f.value = ''; applyChange(k); };
        row.append(f, x);
      }
      det.append(row);
    });
    if (title.startsWith('画布')) det.insertAdjacentHTML('beforeend', '<div class="tip">点任意一条线（线身或箭头都行）：箭头前方直到边界没有别的线 → 整条线沿自己的路径蛇形滑出；被挡住 → 线变白、冲到挡路的线再退回。顺序随意。内置关卡 = 从参考视频第 1 帧逐格还原的哆啦A梦（48×50 格、200 条线）。</div>');
    if (title.startsWith('手指')) det.insertAdjacentHTML('beforeend', '<div class="tip">默认手指 = 其它核玩工具同款预设 hand.png（指尖锚点 0.2204 / 0.0367）；可选程序绘制的参考造型卡通手；上传透明 PNG 会覆盖。“参考视频顺序”= 逐帧还原的 27 次点击（4.4 / 10.95 / 20.62 / 40.22 / 42.38 秒是被挡住的点击）和镜头平移，之后自动求解直到清空。录制不会随自动通关自动开始（除非打开“自动录制”）。</div>');
    if (title.startsWith('导出 H5')) det.insertAdjacentHTML('beforeend', '<div class="tip">试玩由玩家自己玩：导出包不含手指、默认不自动演示。预览与导出均按所选机型/自定义尺寸；选「自适应」才是全机型 contain/letterbox。玩家可拖动平移镜头。</div>');
    if (title.startsWith('导出 AE')) det.insertAdjacentHTML('beforeend', '<div class="tip">每条线 = 一个形状图层（路径 = 自身折线 + 箭头方向延长线，修剪路径 开始/结束 关键帧 = 蛇形滑动），箭头 = 独立形状图层（位置/旋转关键帧），全部父级到“镜头”空对象（位置/缩放关键帧 = 推镜与平移）。</div>');
    body.append(det);
  });
}
let toastT = 0;
function toast(t, dur = 1600) { const el = document.getElementById('toast'); if (!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(toastT); if (dur > 0) toastT = setTimeout(() => el.classList.remove('show'), dur); }
const $ = id => document.getElementById(id) || {};
$('btnAuto').onclick = autoSolve;
$('btnNew').onclick = () => { if (editor) closeEditor(false); newGame(); };
$('btnRandom').onclick = () => { if (editor) closeEditor(false); randomLevel(); };
$('btnEdit').onclick = () => editor ? closeEditor(true) : openEditor();
$('btnRec').onclick = () => rec ? stopRec() : startRec();
$('btnShot').onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'arrow-escape_shot.png'; a.click(); };
$('btnExport').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportJSON(S)], { type: 'application/json' })); a.download = 'arrow-escape-tool-settings.json'; a.click(); };
$('btnImport').onclick = () => document.getElementById('importFile').click();
$('importFile').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { const j = JSON.parse(t); S = migrate(j); saveSettings(S); buildPanel(); loadHand(); newGame(); toast('已导入设置'); }).catch(() => toast('导入失败')); };
$('btnReset').onclick = () => { if (!confirm('恢复全部默认设置？')) return; S = { ...DEFS }; saveSettings(S); buildPanel(); loadHand(); newGame(); };
{ const v = document.getElementById('ver'); if (v) v.textContent = 'v' + APP_VERSION; }
const __h5 = applyPlayableMode({
  applySettings: ps => { Object.assign(S, migrate({ version: 1, settings: { ...S, ...ps } })); },
  autoPlay: () => { try { startAuto(); } catch (e) { } },
  state: () => { try { return G.lines.map(l => l.state[0] + (l.marked ? 'm' : '')).join(''); } catch (e) { return ''; } },
  isEnded: () => { try { return ended(); } catch (e) { return false; } },
  onResize: () => { },
});
if (__h5) { try { const panel = document.getElementById('panel'); if (panel) panel.style.display = 'none'; } catch (e) { } }
if (!__h5) bindEditorDevicePreview(() => S);
window.__game = {
  renderAt: t => { window.__vclock = t; frameTick(t); },
  get G() { return G; }, get S() { return S; }, get view() { return view; }, get hand() { return hand; }, get cam() { return cam; }, get grid() { return grid; }, get level() { return level; }, get auto() { return auto; }, get editor() { return editor; },
  autoSolve, startAuto, stopAuto, newGame, tapDesign, cellToDesign, toDesign, RX, RY, solveLevel, levelFromSettings, frameState,
  set(k, v) { S[k] = v; applyChange(k); buildPanel(); }, setMany(o) { Object.assign(S, o); saveSettings(S); buildPanel(); loadHand(); newGame(); },
  openEditor, closeEditor, randomLevel, editorDown, editorMove, editorUp, levelCheck, levelRef,
  doExportAE, doExportH5, aeStart: () => recStart(), aeStop: () => aeStop(), aeActive: () => aeActive(), startRec, stopRec, get mediaRec() { return rec; }, migrate, APP_ID, APP_VERSION,
};
buildPanel(); loadHand(); newGame(); window.__ready = true; requestAnimationFrame(loop);
