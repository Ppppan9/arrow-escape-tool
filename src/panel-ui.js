/** Shared control-panel behaviour: category headers, icons, counts, search, expand/collapse, open-state persistence, optional level select sync. Does not change control IDs or setting keys. */
export const CATS = [
  ['🎮 玩法 · 关卡'],
  ['🖼 画面 · 镜头 · 光照'],
  ['🎵 动效 · 音效'],
  ['🎬 演示 · 录制 · 导出'],
];

function catIndex(name) {
  const n = String(name || '');
  if (/^(手指|录制|导出 AE|导出 3D|导出 H5|结束页|高级设置)/.test(n)) return 3;
  if (/^(动画|物理|粒子|音效|点击与动画|消除特效|玩法与动画)/.test(n) || /动画时长/.test(n)) return 2;
  if (/^(主题|关卡|画布与关卡|玩法规则|棋盘布局|导入透明|字母型|木板格子|目标盒|玩法$)/.test(n)) return 0;
  if (/关卡|玩法规则|棋盘|导入透明|字母型/.test(n) && !/导出|录制|手指/.test(n)) return 0;
  if (/外观|镜头|场景|3D|线条|发射器|材质|灯光|小人|石头|文字|失败|胜利|树桩|界面|环与扣|轨道|球|色块/.test(n)) return 1;
  return 0;
}

export const ICONS = [
  ['主题', '🎨'], ['关卡', '🧩'], ['画布', '📐'], ['棋盘', '🀄'], ['玩法规则', '📜'], ['玩法', '🎮'],
  ['导入透明', '🖼'], ['外观', '✨'], ['麻将外观', '🀄'], ['积木外观', '🧱'], ['树桩', '🌳'],
  ['镜头', '🎥'], ['场景', '🏞'], ['3D 渲染', '🧊'], ['界面', '🪧'], ['线条', '➡'],
  ['轨道', '🛤'], ['球', '🔴'], ['发射器', '🐸'], ['消除特效', '💥'], ['场景与光照', '💡'],
  ['失败', '🏁'], ['胜利', '🏆'], ['文字', '🔤'], ['木板', '🪵'], ['目标盒', '📦'],
  ['石头', '🪨'], ['小人', '🧍'], ['环与扣', '💍'], ['材质', '💎'], ['字母型', '🔤'],
  ['色块', '🎨'], ['动画', '✨'], ['物理', '💥'], ['粒子', '🎉'], ['音效', '🔊'],
  ['点击与动画', '👆'], ['玩法与动画', '✨'], ['手指', '👆'], ['录制', '⏺'],
  ['导出 AE', '🎞'], ['导出 3D', '🧊'], ['导出 H5', '📱'], ['结束页', '🏁'], ['高级设置', '⚙'],
];

function iconFor(name) {
  const n = String(name || '');
  let best = null, bestLen = -1;
  for (const [k, ic] of ICONS) {
    if (n.startsWith(k) || n.includes(k)) {
      if (k.length > bestLen) { best = ic; bestLen = k.length; }
    }
  }
  return best || '⚙';
}

function groupName(det) {
  return det.dataset.group || det.dataset.g || det.dataset.title ||
    (det.querySelector('summary .gn, summary .sum-t') || det.querySelector('summary'))?.textContent?.replace(/[▸▾▼▲▶►\d]+$/u, '').trim() || '';
}

function ensureSummaryChrome(det) {
  const sum = det.querySelector('summary'); if (!sum) return;
  const name = groupName(det);
  det.dataset.group = name;
  let gi = sum.querySelector('.gi, .ico');
  let gn = sum.querySelector('.gn, .sum-t');
  let gc = sum.querySelector('.gc');
  const count = det.querySelectorAll('.row, .theme-picker').length || det.querySelectorAll('input,select,textarea,button').length;
  if (!gi || !gn) {
    // Preserve existing text, rebuild chrome once.
    if (!sum.dataset.unified) {
      const raw = (gn ? gn.textContent : sum.textContent).replace(/[▸▾▼▲▶►]/g, '').trim();
      sum.innerHTML = `<span class="gi">${iconFor(name || raw)}</span><span class="gn"></span><span class="gc">${count}</span>`;
      sum.querySelector('.gn').textContent = name || raw;
      sum.dataset.unified = '1';
    }
  } else {
    if (gi && !gi.textContent.trim()) gi.textContent = iconFor(name);
    if (!gc) { gc = document.createElement('span'); gc.className = 'gc'; sum.appendChild(gc); }
    gc.textContent = String(count);
  }
}

function insertCats(body) {
  for (const el of [...body.querySelectorAll(':scope > .pcat[data-auto-cat]')]) el.remove();
  const details = [...body.querySelectorAll(':scope > details')];
  const firstAt = [null, null, null, null];
  for (const det of details) {
    const i = catIndex(groupName(det));
    if (firstAt[i] == null) firstAt[i] = det;
  }
  for (let i = 0; i < 4; i++) {
    const h = document.createElement('div');
    h.className = 'pcat'; h.dataset.autoCat = '1'; h.textContent = CATS[i][0];
    let ref = firstAt[i];
    if (!ref) {
      for (let j = i + 1; j < 4; j++) if (firstAt[j]) { ref = firstAt[j]; break; }
    }
    if (ref) body.insertBefore(h, ref); else body.appendChild(h);
  }
}

