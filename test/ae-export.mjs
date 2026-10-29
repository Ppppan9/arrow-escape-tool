// 自动通关（参考序列前 12 秒，含 2 次被挡与 1 次平移）记录 AE 时间轴 → 导出 zip → 检查结构 → 用 Node 模拟 AE 跑 jsx
import { openPage, ok } from './lib.mjs';
import { runJsxMock } from './ae-mock.mjs';
import fs from 'fs'; import { execSync } from 'child_process';
const SECS = +(process.argv[2] || 12);
const { b, p, errs } = await openPage();
const info = await p.evaluate(async secs => { try {
  localStorage.clear(); __game.setMany({}); let t = window.__T; __game.renderAt(t); __game.aeStart(); __game.startAuto();
  for (let f = 0; f < secs * 30; f++) { t += 1000 / 30; __game.renderAt(t); } window.__T = t;
  __game.aeStop(); const r = await __game.doExportAE(false);
  const enc = async blob => { const buf = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(bin); };
  const L = r.timeline.comps.find(c => c.id === 'main').layers;
  const l1 = L.find(l => l.name.startsWith('线_002')), l12 = L.find(l => l.name.startsWith('线_012_')), cam = L.find(l => l.src.nul);
  return { zip: await enc(r.blob), name: r.name, stats: r.stats, files: r.fileList.map(x => x.name), duration: r.timeline.meta.duration, names: L.map(l => l.name), l1: { out: l1.out, ts: l1.src.shape.trimStart.t && l1.src.shape.trimStart.t.length, te: l1.src.shape.trimEnd.t && l1.src.shape.trimEnd.t.length, parent: l1.parent }, l12: { out: l12.out, col: l12.src.shape.color, ts: l12.src.shape.trimStart.t && l12.src.shape.trimStart.v }, cam: { pos: cam.tr.position.t && cam.tr.position.t.length, sc: cam.tr.scale.v && cam.tr.scale.v.slice(-1) } };
} catch (e) { return { err: e.stack }; } }, SECS);
if (info.err) { console.log(info.err); process.exit(1); }
fs.mkdirSync('screenshots', { recursive: true });
const zipPath = 'screenshots/arrow_escape_ae_sample.zip'; fs.writeFileSync(zipPath, Buffer.from(info.zip, 'base64'));
console.log(JSON.stringify({ name: info.name, duration: info.duration, stats: info.stats, files: info.files.length }));
for (const n of ['build_ae_project.jsx', 'timeline.json', 'README_AE.md', 'audio/mix.wav', 'assets/dots.png', 'assets/hand.png', 'assets/disclaimer.png', 'assets/vignette.png']) ok(info.files.includes(n), 'zip 含 ' + n);
ok(info.stats.lines === 200 && info.names.filter(n => n.endsWith('_箭头')).length === 200, '200 条线各自一个形状图层 + 200 个箭头图层');
ok(info.l1.out < info.duration && info.l1.te > 2 && info.l1.parent === 'cam', `已挪走的线 2：修剪路径关键帧 ${info.l1.ts}/${info.l1.te}，出点 ${info.l1.out}s，父级 = 镜头`);
ok(info.l12.col && info.l12.col.hold && info.l12.col.t.length >= 2 && info.l12.out >= info.duration - 0.05, `被挡的线 12：颜色定格关键帧 ${JSON.stringify(info.l12.col).slice(0, 120)}，冲撞修剪关键帧 ${JSON.stringify(info.l12.ts).slice(0, 80)}`);
ok(info.cam.pos >= 3 && Math.abs(info.cam.sc[0][0] - 164.7) < 1, `镜头空对象：位置关键帧 ${info.cam.pos}，缩放 ${info.cam.sc}`);
ok(info.names.some(n => n.startsWith('点击波纹')) && info.names.includes('手指') && info.names.includes('被挡边框红光') && info.names.includes('混合音轨'), '波纹 / 手指 / 边框红光 / 音频图层');
// Node 模拟 AE 运行 jsx
const dir = '/tmp/ae_unzip'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir); execSync(`cd ${dir} && unzip -q ${process.cwd()}/${zipPath}`);
const m = runJsxMock(dir), main = m.log.comps.find(c => c.name === '主合成_箭头挪出');
const shapes = main.list.filter(l => l.kind === 'shape'), parented = main.list.filter(l => l.parent && l.parent.kind === 'null');
const trim = shapes.map(l => l.property('ADBE Root Vectors Group').kids[0]?.property('ADBE Vectors Group').kids.find(k => k.name === 'ADBE Vector Filter - Trim')).filter(Boolean);
console.log('jsx mock:', JSON.stringify(m.stats), 'alerts:', m.log.alerts.map(a => a.slice(0, 160)));
ok(m.stats && m.stats.layers === info.stats.layers, `jsx 在模拟 AE 中跑完：${m.stats && m.stats.layers} 图层 / ${m.stats && m.stats.keys} 关键帧`);
ok(!/警告|缺少/.test(m.log.alerts.join('')), 'jsx 无警告、无缺失素材');
ok(trim.length === 200 && trim.some(t => t.property('ADBE Vector Trim End').keys.length > 2), `200 个修剪路径（有关键帧）`);
ok(parented.length >= 401, `线/箭头/点阵父级到镜头空对象：${parented.length}`);
ok(errs.length === 0, '无页面错误 ' + errs.slice(0, 3).join(' | '));
await b.close();
