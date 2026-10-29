// WebAudio 音效：挪出“嗖”、被挡“嗡”、点击、胜利 —— 程序合成（无外部素材）；开场配音为参考视频里提取的音频（src/assets/voice_intro.mp3，可关闭）。
import VOICE_MP3 from './assets/voice_intro.mp3';
export const SFX_NAMES = { voice: ['sfxVoice', '开场配音'], slide: ['sfxSlide', '挪出'], block: ['sfxBlock', '被挡'], tap: ['sfxTap', '点击'], win: ['sfxWin', '胜利'] };
export const SFX_DUR = { voice: 3.5, slide: 0.3, block: 0.65, tap: 0.06, win: 1.3 };
const b64ToBuf = d => { const s = atob(d.split(',')[1]), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
export class Sfx {
  constructor() { this.ctx = null; this.voiceBuf = null; this.voiceSrc = null; }
  ensure() {
    if (this.ctx) return this.ctx;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { this.ctx = new C(); } catch (e) { return null; }
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    try { this.recDest = this.ctx.createMediaStreamDestination(); this.master.connect(this.recDest); } catch (e) { }
    this.makeNoise(); this.loadVoice(); return this.ctx;
  }
  async loadVoice() { if (this.voiceBuf || this._vl) return this._vl; this._vl = new Promise(res => { try { this.ctx.decodeAudioData(b64ToBuf(VOICE_MP3), b => { this.voiceBuf = b; res(b); }, () => res(null)); } catch (e) { res(null); } }); return this._vl; }
  makeNoise() { const len = Math.round(this.ctx.sampleRate * 1.5), b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0); let s = 7; for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } this.noise = b; }
  now() { return this._t != null ? this._t : this.ctx.currentTime; }
  resume() { const c = this.ensure(); if (c && c.state === 'suspended') c.resume(); }
  stopVoice() { try { if (this.voiceSrc) this.voiceSrc.stop(); } catch (e) { } this.voiceSrc = null; }
  // delay：秒（参考视频声音比画面晚 ≈0.15 秒）
  play(name, S, o = {}) {
    const [k] = SFX_NAMES[name] || []; if (!k || S.sfxMute || !S[k]) return;
    const delay = o.delay ?? 0;
    if (this.hook && this._t == null) try { this.hook(name, { ...o, delay }); } catch (e) { }
    if (!this.ensure()) return;
    const v = S.sfxVolume * (S[k + 'Vol'] ?? 1); if (v <= 0) return;
    this['_' + name](this.now() + delay, v, o);
  }
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  osc(t, type, f0, f1, dur, vol, a = 0.004) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur); this.env(g, t, a, vol, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + a + dur + 0.05); }
  nz(t, type, f0, f1, q, dur, vol, a = 0.004) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q; const g = c.createGain(); this.env(g, t, a, vol, dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + a + dur + 0.05); }
  // 参考：很轻很短的高频“嗖”（≈0.15 秒，能量集中在 4~5kHz）
  _slide(t, v) { this.nz(t, 'bandpass', 3200, 6500, 1.4, 0.16, v * 0.55, 0.03); this.nz(t + 0.02, 'highpass', 5000, 7000, 0.7, 0.1, v * 0.18, 0.02); }
  // 参考：短促的中频起音 + 约 100Hz 的低沉“嗡”，0.5 秒衰减
  _block(t, v) { this.nz(t, 'bandpass', 1500, 900, 2, 0.07, v * 0.35, 0.003); this.osc(t + 0.02, 'sine', 120, 95, 0.5, v * 0.65, 0.01); this.osc(t + 0.02, 'triangle', 240, 190, 0.35, v * 0.18, 0.01); this.osc(t + 0.02, 'square', 60, 50, 0.3, v * 0.05, 0.01); }
  _tap(t, v) { this.osc(t, 'triangle', 1800, 1200, 0.03, v * 0.2, 0.001); }
  _win(t, v) { [523, 659, 784, 1047, 1319].forEach((f, i) => { this.osc(t + i * 0.09, 'sine', f, f, 0.55, v * 0.2, 0.006); this.osc(t + i * 0.09, 'triangle', f * 2, f * 2, 0.2, v * 0.04, 0.006); }); this.nz(t + 0.36, 'highpass', 6000, 9000, 1, 0.5, v * 0.08, 0.02); }
  _voice(t, v) { const go = buf => { if (!buf) return; const s = this.ctx.createBufferSource(); s.buffer = buf; const g = this.ctx.createGain(); g.gain.value = v; s.connect(g); g.connect(this.master); s.start(Math.max(t, this.ctx.currentTime || 0)); if (this._t == null) this.voiceSrc = s; }; if (this.voiceBuf) go(this.voiceBuf); else this.loadVoice().then(go); }
}
export async function renderSfxOffline(events, dur, S) {
  const C = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!C) return null;
  const sr = 44100, oc = new C(1, Math.max(1, Math.ceil(sr * dur)), sr);
  const x = new Sfx(); x.ctx = oc; x.master = oc.createGain(); x.master.connect(oc.destination); x.makeNoise();
  if (events.some(e => e.name === 'voice')) { x.voiceBuf = await new Promise(res => { try { oc.decodeAudioData(b64ToBuf(VOICE_MP3), res, () => res(null)); } catch (e) { res(null); } }); }
  const S2 = { ...S, sfxMute: false }; for (const k in SFX_NAMES) S2[SFX_NAMES[k][0]] = true;
  for (const e of events) { x._t = e.t + (e.delay || 0); x.play(e.name, S2, { ...e, delay: 0 }); }
  return await oc.startRendering();
}
export function encodeWav(buf) {
  const ch = buf.getChannelData(0), n = ch.length, dv = new DataView(new ArrayBuffer(44 + n * 2));
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, ch[i])); dv.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
  return new Uint8Array(dv.buffer);
}
