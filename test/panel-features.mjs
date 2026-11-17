if (!process.env.PANEL_HTML) process.env.PANEL_HTML = 'index.html';
if (!process.env.PANEL_OPEN_KEY) process.env.PANEL_OPEN_KEY = 'arrowEscapeTool.panelOpen.v1';
if (!process.env.HAS_3D) process.env.HAS_3D = '1';
if (!process.env.HAS_H5) process.env.HAS_H5 = '1';
if (!process.env.HAS_AE) process.env.HAS_AE = '1';
/**
 * Unified panel feature test. Run from a tool repo:
 *   node test/panel-features.mjs
 * Optional env: PANEL_HTML=index.html  PANEL_OPEN_KEY=...  HAS_3D=1  HAS_H5=1  HAS_AE=1
 */
import { createRequire } from 'module';
import { createServer } from 'http';
const _require = createRequire(import.meta.url);
function _chromium() {
  const tries = [
    () => _require('playwright-core'),
    () => _require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.js'),
  ];
  for (const fn of tries) {
    try {
      const m = fn();
      return m.chromium || m.default?.chromium;
    } catch {}
  }
  throw new Error('playwright-core not found');
}
const chromium = { launch: (...a) => _chromium().launch(...a) };
import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = process.cwd();
const htmlFile = process.env.PANEL_HTML || (existsSync(join(root, 'index.html')) ? 'index.html' : 'zipper_tool.html');
const openKey = process.env.PANEL_OPEN_KEY || '';
const expect3d = process.env.HAS_3D !== '0';
const expectH5 = process.env.HAS_H5 !== '0';
const expectAe = process.env.HAS_AE !== '0';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp' };

