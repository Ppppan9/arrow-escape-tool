// 箭头挪出 —— 纯逻辑（网格单位 = 格）。线 = 网格点折线（尾 → 头），头的方向 = 最后一段方向。
// 点一条线：从箭头沿直线到关卡边界没有别的线 → 沿自身路径蛇形滑出；否则被挡（参考：变白、冲到挡路线再退回）。
import LEVEL_REF from './level_ref.json';
export const DIRS = { R: [1, 0], L: [-1, 0], D: [0, 1], U: [0, -1] };
export const REF_LEVEL = LEVEL_REF;
const key = (c, r) => c * 4096 + r;
export const dirOfPts = p => { const a = p[p.length - 2], b = p[p.length - 1]; return [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])]; };
export function levelFromSettings(S) {
  if (S.levelJson && S.levelJson.trim()) { try { const L = normalizeLevel(JSON.parse(S.levelJson)); if (L.lines.length) return L; } catch (e) { console.warn('关卡 JSON 无效，使用参考关卡', e); } }
  return normalizeLevel(LEVEL_REF);
}
// 校验 + 规范化：去掉非法线（<2 点 / 非相邻 / 与别的线重叠）
export function normalizeLevel(j) {
  const lines = [], used = new Set(), errors = [];
  let cols = +j.cols || 0, rows = +j.rows || 0;
  (j.lines || []).forEach((l, i) => {
    const p = (l.p || l.points || []).map(q => [Math.round(+q[0]), Math.round(+q[1])]);
    if (p.length < 2) { errors.push(`线 ${i}：少于 2 个点`); return; }
    for (let k = 1; k < p.length; k++) if (Math.abs(p[k][0] - p[k - 1][0]) + Math.abs(p[k][1] - p[k - 1][1]) !== 1) { errors.push(`线 ${i}：第 ${k} 段不是相邻格`); return; }
    const ks = p.map(q => key(q[0], q[1])); if (new Set(ks).size !== ks.length || ks.some(k => used.has(k))) { errors.push(`线 ${i}：与已有线重叠`); return; }
    ks.forEach(k => used.add(k));
    for (const q of p) { cols = Math.max(cols, q[0] + 1); rows = Math.max(rows, q[1] + 1); }
    lines.push({ c: ['c', 'g', 'w'].includes(l.c) || /^#[0-9a-f]{6}$/i.test(l.c || '') ? l.c : 'c', p });
  });
  return { name: j.name || '', cols, rows, lines, errors };
}
// 第一个挡路的线（沿箭头方向直到关卡边界）
export function blockerOf(occ, p, cols, rows, self) {
  const [dx, dy] = dirOfPts(p); let [c, r] = p[p.length - 1];
  for (let k = 1; ; k++) { c += dx; r += dy; if (c < 0 || r < 0 || c >= cols || r >= rows) return null; const o = occ.get(key(c, r)); if (o != null && o !== self) return { id: o, k }; }
}
// 贪心求解：能挪出的线挪走只会让别的线更容易挪出，所以贪心能判定可解与否
export function solveLevel(level, removed = new Set()) {
  const occ = new Map(); level.lines.forEach((l, i) => { if (!removed.has(i)) for (const q of l.p) occ.set(key(q[0], q[1]), i); });
  const alive = new Set(level.lines.map((_, i) => i).filter(i => !removed.has(i))), order = [];
  let prog = true;
  while (alive.size && prog) { prog = false; for (const i of [...alive]) { if (!blockerOf(occ, level.lines[i].p, level.cols, level.rows, i)) { alive.delete(i); order.push(i); for (const q of level.lines[i].p) occ.delete(key(q[0], q[1])); prog = true; } } }
  return { solvable: alive.size === 0, order, stuck: [...alive] };
}
const easeOut = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 2);
export class Game {
  constructor(level, S) {
    this.S = S; this.level = level; this.cols = level.cols; this.rows = level.rows; this.t = 0; this.events = []; this.winT = null;
    this.occ = new Map();
    this.lines = level.lines.map((l, id) => {
      const p = l.p, dir = dirOfPts(p), n = p.length - 1;
      const cum = [0]; for (let k = 1; k <= n; k++) cum.push(k);
      const L = { id, col: l.c, p, dir, n, state: 'idle', s: 0, v: 0, marked: false, flashT: null, t0: 0, stop: 0, phase: '', tapT: null, goneT: null, taps: 0 };
      for (const q of p) this.occ.set(key(q[0], q[1]), id);
      return L;
    });
    this.dots = level.lines.flatMap(l => l.p);
  }
  get alive() { return this.lines.filter(l => l.state !== 'gone').length; }
  get cleared() { return this.lines.every(l => l.state === 'gone'); }
  free(id) { return !blockerOf(this.occ, this.lines[id].p, this.cols, this.rows, id); }
  tappable(id) { const l = this.lines[id]; return l && (l.state === 'idle'); }
  freeIds() { return this.lines.filter(l => l.state === 'idle' && this.free(l.id)).map(l => l.id); }
  idleIds() { return this.lines.filter(l => l.state === 'idle').map(l => l.id); }
  // 点击（格坐标）→ 最近的线（线段距离 ≤ hitR）
  hitTest(cx, cy, hitR = this.S.hitR) {
    let best = null, bd = hitR;
    for (const l of this.lines) {
      if (l.state === 'gone' || l.state === 'out') continue;
      const P = this.poly(l).pts;
      for (let k = 0; k < P.length - 1; k++) { const d = segDist(cx, cy, P[k], P[k + 1]); if (d < bd) { bd = d; best = l.id; } }
      const h = P[P.length - 1], hd = Math.hypot(cx - (h[0] + l.dir[0] * 0.2), cy - (h[1] + l.dir[1] * 0.2)) - 0.15; if (hd < bd) { bd = hd; best = l.id; }
    }
    return best;
  }
  tap(id) {
    const l = this.lines[id]; if (!l || l.state !== 'idle') return null; l.taps++; l.tapT = this.t;
    const b = blockerOf(this.occ, l.p, this.cols, this.rows, id);
    if (!b) { for (const q of l.p) this.occ.delete(key(q[0], q[1])); l.state = 'out'; l.s = 0; l.v = this.S.slideV0; l.t0 = this.t; l.wasMarked = l.marked; l.marked = false; this.events.push({ type: 'slide', id }); return { ok: true, id }; }
    if (this.S.blockedStyle === 'shake') { l.state = 'shake'; l.t0 = this.t; this.events.push({ type: 'block', id, blocker: b.id }); return { ok: false, id, blocker: b.id }; }
    l.state = 'bump'; l.phase = 'fwd'; l.s = 0; l.v = this.S.slideV0; l.t0 = this.t; l.marked = true; l.blocker = b.id; l.stop = Math.max(0, b.k - this.S.bumpStopGap);
    this.events.push({ type: 'block', id, blocker: b.id }); return { ok: false, id, blocker: b.id };
  }
  // view：当前镜头可见范围（格坐标 {x0,y0,x1,y1}），线完全离开画面才算挪走
  update(dt, view) {
    const S = this.S; this.t += dt;
    for (const l of this.lines) {
      if (l.state === 'out') {
        l.v = Math.min(S.slideVmax, l.v + S.slideAccel * dt); l.s += l.v * dt;
        if (l.s >= l.n) { const tail = this.at(l, l.s), m = 1.2; const v = view || { x0: -2, y0: -2, x1: this.cols + 1, y1: this.rows + 1 };
          const out = l.dir[0] > 0 ? tail[0] > v.x1 + m : l.dir[0] < 0 ? tail[0] < v.x0 - m : l.dir[1] > 0 ? tail[1] > v.y1 + m : tail[1] < v.y0 - m;
          if (out || l.s > l.n + 400) { l.state = 'gone'; l.goneT = this.t; this.events.push({ type: 'gone', id: l.id }); } }
      } else if (l.state === 'bump') {
        if (l.phase === 'fwd') { l.v = Math.min(S.slideVmax, l.v + S.slideAccel * dt); l.s += l.v * dt; if (l.s >= l.stop) { l.s = l.stop; l.phase = 'hold'; l.ph0 = this.t; const b = this.lines[l.blocker]; if (b && S.blockerFlash) b.flashT = this.t; this.events.push({ type: 'contact', id: l.id, blocker: l.blocker }); } }
        else if (l.phase === 'hold') { if (this.t - l.ph0 >= S.bumpHold) { l.phase = 'back'; l.ph0 = this.t; } }
        else if (l.phase === 'back') { const u = (this.t - l.ph0) / Math.max(0.01, S.bumpBackDur); l.s = l.stop * (1 - easeOut(u)); if (u >= 1) { l.s = 0; l.state = 'idle'; l.phase = ''; if (!S.blockedPersist) l.marked = false; } }
      } else if (l.state === 'shake') { if (this.t - l.t0 >= S.shakeDur) l.state = 'idle'; }
    }
    if (this.winT == null && this.cleared) { this.winT = this.t; this.events.push({ type: 'win' }); }
  }
  // 轨迹 = 自身路径 + 箭头方向的延长线；线占 [s, s+n]
  at(l, a) { if (a <= l.n) { const k = Math.min(l.n - 1, Math.floor(a)), u = a - k, A = l.p[k], B = l.p[k + 1]; return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u]; } const H = l.p[l.n], e = a - l.n; return [H[0] + l.dir[0] * e, H[1] + l.dir[1] * e]; }
  dirAt(l, a) { if (a < l.n) { const k = Math.min(l.n - 1, Math.floor(a)), A = l.p[k], B = l.p[k + 1]; return [B[0] - A[0], B[1] - A[1]]; } return l.dir; }
  // 当前显示的折线（格坐标）+ 头方向；shake 模式带沿箭头方向的位移
  poly(l) {
    const a = l.s, b = l.s + l.n, pts = [this.at(l, a)];
    for (let k = Math.floor(a) + 1; k < b - 1e-9; k++) pts.push(k <= l.n ? l.p[k] : this.at(l, k));
    // 延长线上的点是共线的，只需要首尾；去掉共线中间点
    pts.push(this.at(l, b));
    const out = [pts[0]]; for (let k = 1; k < pts.length - 1; k++) { const P = out[out.length - 1], Q = pts[k], R = pts[k + 1]; if (Math.abs((Q[0] - P[0]) * (R[1] - Q[1]) - (Q[1] - P[1]) * (R[0] - Q[0])) > 1e-9) out.push(Q); }
    out.push(pts[pts.length - 1]);
    let dx = 0, dy = 0; if (l.state === 'shake') { const u = (this.t - l.t0) / this.S.shakeDur, o = Math.sin(u * Math.PI * 2 * this.S.shakeFreq) * this.S.shakeAmp * (1 - u); dx = l.dir[0] * o; dy = l.dir[1] * o; }
    return { pts: dx || dy ? out.map(q => [q[0] + dx, q[1] + dy]) : out, dir: this.dirAt(l, b - 1e-6) };
  }
}
function segDist(x, y, A, B) { const vx = B[0] - A[0], vy = B[1] - A[1], L2 = vx * vx + vy * vy || 1; let u = ((x - A[0]) * vx + (y - A[1]) * vy) / L2; u = Math.max(0, Math.min(1, u)); return Math.hypot(x - A[0] - vx * u, y - A[1] - vy * u); }
// 由透明图片生成可解关卡：像素格（alpha>0.5）上随机游走铺满折线，再修复到可解
export function levelFromImage(img, S, rnd = Math.random) {
  const cols = Math.max(4, Math.round(S.genCols)), rows = Math.max(4, Math.round(cols * img.height / img.width));
  const c = document.createElement('canvas'); c.width = cols; c.height = rows; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(img, 0, 0, cols, rows);
  const d = g.getImageData(0, 0, cols, rows).data, on = new Set(), colr = new Map();
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const i = (r * cols + q) * 4; if (d[i + 3] > 128) { on.add(key(q, r)); colr.set(key(q, r), [d[i], d[i + 1], d[i + 2]]); } }
  const pal = rgb => { if (S.genColors === 'image') return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join(''); const [r, g2, b] = rgb, mx = Math.max(r, g2, b), mn = Math.min(r, g2, b); if (mn > 170 || mx - mn < 40) return 'w'; return b >= g2 ? 'c' : 'g'; };
  const free = new Set(on), lines = [], maxL = Math.max(2, Math.round(S.genMaxLen)), nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const cellsSorted = [...on].sort(() => rnd() - 0.5);
  for (const k0 of cellsSorted) {
    if (!free.has(k0)) continue; let cur = [Math.floor(k0 / 4096), k0 % 4096]; const p = [cur]; free.delete(k0);
    const want = 2 + Math.floor(rnd() * (maxL - 1)); let last = null;
    while (p.length < want) { const opts = nb.filter(([dx, dy]) => free.has(key(cur[0] + dx, cur[1] + dy))); if (!opts.length) break; let o = last && rnd() < 0.55 && opts.find(v => v[0] === last[0] && v[1] === last[1]) || opts[Math.floor(rnd() * opts.length)]; cur = [cur[0] + o[0], cur[1] + o[1]]; free.delete(key(cur[0], cur[1])); p.push(cur); last = o; }
    if (p.length < 2) { // 孤立格：并到相邻线的端点
      const hit = lines.find(l => { const e = l.p[l.p.length - 1], s = l.p[0]; return Math.abs(e[0] - cur[0]) + Math.abs(e[1] - cur[1]) === 1 || Math.abs(s[0] - cur[0]) + Math.abs(s[1] - cur[1]) === 1; });
      if (hit) { const e = hit.p[hit.p.length - 1]; if (Math.abs(e[0] - cur[0]) + Math.abs(e[1] - cur[1]) === 1) hit.p.push(cur); else hit.p.unshift(cur); }
      continue;
    }
    lines.push({ p, c: pal(colr.get(key(p[0][0], p[0][1]))) });
  }
  // 修复可解性：卡住的线反向；还卡住就从中间切开；实在不行删掉
  let L = { cols, rows, lines };
  for (let it = 0; it < 60; it++) {
    const s = solveLevel(L); if (s.solvable) break;
    for (const i of s.stuck) { const l = L.lines[i]; if (it % 3 === 0) l.p.reverse(); else if (l.p.length >= 4) { const m = Math.floor(l.p.length / 2); L.lines.push({ p: l.p.splice(m), c: l.c }); } else if (it > 40) l.p = []; }
    L.lines = L.lines.filter(l => l.p.length >= 2);
  }
  return normalizeLevel({ name: '图片生成', cols, rows, lines: L.lines });
}
