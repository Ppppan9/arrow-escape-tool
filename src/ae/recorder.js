// 导出 After Effects 工程：逐帧采样 frameState()（镜头 / 每条线的滑动位置 s 与颜色 / 手指 / 波纹 / 胜利页），生成
// timeline.json + build_ae_project.jsx + 素材 PNG + 音频。每条线 = 独立形状图层（整条轨迹路径 + 修剪路径 开始/结束 关键帧），
// 箭头 = 独立形状图层（位置/旋转关键帧），全部父级到“镜头”空对象（位置/缩放关键帧）。
import { makeZip } from './zip.js';
import JSX_TEXT from './build_ae_project.jsx';
import README_TEXT from './README_AE.md';
import { renderSfxOffline, encodeWav, SFX_NAMES, SFX_DUR } from '../audio.js';
const r4 = x => Math.round(x * 10000) / 10000;
const rgb = h => { const v = parseInt((h || '#000000').slice(1), 16); return [r4((v >> 16 & 255) / 255), r4((v >> 8 & 255) / 255), r4((v & 255) / 255)]; };
const COLN = { c: ['青', 'cyan'], g: ['绿', 'green'], w: ['白', 'white'] };
export function createAERecorder(api) {
  let R = null;
  function start() { const E = api.env(); R = { t0: api.now(), lastT: 0, frames: 0, f: [], sfx: [], S: { ...E.S }, view: { ...E.view }, grid: { ...E.grid }, level: E.level, G: E.G }; api.sfx.hook = (name, o) => { if (R) R.sfx.push({ t: Math.max(0, (api.now() - R.t0) / 1000), name, delay: (o && o.delay) || 0 }); }; }
  function sample(now) { if (!R) return; const E = api.env(); if (E.G !== R.G) { R.G = E.G; R.level = E.level; R.reset = (R.reset || 0) + 1; } const t = Math.max(R.lastT + 1e-4 * (R.frames > 0), (now - R.t0) / 1000); R.f.push({ t, ...E.frame, gen: R.reset || 0 }); R.lastT = t; R.frames++; }
  async function exportZip(rec = R, So = null) {
    if (!rec || rec.frames < 2) throw new Error('没有可导出的记录：请先自动通关或手动游玩');
    const E = api.env(), S = So ? { ...rec.S, ...So } : rec.S, Rn = E.R, V = rec.view, grid = rec.grid, lv = rec.level, p = grid.p;
    // 只导出最后一局（记录中途“重新开始”时，前面的局丢弃）
    const gen = rec.f[rec.f.length - 1].gen, F0 = rec.f.filter(f => f.gen === gen), tb = F0[0].t, FR = F0.map(f => ({ ...f, t: f.t - tb }));
    const fps = +S.aeFps || 30, bake = S.aeSampling === 'bake', zh = S.aeNames !== 'en';
    const [CW, CH] = S.aeSize === 'canvas' ? [S.canvasW, S.canvasH] : S.aeSize.split('x').map(Number), CK = CW / V.w;
    const D = Math.max(1 / fps, Math.ceil((FR[FR.length - 1].t + 1 / fps) * fps - 1e-6) / fps);
    const assets = [], assetFiles = [], pending = [];
    const folders = [{ id: 'root', name: zh ? '箭头挪出_AE工程' : 'ArrowEscape_AE' }, { id: 'img', name: zh ? '素材' : 'Assets', parent: 'root' }, { id: 'aud', name: zh ? '音频' : 'Audio', parent: 'root' }, { id: 'pre', name: zh ? '预合成' : 'Precomps', parent: 'root' }];
    const toPng = c => new Promise(res => c.toBlob(b => b.arrayBuffer().then(a => res(new Uint8Array(a))), 'image/png'));
    const addAsset = (id, c, name) => { const file = 'assets/' + id + '.png'; assets.push({ id, file, folder: 'img', w: c.width, h: c.height, name: name || id + '.png' }); pending.push(toPng(c).then(data => assetFiles.push({ name: file, data }))); };
    // 逐帧重采样
    const frames = []; { let j = 0; for (let f = 0; f * 1 / fps <= D - 1e-9; f++) { const tau = f / fps; while (j < FR.length - 1 && FR[j + 1].t <= tau + 1e-9) j++; frames.push({ tau, A: FR[j], B: FR[j + 1] || FR[j], u: FR[j + 1] && FR[j + 1].t > FR[j].t ? Math.max(0, Math.min(1, (tau - FR[j].t) / (FR[j + 1].t - FR[j].t))) : 0 }); } }
    const lin = (fr, get) => { const a = get(fr.A), b = get(fr.B); if (a == null || b == null) return a ?? b; return Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * fr.u) : typeof a === 'number' ? a + (b - a) * fr.u : a; };
    const rnd = v => Array.isArray(v) ? v.map(x => Math.round(x * 1000) / 1000) : typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
    function prop(ts, vs, tol, hold) {
      const same = (a, b, e) => Array.isArray(a) ? a.every((x, i) => Math.abs(x - b[i]) <= e) : typeof a === 'number' ? Math.abs(a - b) <= e : a === b;
      if (vs.every(x => same(x, vs[0], 1e-6))) return rnd(vs[0]);
      let keep;
      if (hold) { keep = [0]; for (let i = 1; i < vs.length; i++) if (!same(vs[i], vs[i - 1], 1e-6)) keep.push(i); }
      else if (bake) keep = vs.map((_, i) => i);
      else { keep = [0]; let a = 0; for (let b = 2; b < vs.length; b++) { let ok = true; for (let m = a + 1; m < b && ok; m++) { const u = (ts[m] - ts[a]) / (ts[b] - ts[a]); const l = Array.isArray(vs[a]) ? vs[a].map((x, i) => x + (vs[b][i] - x) * u) : vs[a] + (vs[b] - vs[a]) * u; ok = same(l, vs[m], tol); } if (!ok) { keep.push(b - 1); a = b - 1; } } if (vs.length > 1) keep.push(vs.length - 1); }
      const o = { t: keep.map(i => r4(ts[i])), v: keep.map(i => rnd(vs[i])) }; if (hold) o.hold = true; return o;
    }
    const layers = [], comps = [], markers = [];
    const ts = frames.map(f => f.tau);
    // 镜头空对象（参考坐标 → 合成坐标）
    layers.push({ id: 'cam', name: zh ? '镜头（空对象）' : 'Camera (null)', src: { nul: true }, label: 9, tr: { anchor: [0, 0], position: prop(ts, frames.map(fr => { const c = lin(fr, f => [f.cam.tx, f.cam.ty]); return [(c[0] - V.x0) * CK, (c[1] - V.y0) * CK]; }), 0.2), scale: prop(ts, frames.map(fr => { const s = lin(fr, f => f.cam.s) * CK * 100; return [s, s]; }), 0.05) }, defer: true });
    // 背景色
    layers.unshift({ name: zh ? '背景' : 'Background', src: { solid: rgb(S.bgColor), w: CW, h: CH }, label: 15, tr: { anchor: [CW / 2, CH / 2], position: [CW / 2, CH / 2] } });
    // 点阵 + （可选）静止线条合成图：在参考坐标里绘制，3 倍分辨率
    const RS = 3, bx0 = grid.x - 2 * p, by0 = grid.y - 2 * p, bw = (lv.cols + 3) * p, bh = (lv.rows + 3) * p;
    const X = c => grid.x + c * p, Y = r => grid.y + r * p;
    const lineInfo = lv.lines.map((l0, i) => { const a0 = l0.p[l0.p.length - 2], b0 = l0.p[l0.p.length - 1], l = { ...l0, dir: [Math.sign(b0[0] - a0[0]), Math.sign(b0[1] - a0[1])] }; const n = l.p.length - 1; let maxS = 0, touched = false, gone = -1; const cols = []; FR.forEach((f, k) => { const L = f.lines[i]; if (!L) { if (gone < 0) gone = k; return; } maxS = Math.max(maxS, L.s); if (L.s > 1e-6 || L.shake || L.col !== FR[0].lines[i]?.col) touched = true; }); if (gone >= 0) touched = true; return { l, i, n, maxS, touched, gone }; });
    { const c = document.createElement('canvas'); c.width = Math.ceil(bw * RS); c.height = Math.ceil(bh * RS); const g = c.getContext('2d'); g.scale(RS, RS); g.translate(-bx0, -by0); Rn.drawDots(g, S, lv.lines.flatMap(l => l.p), X, Y, p); addAsset('dots', c, zh ? '点阵.png' : 'dots.png'); layers.push({ name: zh ? '底部点阵' : 'Grid dots', src: { asset: 'dots' }, parent: 'cam', label: 15, tr: { anchor: [0, 0], position: [bx0, by0], scale: [100 / RS, 100 / RS] } }); }
    const onlyTouched = S.aeLines === 'touched';
    if (onlyTouched) { const c = document.createElement('canvas'); c.width = Math.ceil(bw * RS); c.height = Math.ceil(bh * RS); const g = c.getContext('2d'); g.scale(RS, RS); g.translate(-bx0, -by0); for (const L of lineInfo) if (!L.touched) Rn.drawLineShape(g, S, L.l.p.map(q => [X(q[0]), Y(q[1])]), L.l.dir, FR[0].lines[L.i].col, p); addAsset('static_lines', c, zh ? '静止线条.png' : 'static_lines.png'); layers.push({ name: zh ? '静止线条（合成图）' : 'Static lines (flattened)', src: { asset: 'static_lines' }, parent: 'cam', label: 15, tr: { anchor: [0, 0], position: [bx0, by0], scale: [100 / RS, 100 / RS] } }); }
    // 线条：路径 = 自身折线（带圆角贝塞尔）+ 延长线；修剪 开始/结束 = s / s+n-back（按圆角后的真实弧长换算成百分比）
    const lw = S.lineWidth * p, r = S.cornerR * p, back = Math.max(0, S.headBack * p - lw * 0.5) / p;
    const strokeSet = col => { const a = []; a.push({ color: col, width: r4(lw), opacity: 100, key: 'core' }); if (S.outlineW > 0 && S.outlineAlpha > 0) a.push({ color: rgb(S.outlineColor), width: r4(lw + S.outlineW * 2 * p), opacity: r4(S.outlineAlpha * 100) }); if (S.glow > 0) a.push({ color: col, width: r4(lw * S.glowWidth), opacity: r4(S.glow * 35), key: 'glow' }); return a; };
    let nLines = 0;
    for (const L of lineInfo) {
      if (onlyTouched && !L.touched) continue; if (!FR[0].lines[L.i]) continue; nLines++;
      const l = L.l, n = L.n, ext = Math.ceil(Math.max(L.maxS, 0) + 1), P = l.p.map(q => [X(q[0]), Y(q[1])]), H = P[n], Ptr = P.concat([[H[0] + l.dir[0] * ext * p, H[1] + l.dir[1] * ext * p]]);
      // 圆角：每个拐点替换为两个顶点 + 切线（四分之一圆）
      const verts = [], inT = [], outT = [], corners = []; const kq = 0.5523 * r;
      Ptr.forEach((q, k) => { if (k === 0 || k === Ptr.length - 1) { verts.push(q); inT.push([0, 0]); outT.push([0, 0]); return; } const a = Ptr[k - 1], c = Ptr[k + 1], d1 = [Math.sign(q[0] - a[0]), Math.sign(q[1] - a[1])], d2 = [Math.sign(c[0] - q[0]), Math.sign(c[1] - q[1])]; if (d1[0] === d2[0] && d1[1] === d2[1]) return; corners.push(k); verts.push([q[0] - d1[0] * r, q[1] - d1[1] * r]); inT.push([0, 0]); outT.push([d1[0] * kq, d1[1] * kq]); verts.push([q[0] + d2[0] * r, q[1] + d2[1] * r]); inT.push([-d2[0] * kq, -d2[1] * kq]); outT.push([0, 0]); });
      const rc = r / p, red = 2 * rc - Math.PI * rc / 2, total = n + ext - corners.length * red;
      const toRound = a => { let o = a; for (const k of corners) { if (a >= k + rc) o -= red; else if (a > k - rc) { o -= (a - (k - rc)) * (1 - (Math.PI / 4)); } } return o; };
      const pct = a => Math.max(0, Math.min(100, toRound(Math.max(0, Math.min(n + ext, a))) / total * 100));
      const gone = L.gone >= 0 ? FR[L.gone].t : null, outT0 = gone != null ? Math.min(D, Math.ceil(gone * fps) / fps) : D;
      const fl = frames.filter(fr => fr.tau < outT0 + 1e-9), tl = fl.map(f => f.tau);
      const sOf = fr => { const a = fr.A.lines[L.i], b = fr.B.lines[L.i]; if (!a) return b ? b.s : null; if (!b) return a.s; return a.s + (b.s - a.s) * fr.u; };
      const sv = fl.map(fr => { const s = sOf(fr); return s == null ? L.maxS : s; }), colv = fl.map(fr => rgb((fr.A.lines[L.i] || fr.B.lines[L.i] || FR[0].lines[L.i]).col));
      const shv = fl.map(fr => { const a = fr.A.lines[L.i]; if (!a || !a.shake) return [0, 0]; const s0 = a.sh0, s1 = a.shake; return [(s1[0] - s0[0]) * p, (s1[1] - s0[1]) * p]; });
      const cn = (COLN[l.c] || [l.c, l.c])[zh ? 0 : 1], nm = `${zh ? '线' : 'Line'}_${String(L.i + 1).padStart(3, '0')}_${cn}`;
      const colP = prop(tl, colv, 0, true), offP = prop(tl, shv, 0.05);
      layers.push({ name: nm, src: { shape: { kind: 'path', verts: verts.map(rnd), inT: inT.map(rnd), outT: outT.map(rnd), closed: false, strokes: strokeSet(rgb(FR[0].lines[L.i].col)), color: colP, trimStart: prop(tl, sv.map(pct), 0.01), trimEnd: prop(tl, sv.map(s => pct(s + n - back)), 0.01) } }, parent: 'cam', in: 0, out: r4(outT0), label: l.c === 'g' ? 3 : l.c === 'w' ? 15 : 8, tr: { anchor: [0, 0], position: offP } });
      // 箭头：三角形（朝右建模），位置 = 头部点，旋转 = 当前方向（定格）
      const headPos = fl.map((fr, k) => { const s = sv[k], a = s + n, H2 = a <= n ? (() => { const kk = Math.min(n - 1, Math.floor(a)), u = a - kk; return [P[kk][0] + (P[kk + 1][0] - P[kk][0]) * u, P[kk][1] + (P[kk + 1][1] - P[kk][1]) * u]; })() : [H[0] + l.dir[0] * (a - n) * p, H[1] + l.dir[1] * (a - n) * p]; return [H2[0] + shv[k][0], H2[1] + shv[k][1]]; });
      const rot = fl.map((fr, k) => { const a = sv[k] + n - 1e-6; let d = l.dir; if (a < n) { const kk = Math.min(n - 1, Math.floor(a)); d = [Math.sign(l.p[kk + 1][0] - l.p[kk][0]), Math.sign(l.p[kk + 1][1] - l.p[kk][1])]; } return Math.atan2(d[1], d[0]) * 180 / Math.PI; });
      layers.push({ name: nm + (zh ? '_箭头' : '_head'), src: { shape: { kind: 'tri', verts: [[r4(S.headTip * p), 0], [r4(-S.headBack * p), r4(S.headHalfW * p)], [r4(-S.headBack * p), r4(-S.headHalfW * p)]], closed: true, fillStrokes: true, strokes: strokeSet(rgb(FR[0].lines[L.i].col)).map(s => ({ ...s, width: r4(Math.max(0.5, s.width - lw + 0.08 * p)) })), color: colP } }, parent: 'cam', in: 0, out: r4(outT0), label: l.c === 'g' ? 3 : l.c === 'w' ? 15 : 8, tr: { anchor: [0, 0], position: prop(tl, headPos, 0.1), rotation: prop(tl, rot, 0, true) } });
    }
    // 被挡边框红光：PNG（参考坐标，父级到镜头）+ 不透明度关键帧
    { const vf = frames.map(fr => lin(fr, f => f.vig || 0)); if (vf.some(v => v > 0)) { const [vx, vy, vw, vh] = E.vigRect, c = document.createElement('canvas'), k = 1.5; c.width = Math.ceil(vw * k); c.height = Math.ceil(vh * k); const g = c.getContext('2d'); g.scale(k, k); g.translate(-vx, -vy); E.drawVig(g, 1); addAsset('vignette', c, zh ? '被挡边框红光.png' : 'blocked_vignette.png');
      layers.push({ name: zh ? '被挡边框红光' : 'Blocked vignette', src: { asset: 'vignette' }, parent: 'cam', label: 1, tr: { anchor: [0, 0], position: [r4(vx), r4(vy)], scale: [100 / k, 100 / k], opacity: prop(ts, vf.map(v => v * 100), 0.5) } }); } }
    // 点击波纹：每次点击两层（外圈 + 中心点），设计坐标
    const rids = new Map(); FR.forEach(f => f.ripples.forEach(rp => { if (!rids.has(rp.id)) rids.set(rp.id, []); rids.get(rp.id).push({ t: f.t, rp, cam: f.cam }); }));
    const [ra, rb, rc2] = rgb(S.rippleColor); let ri = 0;
    for (const [, arr] of rids) {
      ri++; const t0 = arr[0].t - arr[0].rp.u * S.rippleDur, fl = frames.filter(fr => fr.tau >= t0 - 1e-9 && fr.tau <= t0 + S.rippleDur + 1e-9); if (!fl.length) continue; const tl = fl.map(f => f.tau);
      const pos = fl.map(fr => { const c = lin(fr, f => [f.cam.s, f.cam.tx, f.cam.ty]), rp = arr[0].rp; return [(c[0] * rp.x + c[1] - V.x0) * CK, (c[0] * rp.y + c[2] - V.y0) * CK]; });
      const us = fl.map(fr => (fr.tau - t0) / S.rippleDur);
      const outer = us.map(u => { const e = 1 - Math.pow(1 - Math.min(1, u / 0.45), 3); return (0.4 + 0.6 * e) * 100; }), oo = us.map(u => Math.max(0, 0.2 * (1 - Math.pow(Math.min(1, u), 1.5))) * 100), io = us.map(u => Math.max(0, 0.55 * (1 - u / 0.55)) * 100);
      const base = { parent: null, in: r4(tl[0]), out: r4(Math.min(D, tl[tl.length - 1] + 1 / fps)), label: 12 };
      layers.push({ ...base, name: `${zh ? '点击波纹' : 'Ripple'}_${ri}_${zh ? '外圈' : 'outer'}`, src: { shape: { kind: 'ellipse', size: r4(S.rippleR * 2 * CK), fill: [ra, rb, rc2] } }, tr: { position: prop(tl, pos, 0.2), scale: prop(tl, outer.map(v => [v, v]), 0.3), opacity: prop(tl, oo, 0.3) } });
      layers.push({ ...base, name: `${zh ? '点击波纹' : 'Ripple'}_${ri}_${zh ? '中心' : 'dot'}`, src: { shape: { kind: 'ellipse', size: r4(S.rippleR * 0.48 * CK), fill: [ra, rb, rc2] } }, tr: { position: prop(tl, pos, 0.2), opacity: prop(tl, io, 0.3) } });
    }
    // 免责声明文字（PNG）
    if (S.discShow && S.discText) { const c = document.createElement('canvas'); c.width = Math.ceil(V.w * CK); c.height = Math.ceil(V.h * CK); const g = c.getContext('2d'); g.scale(CK, CK); g.translate(-V.x0, -V.y0); Rn.drawDisclaimer(g, S, V); addAsset('disclaimer', c, zh ? '底部文字.png' : 'disclaimer.png'); layers.push({ name: zh ? '底部文字' : 'Disclaimer', src: { asset: 'disclaimer' }, label: 15, tr: { anchor: [0, 0], position: [0, 0] } }); }
    // 胜利页：压暗（纯色层不透明度）+ 标题（PNG，缩放/不透明度）
    const wf = frames.map(fr => lin(fr, f => f.win)); const w0 = wf.findIndex(v => v > 0);
    if (w0 >= 0) { const tl = ts.slice(w0), wu = wf.slice(w0), a = wu.map(u => Math.min(1, u * 2.5));
      layers.push({ name: zh ? '胜利页_压暗' : 'Win_dim', src: { solid: rgb('#040a0c'), w: CW, h: CH }, in: r4(tl[0]), out: D, label: 1, tr: { anchor: [CW / 2, CH / 2], position: [CW / 2, CH / 2], opacity: prop(tl, a.map(x => x * S.winDim * 100), 0.3) } });
      const c = document.createElement('canvas'); c.width = Math.ceil(V.w * CK); c.height = Math.ceil(V.h * CK); const g = c.getContext('2d'); g.scale(CK, CK); g.translate(-V.x0, -V.y0); Rn.drawWin(g, { ...S, winDim: 0 }, V, 10); addAsset('win', c, zh ? '胜利标题.png' : 'win_title.png');
      const cy = (V.h * 0.42) * CK; layers.push({ name: zh ? '胜利页_标题' : 'Win_title', src: { asset: 'win' }, in: r4(tl[0]), out: D, label: 1, tr: { anchor: [(360 - V.x0) * CK, cy], position: [(360 - V.x0) * CK, cy], scale: prop(tl, wu.map(u => { const s = (0.85 + 0.15 * (1 - Math.pow(1 - Math.min(1, u * 1.6), 3))) * 100; return [s, s]; }), 0.2), opacity: prop(tl, a.map(x => x * 100), 0.3) } }); }
    const ef = frames.map(fr => lin(fr, f => f.end)); const e0 = ef.findIndex(v => v > 0);
    if (e0 >= 0) { const c = document.createElement('canvas'); c.width = Math.ceil(V.w * CK); c.height = Math.ceil(V.h * CK); const g = c.getContext('2d'); g.scale(CK, CK); g.translate(-V.x0, -V.y0); Rn.drawEnd(g, S, V, 1); addAsset('endcard', c, zh ? '结束页.png' : 'endcard.png'); layers.push({ name: zh ? '结束页' : 'End card', src: { asset: 'endcard' }, in: r4(ts[e0]), out: D, label: 5, tr: { anchor: [0, 0], position: [0, 0], opacity: prop(ts.slice(e0), ef.slice(e0).map(x => x * 100), 0.3) } }); }
    // 手指
    const hf = frames.map(fr => fr.A.hand ? fr : null); const hi = hf.findIndex(Boolean);
    if (hi >= 0 && E.handImg) {
      const im = E.handImg, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); addAsset('hand', c, zh ? '手指.png' : 'hand.png');
      const [ax, ay] = E.handAnchor, hs = S.handSize * 720 / im.width; let a = hi;
      for (let k = hi; k <= hf.length; k++) { if (k < hf.length && hf[k]) continue; if (k > a) { const seg = frames.slice(a, k), tl = seg.map(f => f.tau);
          layers.push({ name: zh ? '手指' : 'Hand', src: { asset: 'hand' }, in: r4(tl[0]), out: r4(Math.min(D, tl[tl.length - 1] + 1 / fps)), label: 12, tr: { anchor: [ax * im.width, ay * im.height], position: prop(tl, seg.map(fr => { const h = fr.B.hand ? lin(fr, f => [f.hand.x, f.hand.y]) : [fr.A.hand.x, fr.A.hand.y]; return [(h[0] - V.x0) * CK, (h[1] - V.y0) * CK]; }), 0.2), scale: prop(tl, seg.map(fr => { const s = fr.A.hand.sc * hs * CK * 100; return [S.handFlip ? -s : s, s]; }), 0.2), rotation: S.handRotation } }); }
        while (k < hf.length && !hf[k]) k++; a = k; }
    }
    // 音频
    const audioFiles = [], ZH = n => (SFX_NAMES[n] || [0, n])[1], sfxE = rec.sfx.map(e => ({ ...e, t: e.t - tb })).filter(e => e.t >= -0.01);
    if (S.aeAudio !== 'none' && sfxE.length) try {
      if (S.aeAudio === 'both' || S.aeAudio === 'mixed') { const buf = await renderSfxOffline(sfxE, D + 0.8, S); if (buf) { audioFiles.push({ name: 'audio/mix.wav', data: encodeWav(buf) }); assets.push({ id: 'mix', file: 'audio/mix.wav', folder: 'aud', name: 'mix.wav' }); layers.push({ name: zh ? '混合音轨' : 'Mixed audio', src: { asset: 'mix' }, label: 16 }); } }
      if (S.aeAudio === 'both' || S.aeAudio === 'events') {
        const kinds = new Set(sfxE.map(e => e.name));
        for (const k of kinds) { const buf = await renderSfxOffline([{ t: 0, name: k }], (SFX_DUR[k] || 0.4) + 0.2, S); if (!buf) continue; audioFiles.push({ name: `audio/sfx_${k}.wav`, data: encodeWav(buf) }); assets.push({ id: 'sfx_' + k, file: `audio/sfx_${k}.wav`, folder: 'aud', name: `sfx_${k}.wav` }); }
        const al = sfxE.map((e, i) => { const st = r4(Math.max(0, e.t + (e.delay || 0))); return { name: `${zh ? '音效' : 'SFX'} ${i + 1} ${zh ? ZH(e.name) : e.name}`, src: { asset: 'sfx_' + e.name }, start: st, in: st, label: 16 }; });
        comps.push({ id: 'sfx', name: zh ? '音效_逐事件' : 'SFX_events', w: CW, h: CH, duration: D, fps, folder: 'pre', layers: al }); layers.push({ name: zh ? '音效_逐事件' : 'SFX_events', src: { comp: 'sfx' }, label: 16, audioEnabled: S.aeAudio === 'events' });
      }
    } catch (e) { console.warn('audio export', e); }
    for (const e of sfxE) markers.push([r4(Math.max(0, e.t + (e.delay || 0))), zh ? ZH(e.name) : e.name]);
    const d = new Date(), p2 = x => String(x).padStart(2, '0'), stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
    comps.push({ id: 'main', name: zh ? '主合成_箭头挪出' : 'Main_ArrowEscape', w: CW, h: CH, duration: D, fps, folder: 'root', bg: rgb(S.bgColor), layers, markers });
    const kc = P => P && P.t ? P.t.length : 0, stats = { comps: comps.length, layers: 0, keys: 0, lines: nLines, heads: nLines, ripples: ri, sfx: sfxE.length };
    for (const c of comps) { stats.layers += c.layers.length; for (const l of c.layers) { if (l.tr) for (const k of ['position', 'scale', 'rotation', 'opacity']) { const n = kc(l.tr[k]); if (n > 1) stats.keys += n; } const sh = l.src.shape; if (sh) for (const k of ['trimStart', 'trimEnd', 'color']) { const n = kc(sh[k]); if (n > 1) stats.keys += n; } } }
    const timeline = { meta: { tool: 'arrow-escape-tool', version: api.version || '1.0.0', format: 1, created: d.toISOString(), fps, width: CW, height: CH, duration: D, design: [720, 1280], view: V, scale: CK, grid, sampling: bake ? 'bake' : 'reduce', names: zh ? 'zh' : 'en', saveAep: S.aeSaveAep !== false, aepName: `arrow-escape-tool_${stamp}.aep`, newProject: true, stats, note: '图层从下到上排列；时间单位秒；线条/箭头/点阵父级到“镜头”空对象，坐标为参考坐标像素；其余为合成像素；修剪路径为百分比' },
      folders, assets: assets.map(({ id, file, folder, w, h, name }) => ({ id, file, folder, w, h, name })), comps, mainComp: 'main' };
    await Promise.all(pending);
    const enc = new TextEncoder(), files = [{ name: 'build_ae_project.jsx', data: enc.encode(JSX_TEXT) }, { name: 'timeline.json', data: enc.encode(JSON.stringify(timeline)) }, { name: 'README_AE.md', data: enc.encode(README_TEXT) }, ...assetFiles.sort((a, b) => a.name < b.name ? -1 : 1), ...audioFiles];
    return { blob: makeZip(files), name: `arrow-escape-tool_ae_export_${stamp}.zip`, timeline, stats, files: files.length, fileList: files };
  }
  return { start, stop: () => { const r = R; R = null; return r; }, sample, exportZip, get rec() { return R; }, set rec(v) { R = v; } };
}
