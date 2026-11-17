// Generic 3D export from an AE timeline (glTF 2.0 .glb + scene3d.json + Blender script + audio).
// Used by tools whose scene is authored as AE layers (arrow-escape, pin-rescue, and similar).
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { ueOptimizeExport } from './ue-optimize.js';
import { makeZip } from '../ae/zip.js';
import PY_TEXT from './blender_import.py';
import README_TEXT from './README_3D.md';

const PX = 0.01;
const r5 = x => Math.round(x * 1e5) / 1e5;
const isKF = p => p && typeof p === 'object' && Array.isArray(p.t) && Array.isArray(p.v);
function atProp(p, t, fallback) {
  if (p == null) return fallback;
  if (!isKF(p)) return p;
  const ts = p.t, vs = p.v;
  if (!ts.length) return fallback;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[ts.length - 1]) return vs[vs.length - 1];
  let j = 0; while (j < ts.length - 2 && ts[j + 1] <= t) j++;
  const t0 = ts[j], t1 = ts[j + 1], a = vs[j], b = vs[j + 1], u = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
  if (p.hold) return a;
  if (Array.isArray(a)) return a.map((x, i) => x + (b[i] - x) * u);
  if (typeof a === 'number') return a + (b - a) * u;
  return a;
}
function pngToImage(bytes) {
  return new Promise((res, rej) => {
    const blob = new Blob([bytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = e => { URL.revokeObjectURL(url); rej(e); };
    im.src = url;
  });
}
function solidTex(rgb, w = 8, h = 8) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = `rgb(${(rgb||[200,200,200]).map(x=>x|0).join(',')})`; g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}


function glbStripEmptyAnimations(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (u8.length < 20) return u8;
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== 0x46546C67) return u8;
  const jsonLen = dv.getUint32(12, true);
  const jsonType = dv.getUint32(16, true);
  if (jsonType !== 0x4E4F534A) return u8;
  const jsonStart = 20, jsonBytes = u8.subarray(jsonStart, jsonStart + jsonLen);
  let obj; try { obj = JSON.parse(new TextDecoder().decode(jsonBytes)); } catch (e) { return u8; }
  if (!obj.animations || obj.animations.length) return u8;
  delete obj.animations;
  const json = new TextEncoder().encode(JSON.stringify(obj));
  const pad = (4 - (json.length % 4)) % 4;
  const jsonChunkLen = json.length + pad;
  const rest = u8.subarray(jsonStart + jsonLen);
  const out = new Uint8Array(12 + 8 + jsonChunkLen + rest.length);
  const w = new DataView(out.buffer);
  w.setUint32(0, 0x46546C67, true);
  w.setUint32(4, 2, true);
  w.setUint32(8, out.length, true);
  w.setUint32(12, jsonChunkLen, true);
  w.setUint32(16, 0x4E4F534A, true);
  out.set(json, 20);
  for (let i = 0; i < pad; i++) out[20 + json.length + i] = 0x20;
  out.set(rest, 20 + jsonChunkLen);
  return out;
}

