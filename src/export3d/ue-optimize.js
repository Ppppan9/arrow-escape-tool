// 3D 导出瘦身（引擎导入友好）：直接处理 GLTFExporter 写出的 .glb（ArrayBuffer/Uint8Array），纯 JS、无依赖，浏览器和 Node 都能跑。
// 目标：导入大型 3D 引擎时不再生成成千上万个网格资产 / 材质 / 动画轨道。画面与动画保持一致（逐帧采样误差 < 容差）。
//   1. 相同图片 / 贴图 / 材质（同名模板、同参数）/ 数据块 / 网格合并共享
//   2. 整段不可见（缩放恒为 0）的节点删除；没有网格也没有相机灯光的空节点删除
//   3. 短命对象（碎屑、子弹、拖尾、涟漪等同结构兄弟节点）按时间段复用成“对象池”节点，不再每发一个节点
//   4. 关键帧精简：去掉可由前后线性插值得到的帧、STEP 重复帧；恒定轨道直接写回节点静态变换
//   5. 不动的同材质网格（同一父节点下）合并成一个网格
// 受保护：相机、灯光、opts.protect 里的节点名（例如 scene3d.json 的 opacity 曲线目标，Blender 脚本按名字找它们和它们的材质）。
export const UE_OPT_VERSION = 1;

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const PATH_N = { translation: 3, rotation: 4, scale: 3, weights: 0 };
const ZERO = 1e-7;

function parseGLB(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not glb');
  const jl = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(u8.subarray(20, 20 + jl)));
  let bin = new Uint8Array(0), o = 20 + jl;
  if (o + 8 <= u8.byteLength) { const bl = dv.getUint32(o, true); bin = u8.subarray(o + 8, o + 8 + bl); }
  return { json, bin };
}
function writeGLB(json, bin) {
  let js = new TextEncoder().encode(JSON.stringify(json));
  const jp = (4 - (js.length % 4)) % 4, bp = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + js.length + jp + (bin.length ? 8 + bin.length + bp : 0);
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, js.length + jp, true); dv.setUint32(16, 0x4E4F534A, true); out.set(js, 20); out.fill(0x20, 20 + js.length, 20 + js.length + jp);
  if (bin.length) { const o = 20 + js.length + jp; dv.setUint32(o, bin.length + bp, true); dv.setUint32(o + 4, 0x004E4942, true); out.set(bin, o + 8); }
  return out;
}

// ---------- 数据访问 ----------
function readAcc(json, bin, i) {
  const a = json.accessors[i], C = CT[a.componentType], nc = NC[a.type], n = a.count * nc;
  const out = new C(n);
  if (a.bufferView == null) return out;
  const bv = json.bufferViews[a.bufferView], es = C.BYTES_PER_ELEMENT, base = (bv.byteOffset || 0) + (a.byteOffset || 0), st = bv.byteStride || nc * es;
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  if (st === nc * es && (bin.byteOffset + base) % es === 0) { out.set(new C(bin.buffer, bin.byteOffset + base, n)); return out; }
  const get = { 1: (o) => C === Int8Array ? dv.getInt8(o) : dv.getUint8(o), 2: (o) => C === Int16Array ? dv.getInt16(o, true) : dv.getUint16(o, true), 4: (o) => C === Float32Array ? dv.getFloat32(o, true) : dv.getUint32(o, true) }[es];
  for (let k = 0; k < a.count; k++) for (let c = 0; c < nc; c++) out[k * nc + c] = get(base + k * st + c * es);
  return out;
}
function hashBytes(u8) { // 两路 32 位哈希 + 长度（写出时还会逐字节比较）
  let h = 0x811c9dc5, g = 0x12345678; for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193); g = Math.imul(g ^ u8[i], 0x5bd1e995); g ^= g >>> 15; }
  return (h >>> 0).toString(36) + (g >>> 0).toString(36) + ':' + u8.length;
}
function eqBytes(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
const canon = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((r, kk) => (r[kk] = v[kk], r), {}) : v);
const nameTpl = (s) => String(s || '').replace(/\d+/g, '#');