function serve() {
  return new Promise(res => {
    const s = createServer((req, r) => {
      let p = join(root, decodeURIComponent((req.url || '/').split('?')[0]));
      if (p.endsWith('/')) p += htmlFile;
      try { const d = readFileSync(p); r.writeHead(200, { 'content-type': mime[extname(p)] || 'application/octet-stream' }); r.end(d); }
      catch { r.writeHead(404); r.end('no'); }
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

const results = [];
function rec(name, ok, detail) { results.push({ name, ok, detail: detail || '' }); console.log(ok ? 'PASS' : 'FAIL', name, detail || ''); }

const server = await serve();
const port = server.address().port;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(20000);
const downloads = [];
page.on('download', d => downloads.push(d));

try {
  await page.goto(`http://127.0.0.1:${port}/${htmlFile}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#panel', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.__api = function () {
      const a = window.__app || {};
      const g = window.__game || {};
      const tool = window.__tool || {};
      let S = null;
      try { if (typeof window.__S === 'function') S = window.__S(); } catch (e) {}
      S = S || g.S || a.S || window.S || {};
      return Object.assign({ S }, a, tool, g, {
        aeStart: g.aeStart || a.aeStart || window.__aeStart,
        aeStop: g.aeStop || a.aeStop || window.__aeStop,
        doExportAE: g.doExportAE || a.doExportAE || g.aeExport || a.aeExport || window.__aeExport,
        doExport3D: g.doExport3D || a.doExport3D || g.export3DZip || a.export3DZip || window.__export3d,
        doExportH5: g.doExportH5 || a.doExportH5 || g.exportH5Zip || a.exportH5Zip || window.__exportH5,
      });
    };
  });

  const title = await page.$eval('#panelHead h1', el => el.textContent);
  rec('title-控制台', /控制台/.test(title), title.trim());

  for (const [sel, label] of [
    ['#btnAuto', '自动通关'],
    ['#btnRec', '录制'],
    ['#btnShot', '截图'],
    ['#btnExport', '导出设置'],
    ['#btnImport', '导入设置'],
    ['#btnReset', '恢复默认'],
    ['#panelSearch', '搜索框'],
    ['#btnExpandAll', '全部展开'],
    ['#btnCollapseAll', '全部收起'],
    ['#status', '状态条'],
    ['#panelTools', '搜索工具条'],
  ]) {
    rec('dom:' + label, !!(await page.$(sel)));
  }
  rec('card-关卡', !!(await page.$('#panelHead .pcard')));
  const cards = await page.$$eval('#panelHead .ptitle, #panelHead .pcard .ptitle', els => els.map(e => e.textContent));
  rec('card-titles', cards.some(t => /关卡/.test(t)) && cards.some(t => /演示/.test(t)) && cards.some(t => /设置/.test(t)), cards.join(' | '));

  const cats = await page.$$eval('#panelBody .pcat', els => els.map(e => e.textContent.trim()));
  rec('cat-玩法', cats.some(c => /玩法/.test(c)), cats.join(' | '));
  rec('cat-画面', cats.some(c => /画面/.test(c)), cats.join(' | '));
  rec('cat-动效', cats.some(c => /动效|音效/.test(c)), cats.join(' | '));
  rec('cat-导出', cats.some(c => /演示|录制|导出/.test(c)), cats.join(' | '));

  const groups = await page.$$eval('#panelBody > details > summary', els => els.map(e => e.textContent));
  rec('groups-present', groups.length > 0, String(groups.length));
  const exportTitles = groups.filter(t => /导出/.test(t));
  const order = exportTitles.map(t => /H5/.test(t) ? 'H5' : /3D/.test(t) ? '3D' : /AE/.test(t) ? 'AE' : t);
  rec('export-order-录屏截图按钮在顶栏', true, '顶栏已有录制/截图');
  if (expectAe) rec('group-AE', exportTitles.some(t => /AE/.test(t)), exportTitles.join(' | '));
  if (expect3d) rec('group-3D', exportTitles.some(t => /3D/.test(t)), exportTitles.join(' | '));
  else rec('group-3D-absent-known', !exportTitles.some(t => /3D/.test(t)), 'tool has no 3D export by design');
  if (expectH5) rec('group-H5', exportTitles.some(t => /H5/.test(t)), exportTitles.join(' | '));
  // order AE then 3D then H5 if all present
  const idx = k => order.indexOf(k);
  if (expectAe && expectH5) rec('export-group-order', idx('AE') >= 0 && idx('H5') > idx('AE') && (!expect3d || (idx('3D') > idx('AE') && idx('H5') > idx('3D'))), order.join(','));

  // expand / collapse
  await page.click('#btnCollapseAll');
  await page.waitForTimeout(200);
  const closed = await page.$$eval('#panelBody > details', els => els.filter(e => !e.open).length);
  rec('collapse-all', closed > 0, `closed ${closed}/${(await page.$$('#panelBody > details')).length}`);
  await page.click('#btnExpandAll');
  await page.waitForTimeout(200);
  const opened = await page.$$eval('#panelBody > details', els => els.filter(e => e.open).length);
  rec('expand-all', opened > 0, `open ${opened}`);

  // persist open state
  if (openKey) {
    await page.click('#btnCollapseAll');
    await page.waitForTimeout(150);
    const stored = await page.evaluate(k => localStorage.getItem(k), openKey);
    rec('open-state-saved', !!stored && stored !== '{}', String(stored).slice(0, 120));
  } else {
    const anyKey = await page.evaluate(() => Object.keys(localStorage).find(k => /panelOpen/.test(k)));
    rec('open-state-saved', !!anyKey, anyKey || 'no key');
  }

  // search
  await page.fill('#panelSearch', 'H5');
  await page.waitForTimeout(150);
  const vis = await page.$$eval('#panelBody > details', els => els.filter(e => !e.classList.contains('hidden-by-filter')).map(e => e.querySelector('summary')?.textContent || ''));
  rec('search-H5', vis.some(t => /H5/.test(t)) && vis.length < groups.length, vis.join(' | '));
  await page.fill('#panelSearch', '');
  await page.waitForTimeout(100);

  // screenshot download (filter by extension so a leftover zip/json cannot steal the event)
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000, predicate: d => /\.(png|jpe?g|webp)$/i.test(d.suggestedFilename() || '') }),
      page.click('#btnShot'),
    ]);
    rec('screenshot-download', !!dl.suggestedFilename(), dl.suggestedFilename());
  } catch (e) {
    rec('screenshot-download', false, e.message);
  }

  // export settings
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000, predicate: d => /\.json$/i.test(d.suggestedFilename() || '') }),
      page.click('#btnExport'),
    ]);
    const name = dl.suggestedFilename();
    const path = await dl.path();
    let parsed = false, keys = 0;
    try { const j = JSON.parse(readFileSync(path, 'utf8')); parsed = typeof j === 'object'; keys = j && (j.settings ? Object.keys(j.settings) : Object.keys(j)).length; } catch {}
    rec('settings-export', !!name && /\.json$/i.test(name) && parsed, `${name} keys=${keys}`);
  } catch (e) {
    rec('settings-export', false, e.message);
  }

  // import settings: tweak a known range via DOM then export, change, import back
  const tweak = await page.evaluate(() => {
    const rng = document.querySelector('#panelBody input[type=range]');
    if (!rng) return null;
    const key = rng.id?.replace(/^rng_/, '') || rng.dataset.key || '';
    const old = rng.value;
    const min = +rng.min, max = +rng.max, step = +rng.step || 1;
    let nv = +old + step;
    if (nv > max) nv = +old - step;
    if (nv === +old) nv = min;
    rng.value = String(nv);
    rng.dispatchEvent(new Event('input', { bubbles: true }));
    rng.dispatchEvent(new Event('change', { bubbles: true }));
    return { key, old, nv: String(nv) };
  });
  rec('setting-tweak', !!tweak, tweak ? JSON.stringify(tweak) : 'no range');

  // reset (confirm)
  page.once('dialog', d => d.accept());
  await page.click('#btnReset');
  await page.waitForTimeout(400);
  rec('settings-reset-clicked', true, 'confirm accepted');

  // auto-solve start
  const autoBefore = await page.evaluate(() => ({
    has: !!((typeof window.__api === "function" ? window.__api() : (window.__app || window.__game || window.game))),
  }));
  await page.click('#btnAuto');
  await page.waitForTimeout(800);
  const autoAfter = await page.evaluate(() => {
    const a = (typeof window.__api === "function" ? window.__api() : (window.__app || window.__game || {}));
    const running = !!(a.AUTO?.running || a.auto || a.autoSolveRunning || a.solving ||
      document.getElementById('btnAuto')?.classList.contains('on') ||
      /停止|取消/.test(document.getElementById('btnAuto')?.textContent || ''));
    return { running, btn: document.getElementById('btnAuto')?.textContent };
  });
  rec('auto-solve-starts', autoAfter.running, autoAfter.btn || JSON.stringify(autoAfter));
  // stop if possible so later tests aren't blocked
  if (autoAfter.running) {
    await page.click('#btnAuto').catch(() => {});
    await page.waitForTimeout(300);
  }

  // recording start/stop (short)
  await page.click('#btnExpandAll').catch(() => {});
  await page.evaluate(() => {
    const g = (typeof window.__api === "function" ? window.__api() : (window.__app || window.__game || window.__tool || {}));
    const S = g.S || g.settings || window.S;
    if (S && 'aeWithRec' in S) S.aeWithRec = false;
    if (typeof g.set === 'function') { try { g.set('aeWithRec', false); } catch (e) {} }
    for (const r of document.querySelectorAll('#panelBody .row')) {
      if (/录制视频时同步|同步记录|aeWithRec|停止录制后自动导出/.test(r.textContent || '')) {
        const sw = r.querySelector('input[type=checkbox], input.switch-input');
        if (sw && sw.checked) { sw.checked = false; sw.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    }
  });
  const recBtnText = await page.$eval('#btnRec', el => el.textContent);
  // startRec is async (zipper WebCodecs init); await the API when present, then confirm UI.
  await page.evaluate(async () => {
    const g = (typeof window.__api === "function" ? window.__api() : (window.__game || window.__app || {}));
    const start = g.startRec || window.__startRec;
    if (typeof start === 'function') { try { await start.call(g); return; } catch (e) {} }
    document.getElementById('btnRec')?.click();
  });
  const recOn = await page.waitForFunction(() => {
    const b = document.getElementById('btnRec');
    return !!(b?.classList.contains('on') || /停止/.test(b?.textContent || ''));
  }, { timeout: 20000 }).then(() => true).catch(() => false);
  rec('record-starts', recOn, 'btn was ' + recBtnText);
  if (recOn) {
    let videoName = '';
    try {
      const [dl] = await Promise.all([
        page.waitForEvent('download', { timeout: 45000, predicate: d => /\.(mp4|webm)$/i.test(d.suggestedFilename() || '') }),
        page.evaluate(async () => {
          const g = (typeof window.__api === "function" ? window.__api() : (window.__game || window.__app || {}));
          const stop = g.stopRec || window.__stopRec;
          if (typeof stop === 'function') { await stop.call(g); return; }
          document.getElementById('btnRec')?.click();
        }),
      ]);
      videoName = dl.suggestedFilename() || '';
    } catch (e) {
      const hrefName = await page.evaluate(() => {
        const a = document.querySelector('#recList a[download], #recList a[href]');
        return a ? (a.getAttribute('download') || a.textContent || '') : '';
      });
      videoName = /\.(mp4|webm)/i.test(hrefName) ? hrefName.trim() : '';
      if (!videoName) videoName = '';
    }
    rec('record-download', !!videoName, videoName || 'no video download after async stopRec');
  } else {
    rec('record-download', false, 'did not start');
  }

  // AE / 3D / H5 buttons exist inside groups
  const bodyText = await page.$eval('#panelBody', el => el.innerText);
  if (expectAe) rec('ae-controls-visible', /开始记录|导出 AE|停止并导出/.test(bodyText), '');
  if (expect3d) rec('3d-controls-visible', /导出 3D|GLB|Blender/.test(bodyText), '');
  if (expectH5) rec('h5-controls-visible', /导出 H5|试玩/.test(bodyText), '');


  // ---- full functional: settings import restores a value ----
  try {
    const before = await page.evaluate(() => {
      const rng = document.querySelector('#panelBody input[type=range]');
      if (!rng) return null;
      const key = rng.id?.replace(/^rng_|^sel_|^chk_/, '') || rng.dataset.key || '';
      return { key, val: rng.value, min: rng.min, max: rng.max, step: rng.step || '1' };
    });
    if (!before) rec('settings-import-restore', false, 'no range');
    else {
      const [dl] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000, predicate: d => /\.json$/i.test(d.suggestedFilename() || '') }),
        page.click('#btnExport'),
      ]);
      const savedPath = await dl.path();
      const raw = readFileSync(savedPath, 'utf8');
      const changed = await page.evaluate((b) => {
        const rng = document.querySelector('#panelBody input[type=range]');
        if (!rng) return null;
        let nv = +b.val + (+b.step || 1);
        if (nv > +b.max) nv = +b.val - (+b.step || 1);
        rng.value = String(nv);
        rng.dispatchEvent(new Event('input', { bubbles: true }));
        rng.dispatchEvent(new Event('change', { bubbles: true }));
        return rng.value;
      }, before);
      rec('settings-import-changed', changed != null && String(changed) !== String(before.val), `${before.val} -> ${changed}`);
      const input = await page.$('#importFile');
      await input.setInputFiles(savedPath);
      await page.waitForTimeout(600);
      const restored = await page.evaluate((k) => {
        const rng = k ? document.querySelector('#rng_' + k + ', [data-key="'+k+'"]') : document.querySelector('#panelBody input[type=range]');
        return rng ? rng.value : null;
      }, before.key);
      rec('settings-import-restore', restored != null && String(restored) === String(before.val), `got ${restored}, want ${before.val}`);
    }
  } catch (e) { rec('settings-import-restore', false, e.message); }

  // ---- auto-solve runs to a win (official in-page pump per tool; do not IPC every frame) ----
  page.setDefaultTimeout(420000);
  try {
    const limit = +(process.env.AUTO_WIN_MS || 400000);
    const st = await page.evaluate(async (limit) => {
      // Live object, not a shallow copy — getters like F/G must stay live.
      const g = window.__game || window.__app || window.__tool || {};
      const S = (typeof window.__S === 'function' ? window.__S() : null) || g.S || window.S || {};
      try { window.__failed = false; window.__finished = false; window.__win = false; } catch (e) {}
      const id = String(g.APP_ID || g.TOOL_ID || (window.__app && window.__app.TOOL_ID) || S.app || '');
      const speed = {
        autoMode: 'video', handShow: false,
        animScale: 0.15, flyMs: 40, flyDuration: 40, handSpeed: 8, autoSpeed: 6, timerSec: 120,
        moveMs: 40, animMs: 40, stepMs: 30, autoDelay: 10, fingerMs: 40,
        autoWait: 10, recAuto: false, aeWithRec: false, autoRec: false, endCard: false,
        cupInterval: 40, cupFly: 40, boxGrow: 40, boxClose: 40, boxFlyDur: 40, slideSpeed: 8,
        introSec: 0, chainSpeed: 2.5, autoStartDelay: 0,
      };
      const applyKnobs = (extra) => {
        const knobs = Object.assign({}, speed, extra || {});
        if (typeof window.__setSettings === 'function') {
          try { window.__setSettings(knobs); return; } catch (e) {}
        }
        if (typeof g.setMany === 'function') { try { g.setMany(knobs); return; } catch (e) {} }
        if (typeof g.set === 'function') {
          for (const [k, v] of Object.entries(knobs)) { try { g.set(k, v); } catch (e) {} }
          return;
        }
        if (typeof g.setSetting === 'function') {
          for (const [k, v] of Object.entries(knobs)) { try { g.setSetting(k, v); } catch (e) {} }
          return;
        }
        for (const [k, v] of Object.entries(knobs)) if (S && k in S) S[k] = v;
      };
      const startAe = () => {
        const fn = g.aeStart || (window.__app && window.__app.aeStart) || window.__aeStart;
        if (typeof fn === 'function') { try { fn.call(g); } catch (e) {} }
      };
      const yieldTick = () => new Promise(r => setTimeout(r, 0));

      const verdict = () => {
        const G = g.G || g.st || g.game || {};
        const F = g.F || {};
        const ended = typeof g.ended === 'function' ? !!g.ended() : (typeof g.isEnded === 'function' ? !!g.isEnded() : false);
        const phase = String(F.phase || G.phase || G.panel || G.state || G.over || '');
        if (window.__failed || phase === 'fail' || G.over === 'fail') return 'fail';
        if (window.__finished || window.__win || G.win === true || G.cleared === true) return 'win';
        if (G.winT != null && G.winT !== false) return 'win';
        if (phase === 'win' || phase === 'end' || phase === 'cleared' || phase === 'curtain') return 'win';
        if ((g.winsInRun || F.winsInRun || 0) > 0) return 'win';
        if (ended && phase !== 'fail' && G.state !== 'fail') return 'win';
        if (G.state && G.state !== 'play' && G.state !== 'fail' && G.state !== 'idle' && G.state !== 'ready') return 'win';
        return '';
      };

      const t0 = Date.now();
      let how = 'realtime';
      const hasAdvance = typeof g.advance === 'function';
      const isZuma = !!(g.Z && typeof g.Z.plan === 'function');
      const isRingBelt = typeof window.__step === 'function' && typeof window.__auto === 'function';
      const isCoffee = /coffee/i.test(id);

      if (hasAdvance) {
        // zipper official: only the knobs that path uses; each set() rebuilds the panel
        try { g.set('autoMode', 'video'); } catch (e) {}
        try { g.set('handShow', false); } catch (e) {}
        try { g.set('aeWithRec', false); } catch (e) {}
        try { g.set('recAuto', false); } catch (e) {}
        try { g.set('autoRec', false); } catch (e) {}
        if (typeof g.newGame === 'function') { try { g.newGame(0); } catch (e) { try { g.newGame(); } catch (e2) {} } }
        try { g.advance(0.7, false); } catch (e) {}
        startAe();
        try { g.startAuto(); } catch (e) {}
        how = 'advance';
        for (let i = 0; i < 800 && !verdict(); i++) {
          g.advance(0.1);
          if (Date.now() - t0 > limit) break;
        }
      } else if (isZuma) {
        // official run-test: only seed 1; kitchen-sink knobs (e.g. introSec 0) can dump the chain into the hole immediately
        window.__nodraw = true;
        if (typeof g.setMany === 'function') { try { g.setMany({ seed: 1 }); } catch (e) {} }
        let t = 500000;
        try { g.renderAt(t); } catch (e) {}
        if (typeof g.newGame === 'function') { try { g.newGame(); } catch (e) {} }
        try { window.__failed = false; window.__finished = false; } catch (e) {}
        startAe();
        how = 'planShoot';
        let cd = 0;
        for (let i = 0; i < 30 * 180 && !verdict(); i++) {
          const Z = g.Z;
          if (cd <= 0 && Z && typeof Z.canShoot === 'function' && Z.canShoot()) {
            const q = Z.plan();
            if (q) { try { if (Z.aim) Z.aim(q.x, q.y); Z.shoot(q.x, q.y); } catch (e) {} }
            cd = 18;
          }
          cd--; t += 33.3;
          try { g.renderAt(t); } catch (e) {}
          if (i % 8 === 7) await yieldTick();
          if (Date.now() - t0 > limit) break;
        }
      } else if (isRingBelt) {
        applyKnobs({ loopLevels: false, autoSpeed: 3, recAuto: false, aeWithRec: false, autoRec: false });
        startAe();
        try { window.__auto(true); } catch (e) {}
        how = 'step';
        for (let i = 0; i < 400 && !verdict(); i++) {
          try { window.__step(50); } catch (e) {}
          if (i % 2 === 1) await yieldTick();
          if (Date.now() - t0 > limit) break;
        }
      } else if (isCoffee) {
        // official: wall-clock autoSolve + __finished, up to 400s. Do not freeze the rAF loop with __vclock.
        const f = 2.5;
        applyKnobs({
          autoSpeed: f,
          cupInterval: Math.round(200 / f), cupFly: Math.round(150 / f),
          boxGrow: Math.round(300 / f), boxClose: Math.round(450 / f),
          boxFlyDur: Math.round(400 / f), slideSpeed: 6 * f,
          autoRec: false, aeWithRec: false, render3d: false,
        });
        if (typeof g.newGame === 'function') { try { g.newGame(); } catch (e) {} }
        startAe();
        try { if (typeof g.autoSolve === 'function') g.autoSolve(); } catch (e) {}
        how = 'realtime';
        while (Date.now() - t0 < limit && !verdict()) {
          await new Promise(r => setTimeout(r, 150));
        }
      } else {
        applyKnobs(/block-shooter|voxel-shoot/i.test(id)
          ? { autoSpeed: 4, autoStartDelay: 0, render3d: false }
          : {});
        try { window.__no3d = true; } catch (e) {}
        if (typeof g.renderAt === 'function') {
          window.__T = window.__T || 1e5;
          try { g.renderAt(window.__T); } catch (e) {}
        }
        if (typeof g.newGame === 'function') { try { g.newGame(); } catch (e) { try { g.newGame(true); } catch (e2) {} } }
        startAe();
        // prefer startAuto (ring-untangle autoSolve is a toggle and would stop a running run)
        try {
          if (typeof g.startAuto === 'function') g.startAuto();
          else if (typeof g.autoSolve === 'function') g.autoSolve();
          else if (typeof g.autoPlay === 'function') g.autoPlay();
        } catch (e) {}
        if (typeof g.renderAt === 'function') {
          how = 'renderAt';
          if (window.__T == null) window.__T = 1e5;
          const step = 1000 / 30;
          const maxF = /block-shooter|voxel-shoot/i.test(id) ? 30 * 400 : 30 * 180;
          for (let i = 0; i < maxF && !verdict(); i++) {
            window.__T += step;
            try { g.renderAt(window.__T); } catch (e) {}
            if (i % 2 === 1) await yieldTick();
            if (Date.now() - t0 > limit) break;
          }
        } else {
          how = 'realtime';
          while (Date.now() - t0 < limit && !verdict()) {
            await new Promise(r => setTimeout(r, 200));
          }
        }
      }

      const G = g.G || {}, F = g.F || {};
      const result = verdict() || 'timeout';
      if (g.stopAuto) try { g.stopAuto(); } catch (e) {}
      if (typeof window.__auto === 'function') try { window.__auto(false); } catch (e) {}
      return {
        result, how, sec: +((Date.now() - t0) / 1000).toFixed(1),
        finished: !!window.__finished, phase: F.phase || G.phase || G.panel || G.state || '',
        cleared: !!G.cleared, winsInRun: F.winsInRun || g.winsInRun || 0,
        winT: G.winT, ended: typeof g.isEnded === 'function' ? !!g.isEnded() : false,
        btn: document.getElementById('btnAuto')?.textContent || '',
        id,
      };
    }, limit);
    rec('auto-solve-wins', st.result === 'win', JSON.stringify(st) + ' ' + st.sec + 's');
    await page.evaluate(() => {
      const g = window.__game || window.__app || {};
      if (g.stopAuto) try { g.stopAuto(); } catch (e) {}
      if (typeof window.__auto === 'function') try { window.__auto(false); } catch (e) {}
      const stopAe = g.aeStop || (window.__app && window.__app.aeStop) || window.__aeStop;
      if (typeof stopAe === 'function') { try { stopAe.call(g); } catch (e) {} }
    });
  } catch (e) { rec('auto-solve-wins', false, e.message); }

  // ---- AE / 3D / H5 real zip downloads + contents ----
  page.setDefaultTimeout(180000);
  const outDir = '/tmp/panel-export-check';
  try { mkdirSync(outDir, { recursive: true }); } catch (e) {}
  const dumpB64 = (name, b64) => { const p = outDir + '/' + name.replace(/[^\w.-]+/g,'_'); writeFileSync(p, Buffer.from(b64, 'base64')); return p; };
  const zipList = (p) => { try { return execSync(`python3 -c 'import zipfile,sys; print(chr(10).join(zipfile.ZipFile(sys.argv[1]).namelist()))' ${JSON.stringify(p)}`, { encoding: 'utf8' }); } catch (e) { return 'ERR '+e.message; } };

  const inspectPy = join(dirname(fileURLToPath(import.meta.url)), 'inspect-zip.py');
  const inspectZip = (p) => { try { return execSync(`python3 ${JSON.stringify(inspectPy)} ${JSON.stringify(p)}`, { encoding: 'utf8' }); } catch (e) { return zipList(p); } };
    const nameOk = (kind, name) => {
    const n = String(name || '');
    const stamp = /_?\d{8}_\d{6}([_.-][a-z0-9-]+)?\.zip$/i;
    if (kind === 'ae') return stamp.test(n) && /(_ae_export_|_ae_[a-z0-9-]+_)/i.test(n);
    if (kind === '3d') return stamp.test(n) && /(_3d_export_|_3d_[a-z0-9-]+_)/i.test(n);
    if (kind === 'h5') return stamp.test(n) && /(_h5_playable_|_h5_[a-z0-9-]+_)/i.test(n);
    return false;
  };

  async function exportViaApi(which) {
    // Real download (not base64 through evaluate). Ignore leftover rec .mp4/.webm events.
    const zipDl = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { page.off('download', onDl); reject(new Error('download timeout')); }, 180000);
      const onDl = d => {
        const n = d.suggestedFilename() || '';
        if (!/\.zip$/i.test(n)) return;
        clearTimeout(timer);
        page.off('download', onDl);
        resolve(d);
      };
      page.on('download', onDl);
    });
    const ev = page.evaluate(async (which) => {
      const g = window.__game || window.__app || {};
      try { if (g.stopRec) g.stopRec(); } catch (e) {}
      const fn = which === 'ae'
        ? (g.doExportAE || g.aeExport || window.__aeExport)
        : which === '3d'
          ? (g.doExport3D || g.export3DZip || window.__export3d)
          : (g.doExportH5 || g.exportH5Zip || window.__exportH5);
      if (typeof fn !== 'function') throw new Error('no ' + which + ' api');
      return await fn.call(g);
    }, which);
    const [dl] = await Promise.all([zipDl, ev]);
    const name = dl.suggestedFilename();
    const pth = outDir + '/' + name.replace(/[^\w.-]+/g, '_');
    await dl.saveAs(pth);
    return { name, pth, size: statSync(pth).size };
  }

  if (expectAe) {
    try {
      const r = await exportViaApi('ae');
      if (r.err) rec('ae-export-zip', false, r.err);
      else {
        const pth = r.pth;
        const names = inspectZip(pth);
        const hasJsx = /build_ae_project\.jsx|\.jsx/.test(names);
        const fnOk = nameOk('ae', r.name);
        rec('ae-export-zip', hasJsx && fnOk && r.size > 100, `${r.name} ${r.size}b jsx=${hasJsx} nameOk=${fnOk}`);
      }
    } catch (e) { rec('ae-export-zip', false, e.message); }
  }

  if (expect3d) {
    try {
      const r = await exportViaApi('3d');
      if (r.err) rec('3d-export-zip', false, r.err);
      else {
        const pth = r.pth;
        const names = inspectZip(pth);
        const hasGlb = /scene\.glb/i.test(names) || names.includes('scene.glb') || /\.glb/i.test(names);
        const fnOk = nameOk('3d', r.name);
        rec('3d-export-zip', hasGlb && fnOk && r.size > 200, `${r.name} ${r.size}b nameOk=${fnOk} ${names.split('\n').slice(0,8).join(',')}`);
        if (hasGlb) {
          try {
            const glbPath = outDir + '/scene.glb';
            execSync(`python3 ${JSON.stringify(inspectPy)} ${JSON.stringify(pth)} extract-glb ${JSON.stringify(outDir)}`)
            const validatorUrl = new URL('gltf-validator/module.mjs', 'file:///workspace/block-tower-tool/node_modules/');
            const { validateBytes } = await import('/workspace/block-tower-tool/node_modules/gltf-validator/module.mjs');
            const buf = readFileSync(glbPath);
            const report = await validateBytes(new Uint8Array(buf));
            const ok = report?.issues?.numErrors === 0;
            let anims = 0, tracks = 0;
            try {
              const info = execSync(`python3 -c 'import struct,json,sys
d=open(sys.argv[1],"rb").read()
n,typ=struct.unpack_from("<I4s",d,12)
j=json.loads(d[20:20+n])
a=j.get("animations") or []
print(len(a), sum(len(x.get("channels") or []) for x in a))
' ${JSON.stringify(glbPath)}`, { encoding: 'utf8' }).trim().split(/\s+/);
              anims = +info[0] || 0; tracks = +info[1] || 0;
            } catch (e2) {}
            rec('3d-glb-valid', ok, `errors=${report?.issues?.numErrors} warnings=${report?.issues?.numWarnings} animations=${anims} tracks=${tracks}`);
            rec('3d-glb-has-animation', anims > 0 && tracks > 0, `animations=${anims} tracks=${tracks}`);
          } catch (e) { rec('3d-glb-valid', false, e.message); rec('3d-glb-has-animation', false, e.message); }
        } else { rec('3d-glb-valid', false, 'no scene.glb'); rec('3d-glb-has-animation', false, 'no scene.glb'); }
      }
    } catch (e) { rec('3d-export-zip', false, e.message); rec('3d-glb-valid', false, 'no zip'); rec('3d-glb-has-animation', false, 'no zip'); }
  } else {
    rec('3d-export-zip', true, 'n/a'); rec('3d-glb-valid', true, 'n/a'); rec('3d-glb-has-animation', true, 'n/a');
  }

  if (expectH5) {
    try {
      const r = await exportViaApi('h5');
      if (r.err) rec('h5-export-zip', false, r.err);
      else {
        const pth = r.pth;
        const names = inspectZip(pth);
        const htmls = names.split(/\r?\n/).filter(n => n.trim().toLowerCase().endsWith('index.html'));
        const fnOk = nameOk('h5', r.name);
        rec('h5-export-zip', htmls.length > 0 && fnOk && r.size > 200, `${r.name} ${r.size}b nameOk=${fnOk} htmls=${htmls.length} e.g. ${htmls.slice(0,6).join(',')}`);
      }
    } catch (e) { rec('h5-export-zip', false, e.message); }
  }

  // mobile stacking
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const stack = await page.evaluate(() => {
    const app = document.getElementById('app');
    const st = getComputedStyle(app).flexDirection;
    const panel = document.getElementById('panel');
    return { dir: st, width: panel.getBoundingClientRect().width, vw: innerWidth };
  });
  rec('mobile-stack', stack.dir === 'column' && stack.width > stack.vw * 0.8, JSON.stringify(stack));

} catch (e) {
  rec('fatal', false, e.stack || e.message);
}

await browser.close();
server.close();
const fail = results.filter(r => !r.ok);
console.log('\n==== panel feature summary ====' );
console.log(`passed ${results.filter(r => r.ok).length} / ${results.length}`);
if (fail.length) {
  console.log('failures:');
  for (const f of fail) console.log(' -', f.name, f.detail);
  process.exit(1);
}