export async function export3D({ S, ae, toolId = 'tool' }) {
  if (!ae || !ae.timeline) throw new Error('没有可用的 AE 记录（请先「开始记录」再通关或游玩）');
  const tl = ae.timeline, meta = tl.meta || {}, fps = +S.export3dFps || +meta.fps || 30;
  const W = +meta.width || 720, H = +meta.height || 1280, D = Math.max(1 / fps, +meta.duration || 1);
  const NF = Math.max(1, Math.round(D * fps));
  const times = []; for (let f = 0; f <= NF; f++) times.push(r5(f / fps));
  const main = (tl.comps || []).find(c => c.id === 'main' || c.id === tl.mainComp) || (tl.comps || [])[0];
  if (!main) throw new Error('AE 时间轴缺少主合成');
  const layers = (main.layers || []).filter(l => l && l.src && !l.src.comp && !(l.src.asset && String(l.src.asset).startsWith('sfx')) && !(l.src.asset === 'mix'));
  const files = new Map((ae.fileList || []).map(f => [f.name, f.data]));
  const assetById = new Map((tl.assets || []).map(a => [a.id, a]));
  const imgCache = new Map();
  async function texOf(assetId) {
    if (imgCache.has(assetId)) return imgCache.get(assetId);
    const a = assetById.get(assetId);
    const data = a && files.get(a.file);
    if (!data) return null;
    try {
      const im = await pngToImage(data);
      const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.flipY = true; t.needsUpdate = true;
      imgCache.set(assetId, { tex: t, w: a.w || im.width, h: a.h || im.height });
      return imgCache.get(assetId);
    } catch (e) { return null; }
  }

  const root = new THREE.Group(); root.name = (toolId || 'tool').replace(/[^a-z0-9_]+/gi, '_') + '_root';
  root.scale.setScalar(PX); root.rotation.x = -Math.PI / 2;
  const tracks = [], nodes = [];
  const used = { planes: 0, shapes: 0, solids: 0 };
  let z = 0;

  function addTracks(name, mesh, samples) {
    const P = [], Q = [], SC = [];
    const qq = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
    let anyOp = false, anySc = false;
    for (const s of samples) {
      P.push(s.x, -s.y, s.z || 0);
      qq.setFromAxisAngle(Z, -(s.rot || 0) * Math.PI / 180);
      Q.push(qq.x, qq.y, qq.z, qq.w);
      if (Math.abs(s.sx - samples[0].sx) > 1e-6 || Math.abs(s.sy - samples[0].sy) > 1e-6) anySc = true;
      if (Math.abs(s.op - samples[0].op) > 1e-6) anyOp = true;
    }
    // Bake opacity into scale: r160 GLTFExporter drops the whole clip if any track
    // uses an unsupported path such as material.opacity (PATH_PROPERTIES is TRS-only).
    for (const s of samples) {
      const k = anyOp ? s.op : 1;
      SC.push(s.sx * k, s.sy * k, k);
    }
    tracks.push(new THREE.VectorKeyframeTrack(name + '.position', times, P));
    tracks.push(new THREE.QuaternionKeyframeTrack(name + '.quaternion', times, Q));
    if (anySc || anyOp) tracks.push(new THREE.VectorKeyframeTrack(name + '.scale', times, SC));
    else mesh.scale.set(samples[0].sx, samples[0].sy, 1);
    if (mesh.material) { mesh.material.transparent = true; mesh.material.opacity = 1; }
    mesh.position.set(samples[0].x, -samples[0].y, samples[0].z || 0);
  }

  function sampleLayer(l) {
    const tr = l.tr || {}, inT = l.in != null ? +l.in : 0, outT = l.out != null ? +l.out : D + 1;
    return times.map(t => {
      const on = t >= inT - 1e-6 && t <= outT + 1e-6;
      const pos = atProp(tr.position, t, tr.position || [W / 2, H / 2]);
      const sc = atProp(tr.scale, t, tr.scale || [100, 100]);
      const rot = atProp(tr.rotation, t, tr.rotation || 0);
      const op = atProp(tr.opacity, t, tr.opacity != null ? tr.opacity : 100);
      const sx = Array.isArray(sc) ? sc[0] / 100 : sc / 100, sy = Array.isArray(sc) ? sc[1] / 100 : sc / 100;
      return { t, x: +pos[0] || 0, y: +pos[1] || 0, rot: +rot || 0, sx: on ? sx : 0, sy: on ? sy : 0, op: on ? Math.max(0, Math.min(1, (+op || 0) / 100)) : 0 };
    });
  }

  // background first
  {
    const bgCol = main.bg || [0, 0, 0];
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: new THREE.Color(bgCol[0] / 255, bgCol[1] / 255, bgCol[2] / 255), name: 'mat_bg' }));
    mesh.name = 'background'; mesh.position.set(W / 2, -H / 2, -2); root.add(mesh); used.solids++;
  }

  for (const l of layers) {
    if (l.src && l.src.nul) continue; // camera null — applied as group? skip, camera is ortho full-frame
    if (l.src && l.src.asset === 'mix') continue;
    const name = String(l.name || l.id || 'layer').replace(/[^\w\u4e00-\u9fff]+/g, '_').slice(0, 60) || 'layer';
    // unique
    let nm = name, n = 2; while (root.getObjectByName(nm)) nm = name + '_' + (n++);
    const samples = sampleLayer(l);
    let mesh = null, kind = 'plane';
    if (l.src.asset) {
      const tex = await texOf(l.src.asset);
      const w = tex ? tex.w : 64, h = tex ? tex.h : 64;
      const mat = new THREE.MeshBasicMaterial({ map: tex ? tex.tex : null, transparent: true, depthWrite: false, name: 'mat_' + nm });
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      // anchor: default center; if tr.anchor, offset geometry
      const anc = l.tr && l.tr.anchor; if (Array.isArray(anc)) mesh.geometry.translate(w / 2 - anc[0], anc[1] - h / 2, 0);
      used.planes++; kind = 'sprite';
    } else if (l.src.solid) {
      const w = l.src.w || W, h = l.src.h || H;
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: solidTex(l.src.solid), transparent: true, depthWrite: false, name: 'mat_' + nm }));
      const anc = l.tr && l.tr.anchor; if (Array.isArray(anc)) mesh.geometry.translate(w / 2 - anc[0], anc[1] - h / 2, 0);
      used.solids++; kind = 'solid';
    } else if (l.src.shape) {
      const sh = l.src.shape;
      let geo;
      if (sh.kind === 'tri' && Array.isArray(sh.verts) && sh.verts.length >= 3) {
        const s = new THREE.Shape(); s.moveTo(sh.verts[0][0], -sh.verts[0][1]); for (let i = 1; i < sh.verts.length; i++) s.lineTo(sh.verts[i][0], -sh.verts[i][1]); s.closePath();
        geo = new THREE.ShapeGeometry(s);
      } else if (sh.kind === 'ellipse') {
        const sz = +sh.size || 20; geo = new THREE.CircleGeometry(sz / 2, 24);
      } else if (sh.kind === 'path' && Array.isArray(sh.verts) && sh.verts.length >= 2) {
        const pts = sh.verts.map(v => new THREE.Vector3(v[0], -v[1], 0));
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0);
        const w = (sh.strokes && sh.strokes[0] && sh.strokes[0].width) || 8;
        geo = new THREE.TubeGeometry(curve, Math.max(8, pts.length * 4), Math.max(1, w / 2), 6, false);
      } else {
        geo = new THREE.PlaneGeometry(20, 20);
      }
      const col = sh.color && !isKF(sh.color) ? sh.color : (sh.fill || [200, 200, 200]);
      const c = Array.isArray(col) ? col : [200, 200, 200];
      mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color((c[0] || 0) / 255, (c[1] || 0) / 255, (c[2] || 0) / 255), transparent: true, depthWrite: false, side: THREE.DoubleSide, name: 'mat_' + nm }));
      used.shapes++; kind = 'shape';
    } else continue;
    mesh.name = nm;
    z += 0.05;
    for (const s of samples) s.z = z;
    addTracks(nm, mesh, samples);
    root.add(mesh);
    nodes.push({ name: nm, kind, in: l.in || 0, out: l.out != null ? l.out : D });
  }

  const cam = new THREE.OrthographicCamera(-W / 2 * PX, W / 2 * PX, H / 2 * PX, -H / 2 * PX, 0.01, 50);
  cam.name = 'camera_ortho'; cam.position.set(W / 2 * PX, 8, H / 2 * PX); cam.lookAt(W / 2 * PX, 0, H / 2 * PX);

  const scene = new THREE.Scene(); scene.name = 'scene'; scene.add(root); scene.add(cam);
  const expOpts = { binary: true };
  if (tracks.length) expOpts.animations = [new THREE.AnimationClip('ae_timeline', D, tracks)];
  const glb0 = await new Promise((res, rej) => {
    new GLTFExporter().parse(scene, out => res(out), rej, expOpts);
  });
  const glb1 = glbStripEmptyAnimations(glb0);
  const UEO = ueOptimizeExport(glb1, S, { fps, opacity: null }); // 引擎精简导出（控制台可关）
  const glb = UEO.glb;
  const stamp = (ae.name && (ae.name.match(/(\d{8}_\d{6})/) || [])[1]) || (() => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; })();
  const audio = (ae.fileList || []).filter(f => f.name.startsWith('audio/'));
  const scene3d = {
    tool: toolId, fps, width: W, height: H, duration: D, frameEnd: NF,
    units: { px: PX, note: 'root scale 0.01, rot X -90deg' },
    camera: { name: cam.name, type: 'orthographic', orthoScale: r5(Math.max(W, H) * PX), widthM: r5(W * PX), heightM: r5(H * PX) },
    stats: { nodes: nodes.length, tracks: tracks.length, ...used },
    optimize: UEO.stats,
    nodes, audio: audio.map(a => ({ file: a.file || a.name, t: 0, name: a.name })),
  };
  const enc = new TextEncoder();
  const out = [
    { name: 'scene.glb', data: new Uint8Array(glb) },
    { name: 'scene3d.json', data: enc.encode(JSON.stringify(scene3d)) },
    { name: 'timeline.json', data: enc.encode(JSON.stringify(tl)) },
    { name: 'blender_import.py', data: enc.encode(PY_TEXT) },
    { name: 'README_3D.md', data: enc.encode(README_TEXT) },
    ...audio,
  ];
  const id = String(toolId || meta.tool || 'tool').replace(/[^a-z0-9_-]+/gi, '_');
  return { blob: makeZip(out), name: `${id}_3d_export_${stamp}.zip`, stats: scene3d.stats, duration: D, fps, glbSize: glb.byteLength, files: out.map(f => f.name) };
}
