// 综合测试：加载 / 被挡点击 / 随机顺序手动清空（真实鼠标点击）/ 自动通关（参考序列 + 求解）/ 纯求解 / 胜利页 / 编辑器 / 设置导入导出 / 换一局
import { openPage, advance, shot, ok } from './lib.mjs';
import fs from 'fs';
const { b, p, errs } = await openPage();
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { localStorage.clear(); __game.setMany({}); });
let r = await ev(() => ({ n: __game.G.lines.length, solv: __game.solveLevel(__game.level).solvable, hand: __game.S.handStyle, img: !!__game.hand.img, src: (__game.hand.img && __game.hand.img.src || '').slice(0, 22), h5a: __game.S.h5AutoPlay, ver: __game.APP_VERSION }));
ok(r.n === 200 && r.solv, `参考关卡 200 条线且可解 (${JSON.stringify(r)})`);
ok(r.hand === 'preset' && r.src.startsWith('data:image/png'), '默认手指 = 预设 hand.png');
ok(r.h5a === false, 'H5 自动演示默认关闭');

// ---- 被挡点击：线 11（参考 4.4 秒被挡）----
await ev(() => { __game.newGame(); }); await advance(p, 2);
r = await ev(() => { const g = __game, l = g.G.lines[11], q = l.p[1]; const res = g.tapDesign(...g.cellToDesign(q[0], q[1])); return { res, st: l.state, marked: l.marked, occ: g.G.lines.filter(x => x.state === 'idle').length }; });
ok(r.res && r.res.ok === false && r.st === 'bump' && r.marked, `点被挡的线 → 冲撞（${JSON.stringify(r)}）`);
await advance(p, 0.25);
r = await ev(() => { const g = __game.G, l = g.lines[11]; return { st: l.state, ph: l.phase, flash: g.lines[l.blocker].flashT != null }; });
ok(r.flash, `挡路线闪白 (${JSON.stringify(r)})`);
await advance(p, 0.6);
r = await ev(() => { const l = __game.G.lines[11]; return { st: l.state, s: l.s, marked: l.marked, col: __game.frameState().lines[11].col }; });
ok(r.st === 'idle' && r.s === 0 && r.marked && r.col.toLowerCase() === '#eefcf9' || r.col.toLowerCase() === '#ffffff', `退回原位并保持白色 (${JSON.stringify(r)})`);

// ---- 手动随机顺序清空：全景镜头，真实鼠标点击 ----
await ev(() => { __game.setMany({ camMode: 'fit', sfxMute: true }); });
await advance(p, 0.5);
const box = await p.locator('#stage').boundingBox();
let taps = 0, blocked = 0, real = 0, guard = 0;
while (guard++ < 2000) {
  const st = await ev(() => { const g = __game; const idle = g.G.idleIds(); if (!idle.length) return null; const fr = g.G.freeIds(), pool = Math.random() < 0.15 || !fr.length ? idle : fr, id = pool[Math.floor(Math.random() * pool.length)], l = g.G.lines[id], q = l.p[Math.floor(Math.random() * l.p.length)]; const [dx, dy] = g.cellToDesign(q[0], q[1]); const v = g.view, S = g.S, K = Math.min(S.canvasW / 720, S.canvasH / 1280); return { id, x: (dx - v.x0) * K / S.canvasW, y: (dy - v.y0) * K / S.canvasH, free: g.G.free(id) }; });
  if (!st) { const w = await advance(p, 2); if (w.left === 0) break; continue; }
  const before = await ev(() => __game.G.lines.map(l => l.state).join());
  await p.mouse.click(box.x + st.x * box.width, box.y + st.y * box.height); real++;
  await advance(p, 0.05);
  const after = await ev(id => __game.G.lines[id].state, st.id);
  taps++; if (!st.free) { blocked++; if (after !== 'bump') { ok(false, `被挡线点击后应冲撞, 实际 ${after}`); break; } } else if (after !== 'out' && after !== 'gone') { ok(false, `可走线点击后应滑出, 实际 ${after} (line ${st.id})`); break; }
  await advance(p, st.free ? 0.02 : 0.6);
}
await advance(p, 3);
r = await ev(() => ({ left: __game.G.lines.filter(l => l.state !== 'gone').length, win: __game.G.winT, fin: window.__finished }));
ok(r.left === 0 && r.win != null && r.fin, `随机顺序手动清空（${taps} 次真实点击，其中 ${blocked} 次被挡）→ 胜利`);
await shot(p, 'screenshots/test_manual_win.png');

// ---- 自动通关：参考序列 + 求解 ----
await ev(() => { __game.setMany({ camMode: 'ref', sfxMute: true }); __game.startAuto(); });
let w; for (let i = 0; i < 40; i++) { w = await advance(p, 10); if (w.win != null) break; }
r = await ev(() => ({ bl: __game.auto && __game.auto.blocked, taps: __game.auto && __game.auto.taps, refIdx: __game.auto && __game.auto.refIdx }));
ok(w.win != null && w.left === 0, `自动通关（参考序列）到胜利，用时 ${w.win && w.win.toFixed(1)}s，点击 ${r.taps} 次，被挡 ${r.bl} 次`);
ok(r.bl === 5 && r.refIdx === 27, '参考序列里的 5 次被挡全部复现（4.4/10.95/20.62/40.22/42.38 秒）');
await advance(p, 2.5); await shot(p, 'screenshots/test_win_screen.png');
r = await ev(() => __game.frameState().win); ok(r > 1, '胜利页显示');

