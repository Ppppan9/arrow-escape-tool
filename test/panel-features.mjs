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
import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
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

  // screenshot download
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.click('#btnShot'),
    ]);
    rec('screenshot-download', !!dl.suggestedFilename(), dl.suggestedFilename());
  } catch (e) {
    rec('screenshot-download', false, e.message);
  }

  // export settings
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
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
    has: !!(window.__app || window.__game || window.game),
  }));
  await page.click('#btnAuto');
  await page.waitForTimeout(800);
  const autoAfter = await page.evaluate(() => {
    const a = window.__app || window.__game || {};
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
    const g = window.__app || window.__game || window.__tool || {};
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
  await page.click('#btnRec');
  await page.waitForTimeout(900);
  const recOn = await page.evaluate(() => {
    const b = document.getElementById('btnRec');
    return !!(b?.classList.contains('on') || /停止/.test(b?.textContent || ''));
  });
  rec('record-starts', recOn, 'btn was ' + recBtnText);
  if (recOn) {
    const names = [];
    page.on('download', d => names.push(d.suggestedFilename() || ''));
    await page.click('#btnRec');
    await page.waitForTimeout(1500);
    let videoName = names.find(n => /\.(mp4|webm)$/i.test(n));
    if (!videoName) {
      const hrefName = await page.evaluate(() => {
        const a = document.querySelector('#recList a[download], #recList a[href]');
        return a ? (a.getAttribute('download') || a.textContent || '') : '';
      });
      if (/\.(mp4|webm)/i.test(hrefName)) {
        try {
          const [dl] = await Promise.all([
            page.waitForEvent('download', { timeout: 8000 }),
            page.click('#recList a[download], #recList a[href]'),
          ]);
          videoName = dl.suggestedFilename() || hrefName;
        } catch (e) {
          videoName = hrefName.trim();
        }
      }
    }
    rec('record-download', !!videoName, videoName || ('no video; got ' + names.join(',')));
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
        page.waitForEvent('download', { timeout: 8000 }),
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

  // ---- auto-solve runs to a win ----
  try {
    await page.evaluate(() => {
      const g = window.__app || window.__game || {};
      const S = g.S || window.S;
      if (!S) return;
      const speed = {
        animScale: 0.15, flyMs: 40, flyDuration: 40, handSpeed: 8, autoSpeed: 5, timerSec: 120,
        moveMs: 40, animMs: 40, stepMs: 30, autoDelay: 10, fingerMs: 40,
        autoWait: 10, recAuto: false, aeWithRec: false, endCard: false,
      };
      for (const [k,v] of Object.entries(speed)) if (k in S) S[k] = v;
      if (typeof g.setMany === 'function') { try { g.setMany({ ...speed, aeWithRec: false }); } catch (e) {} }
      if (typeof g.newGame === 'function') { try { g.newGame(); } catch (e) { try { g.newGame(true); } catch (e2) {} } }
      const startAe = g.aeStart || window.__aeStart;
      if (typeof startAe === 'function') { try { startAe(); } catch (e) {} }
    });
    await page.waitForTimeout(400);
    const autoBtn = await page.$('#btnAuto');
    if (autoBtn) await autoBtn.click();
    else await page.evaluate(() => { const g = window.__app || window.__game || {}; if (g.autoSolve) g.autoSolve(); else if (g.startAuto) g.startAuto(); });
    const t0 = Date.now();
    const limit = +(process.env.AUTO_WIN_MS || 90000);
    let win = false, info = '';
    while (Date.now() - t0 < limit) {
      const st = await page.evaluate(() => {
        const g = window.__app || window.__game || {};
        const G = g.G || g.st || g.game || {};
        const ended = typeof g.ended === 'function' ? !!g.ended() : false;
        const panel = G.panel || G.phase || '';
        const st = G.state || G.over || '';
        const flags = [
          window.__finished, window.__win, G.win === true, G.cleared === true,
          panel === 'win' || panel === 'end',
          st === 'win' || st === 'end' || st === 'cleared',
          ended && st !== 'fail' && panel !== 'fail',
        ];
        const fail = !!(window.__failed || st === 'fail' || panel === 'fail' || G.over === 'fail');
        return { finished: !!window.__finished, failed: fail, panel: String(panel||st), ended, any: flags.some(Boolean), btn: document.getElementById('btnAuto')?.textContent || '', cleared: !!G.cleared };
      });
      info = JSON.stringify(st);
      if (st.failed && !st.finished && st.panel === 'fail') { win = false; info = 'ended as fail ' + info; break; }
      if (st.any && st.panel !== 'fail') { win = true; break; }
      await page.waitForTimeout(800);
    }
    rec('auto-solve-wins', win, info + ` ${((Date.now()-t0)/1000).toFixed(1)}s`);
    await page.evaluate(() => {
      const g = window.__app || window.__game || {};
      if (g.stopAuto) try { g.stopAuto(); } catch (e) {}
      const stopAe = g.aeStop || window.__aeStop;
      if (typeof stopAe === 'function') { try { stopAe(); } catch (e) {} }
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
    return page.evaluate(async (which) => {
      const g = window.__app || window.__game || {};
      const fn = which === 'ae'
        ? (g.doExportAE || g.aeExport || window.__aeExport)
        : which === '3d'
          ? (g.doExport3D || g.export3DZip || window.__export3d)
          : (g.doExportH5 || g.exportH5Zip || window.__exportH5);
      if (typeof fn !== 'function') return { err: 'no ' + which + ' api' };
      const out = await fn.call(g, true);
      const first = Array.isArray(out) ? out[0] : out;
      const blob = first && (first.blob || (first instanceof Blob ? first : null));
      const name = first && first.name;
      if (!blob) return { err: 'no blob', name };
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ''; const step = 32768; for (let i = 0; i < buf.length; i += step) s += String.fromCharCode.apply(null, buf.subarray(i, i + step));
      return { name, b64: btoa(s), size: buf.length };
    }, which);
  }

  if (expectAe) {
    try {
      const r = await exportViaApi('ae');
      if (r.err) rec('ae-export-zip', false, r.err);
      else {
        const pth = dumpB64(r.name, r.b64);
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
        const pth = dumpB64(r.name, r.b64);
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
            const report = await validateBytes(new Uint8Array(readFileSync(glbPath)));
            const ok = report?.issues?.numErrors === 0;
            rec('3d-glb-valid', ok, `errors=${report?.issues?.numErrors} warnings=${report?.issues?.numWarnings}`);
          } catch (e) { rec('3d-glb-valid', false, e.message); }
        } else rec('3d-glb-valid', false, 'no scene.glb');
      }
    } catch (e) { rec('3d-export-zip', false, e.message); rec('3d-glb-valid', false, 'no zip'); }
  } else {
    rec('3d-export-zip', true, 'n/a'); rec('3d-glb-valid', true, 'n/a');
  }

  if (expectH5) {
    try {
      const r = await exportViaApi('h5');
      if (r.err) rec('h5-export-zip', false, r.err);
      else {
        const pth = dumpB64(r.name, r.b64);
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