function bindOpenState(det, openKey) {
  if (!openKey || det.dataset.openBound) return;
  det.dataset.openBound = '1';
  const name = groupName(det);
  try {
    const o = JSON.parse(localStorage.getItem(openKey) || '{}') || {};
    if (name in o) det.open = !!o[name];
  } catch (e) { /* ignore */ }
  det.addEventListener('toggle', () => {
    try {
      const o = JSON.parse(localStorage.getItem(openKey) || '{}') || {};
      o[groupName(det)] = det.open;
      localStorage.setItem(openKey, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  });
}

export function enhancePanel(opts = {}) {
  const body = opts.body || document.getElementById('panelBody');
  if (!body) return;
  const openKey = opts.openKey;
  for (const det of body.querySelectorAll(':scope > details')) {
    ensureSummaryChrome(det);
    bindOpenState(det, openKey);
  }
  insertCats(body);
  syncLevelSelect();
}

export function filterPanel(q) {
  const body = document.getElementById('panelBody'); if (!body) return;
  q = String(q || '').trim().toLowerCase();
  let cur = null, catVis = false;
  const flush = () => { if (cur) cur.classList.toggle('hidden-by-filter', !!q && !catVis); };
  for (const el of body.children) {
    if (el.classList.contains('pcat')) { flush(); cur = el; catVis = false; continue; }
    if (el.tagName !== 'DETAILS') continue;
    const gname = groupName(el).toLowerCase();
    const gHit = !q || gname.includes(q);
    let any = false;
    for (const r of el.querySelectorAll('.row, .theme-picker, .tip')) {
      const hit = gHit || r.textContent.toLowerCase().includes(q);
      r.classList.toggle('hidden-by-filter', !hit);
      any = any || hit;
    }
    if (!el.querySelectorAll('.row, .theme-picker').length) any = gHit || el.textContent.toLowerCase().includes(q);
    el.classList.toggle('hidden-by-filter', !any);
    if (q && any && !el.open) { el.dataset.autoOpen = '1'; el.open = true; }
    else if (!q && el.dataset.autoOpen) { delete el.dataset.autoOpen; el.open = false; }
    catVis = catVis || any;
  }
  flush();
}

export function setAllOpen(open) {
  const body = document.getElementById('panelBody'); if (!body) return;
  for (const det of body.querySelectorAll(':scope > details')) det.open = !!open;
}

function findLevelControl() {
  const keys = ['level', 'startLevel', 'levelIdx', 'levelId', 'lv'];
  for (const k of keys) {
    const el = document.querySelector(`[data-key="${k}"], #${k}, select[name="${k}"]`);
    if (el && (el.tagName === 'SELECT' || el.tagName === 'INPUT')) return el;
  }
  // label-adjacent: a row whose label mentions 关卡 and contains a select
  for (const row of document.querySelectorAll('#panelBody .row')) {
    const lab = (row.querySelector('label, span') || {}).textContent || '';
    if (/^关卡/.test(lab.trim())) {
      const sel = row.querySelector('select');
      if (sel) return sel;
    }
  }
  return null;
}

export function syncLevelSelect() {
  const top = document.getElementById('levelSel');
  if (!top) return;
  const src = findLevelControl();
  if (!src || src === top) {
    if (!src && !top.options.length) top.classList.add('hidden-level');
    return;
  }
  top.classList.remove('hidden-level');
  if (src.tagName === 'SELECT') {
    const html = src.innerHTML, val = src.value;
    if (top.dataset.srcHtml !== html) { top.innerHTML = html; top.dataset.srcHtml = html; }
    if (top.value !== val) top.value = val;
    if (!top.dataset.boundLevel) {
      top.dataset.boundLevel = '1';
      top.addEventListener('change', () => {
        src.value = top.value;
        src.dispatchEvent(new Event('change', { bubbles: true }));
        src.dispatchEvent(new Event('input', { bubbles: true }));
      });
      src.addEventListener('change', () => { if (top.value !== src.value) top.value = src.value; });
    }
  } else if (src.tagName === 'INPUT' && (src.type === 'number' || src.type === 'range')) {
    const min = +src.min || 1, max = +src.max || 20, val = src.value;
    if (!top.dataset.boundLevel) {
      top.innerHTML = '';
      for (let i = min; i <= max; i++) { const o = document.createElement('option'); o.value = String(i); o.textContent = '第 ' + i + ' 关'; top.appendChild(o); }
      top.dataset.boundLevel = '1';
      top.addEventListener('change', () => {
        src.value = top.value;
        src.dispatchEvent(new Event('input', { bubbles: true }));
        src.dispatchEvent(new Event('change', { bubbles: true }));
      });
      src.addEventListener('change', () => { if (top.value !== src.value) top.value = src.value; });
      src.addEventListener('input', () => { if (top.value !== src.value) top.value = src.value; });
    }
    if (top.value !== String(val)) top.value = String(val);
  }
}

let toolsBound = false;
export function bindPanelTools() {
  if (toolsBound) return;
  toolsBound = true;
  const ps = document.getElementById('panelSearch');
  if (ps) ps.addEventListener('input', () => filterPanel(ps.value));
  const ex = document.getElementById('btnExpandAll');
  if (ex) ex.addEventListener('click', () => setAllOpen(true));
  const cl = document.getElementById('btnCollapseAll');
  if (cl) cl.addEventListener('click', () => setAllOpen(false));
}

export function installPanelUI(opts = {}) {
  bindPanelTools();
  const run = () => { try { enhancePanel(opts); } catch (e) { console.warn('panel-ui', e); } };
  run();
  const body = document.getElementById('panelBody');
  if (body && !body.dataset.uiObs) {
    body.dataset.uiObs = '1';
    let t = 0;
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 20); });
    mo.observe(body, { childList: true });
  }
  return { enhancePanel, filterPanel, setAllOpen, syncLevelSelect };
}
