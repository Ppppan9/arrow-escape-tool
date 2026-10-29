// 用 Node 模拟 After Effects ExtendScript 对象模型，实际跑一遍 build_ae_project.jsx，检查建出的工程（图层 / 父级 / 形状 / 修剪关键帧）
import fs from 'fs'; import path from 'path'; import vm from 'vm';
export function runJsxMock(dir) {
  const log = { alerts: [], layers: [], comps: [] };
  class Prop { constructor(name, kids) { this.name = name; this.value = null; this.keys = []; this.kids = []; this.interp = []; this.dimensionsSeparated = false; }
    property(n) { if (typeof n === 'number') return this.kids[n - 1]; let k = this.kids.find(x => x.name === n); if (!k) { k = new Prop(n); this.kids.push(k); } return k; }
    addProperty(n) { const k = new Prop(n); this.kids.push(k); return k; }
    setValue(v) { this.value = v; } setValueAtTime(t, v) { this.keys.push([t, v]); }
    setValuesAtTimes(ts, vs) { if (ts.length !== vs.length) throw new Error('len mismatch ' + this.name); ts.forEach((t, i) => this.keys.push([t, vs[i]])); }
    get numKeys() { return this.keys.length; } setInterpolationTypeAtKey(k, a) { if (k < 1 || k > this.keys.length) throw new Error('bad key index'); this.interp[k - 1] = a; } }
  class Layer { constructor(kind, src) { this.kind = kind; this.src = src; this.root = new Prop('root'); this.name = ''; this.startTime = 0; this.inPoint = 0; this.outPoint = 999; this._parent = null; this.label = 0; }
    property(n) { return this.root.property(n); } set parent(p) { if (p && !(p instanceof Layer)) throw new Error('parent must be layer'); this._parent = p; } get parent() { return this._parent; } }
  class Comp { constructor(name, w, h, pa, d, fps) { Object.assign(this, { name, width: w, height: h, duration: d, frameRate: fps }); this.list = []; const self = this; this.markerProperty = new Prop('marker');
    this.layers = { add: it => self.push(new Layer('footage', it)), addNull: () => self.push(new Layer('null')), addShape: () => self.push(new Layer('shape')), addSolid: (c, n, w, h) => self.push(new Layer('solid', { c, w, h })), addText: t => self.push(new Layer('text', t)) }; log.comps.push(this); }
    push(l) { this.list.push(l); return l; } openInViewer() { } }
  class File { constructor(p) { this.fsName = p; } get exists() { return fs.existsSync(this.fsName); } get parent() { return new File(path.dirname(this.fsName)); } open() { return this.exists; } read() { return fs.readFileSync(this.fsName, 'utf8'); } close() { } }
  const items = []; const project = { items: { addFolder: n => { const f = { name: n, kind: 'folder' }; items.push(f); return f; }, addComp: (...a) => new Comp(...a) }, importFile: io => { if (!io.file.exists) throw new Error('missing ' + io.file.fsName); const it = { name: path.basename(io.file.fsName), file: io.file.fsName }; items.push(it); return it; }, save() { } };
  const ctx = { app: { newProject() { }, project, beginUndoGroup() { }, endUndoGroup() { } }, File, ImportOptions: class { constructor(f) { this.file = f; } canImportAs() { return true; } }, ImportAsType: { FOOTAGE: 1 }, Shape: class { constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = false; } },
    KeyframeInterpolationType: { LINEAR: 'L', HOLD: 'H', BEZIER: 'B' }, BlendingMode: { ADD: 'add' }, ParagraphJustification: { CENTER_JUSTIFY: 1 }, MarkerValue: class { constructor(c) { this.comment = c; } },
    alert: m => log.alerts.push(m), confirm: () => false, $: { fileName: path.join(dir, 'build_ae_project.jsx'), global: {} } };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(dir, 'build_ae_project.jsx'), 'utf8'), ctx, { filename: 'build_ae_project.jsx' });
  return { log, stats: ctx.$.global.__ARROW_ESCAPE_BUILD_STATS, items };
}