// 新数据表：所有访问器 / 图片重新写入一个干净的 BIN
class Store {
  constructor() { this.parts = []; this.len = 0; this.views = []; this.accs = []; this.dedup = new Map(); }
  _view(u8, target) {
    const pad = (4 - (this.len % 4)) % 4; if (pad) { this.parts.push(new Uint8Array(pad)); this.len += pad; }
    const v = { buffer: 0, byteOffset: this.len, byteLength: u8.length }; if (target) v.target = target;
    this.parts.push(u8); this.len += u8.length; this.views.push(v); return this.views.length - 1;
  }
  image(u8) { return this._view(u8); }
  acc(arr, type, ctype, extra = {}, target) {
    const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    const key = hashBytes(u8) + '|' + type + '|' + ctype + '|' + canon(extra) + '|' + (target || 0);
    const hit = this.dedup.get(key); if (hit) for (const h of hit) if (eqBytes(h.u8, u8)) return h.i;
    const nc = NC[type], count = arr.length / nc;
    const a = Object.assign({ bufferView: this._view(new Uint8Array(u8), target), componentType: ctype, count, type }, extra);
    if (ctype === 5126 || type === 'SCALAR' || extra.needMinMax) { // min/max（POSITION 和动画时间必须有）
      const mn = new Array(nc).fill(Infinity), mx = new Array(nc).fill(-Infinity);
      for (let k = 0; k < count; k++) for (let c = 0; c < nc; c++) { const v = arr[k * nc + c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
      if (count) { a.min = mn.map(f32); a.max = mx.map(f32); }
    }
    delete a.needMinMax;
    this.accs.push(a); const i = this.accs.length - 1;
    if (!hit) this.dedup.set(key, [{ u8, i }]); else hit.push({ u8, i });
    return i;
  }
  bin() { const out = new Uint8Array(this.len); let o = 0; for (const p of this.parts) { out.set(p, o); o += p.length; } return out; }
}
const f32 = (x) => Math.fround(x);

// ---------- 动画：取值 / 插值 ----------
function slerp(a, ai, b, bi, u, out, oi) {
  let ax = a[ai], ay = a[ai + 1], az = a[ai + 2], aw = a[ai + 3], bx = b[bi], by = b[bi + 1], bz = b[bi + 2], bw = b[bi + 3];
  let d = ax * bx + ay * by + az * bz + aw * bw; if (d < 0) { d = -d; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  let s0 = 1 - u, s1 = u;
  if (d < 0.9995) { const th = Math.acos(Math.min(1, d)), sn = Math.sin(th); s0 = Math.sin((1 - u) * th) / sn; s1 = Math.sin(u * th) / sn; }
  let x = s0 * ax + s1 * bx, y = s0 * ay + s1 * by, z = s0 * az + s1 * bz, w = s0 * aw + s1 * bw; const l = Math.hypot(x, y, z, w) || 1;
  out[oi] = x / l; out[oi + 1] = y / l; out[oi + 2] = z / l; out[oi + 3] = w / l;
}
function evalCh(ch, t, out, oi = 0) { // ch: {T, V, n, interp, path}
  const { T, V, n } = ch, L = T.length;
  if (L === 0) return;
  if (t <= T[0] || L === 1) { for (let c = 0; c < n; c++) out[oi + c] = V[c]; return; }
  if (t >= T[L - 1]) { for (let c = 0; c < n; c++) out[oi + c] = V[(L - 1) * n + c]; return; }
  let lo = 0, hi = L - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  if (ch.interp === 'STEP') { for (let c = 0; c < n; c++) out[oi + c] = V[lo * n + c]; return; }
  const u = (t - T[lo]) / (T[hi] - T[lo]);
  if (ch.path === 'rotation') return slerp(V, lo * n, V, hi * n, u, out, oi);
  for (let c = 0; c < n; c++) out[oi + c] = V[lo * n + c] * (1 - u) + V[hi * n + c] * u;
}

// 关键帧精简：误差 tol 以内的线性冗余帧 / STEP 重复帧去掉（首尾保留）
function reduceKeys(T, V, n, interp, tol, isRot) {
  const L = T.length; if (L <= 2 || interp === 'CUBICSPLINE') return { T, V };
  if (isRot) { for (let k = 1; k < L; k++) { let d = 0; for (let c = 0; c < 4; c++) d += V[k * 4 + c] * V[(k - 1) * 4 + c]; if (d < 0) for (let c = 0; c < 4; c++) V[k * 4 + c] = -V[k * 4 + c]; } }
  const near = (i, j) => { for (let c = 0; c < n; c++) if (Math.abs(V[i * n + c] - V[j * n + c]) > tol) return false; return true; };
  const keep = [0];
  if (interp === 'STEP') {
    for (let i = 1; i < L - 1; i++) if (!near(i, keep[keep.length - 1])) keep.push(i);
    keep.push(L - 1);
  } else {
    const MAXW = 400;
    for (let i = 1; i < L - 1; i++) {
      const a = keep[keep.length - 1], b = i + 1;
      if (i - a > MAXW) { keep.push(i); continue; }
      const ta = T[a], tb = T[b]; let ok = tb > ta;
      for (let j = a + 1; ok && j < b; j++) {
        const u = (T[j] - ta) / (tb - ta);
        for (let c = 0; c < n; c++) { const p = V[a * n + c] * (1 - u) + V[b * n + c] * u; if (Math.abs(p - V[j * n + c]) > tol) { ok = false; break; } }
      }
      if (!ok) keep.push(i);
    }
    keep.push(L - 1);
  }
  if (keep.length === L) return { T, V };
  const T2 = new Float32Array(keep.length), V2 = new Float32Array(keep.length * n);
  keep.forEach((k, i) => { T2[i] = T[k]; for (let c = 0; c < n; c++) V2[i * n + c] = V[k * n + c]; });
  return { T: T2, V: V2 };
}
function isConst(ch, tol) { const { V, n } = ch; for (let k = 1; k < V.length / n; k++) for (let c = 0; c < n; c++) if (Math.abs(V[k * n + c] - V[c]) > tol) return false; return true; }

// ---------- 主函数 ----------
export function optimizeGLB(input, opts = {}) {
  const t0 = Date.now();
  const u8in = input instanceof Uint8Array ? input : new Uint8Array(input);
  const { json, bin } = parseGLB(u8in);
  const stats = { version: UE_OPT_VERSION, before: summary(json), steps: {} };
  if (json.skins?.length || (json.extensionsRequired || []).some(e => /draco|meshopt|KHR_texture_basisu/i.test(e))) { stats.skipped = 'unsupported'; return { glb: u8in, stats }; }
  const protect = new Set(opts.keep || []);          // 完全不动（名字、材质、节点都保留）
  const opacity = opts.opacity || null;              // scene3d.json 的 opacity：{节点名: [[t, a], ...]}，池化后按新名字合并曲线
  const named = new Set(Object.keys(opacity || {})); // 需要按名字找到的节点：不做静态合并
  const fps = opts.fps || guessFps(json, bin) || 30;
  const tolT = opts.tolT ?? 5e-4, tolR = opts.tolR ?? 2e-4, tolS = opts.tolS ?? 2e-4; // 平移按世界米，旋转按四元数分量，缩放按比例
  const nodes = json.nodes || [];
  const N = nodes.length;
  const parent = new Int32Array(N).fill(-1); nodes.forEach((n, i) => (n.children || []).forEach(c => (parent[c] = i)));

  // --- 读取动画通道（单动画才做恒定轨道写回 / 对象池）---
  const anims = (json.animations || []).map(a => a.channels.map(c => {
    const s = a.samplers[c.sampler]; const n = PATH_N[c.target.path];
    return { node: c.target.node, path: c.target.path, interp: s.interpolation || 'LINEAR', T: readAcc(json, bin, s.input), V: Float32Array.from(readAcc(json, bin, s.output)), n: n || (json.accessors[s.output].count ? (readAcc(json, bin, s.output).length / json.accessors[s.input].count) : 1), name: a.name };
  }));
  const single = anims.length === 1;
  let dur = 0; for (const A of anims) for (const c of A) if (c.T.length) dur = Math.max(dur, c.T[c.T.length - 1]);
  const NF = Math.round(dur * fps);
  const chOf = (A, i) => A.filter(c => c.node === i);

  // --- 受保护节点（含祖先与子孙不参与对象池 / 合并 / 删除）---
  const prot = new Uint8Array(N);
  nodes.forEach((n, i) => { if (protect.has(n.name) || n.camera != null || n.extensions?.KHR_lights_punctual) { for (let p = i; p >= 0; p = parent[p]) prot[p] = 1; } });
  const protSub = new Uint8Array(N); // 在受保护节点之下
  nodes.forEach((n, i) => { for (let p = i; p >= 0; p = parent[p]) if (protect.has(nodes[p].name)) { protSub[i] = 1; break; } });
  const alive = new Uint8Array(N).fill(1);
  // 内容键：网格按数据内容 + 材质（同名模板同参数）判断是否相同，用于对象池分组
  const protMat0 = new Set(); nodes.forEach((n, i) => { if ((protect.has(n.name) || protSub[i]) && n.mesh != null) for (const p of json.meshes[n.mesh].primitives) if (p.material != null) protMat0.add(p.material); });
  const accK = new Map(), accKey = (i) => { if (!accK.has(i)) { const a = json.accessors[i], arr = readAcc(json, bin, i); accK.set(i, hashBytes(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)) + a.type + a.componentType + !!a.normalized); } return accK.get(i); };
  const imgKey = (i) => { const im = json.images[i]; if (im.bufferView == null) return 'u' + im.uri; const bv = json.bufferViews[im.bufferView]; return hashBytes(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)); };
  const texKey = (i) => { const t = json.textures[i]; return canon({ s: t.sampler, i: t.source != null ? imgKey(t.source) : null, e: t.extensions }); };
  const texRepl = (o) => { if (Array.isArray(o)) return o.map(texRepl); if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) { const v = o[k]; r[k] = (/Texture$/.test(k) && v && typeof v === 'object' && typeof v.index === 'number') ? Object.assign({}, texRepl(v), { index: texKey(v.index) }) : texRepl(v); } return r; } return o; };
  const matK = new Map(), matKey = (i) => { if (i == null) return '-'; if (!matK.has(i)) { const m = json.materials[i]; matK.set(i, protMat0.has(i) ? 'P' + i : nameTpl(m.name) + canon(texRepl({ ...m, name: undefined }))); } return matK.get(i); };
  const meshK = new Map(), meshKey = (i) => { if (!meshK.has(i)) { const m = json.meshes[i]; meshK.set(i, hashBytes(new TextEncoder().encode(canon(m.primitives.map(p => ({ a: Object.fromEntries(Object.entries(p.attributes).map(([k, v]) => [k, accKey(v)])), i: p.indices != null ? accKey(p.indices) : null, m: matKey(p.material), o: p.mode, t: p.targets ? p.targets.map(t => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, accKey(v)]))) : null })))))); } return meshK.get(i); };
  const killSub = (i) => { const st = [i]; while (st.length) { const k = st.pop(); alive[k] = 0; for (const c of nodes[k].children || []) st.push(c); } };

  // --- 1. 永远不可见（缩放恒 0）的子树删掉 ---
  let removedHidden = 0;
  if (anims.length <= 1) {
    const A = anims[0] || [];
    const scaleCh = new Map(); for (const c of A) if (c.path === 'scale') scaleCh.set(c.node, c);
    for (let i = 0; i < N; i++) {
      if (!alive[i] || prot[i] || protSub[i]) continue;
      const ch = scaleCh.get(i), rest = nodes[i].scale;
      let zero;
      if (ch) { zero = true; for (let k = 0; k < ch.T.length && zero; k++) if (Math.min(Math.abs(ch.V[k * 3]), Math.abs(ch.V[k * 3 + 1]), Math.abs(ch.V[k * 3 + 2])) > ZERO) zero = false; }
      else zero = !!rest && Math.min(...rest.map(Math.abs)) <= ZERO;
      if (zero) { killSub(i); removedHidden++; }
    }
  }
  stats.steps.hiddenRemoved = removedHidden;

  // --- 2. 对象池：同父、同结构、出现时间不重叠的兄弟子树复用同一组节点 ---
  let pooledMembers = 0, poolSlots = 0;
  const newNodes = []; // 追加的池节点
  const poolCount = new Map(), opRemoved = new Set(), opAdded = {}, poolVis = {};
  if (single && opts.pool !== false && NF > 0) {
    const A = anims[0];
    const byNode = new Map(); for (const c of A) { if (!byNode.has(c.node)) byNode.set(c.node, {}); byNode.get(c.node)[c.path] = c; }
    const sigMemo = new Map();
    const sig = (i) => { if (sigMemo.has(i)) return sigMemo.get(i); const n = nodes[i]; const s = '(' + (n.mesh != null ? meshKey(n.mesh) : '-') + (n.camera != null || n.extensions || n.skin != null || n.weights ? '!X' : '') + '[' + (n.children || []).filter(c => alive[c]).map(sig).join(',') + '])'; sigMemo.set(i, s); return s; };
    const sub = (i, out = []) => { out.push(i); for (const c of nodes[i].children || []) if (alive[c]) sub(c, out); return out; };
    const tmp = new Float32Array(4);
    const groups = new Map();
    for (let i = 0; i < N; i++) {
      if (!alive[i] || prot[i] || protSub[i] || parent[i] < 0 && false) continue;
      const sc = byNode.get(i)?.scale; if (!sc) continue;
      const s = sig(i); if (s.includes('!X') || !/\([^-(]/.test(s)) continue; // 需要含网格
      // 可见区间（按根节点缩放）
      let a = -1, b = -1;
      const eps = sc.interp === 'STEP' ? 0.25 / fps : 0; // STEP 关键帧时间是 float32，正好落在帧时刻时取值要稍微往后，避免取到上一帧
      for (let f = 0; f <= NF; f++) { evalCh(sc, f / fps + eps, tmp); if (Math.min(Math.abs(tmp[0]), Math.abs(tmp[1]), Math.abs(tmp[2])) > ZERO) { if (a < 0) a = f; b = f; } }
      if (a < 0) continue;
      // 关键帧之间也要保证区间外为 0：检查首尾关键帧外侧
      const key = parent[i] + '|' + s; if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ i, a, b });
    }
    const depth = (i) => { let d = 0; for (let p = parent[i]; p >= 0; p = parent[p]) d++; return d; };
    const order = [...groups.entries()].filter(([, m]) => m.length > 1).sort((x, y) => depth(x[1][0].i) - depth(y[1][0].i));
    for (const [key, mem0] of order) {
      const mem = mem0.filter(m => alive[m.i]);
      if (mem.length < 2) continue;
      // 每个位置每条路径的插值方式必须一致
      const subs = mem.map(m => sub(m.i));
      const L = subs[0].length; let okInterp = true; const interp = [];
      for (let p = 0; p < L && okInterp; p++) { interp[p] = {}; for (const path of ['translation', 'rotation', 'scale']) { let it = null; for (const s of subs) { const c = byNode.get(s[p])?.[path]; if (c) { if (it && it !== c.interp) okInterp = false; it = c.interp; } } interp[p][path] = it; } }
      if (!okInterp) continue;
      mem.forEach((m, k) => (m.sub = subs[k]));
      mem.sort((x, y) => x.a - y.a);
      const slots = [];
      for (const m of mem) { let best = null; for (const s of slots) if (m.a >= s.lastB + 3 && (!best || s.lastB > best.lastB)) best = s; if (!best) { best = { list: [], lastB: -1e9 }; slots.push(best); } best.list.push(m); best.lastB = m.b; }
      if (slots.length >= mem.length) continue;
      const par = Number(key.split('|')[0]);
      slots.forEach((slot, si) => {
        const list = slot.list;
        if (list.length === 1) return; // 单独一个就保持原样
        // 归属帧段：成员 k 拥有 [start_k, start_{k+1}-1]，start_k = b_{k-1}+2
        const start = list.map((m, k) => k === 0 ? 0 : list[k - 1].b + 2);
        const owner = new Int32Array(NF + 1); let k = 0; for (let f = 0; f <= NF; f++) { while (k + 1 < list.length && f >= start[k + 1]) k++; owner[f] = k; }
        const ids = [];
        for (let p = 0; p < L; p++) {
          const src = nodes[list[0].sub[p]];
          const nn = { name: poolName(src.name, poolCount) };
          if (src.mesh != null) nn.mesh = src.mesh;
          for (const path of ['translation', 'rotation', 'scale']) {
            const it = interp[p][path];
            const rests = list.map(m => nodes[m.sub[p]][path]);
            if (!it) { // 所有成员都没有这条轨道
              const r0 = canon(rests[0]); if (rests.every(r => canon(r) === r0)) { if (rests[0]) nn[path] = rests[0].slice(); continue; }
            }
            const n = PATH_N[path], T = new Float32Array(NF + 1), V = new Float32Array((NF + 1) * n);
            const restDef = path === 'rotation' ? [0, 0, 0, 1] : path === 'scale' ? [1, 1, 1] : [0, 0, 0];
            for (let f = 0; f <= NF; f++) {
              T[f] = f / fps; const m = list[owner[f]], c = byNode.get(m.sub[p])?.[path];
              if (c) evalCh(c, c.interp === 'STEP' ? T[f] + 0.25 / fps : T[f], V, f * n); else { const r = nodes[m.sub[p]][path] || restDef; for (let q = 0; q < n; q++) V[f * n + q] = r[q]; }
            }
            A.push({ node: N + newNodes.length, path, interp: it || 'LINEAR', T, V, n, pooled: true });
          }
          ids.push(N + newNodes.length); newNodes.push(nn);
        }
        // 结构：子节点索引映射
        for (let p = 0; p < L; p++) {
          const src = nodes[list[0].sub[p]], kids = (src.children || []).filter(c => alive[c]).map(c => ids[list[0].sub.indexOf(c)]);
          if (kids.length) newNodes[ids[p] - N].children = kids;
        }
        newNodes[ids[0] - N].__parent = par;
        if (opacity) for (let p = 0; p < L; p++) {
          const names = list.map(m => nodes[m.sub[p]].name);
          if (!names.some(nm => opacity[nm])) continue;
          const keys = [];
          list.forEach((m, k) => {
            const cur = opacity[names[k]]; if (!cur) return;
            const t0 = start[k] / fps, t1 = (k + 1 < list.length ? start[k + 1] - 1 : NF) / fps;
            const ev = (t) => { if (t <= cur[0][0]) return cur[0][1]; for (let q = 1; q < cur.length; q++) if (t <= cur[q][0]) { const a = cur[q - 1], b = cur[q], u = (t - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * u; } return cur[cur.length - 1][1]; };
            keys.push([t0, ev(t0)]); for (const kv of cur) if (kv[0] > t0 + 1e-6 && kv[0] < t1 - 1e-6) keys.push([kv[0], kv[1]]); keys.push([t1, ev(t1)]);
          });
          for (const nm of names) opRemoved.add(nm);
          const nt = opts.nodeTimes; if (nt) { const iv = names.map(nm => nt[nm]).filter(x => x && isFinite(x[0]) && isFinite(x[1])); if (iv.length) poolVis[newNodes[ids[p] - N].name] = iv.map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5]); }
          opAdded[newNodes[ids[p] - N].name] = keys.map(([t, a]) => [Math.round(t * 1e5) / 1e5, Math.round(a * 1e5) / 1e5]);
        }
        for (const m of list) killSub(m.i);
        pooledMembers += list.length; poolSlots++;
      });
    }
    // 删除被池化成员的旧通道
    for (let q = A.length - 1; q >= 0; q--) if (A[q].node < N && !alive[A[q].node]) A.splice(q, 1);
  }
  stats.steps.pooled = { members: pooledMembers, slots: poolSlots };
  const allNodes = nodes.concat(newNodes);
  for (let i = N; i < allNodes.length; i++) if (allNodes[i].__parent != null) { const p = allNodes[i].__parent; delete allNodes[i].__parent; if (p >= 0) (allNodes[p].children = allNodes[p].children || []).push(i); else json.scenes.forEach(s => s.nodes.push(i)); }
  const NA = allNodes.length;
  const alive2 = new Uint8Array(NA).fill(1); for (let i = 0; i < N; i++) alive2[i] = alive[i];
  const par2 = new Int32Array(NA).fill(-1); allNodes.forEach((n, i) => (n.children || []).forEach(c => (par2[c] = i)));

  // --- 3. 关键帧精简 + 恒定轨道写回 ---
  const worldScale = new Float32Array(NA); // 父链静态缩放（用于把世界容差换算到本地）
  const ws = (i) => { if (worldScale[i]) return worldScale[i]; let s = 1; for (let p = par2[i]; p >= 0; p = par2[p]) { const sc = allNodes[p].scale; if (sc) s *= Math.max(Math.abs(sc[0]), Math.abs(sc[1]), Math.abs(sc[2])) || 1; } return (worldScale[i] = s); };
  let keysBefore = 0, keysAfter = 0, chBefore = 0, constDropped = 0;
  const countPath = new Map();
  for (const A of anims) for (const c of A) countPath.set(c.node + c.path, (countPath.get(c.node + c.path) || 0) + 1);
  for (const A of anims) {
    for (let q = A.length - 1; q >= 0; q--) {
      const c = A[q]; if (!alive2[c.node]) { A.splice(q, 1); continue; }
      chBefore++; keysBefore += c.T.length;
      if (!PATH_N[c.path]) { keysAfter += c.T.length; continue; }
      // 容差：既不超过世界空间容差，也不超过这条轨道自身变化幅度的万分之一（相机下的贴图平面离镜头很近，世界容差会被放大成像素级误差）
      let mn = Infinity, mx = -Infinity, range = 0, amax = 0;
      for (let q2 = 0; q2 < c.n; q2++) { mn = Infinity; mx = -Infinity; for (let k = q2; k < c.V.length; k += c.n) { const v = c.V[k]; if (v < mn) mn = v; if (v > mx) mx = v; if (Math.abs(v) > amax) amax = Math.abs(v); } range = Math.max(range, mx - mn); }
      const floor = Math.max(1e-9, 1e-7 * amax);
      const tol = Math.max(floor, c.path === 'translation' ? Math.min(tolT / ws(c.node), 1e-4 * range) : c.path === 'rotation' ? Math.min(tolR, 1e-3 * range) : Math.min(tolS * Math.max(amax, 1e-6), 1e-4 * range));
      const r = reduceKeys(c.T, c.V, c.n, c.interp, tol, c.path === 'rotation'); c.T = r.T; c.V = r.V;
      if (single && countPath.get(c.node + c.path) === 1 && isConst(c, tol)) {
        const v = Array.from(c.V.subarray(0, c.n)); if (c.path === 'rotation') { const l = Math.hypot(...v) || 1; for (let k = 0; k < 4; k++) v[k] /= l; }
        allNodes[c.node][c.path] = v.map(f32); A.splice(q, 1); constDropped++; continue;
      }
      keysAfter += c.T.length;
    }
  }
  stats.steps.keys = { before: keysBefore, after: keysAfter, constTracksBaked: constDropped };

  // --- 4. 不动的同材质网格合并（同父节点下的叶子节点）---
  const animated = new Uint8Array(NA); for (const A of anims) for (const c of A) animated[c.node] = 1;
  const meshes = json.meshes || [];
  const mergeOut = []; let mergedNodes = 0;
  if (opts.mergeStatic !== false) {
    const groups = new Map();
    for (let i = 0; i < NA; i++) {
      const n = allNodes[i];
      if (!alive2[i] || animated[i] || n.mesh == null || (n.children || []).some(c => alive2[c]) || prot[i] || protSub[i] || n.camera != null || n.extensions || n.weights) continue;
      if (protect.has(n.name) || named.has(n.name)) continue;
      const m = meshes[n.mesh]; if (!m || m.primitives.length !== 1 || m.weights) continue;
      const pr = m.primitives[0]; if (pr.targets || (pr.mode ?? 4) !== 4 || pr.extensions) continue;
      const attrSig = Object.keys(pr.attributes).sort().map(k => { const a = json.accessors[pr.attributes[k]]; return k + ':' + a.type + ':' + a.componentType + ':' + !!a.normalized; }).join(',');
      if (!/POSITION:VEC3:5126/.test(attrSig) || /JOINTS|WEIGHTS/.test(attrSig) || /(NORMAL|TANGENT):VEC[34]:(?!5126)/.test(attrSig)) continue;
      const key = par2[i] + '|' + (pr.material ?? -1) + '|' + attrSig;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i);
    }
    const vcount = (i) => json.accessors[meshes[allNodes[i].mesh].primitives[0].attributes.POSITION].count;
    for (const [key, list] of groups) {
      if (list.length < 2) continue;
      // 体积保护：合并后顶点太多、或者大量复用同一个网格（合并会把文件撑大很多）就不合并
      const tot = list.reduce((s, i) => s + vcount(i), 0), uniq = [...new Set(list.map(i => allNodes[i].mesh))].reduce((s, m) => s + json.accessors[meshes[m].primitives[0].attributes.POSITION].count, 0);
      if (tot > (opts.mergeMaxVerts || 200000) || (tot > 60000 && tot > 3 * uniq)) continue;
      mergeOut.push({ key, list }); mergedNodes += list.length;
      for (const i of list) alive2[i] = 0;
    }
  }
  stats.steps.staticMerged = { nodes: mergedNodes, into: mergeOut.length };

  // --- 5. 空节点删除（无网格、无相机灯光、无子节点；动画也无意义）---
  let emptyRemoved = 0;
  const hasMergedChild = new Set(mergeOut.map(g => Number(g.key.split('|')[0])));
  for (let pass = 0; pass < 64; pass++) {
    let ch = 0;
    for (let i = NA - 1; i >= 0; i--) {
      const n = allNodes[i];
      if (!alive2[i] || n.mesh != null || n.camera != null || n.extensions || prot[i] || protect.has(n.name) || named.has(n.name) || hasMergedChild.has(i)) continue;
      if ((n.children || []).some(c => alive2[c])) continue;
      if (par2[i] < 0 && false) continue;
      alive2[i] = 0; ch++; emptyRemoved++;
    }
    if (!ch) break;
  }
  stats.steps.emptyRemoved = emptyRemoved;

  // ================= 重新写出 =================
  const S = new Store();
  const out = { asset: json.asset, scene: json.scene ?? 0 };
  if (json.extensionsUsed) out.extensionsUsed = json.extensionsUsed.slice();
  if (json.extensionsRequired) out.extensionsRequired = json.extensionsRequired.slice();
  if (json.extensions) out.extensions = json.extensions;
  if (json.samplers) out.samplers = json.samplers;
  if (json.cameras) out.cameras = json.cameras;
  if (json.extras) out.extras = json.extras;
  // 图片去重
  const imgMap = new Map(), images = [], imgSeen = new Map();
  const imgIdx = (i) => {
    if (imgMap.has(i)) return imgMap.get(i);
    const im = json.images[i]; let r;
    if (im.bufferView != null) {
      const bv = json.bufferViews[im.bufferView]; const u8 = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
      const h = hashBytes(u8) + im.mimeType; const hit = (imgSeen.get(h) || []).find(x => eqBytes(x.u8, u8));
      if (hit) r = hit.i; else { const o = { bufferView: S.image(new Uint8Array(u8)), mimeType: im.mimeType }; if (im.name) o.name = im.name; images.push(o); r = images.length - 1; (imgSeen.get(h) || imgSeen.set(h, []).get(h)).push({ u8, i: r }); }
    } else { const k = 'uri:' + im.uri; if (imgSeen.has(k)) r = imgSeen.get(k); else { images.push(Object.assign({}, im)); r = images.length - 1; imgSeen.set(k, r); } }
    imgMap.set(i, r); return r;
  };
  const texMap = new Map(), textures = [], texSeen = new Map();
  const texIdx = (i) => {
    if (texMap.has(i)) return texMap.get(i);
    const t = Object.assign({}, json.textures[i]); if (t.source != null) t.source = imgIdx(t.source);
    const k = canon({ ...t, name: undefined }); let r = texSeen.get(k);
    if (r == null) { textures.push(t); r = textures.length - 1; texSeen.set(k, r); }
    texMap.set(i, r); return r;
  };
  const remapTex = (o) => { if (Array.isArray(o)) return o.map(remapTex); if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) { const v = o[k]; r[k] = (/Texture$/.test(k) && v && typeof v === 'object' && typeof v.index === 'number') ? Object.assign({}, remapTex(v), { index: texIdx(v.index) }) : remapTex(v); } return r; } return o; };
  // 材质去重（同名模板 + 同参数；受保护节点用到的材质不合并）
  const protMat = protMat0;
  const matMap = new Map(), materials = [], matSeen = new Map();
  const matIdx = (i) => {
    if (i == null) return undefined; if (matMap.has(i)) return matMap.get(i);
    const m = remapTex(json.materials[i]); const k = nameTpl(m.name) + '|' + canon({ ...m, name: undefined });
    let r = protMat.has(i) ? null : matSeen.get(k);
    if (r == null) { materials.push(m); r = materials.length - 1; if (!protMat.has(i)) matSeen.set(k, r); }
    matMap.set(i, r); return r;
  };
  // 网格（去重）
  const meshOut = [], meshSeen = new Map(), meshMap = new Map();
  const ARRT = { 5126: 'f', 5125: 'u', 5123: 'u', 5121: 'u', 5122: 'i', 5120: 'i' };
  const copyAcc = (i, target) => { const a = json.accessors[i]; const arr = readAcc(json, bin, i); const ex = {}; if (a.normalized) ex.normalized = true; return S.acc(arr, a.type, a.componentType, ex, target); };
  const primOut = (p) => {
    const o = { attributes: {} };
    for (const k of Object.keys(p.attributes)) o.attributes[k] = copyAcc(p.attributes[k], 34962);
    if (p.indices != null) o.indices = copyAcc(p.indices, 34963);
    if (p.material != null) o.material = matIdx(p.material);
    if (p.mode != null && p.mode !== 4) o.mode = p.mode;
    if (p.targets) o.targets = p.targets.map(t => { const r = {}; for (const k of Object.keys(t)) r[k] = copyAcc(t[k], 34962); return r; });
    if (p.extensions) o.extensions = p.extensions; if (p.extras) o.extras = p.extras;
    return o;
  };
  const meshIdx = (i) => {
    if (meshMap.has(i)) return meshMap.get(i);
    const m = meshes[i]; const o = { primitives: m.primitives.map(primOut) }; if (m.name) o.name = m.name; if (m.weights) o.weights = m.weights; if (m.extras) o.extras = m.extras;
    const k = canon({ ...o, name: undefined }); let r = meshSeen.get(k);
    if (r == null) { meshOut.push(o); r = meshOut.length - 1; meshSeen.set(k, r); }
    meshMap.set(i, r); return r;
  };
  // 合并静态网格
  const mergedNodeOut = [];
  for (const g of mergeOut) {
    const [parS, matS] = g.key.split('|'); const parI = Number(parS);
    const first = meshes[allNodes[g.list[0]].mesh].primitives[0];
    const keys = Object.keys(first.attributes);
    const cat = {}; keys.forEach(k => (cat[k] = [])); const idx = []; let vbase = 0;
    for (const i of g.list) {
      const n = allNodes[i], p = meshes[n.mesh].primitives[0];
      const M = trsMatrix(n), Nm = normalMatrix(M), flip = det3(M) < 0;
      let cnt = 0;
      for (const k of keys) {
        let arr = readAcc(json, bin, p.attributes[k]); const a = json.accessors[p.attributes[k]];
        if (k === 'POSITION') arr = xform(arr, 3, M, 1); else if (k === 'NORMAL') arr = xform(arr, 3, Nm, 0, true); else if (k === 'TANGENT') arr = xformTan(arr, M);
        cat[k].push(arr); cnt = a.count;
      }
      if (p.indices != null) { const ia = readAcc(json, bin, p.indices); for (let t = 0; t < ia.length; t += 3) { if (flip) idx.push(ia[t] + vbase, ia[t + 2] + vbase, ia[t + 1] + vbase); else idx.push(ia[t] + vbase, ia[t + 1] + vbase, ia[t + 2] + vbase); } }
      else for (let t = 0; t < cnt; t += 3) { if (flip) idx.push(t + vbase, t + 2 + vbase, t + 1 + vbase); else idx.push(t + vbase, t + 1 + vbase, t + 2 + vbase); }
      vbase += cnt;
    }
    const prim = { attributes: {} };
    for (const k of keys) { const a = json.accessors[first.attributes[k]]; const C = CT[a.componentType]; const tot = cat[k].reduce((s, x) => s + x.length, 0); const arr = new C(tot); let o = 0; for (const x of cat[k]) { arr.set(x, o); o += x.length; } prim.attributes[k] = S.acc(arr, a.type, a.componentType, a.normalized ? { normalized: true } : {}, 34962); }
    const IA = vbase > 65535 ? Uint32Array : Uint16Array; prim.indices = S.acc(IA.from(idx), 'SCALAR', vbase > 65535 ? 5125 : 5123, {}, 34963);
    if (first.material != null) prim.material = matIdx(first.material);
    const mname = (json.materials?.[first.material]?.name || 'mesh').replace(/^(pbr_|mat_)/, '');
    meshOut.push({ name: 'static_' + mname, primitives: [prim] });
    mergedNodeOut.push({ parent: parI, node: { name: (parI >= 0 ? allNodes[parI].name : 'scene') + '_static_' + mname, mesh: meshOut.length - 1 } });
  }
  // 节点重排
  const nodeMap = new Int32Array(NA).fill(-1), nodesOut = [];
  for (let i = 0; i < NA; i++) if (alive2[i]) { nodeMap[i] = nodesOut.length; nodesOut.push(null); }
  for (let i = 0; i < NA; i++) {
    if (!alive2[i]) continue; const n = allNodes[i]; const o = {};
    for (const k of Object.keys(n)) if (k !== 'children' && k !== 'mesh' && k !== 'matrix') o[k] = n[k];
    if (n.matrix) o.matrix = n.matrix;
    if (o.translation && o.translation.every(x => x === 0)) delete o.translation;
    if (o.rotation && o.rotation[0] === 0 && o.rotation[1] === 0 && o.rotation[2] === 0 && o.rotation[3] === 1) delete o.rotation;
    if (o.scale && o.scale.every(x => x === 1)) delete o.scale;
    if (n.mesh != null) o.mesh = meshIdx(n.mesh);
    const kids = (n.children || []).filter(c => alive2[c]).map(c => nodeMap[c]); if (kids.length) o.children = kids;
    nodesOut[nodeMap[i]] = o;
  }
  const sceneRootsExtra = [];
  for (const m of mergedNodeOut) { nodesOut.push(m.node); const id = nodesOut.length - 1; if (m.parent >= 0 && nodeMap[m.parent] >= 0) (nodesOut[nodeMap[m.parent]].children = nodesOut[nodeMap[m.parent]].children || []).push(id); else sceneRootsExtra.push(id); }
  out.scenes = (json.scenes || [{ nodes: [] }]).map((s, si) => { const r = Object.assign({}, s, { nodes: s.nodes.filter(i => alive2[i]).map(i => nodeMap[i]) }); if (si === (json.scene ?? 0)) r.nodes.push(...sceneRootsExtra); return r; });
  out.nodes = nodesOut;
  if (meshOut.length) out.meshes = meshOut;
  if (materials.length) out.materials = materials;
  if (textures.length) out.textures = textures;
  if (images.length) out.images = images;
  // 动画
  const animOut = [];
  (json.animations || []).forEach((a, ai) => {
    const A = anims[ai]; const samplers = [], channels = [];
    let maxT = 0;
    for (const c of A) {
      if (!alive2[c.node] || nodeMap[c.node] < 0) continue;
      const inp = S.acc(c.T, 'SCALAR', 5126, {});
      const outp = S.acc(c.V, c.path === 'rotation' ? 'VEC4' : c.path === 'weights' ? 'SCALAR' : 'VEC3', 5126, {});
      samplers.push({ input: inp, output: outp, interpolation: c.interp }); channels.push({ sampler: samplers.length - 1, target: { node: nodeMap[c.node], path: c.path } });
      maxT = Math.max(maxT, c.T[c.T.length - 1]);
    }
    // 保持时长：所有轨道都被写回静态后，补一条两帧的恒定轨道
    if (dur > 0 && maxT < dur - 1e-4) {
      const ni = out.scenes[out.scene ?? 0].nodes[0];
      if (ni != null) { const t = nodesOut[ni].translation || [0, 0, 0]; const inp = S.acc(Float32Array.from([0, dur]), 'SCALAR', 5126, {}); const outp = S.acc(Float32Array.from([...t, ...t]), 'VEC3', 5126, {}); samplers.push({ input: inp, output: outp, interpolation: 'LINEAR' }); channels.push({ sampler: samplers.length - 1, target: { node: ni, path: 'translation' } }); }
    }
    if (channels.length) { const o = { channels, samplers }; if (a.name) o.name = a.name; animOut.push(o); }
  });
  if (animOut.length) out.animations = animOut;
  out.accessors = S.accs; out.bufferViews = S.views;
  const binOut = S.bin(); out.buffers = [{ byteLength: binOut.length }];
  // 未用到的扩展声明去掉（KHR_lights_punctual / 材质扩展等仍按实际使用）
  const used = new Set(); const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.extensions) Object.keys(o.extensions).forEach(k => used.add(k)); Object.values(o).forEach(walk); } };
  walk({ n: out.nodes, m: out.materials, t: out.textures, me: out.meshes, x: out.extensions });
  if (out.extensionsUsed) { out.extensionsUsed = out.extensionsUsed.filter(e => used.has(e)); if (!out.extensionsUsed.length) delete out.extensionsUsed; }
  if (out.extensionsRequired) { out.extensionsRequired = out.extensionsRequired.filter(e => used.has(e)); if (!out.extensionsRequired.length) delete out.extensionsRequired; }
  const glb = writeGLB(out, binOut);
  if (opacity) { const o2 = {}; for (const k of Object.keys(opacity)) if (!opRemoved.has(k)) o2[k] = opacity[k]; Object.assign(o2, opAdded); stats.opacity = o2; stats.opacityPooled = Object.keys(opAdded).length; stats.poolVis = poolVis; }
  stats.after = summary(out); stats.ms = Date.now() - t0; stats.bytes = { before: u8in.byteLength, after: glb.byteLength };
  return { glb, stats };
}

