// 箭头挪出 —— Canvas 2D 绘制（设计坐标 720×1280；棋盘用镜头变换后的“参考坐标”像素）
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
export const hexRGB = h => { const v = parseInt((h || '#000000').slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
const FONT = '"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif';
export function baseColor(S, col) { return col && col[0] === '#' ? col : S['col_' + col] || S.col_c; }
// 线当前颜色（参考：被挡后变白并保持；挪出时恢复原色；挡路线闪白）
export function lineColor(S, G, l) {
  if (l.flashT != null && G.t - l.flashT < S.blockerFlashDur) return S.blockerFlashColor;
  if (l.state === 'shake') return S.shakeColor;
  if (l.state === 'out') return S.successColor === 'custom' ? S.successCustomColor : baseColor(S, l.col);
  if (l.marked && S.blockedStyle !== 'shake') return S.blockedColor;
  return baseColor(S, l.col);
}
function roundedPath(g, P, r) {
  g.moveTo(P[0][0], P[0][1]);
  for (let k = 1; k < P.length - 1; k++) { const a = P[k - 1], b = P[k], c = P[k + 1]; const rr = Math.min(r, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, Math.hypot(c[0] - b[0], c[1] - b[1]) / 2); if (rr > 0.01) g.arcTo(b[0], b[1], c[0], c[1], rr); else g.lineTo(b[0], b[1]); }
  g.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
}
export function headTri(S, h, d, p) { const px = -d[1], py = d[0], tip = [h[0] + d[0] * S.headTip * p, h[1] + d[1] * S.headTip * p], bx = h[0] - d[0] * S.headBack * p, by = h[1] - d[1] * S.headBack * p, w = S.headHalfW * p; return [tip, [bx + px * w, by + py * w], [bx - px * w, by - py * w]]; }
// 单条线：辉光 → 深色描边 → 线芯 + 三角箭头。pts 为参考坐标像素
export function drawLineShape(g, S, pts, dir, color, p, alpha = 1) {
  if (pts.length < 2) return;
  const lw = S.lineWidth * p, r = S.cornerR * p, h = pts[pts.length - 1];
  // 线芯在箭头底边处收住，避免从三角形里露出
  const body = pts.slice(); const back = Math.max(0, S.headBack * p - lw * 0.5); { const a = body[body.length - 2], L = Math.hypot(h[0] - a[0], h[1] - a[1]); if (L > back + 0.5) body[body.length - 1] = [h[0] - dir[0] * back, h[1] - dir[1] * back]; }
  const tri = headTri(S, h, dir, p);
  const shape = (w, col, a) => { g.globalAlpha = alpha * a; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.beginPath(); roundedPath(g, body, r); g.stroke(); g.lineWidth = Math.max(0.5, w - lw + 0.08 * p); g.beginPath(); g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath(); g.fill(); g.stroke(); };
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (S.glow > 0) shape(lw * S.glowWidth, color, S.glow * 0.35);
  if (S.outlineW > 0 && S.outlineAlpha > 0) shape(lw + S.outlineW * 2 * p, S.outlineColor, S.outlineAlpha);
  shape(lw, color, 1);
  g.globalAlpha = 1;
}
export function drawDots(g, S, dots, X, Y, p) {
  if (!S.dotShow || S.dotR <= 0) return; g.fillStyle = S.dotColor; const r = S.dotR * p; g.beginPath();
  for (const q of dots) { const x = X(q[0]), y = Y(q[1]); g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); } g.fill();
}
export function drawRipple(g, S, x, y, u) {
  if (u < 0 || u > 1) return; const [a, b, c] = hexRGB(S.rippleColor), e = 1 - Math.pow(1 - Math.min(1, u / 0.45), 3), R = S.rippleR * (0.4 + 0.6 * e);
  g.fillStyle = `rgba(${a},${b},${c},${0.2 * (1 - Math.pow(u, 1.5))})`; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
  const du = Math.max(0, 1 - u / 0.55); if (du > 0) { g.fillStyle = `rgba(${a},${b},${c},${0.55 * du})`; g.beginPath(); g.arc(x, y, S.rippleR * 0.24, 0, 7); g.fill(); }
}
export function drawDisclaimer(g, S, view) {
  if (!S.discShow || !S.discText) return; g.save(); g.font = `${S.discWeight} ${S.discSize}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = S.discColor;
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 3; g.fillText(S.discText, 360, view.y0 + view.h - (1280 - S.discY)); g.restore();
}
// 胜利页：压暗 + 霓虹标题（与线条同款青/绿发光）
export function drawWin(g, S, view, u) {
  if (u <= 0) return; const a = Math.min(1, u * 2.5); g.save();
  g.fillStyle = `rgba(4,10,12,${S.winDim * a})`; g.fillRect(view.x0, view.y0, view.w, view.h);
  const s = 0.85 + 0.15 * (1 - Math.pow(1 - Math.min(1, u * 1.6), 3)), cy = view.y0 + view.h * 0.42;
  g.translate(360, cy); g.scale(s, s); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 92px ${FONT}`;
  if (S.winGlow > 0) { g.shadowColor = S.winColor; for (const b of [40, 18]) { g.shadowBlur = b * S.winGlow; g.fillStyle = S.winColor; g.fillText(S.winTitle, 0, 0); } }
  g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.fillStyle = S.winColor; g.fillText(S.winTitle, 0, 0); g.strokeText(S.winTitle, 0, 0);
  if (S.winSub) { g.font = `600 40px ${FONT}`; g.fillStyle = S.winSubColor; g.shadowColor = S.winColor; g.shadowBlur = 12 * S.winGlow; g.fillText(S.winSub, 0, 92); }
  // 霓虹框线（呼应箭头）
  g.shadowBlur = 14 * S.winGlow; g.shadowColor = S.col_c; g.strokeStyle = S.col_c; g.lineWidth = 5; g.lineCap = 'round';
  const w = 270, y0 = -110; g.beginPath(); g.moveTo(-w, y0); g.lineTo(w - 26, y0); g.stroke(); g.fillStyle = S.col_c; g.beginPath(); g.moveTo(w + 4, y0); g.lineTo(w - 26, y0 - 16); g.lineTo(w - 26, y0 + 16); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(w, 150); g.lineTo(-w + 26, 150); g.stroke(); g.beginPath(); g.moveTo(-w - 4, 150); g.lineTo(-w + 26, 134); g.lineTo(-w + 26, 166); g.closePath(); g.fill();
  g.restore();
}
export function endButton() { return { x: 160, y: 1280 * 0.64, w: 400, h: 104 }; }
export function drawEnd(g, S, view, a) {
  g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(view.x0, view.y0, view.w, view.h); g.fillStyle = '#fff'; g.font = `900 50px ${FONT}`; g.textAlign = 'center'; g.fillText(S.endTitle, 360, 1280 * 0.56);
  const b = endButton(); g.fillStyle = S.col_g; g.shadowColor = S.col_g; g.shadowBlur = 20; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 52); g.fill(); g.shadowBlur = 0; g.fillStyle = '#082018'; g.font = `900 44px ${FONT}`; g.textBaseline = 'middle'; g.fillText(S.h5CtaText || '立即下载', 360, b.y + b.h / 2); g.restore();
}
// 程序绘制卡通手（参考视频造型：奶白手、食指指向左上、橙色袖口 + 亮绿内圈）
export function cartoonHand() {
  const W = 260, H = 300, c = mk(W, H), g = c.getContext('2d');
  g.translate(130, 150); g.rotate(-0.62); g.lineJoin = 'round'; g.lineCap = 'round';
  const skin = g.createLinearGradient(-60, -120, 60, 80); skin.addColorStop(0, '#fffdf8'); skin.addColorStop(0.6, '#f6efe6'); skin.addColorStop(1, '#e2d6c8');
  const O = 'rgba(40,30,30,0.55)';
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
  // 手掌 + 蜷起的三指
  g.fillStyle = skin; g.beginPath(); g.moveTo(-34, -40); g.quadraticCurveTo(-48, 20, -30, 58); g.lineTo(40, 58); g.quadraticCurveTo(58, 10, 50, -26); g.quadraticCurveTo(48, -46, 30, -44); g.quadraticCurveTo(24, -58, 8, -52); g.quadraticCurveTo(-4, -60, -16, -46); g.closePath(); g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0; g.strokeStyle = O; g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = 'rgba(150,120,110,0.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(28, -40); g.quadraticCurveTo(26, -26, 30, -14); g.moveTo(8, -48); g.quadraticCurveTo(6, -34, 10, -22); g.stroke();
  // 食指
  g.fillStyle = skin; g.beginPath(); g.moveTo(-36, -30); g.lineTo(-34, -118); g.quadraticCurveTo(-22, -136, -8, -118); g.lineTo(-10, -40); g.closePath(); g.fill(); g.strokeStyle = O; g.lineWidth = 2.5; g.stroke();
  // 拇指
  g.fillStyle = skin; g.beginPath(); g.ellipse(-44, 8, 15, 28, -0.4, 0, 7); g.fill(); g.stroke();
  // 袖口：橙色圆柱 + 亮绿内圈
  const cuff = g.createLinearGradient(-50, 60, 60, 100); cuff.addColorStop(0, '#ff8a1e'); cuff.addColorStop(1, '#d9520a');
  g.fillStyle = cuff; g.beginPath(); g.roundRect(-46, 52, 98, 44, 16); g.fill(); g.strokeStyle = 'rgba(90,30,0,0.6)'; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = '#8cff3a'; g.beginPath(); g.ellipse(4, 70, 38, 11, 0, 0, 7); g.fill(); g.fillStyle = '#3fd12a'; g.beginPath(); g.ellipse(4, 72, 28, 6, 0, 0, 7); g.fill();
  const m = g.getTransform(), tip = m.transformPoint(new DOMPoint(-21, -132));
  c._ax = tip.x / W; c._ay = tip.y / H; c._cartoon = true; return c;
}
