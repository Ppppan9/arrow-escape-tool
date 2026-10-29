// 箭头挪出核玩工具 —— 设置定义（中文标签），版本号 + 迁移。通用分组 / 键名按 game-toolkit-standard/TOOLKIT_STANDARD.md
import { h5DeviceSelectOptions } from './h5/index.js';
export const APP_VERSION = '1.0.1';
export const SETTINGS_VERSION = 1;
export const STORE_KEY = 'arrowEscapeTool.settings';
export const APP_ID = 'arrow-escape-tool';
const ALL8 = 'applovin,facebook,google,mintegral,moloco,tiktok,unity,generic';
// [key, 标签, 类型, 默认, min, max, step]  类型: range/color/bool/select/text/textarea/file/button
export const GROUPS = [
  ['画布与关卡', [
    ['canvasW', '画布宽度(px)', 'range', 720, 360, 1440, 2],
    ['canvasH', '画布高度(px)', 'range', 1280, 640, 2560, 2],
    ['_levelEdit', '关卡编辑器（画线 / 删除 / 改色 / 反向 / 检查可解）', 'button', 'levelEdit', '✏ 打开关卡编辑器'],
    ['_levelCheck', '检查当前关卡是否可全部挪出', 'button', 'levelCheck', '✔ 检查可解'],
    ['_levelExport', '导出关卡 JSON', 'button', 'levelExport', '⬇ 导出关卡'],
    ['_levelImport', '导入关卡 JSON', 'button', 'levelImport', '⬆ 导入关卡'],
    ['_levelImage', '导入透明 PNG / 像素图 → 自动生成可解关卡（颜色取图片）', 'button', 'levelImage', '🖼 图片生成关卡'],
    ['_levelRef', '恢复参考视频关卡（哆啦A梦，200 条线）', 'button', 'levelRef', '↺ 参考关卡'],
    ['levelJson', '关卡数据（JSON；留空 = 内置参考关卡）', 'textarea', ''],
    ['genCols', '图片生成：网格列数', 'range', 40, 6, 80, 1],
    ['genMaxLen', '图片生成：每条线最多格数', 'range', 14, 2, 60, 1],
    ['genColors', '图片生成：颜色', 'select', 'palette', [['palette', '映射到 青 / 绿 / 白 三色（参考风格）'], ['image', '直接用图片颜色']]],
    ['gridAuto', '网格自动居中（关卡尺寸不同于参考时）', 'bool', false],
    ['gridX', '第一列网格点 X(px，参考 39.43)', 'range', 39.43, -200, 700, 0.01],
    ['gridY', '第一行网格点 Y(px，参考 366.96)', 'range', 366.96, -200, 1200, 0.01],
    ['gridPitch', '网格间距(px，参考全景 13.64)', 'range', 13.64, 4, 80, 0.01],
  ]],
  ['线条外观', [
    ['bgColor', '背景颜色(参考≈#121C1F)', 'color', '#121c1f'],
    ['col_c', '青色线(身体，参考≈#36C8E6)', 'color', '#36c8e6'],
    ['col_g', '绿色线(轮廓，参考≈#28F2B6)', 'color', '#28f2b6'],
    ['col_w', '白色线(脸，参考≈#EEFCF9)', 'color', '#eefcf9'],
    ['lineWidth', '线宽(×格距，参考≈0.33)', 'range', 0.33, 0.05, 0.9, 0.01],
    ['cornerR', '拐角圆角半径(×格距，参考≈0.3)', 'range', 0.3, 0, 0.5, 0.01],
    ['outlineW', '深色描边宽(×格距，参考≈0.07)', 'range', 0.07, 0, 0.4, 0.01],
    ['outlineColor', '深色描边颜色', 'color', '#03080a'],
    ['outlineAlpha', '深色描边不透明度', 'range', 0.85, 0, 1, 0.01],
    ['glow', '辉光强度(参考很弱)', 'range', 0.12, 0, 1, 0.01],
    ['glowWidth', '辉光宽度(×线宽)', 'range', 2.6, 1, 8, 0.1],
    ['headTip', '箭头尖超出端点(×格距，参考≈0.49)', 'range', 0.49, 0.1, 1.2, 0.01],
    ['headBack', '箭头底边在端点后(×格距，参考≈0.36)', 'range', 0.36, 0, 1, 0.01],
    ['headHalfW', '箭头半宽(×格距，参考≈0.47)', 'range', 0.47, 0.1, 1, 0.01],
    ['dotShow', '网格点（线挪走后露出的暗点，参考有）', 'bool', true],
    ['dotColor', '网格点颜色(参考≈#263133)', 'color', '#263133'],
    ['dotR', '网格点半径(×格距，参考≈0.09)', 'range', 0.09, 0, 0.4, 0.005],
  ]],
  ['点击与动画', [
    ['hitR', '点击判定半径(×格距；点线上任意位置或箭头)', 'range', 0.6, 0.2, 2, 0.05],
    ['slideV0', '滑出初速度(格/秒)', 'range', 2, 0, 60, 0.5],
    ['slideAccel', '滑出加速度(格/秒²，参考≈300)', 'range', 300, 10, 2000, 5],
    ['slideVmax', '滑出最高速度(格/秒，参考≈72)', 'range', 72, 5, 400, 1],
    ['successColor', '可挪出时线的颜色', 'select', 'keep', [['keep', '保持原色（参考）'], ['custom', '变成下面的高亮色']]],
    ['successCustomColor', '高亮色', 'color', '#39ff88'],
    ['pathPreview', '滑出时显示前方直线光路（参考没有）', 'bool', false],
    ['pathPreviewColor', '光路颜色', 'color', '#39ff88'],
    ['pathPreviewAlpha', '光路不透明度', 'range', 0.35, 0, 1, 0.01],
    ['blockedStyle', '被挡住时的表现', 'select', 'ref', [['ref', '参考：线变白并沿路径冲到挡路线再退回，挡路线闪白'], ['shake', '变红 + 沿箭头方向抖动后恢复（不标记）']]],
    ['blockedColor', '被挡住后线的颜色(参考：白)', 'color', '#ffffff'],
    ['blockedPersist', '被挡住的线保持该颜色直到成功挪出(参考)', 'bool', true],
    ['bumpStopGap', '冲刺停在挡路格前(格，0.5≈箭尖碰到挡路线)', 'range', 0.5, 0, 1, 0.01],
    ['bumpHold', '碰到后停顿(秒，参考≈0.1)', 'range', 0.1, 0, 1, 0.01],
    ['bumpBackDur', '退回时长(秒，参考≈0.2)', 'range', 0.2, 0.02, 1.5, 0.01],
    ['blockerFlash', '挡路线闪一下', 'bool', true],
    ['blockerFlashColor', '挡路线闪烁颜色', 'color', '#ffffff'],
    ['blockerFlashDur', '挡路线闪烁时长(秒，参考≈0.15)', 'range', 0.15, 0.02, 1, 0.01],
    ['blockVig', '被挡时画面边框红光', 'select', 'ref', [['ref', '同参考：前 3 次被挡（0.3 / 0.23 / 0.1 秒），之后不再出现'], ['always', '每次被挡都出现'], ['off', '关闭']]],
    ['blockVigColor', '边框红光颜色', 'color', '#6e000d'],
    ['blockVigWidth', '边框红光宽度(参考像素，参考≈90)', 'range', 90, 10, 300, 1],
    ['blockVigDur', '边框红光时长(秒，“每次”模式)', 'range', 0.3, 0.05, 2, 0.01],
    ['shakeColor', '抖动模式：闪烁颜色', 'color', '#ff4057'],
    ['shakeAmp', '抖动模式：幅度(格)', 'range', 0.25, 0, 1.5, 0.01],
    ['shakeDur', '抖动模式：时长(秒)', 'range', 0.3, 0.05, 2, 0.01],
    ['shakeFreq', '抖动模式：来回次数', 'range', 4, 1, 12, 0.5],
  ]],
  ['镜头', [
    ['camMode', '镜头', 'select', 'ref', [['ref', '参考：开场全景，随后放大并跟随（可拖动平移）'], ['fit', '始终显示整个关卡（不放大）']]],
    ['camZoom', '放大倍数(参考≈1.647)', 'range', 1.647, 1, 4, 0.001],
    ['introHold', '开场全景停留(秒，参考≈0.75)', 'range', 0.75, 0, 5, 0.05],
    ['introZoomDur', '放大过渡(秒，参考≈0.85)', 'range', 0.85, 0.05, 3, 0.05],
    ['camPanDur', '平移过渡(秒，参考≈1.1~1.3)', 'range', 1.15, 0.1, 3, 0.05],
    ['camMargin', '目标离画面边缘多近时平移(×画面宽)', 'range', 0.1, 0, 0.4, 0.01],
    ['dragPan', '手动游玩：拖动平移镜头', 'bool', true],
    ['wheelZoom', '手动游玩：滚轮缩放', 'bool', true],
    ['autoPanEmpty', '手动游玩：画面里没线了自动移到剩余的线', 'bool', true],
  ]],
  ['文字', [
    ['discShow', '显示底部声明', 'bool', true],
    ['discText', '底部声明', 'text', '广告素材宣传场景须达到一定条件，触发相关支线玩法'],
    ['discSize', '字号(px，参考≈20.5)', 'range', 20.5, 8, 48, 0.5],
    ['discY', '文字中心 Y(px，参考≈1265)', 'range', 1265, 0, 1280, 1],
    ['discColor', '文字颜色', 'color', '#ffffff'],
    ['discWeight', '字重', 'select', '500', [['400', '常规'], ['500', '中等（参考）'], ['700', '粗']]],
  ]],
  ['胜利页（参考视频没有）', [
    ['winShow', '全部挪出后显示胜利页', 'bool', true],
    ['winDelay', '最后一条挪出后出现延迟(秒)', 'range', 0.5, 0, 5, 0.05],
    ['winZoomOut', '胜利时镜头拉回全景', 'bool', true],
    ['winTitle', '标题', 'text', '全部挪出！'],
    ['winSub', '副标题', 'text', '你就是最强大脑'],
    ['winColor', '标题颜色(霓虹)', 'color', '#28f2b6'],
    ['winSubColor', '副标题颜色', 'color', '#eefcf9'],
    ['winGlow', '标题辉光', 'range', 0.8, 0, 2, 0.05],
    ['winDim', '背景压暗', 'range', 0.45, 0, 0.9, 0.01],
  ]],
  ['音效', [
    ['sfxMute', '静音', 'bool', false],
    ['sfxVolume', '总音量', 'range', 0.8, 0, 1.5, 0.01],
    ['sfxDelay', '音效相对线开始动的延迟(秒，参考≈0.09)', 'range', 0.09, 0, 0.5, 0.01],
    ['sfxVoice', '开场配音“谁能把箭头全部挪出来？我就彻底服他。”（可选；从参考视频提取，默认关闭）', 'bool', false],
    ['sfxVoiceVol', '开场配音 音量', 'range', 1, 0, 2, 0.01],
    ['voiceAt', '配音开始时刻(秒)', 'range', 0, 0, 5, 0.05],
    ['sfxSlide', '挪出“嗖”', 'bool', true],
    ['sfxSlideVol', '挪出 音量', 'range', 0.8, 0, 2, 0.01],
    ['sfxBlock', '被挡“嗡”', 'bool', true],
    ['sfxBlockVol', '被挡 音量', 'range', 0.9, 0, 2, 0.01],
    ['sfxTap', '点击“嗒”（参考没有）', 'bool', false],
    ['sfxTapVol', '点击 音量', 'range', 0.6, 0, 2, 0.01],
    ['sfxWin', '胜利', 'bool', true],
    ['sfxWinVol', '胜利 音量', 'range', 0.8, 0, 2, 0.01],
  ]],
  ['手指 / 自动通关', [
    ['autoMode', '自动通关顺序', 'select', 'ref', [['ref', '参考视频顺序（27 次点击，含 5 次被挡）→ 之后自动求解到清空'], ['solver', '纯求解顺序（只点能挪出的线）'], ['solverMiss', '求解 + 偶尔点错（被挡）']]],
    ['missChance', '求解+点错：点错概率', 'range', 0.15, 0, 0.8, 0.01],
    ['autoSpeed', '整体速度倍率', 'range', 1, 0.25, 6, 0.05],
    ['autoHandTrack', '参考序列：手指按参考视频逐帧轨迹移动（关掉 = 按下方移动参数）', 'bool', true],
    ['autoTapLatency', '自动点击：按下到线开始动的延迟(秒，参考≈0.05)', 'range', 0.05, 0, 0.5, 0.01],
    ['moveMin', '移动耗时最小(ms)', 'range', 350, 50, 2000, 10],
    ['moveMax', '移动耗时最大(ms)', 'range', 650, 50, 3000, 10],
    ['delayMin', '点击间隔最小(ms)', 'range', 300, 0, 2000, 10],
    ['delayMax', '点击间隔最大(ms)', 'range', 900, 0, 4000, 10],
    ['thinkChance', '“思考停顿”概率', 'range', 0.1, 0, 0.6, 0.01],
    ['thinkMax', '思考停顿最长(ms)', 'range', 900, 0, 4000, 50],
    ['jitter', '落点随机抖动(px)', 'range', 3, 0, 40, 1],
    ['autoPick', '求解时选线策略', 'select', 'near', [['near', '离手指最近（少平移）'], ['scan', '从上到下扫'], ['random', '随机']]],
    ['autoStartDelay', '开始前等待(ms，参考第一次点击≈1.85 秒)', 'range', 1850, 0, 5000, 50],
    ['handStyle', '手指样式（未上传图片时）', 'select', 'preset', [['preset', '预设手指 hand.png（与其它核玩工具同款，默认）'], ['cartoon', '程序绘制卡通手（参考视频造型：白手 + 橙袖口 + 绿边）'], ['none', '不显示手指']]],
    ['handImage', '上传手指图片(透明PNG；留空=用上面的手指样式)', 'file', ''],
    ['handSize', '手指大小(画面宽比例，参考≈0.16)', 'range', 0.16, 0.05, 0.9, 0.01],
    ['handAnchorX', '指尖锚点 X(0~1，预设手指/上传图片)', 'range', 0.2204, 0, 1, 0.0001],
    ['handAnchorY', '指尖锚点 Y(0~1，预设手指/上传图片)', 'range', 0.0367, 0, 1, 0.0001],
    ['handRotation', '手指旋转(度)', 'range', 0, -60, 60, 1],
    ['handFlip', '手指水平翻转', 'bool', false],
    ['pressEnabled', '点击按下效果', 'bool', true],
    ['pressDepth', '按压幅度（按下时手指缩小比例）', 'range', 0.12, 0, 0.3, 0.01],
    ['tapRipple', '点击处灰色波纹圈（参考有）', 'bool', true],
    ['rippleColor', '波纹颜色(参考≈浅灰)', 'color', '#c9cdd0'],
    ['rippleR', '波纹最大半径(px)', 'range', 24, 4, 120, 1],
    ['rippleDur', '波纹时长(秒，参考≈0.5)', 'range', 0.5, 0.1, 2, 0.05],
    ['handShow', '显示手指', 'bool', true],
    ['manualHand', '手动游玩时手指跟随指针', 'bool', true],
    ['hideCursor', '手指出现时隐藏鼠标', 'bool', true],
  ]],
  ['录制', [
    ['recFps', '帧率', 'range', 30, 15, 60, 1],
    ['recFormat', '格式', 'select', 'auto', [['auto', '自动(优先 MP4)'], ['mp4', 'MP4'], ['webm', 'WebM']]],
    ['recBitrate', '码率(Mbps)', 'range', 8, 1, 30, 0.5],
    ['autoRec', '自动通关开始时自动录制（默认关）', 'bool', false],
    ['autoStop', '自动通关结束后停止录制并下载（仅在正在录制时）', 'bool', true],
    ['tailSec', '结束后继续录制(秒)', 'range', 2, 0, 10, 0.1],
  ]],
  ['导出 AE 工程', [
    ['_aeToggle', '记录 AE 时间轴（自动通关/手动游玩都可）', 'button', 'aeToggle', '● 开始记录'],
    ['_aeExport', '重新导出上一次记录', 'button', 'aeExport', '⬇ 导出 ZIP'],
    ['aeWithRec', '录制视频时同步记录，停止录制后自动导出', 'bool', true],
    ['aeFps', 'AE 合成帧率', 'select', '30', [['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']]],
    ['aeSize', 'AE 合成尺寸', 'select', 'canvas', [['canvas', '同画布分辨率'], ['720x1280', '720×1280'], ['1080x1920', '1080×1920']]],
    ['aeSampling', '关键帧方式', 'select', 'reduce', [['reduce', '精简关键帧（线性插值）'], ['bake', '逐帧烘焙（每帧一个关键帧）']]],
    ['aeNames', '图层命名', 'select', 'zh', [['zh', '中文'], ['en', 'English']]],
    ['aeAudio', '音频', 'select', 'both', [['both', '混合音轨 + 逐事件音效层'], ['mixed', '仅混合音轨'], ['events', '仅逐事件音效层'], ['none', '不导出音频']]],
    ['aeLines', '箭头线图层', 'select', 'all', [['all', '每条线都导出（形状图层 + 修剪路径）'], ['touched', '只导出被点过的线，其余合成一张静态图']]],
    ['aeSaveAep', '脚本跑完后提示另存为 .aep', 'bool', true],
  ]],
  ['导出 H5 试玩广告', [
    ['_exportH5', '导出当前设置为自包含 H5 试玩（无编辑器面板，仅游戏+CTA）', 'button', 'exportH5', '⬇ 导出 H5 试玩 ZIP'],
    ['h5Format', '渠道格式', 'select', ALL8, [[ALL8, '全部（AppLovin+Facebook+Google+Mintegral+Moloco+TikTok+Unity+Generic）'], ['tiktok,generic', 'TikTok + Generic'], ['applovin', '仅 AppLovin（MRAID）'], ['facebook', '仅 Facebook/Meta（≤2MB）'], ['google', '仅 Google Ads'], ['mintegral', '仅 Mintegral'], ['moloco', '仅 Moloco'], ['tiktok', '仅 TikTok/Pangle'], ['unity', '仅 Unity Ads（MRAID）'], ['generic', '仅 Generic 离线']]],
    ['h5Orientation', '试玩方向', 'select', '1', [['0', '双端 (0)'], ['1', '竖屏 (1)'], ['2', '横屏 (2)']]],
    ['h5Device', '预览机型', 'select', 'adaptive', h5DeviceSelectOptions()],
    ['h5DeviceW', '预览宽度(px)', 'range', 390, 240, 1440, 1],
    ['h5DeviceH', '预览高度(px)', 'range', 844, 400, 2560, 1],
    ['h5CtaText', 'CTA 按钮文案', 'text', '立即下载'],
    ['h5StoreUrl', '应用商店 / 落地页 URL', 'text', 'https://play.google.com/store/apps/details?id=com.example.game'],
    ['h5GameName', '游戏名（可选）', 'text', '箭头挪出'],
    ['h5Icon', '应用图标（可选，透明PNG）', 'file', ''],
    ['h5MaxMb', '体积告警阈值(MB)', 'range', 5, 1, 20, 0.5],
    ['h5AutoPlay', '打开试玩后自动通关演示', 'bool', false],
  ]],
  ['结束页(End Card)', [
    ['endCard', '显示结束页（下载按钮；参考视频没有）', 'bool', false],
    ['endCardHand', '结束页显示手指（自动通关点按钮）', 'bool', false],
    ['endDelay', '胜利页后出现延迟(ms)', 'range', 1200, 0, 5000, 50],
    ['endTitle', '标题', 'text', '立即下载 挑战更多关卡'],
  ]],
];
export const DEFS = {};
for (const [, items] of GROUPS) for (const it of items) if (it[2] !== 'button') DEFS[it[0]] = it[3];
// migrate：只补默认值、把仍等于旧默认值的项换成新默认、旧键→新键；不覆盖用户改过的值
export const OLD_DEFAULTS = { /* 版本 → { 键: 旧默认 } */ };
export function migrate(obj) {
  if (!obj || typeof obj !== 'object') return { ...DEFS };
  let v = obj.version || 0; const s = { ...(obj.settings || obj) };
  if (v < 1) { // 其它核玩工具通用旧键 → v1
    const mv = (o, n, f = x => x) => { if (o in s) { if (!(n in s)) s[n] = f(s[o]); delete s[o]; } };
    mv('handImg', 'handImage'); mv('sfxVol', 'sfxVolume'); mv('sfx', 'sfxMute', x => !x); mv('recTail', 'tailSec', x => Math.round(x / 100) / 10); mv('endText', 'endTitle');
    if ('handGlove' in s) { if (!s.handImage && !s.handStyle) s.handStyle = s.handGlove === false ? 'none' : 'preset'; delete s.handGlove; }
    if (s.h5Format === 'tiktok,google,mintegral,generic') s.h5Format = ALL8;
    v = 1;
  }
  for (const nv of Object.keys(OLD_DEFAULTS).map(Number).sort((a, b) => a - b)) if (v < nv) { for (const k in OLD_DEFAULTS[nv]) if (s[k] === OLD_DEFAULTS[nv][k]) delete s[k]; v = nv; }
  const out = { ...DEFS };
  for (const k in DEFS) if (k in s && typeof s[k] === typeof DEFS[k]) out[k] = s[k];
  return out;
}
export function loadSettings() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { }
  return { ...DEFS };
}
export function saveSettings(S) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ version: SETTINGS_VERSION, settings: S })); } catch (e) { console.warn('save fail (图片过大?)', e); }
}
export function exportJSON(S) { return JSON.stringify({ app: APP_ID, version: SETTINGS_VERSION, settings: S }, null, 2); }