function poolName(name, cnt) {
  const s = String(name || 'node'), t = nameTpl(s), si = cnt.get(t) || 0; cnt.set(t, si + 1); const tag = 'p' + String(si).padStart(3, '0');
  return /\d+/.test(s) ? s.replace(/\d+/, tag) : s + '_' + tag;
}
function summary(j) {
  let keys = 0; const ch = (j.animations || []).reduce((s, a) => s + a.channels.length, 0);
  for (const a of j.animations || []) for (const s of a.samplers) keys += j.accessors[s.input].count;
  return { nodes: (j.nodes || []).length, meshes: (j.meshes || []).length, materials: (j.materials || []).length, textures: (j.textures || []).length, images: (j.images || []).length, channels: ch, keys };
}
function guessFps(json, bin) {
  const a = json.animations?.[0]; if (!a) return 0; const cnt = new Map();
  for (const s of a.samplers.slice(0, 200)) { const T = readAcc(json, bin, s.input); for (let k = 1; k < Math.min(T.length, 50); k++) { const d = T[k] - T[k - 1]; if (d > 1e-4) { const f = Math.round(1 / d); cnt.set(f, (cnt.get(f) || 0) + 1); } } }
  let best = 0, bc = 0; for (const [f, c] of cnt) if (c > bc && f >= 10 && f <= 120) { best = f; bc = c; } return best;
}
// 矩阵（列主序 4x4）
function trsMatrix(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation || [0, 0, 0], [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1];
  const x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0, (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0, (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0, tx, ty, tz, 1];
}
function det3(m) { return m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]); }
function normalMatrix(m) { // 逆转置 3x3（放在 4x4 里）
  const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, D = -(b * i - c * h), E = a * i - c * g, F = -(a * h - b * g), G = b * f - c * e, H = -(a * f - c * d), I = a * e - b * d;
  const det = a * A + b * B + c * C || 1;
  return [A / det, B / det, C / det, 0, D / det, E / det, F / det, 0, G / det, H / det, I / det, 0, 0, 0, 0, 1];
}
function xform(arr, n, M, w, norm) {
  const out = new Float32Array(arr.length);
  for (let k = 0; k < arr.length; k += n) {
    const x = arr[k], y = arr[k + 1], z = arr[k + 2];
    let X = M[0] * x + M[4] * y + M[8] * z + w * M[12], Y = M[1] * x + M[5] * y + M[9] * z + w * M[13], Z = M[2] * x + M[6] * y + M[10] * z + w * M[14];
    if (norm) { const l = Math.hypot(X, Y, Z) || 1; X /= l; Y /= l; Z /= l; }
    out[k] = X; out[k + 1] = Y; out[k + 2] = Z;
  }
  return out;
}
function xformTan(arr, M) { const out = new Float32Array(arr.length); for (let k = 0; k < arr.length; k += 4) { const x = arr[k], y = arr[k + 1], z = arr[k + 2]; let X = M[0] * x + M[4] * y + M[8] * z, Y = M[1] * x + M[5] * y + M[9] * z, Z = M[2] * x + M[6] * y + M[10] * z; const l = Math.hypot(X, Y, Z) || 1; out[k] = X / l; out[k + 1] = Y / l; out[k + 2] = Z / l; out[k + 3] = arr[k + 3] * (det3(M) < 0 ? -1 : 1); } return out; }