// ---- 纯求解（不按参考顺序，0 次被挡）----
await ev(() => { __game.setMany({ autoMode: 'solver', autoSpeed: 3 }); __game.startAuto(); });
for (let i = 0; i < 40; i++) { w = await advance(p, 10); if (w.win != null) break; }
r = await ev(() => __game.auto && __game.auto.blocked);
ok(w.win != null && r === 0, `纯求解模式通关，被挡 ${r} 次`);
await ev(() => { __game.setMany({ autoMode: 'solverMiss', autoSpeed: 3, missChance: 0.3 }); __game.startAuto(); });
for (let i = 0; i < 60; i++) { w = await advance(p, 10); if (w.win != null) break; }
r = await ev(() => __game.auto && __game.auto.blocked);
ok(w.win != null && r > 0, `求解 + 偶尔点错模式通关，被挡 ${r} 次`);

// ---- 编辑器 ----
await ev(() => { __game.setMany({ autoMode: 'ref', autoSpeed: 1 }); __game.openEditor(); });
r = await ev(() => { const g = __game, e = g.editor; e.lines = []; e.cols = 6; e.rows = 6; const D = (c, r) => g.cellToDesign(c, r);
  // 画两条线：第一条 (0,0)->(3,0) 向右；第二条 (4,1)->(4,0)? 用 editorDown/Move/Up
  g.editorDown(...D(0, 2)); g.editorMove(...D(1, 2)); g.editorMove(...D(2, 2)); g.editorUp();
  g.editorDown(...D(3, 2)); g.editorMove(...D(3, 3)); g.editorMove(...D(3, 4)); g.editorUp();
  // 第三条指向第一条：(2,4)->(2,3) 向上，挡在线 1 下面？线1 在行2 → 向上撞到 (2,2) → 被挡但可解
  g.editorDown(...D(2, 4)); g.editorMove(...D(2, 3)); g.editorUp();
  return { n: e.lines.length, info: document.getElementById('edInfo').textContent };
});
ok(r.n === 3 && r.info.includes('可全部挪出'), `编辑器画线 + 可解检查（${r.info}）`);
// 一行里两条面对面的线 → 互相卡死
await ev(() => { const g = __game, D = (c, r) => g.cellToDesign(c, r); g.editorDown(...D(0, 0)); g.editorMove(...D(1, 0)); g.editorUp(); g.editorDown(...D(4, 0)); g.editorMove(...D(3, 0)); g.editorUp(); });
r = await ev(() => document.getElementById('edInfo').textContent);
ok(r.includes('不可解'), `面对面的两条线 → 检查出不可解（${r}）`);
await ev(() => { document.querySelector('#edTools button[data-t=reverse]').click(); const g = __game; g.editorDown(...g.cellToDesign(4, 0)); g.editorUp(); });
r = await ev(() => document.getElementById('edInfo').textContent);
ok(r.includes('可全部挪出'), `反向其中一条 → 可解（${r}）`);
await ev(() => __game.closeEditor(true));
r = await ev(() => ({ lj: JSON.parse(__game.S.levelJson).lines.length, n: __game.G.lines.length, solv: __game.G.solvable }));
ok(r.lj === 5 && r.n === 5 && r.solv, '编辑器保存为关卡 JSON 并可玩');
await ev(() => __game.levelRef()); r = await ev(() => __game.G.lines.length); ok(r === 200, '恢复参考关卡');

// ---- 设置导出 / 导入（含旧版本迁移）----
r = await ev(() => { const m = __game.migrate({ version: 0, settings: { handImg: 'data:x', sfxVol: 0.3, lineWidth: 0.4 } }); return { h: m.handImage, v: m.sfxVolume, lw: m.lineWidth, keys: Object.keys(m).length }; });
ok(r.h === 'data:x' && r.v === 0.3 && r.lw === 0.4, `migrate 旧设置 (${JSON.stringify(r)})`);
r = await ev(() => { const g = __game; g.set('lineWidth', 0.45); const st = JSON.parse(localStorage.getItem('arrowEscapeTool.settings')); return st.version >= 1 && st.settings.lineWidth === 0.45; });
ok(r, '设置持久化到 localStorage（带版本号）');
// ---- 换一局 ----
r = await ev(() => { document.getElementById('btnRandom').click(); return { n: __game.G.lines.length, s: __game.G.solvable }; });
ok(r.n > 10 && r.s, `🎲 换一局：随机关卡 ${r.n} 条线且可解`);
await ev(() => { localStorage.clear(); __game.setMany({}); __game.levelRef(); });
ok(errs.length === 0, '无页面错误 ' + errs.slice(0, 3).join(' | '));
await b.close();