// 工具侧统一入口：控制台「引擎精简导出」（S.export3dLite，默认开）。失败时自动退回原始 glb，导出不会因此中断。
export function ueOptimizeExport(glb, S, { fps, opacity, keep, nodes } = {}) {
  const raw = glb instanceof Uint8Array ? glb : new Uint8Array(glb);
  if (S && S.export3dLite === false) return { glb: raw, opacity, stats: { enabled: false } };
  try {
    const nodeTimes = {}; if (Array.isArray(nodes)) for (const n of nodes) if (n && n.name && n.in != null && n.out != null) nodeTimes[n.name] = [+n.in, +n.out];
    const r = optimizeGLB(raw, { fps: +fps || undefined, opacity: opacity && Object.keys(opacity).length ? opacity : null, keep, nodeTimes });
    const st = r.stats; if (st.skipped) return { glb: raw, opacity, stats: { enabled: true, skipped: st.skipped } };
    return { glb: r.glb, opacity: st.opacity || opacity, poolVis: st.poolVis || {}, stats: { enabled: true, version: st.version, before: st.before, after: st.after, steps: st.steps, bytes: st.bytes, ms: st.ms } };
  } catch (e) {
    try { console.warn('[3D 精简] 失败，改用原始导出：', e); } catch (_) {}
    return { glb: raw, opacity, stats: { enabled: true, error: String((e && e.message) || e) } };
  }
}

// 测试用：解析 / 取值工具
export const _internals = { parseGLB, readAcc, evalCh, trsMatrix, hashBytes, canon, PATH_N };
