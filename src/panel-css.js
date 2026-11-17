/** Shared control-panel CSS. Call themeCss(theme) to get a stylesheet. */
export const THEMES = {
  mahjong: {
    scheme: 'light', emoji: '🀄',
    pageBg: 'linear-gradient(160deg,#6a1c18 0%,#a33a2a 42%,#e8b07a 100%)',
    ink: '#4a1c10',
    panelBg: 'linear-gradient(#fff6e4,#f3d7a8)',
    panelBorder: '#8a2a1a', panelShadow: '#5a1510',
    titleBg: 'linear-gradient(#c43c2e,#8e1c16)', titleColor: '#ffe9a0', titleShadow: '#5a1510', titleSmall: '#ffe9c8',
    cardBg: '#fffaf0', cardBorder: '#e0b36a', cardTitle: '#8a2a1a',
    btnBg: 'linear-gradient(#d24a3a,#8e1c16)', btnBorder: '#5a1510', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#fff3d6,#f3d9a4)', btnGhostColor: '#8a2a1a', btnGhostBorder: '#c48a3e',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#fff0d8', statusBorder: '#e0b36a', statusColor: '#8a2a1a',
    toolsBg: '#f3d9a4', toolsBorder: '#e0b36a',
    inputBg: '#fffaf0', inputBorder: '#c48a3e', inputColor: '#4a1c10',
    catBg: 'linear-gradient(90deg,#8a2a1a,#c48a3e 70%,transparent)',
    detailsBorder: '#e0b36a', detailsBg: '#fffaf0', detailsOpen: '#c48a3e',
    summaryBg: 'linear-gradient(#fff3d6,#f6dfae)', summaryColor: '#7a4a1c',
    iconBg: '#fff', iconBorder: '#c48a3e', countColor: '#8a2a1a',
    rowLabel: '#5a3414', rowOdd: 'rgba(200,80,40,.08)',
    rangeBg: 'linear-gradient(#ecd3a2,#f7e6c4)', rangeBorder: '#c48a3e',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffd36b,#c43c2e)', thumbBorder: '#8a2a1a',
    switchOff: '#d8c39a', switchBorder: '#8a2a1a',
    tipBg: '#fff8e6', tipColor: '#8a6a40', tipBorder: '#e3c385',
    recColor: '#b4421f', scrollThumb: '#c9995a', accent: '#c43c2e',
  },
  screw: {
    scheme: 'light', emoji: '🔩',
    pageBg: 'linear-gradient(160deg,#3a3f48 0%,#6a7380 45%,#c5cad1 100%)',
    ink: '#2a2e34',
    panelBg: 'linear-gradient(#f4f1ea,#ddd6c8)',
    panelBorder: '#6a4a28', panelShadow: '#3e2a14',
    titleBg: 'linear-gradient(#c47a2a,#8a4e14)', titleColor: '#fff6e0', titleShadow: '#5a3010', titleSmall: '#ffe9c8',
    cardBg: '#faf7f0', cardBorder: '#c4a878', cardTitle: '#6a4a28',
    btnBg: 'linear-gradient(#c47a2a,#8a4e14)', btnBorder: '#5a3010', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#7aa0c8,#3d5f86)', btnBlueBorder: '#2a4060',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#f7f0e2,#e4d8c0)', btnGhostColor: '#6a4a28', btnGhostBorder: '#b08a50',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#ece6da', statusBorder: '#c4a878', statusColor: '#3e2a14',
    toolsBg: '#e4d8c0', toolsBorder: '#c4a878',
    inputBg: '#faf7f0', inputBorder: '#b08a50', inputColor: '#2a2e34',
    catBg: 'linear-gradient(90deg,#6a4a28,#c47a2a 70%,transparent)',
    detailsBorder: '#c4a878', detailsBg: '#faf7f0', detailsOpen: '#b08a50',
    summaryBg: 'linear-gradient(#f7f0e2,#e8dcc6)', summaryColor: '#6a4a28',
    iconBg: '#fff', iconBorder: '#b08a50', countColor: '#6a4a28',
    rowLabel: '#4a3a24', rowOdd: 'rgba(196,122,42,.08)',
    rangeBg: 'linear-gradient(#e4d8c0,#f4f1ea)', rangeBorder: '#b08a50',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffd36b,#c47a2a)', thumbBorder: '#6a4a28',
    switchOff: '#c8c0b0', switchBorder: '#6a4a28',
    tipBg: '#f7f0e2', tipColor: '#6a5a40', tipBorder: '#d4c4a0',
    recColor: '#b4421f', scrollThumb: '#b08a50', accent: '#c47a2a',
  },
  coffee: {
    scheme: 'light', emoji: '☕',
    pageBg: 'linear-gradient(160deg,#3a2418 0%,#6b3d24 40%,#d4a574 100%)',
    ink: '#3a2418',
    panelBg: 'linear-gradient(#fff8ee,#f0d8b8)',
    panelBorder: '#6b3d24', panelShadow: '#3a2418',
    titleBg: 'linear-gradient(#7a4a28,#4a2c18)', titleColor: '#ffe9c8', titleShadow: '#2a1810', titleSmall: '#f5d7b0',
    cardBg: '#fffaf3', cardBorder: '#d4a574', cardTitle: '#6b3d24',
    btnBg: 'linear-gradient(#8a5a34,#5a3418)', btnBorder: '#3a2418', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#fff3e0,#ebd0b0)', btnGhostColor: '#6b3d24', btnGhostBorder: '#c4925a',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#f7e6d0', statusBorder: '#d4a574', statusColor: '#5a3418',
    toolsBg: '#ebd0b0', toolsBorder: '#d4a574',
    inputBg: '#fffaf3', inputBorder: '#c4925a', inputColor: '#3a2418',
    catBg: 'linear-gradient(90deg,#6b3d24,#c4925a 70%,transparent)',
    detailsBorder: '#d4a574', detailsBg: '#fffaf3', detailsOpen: '#c4925a',
    summaryBg: 'linear-gradient(#fff3e0,#f0d8b8)', summaryColor: '#6b3d24',
    iconBg: '#fff', iconBorder: '#c4925a', countColor: '#6b3d24',
    rowLabel: '#5a3418', rowOdd: 'rgba(107,61,36,.08)',
    rangeBg: 'linear-gradient(#ebd0b0,#fff8ee)', rangeBorder: '#c4925a',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffd36b,#8a5a34)', thumbBorder: '#6b3d24',
    switchOff: '#d8c3a8', switchBorder: '#6b3d24',
    tipBg: '#fff8ee', tipColor: '#8a6a48', tipBorder: '#e4c8a4',
    recColor: '#b4421f', scrollThumb: '#c4925a', accent: '#8a5a34',
  },
  'block-shooter': {
    scheme: 'light', emoji: '🎯',
    pageBg: 'linear-gradient(160deg,#12345a 0%,#1e6aaa 45%,#7ec8f0 100%)',
    ink: '#123045',
    panelBg: 'linear-gradient(#eef7ff,#d0e8fb)',
    panelBorder: '#1e5a9c', panelShadow: '#0d2a4a',
    titleBg: 'linear-gradient(#ff8a2a,#e85a10)', titleColor: '#fff', titleShadow: '#9a3a08', titleSmall: '#ffe9c8',
    cardBg: '#f7fbff', cardBorder: '#8ab8e0', cardTitle: '#1e5a9c',
    btnBg: 'linear-gradient(#3a8ad6,#1e5a9c)', btnBorder: '#0d2a4a', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#eef7ff,#cce0f4)', btnGhostColor: '#1e5a9c', btnGhostBorder: '#6aa0d0',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#e6f3ff', statusBorder: '#8ab8e0', statusColor: '#123045',
    toolsBg: '#cce0f4', toolsBorder: '#8ab8e0',
    inputBg: '#f7fbff', inputBorder: '#6aa0d0', inputColor: '#123045',
    catBg: 'linear-gradient(90deg,#1e5a9c,#ff8a2a 70%,transparent)',
    detailsBorder: '#8ab8e0', detailsBg: '#f7fbff', detailsOpen: '#3a8ad6',
    summaryBg: 'linear-gradient(#eef7ff,#d0e8fb)', summaryColor: '#1e5a9c',
    iconBg: '#fff', iconBorder: '#3a8ad6', countColor: '#1e5a9c',
    rowLabel: '#1a4068', rowOdd: 'rgba(30,90,156,.07)',
    rangeBg: 'linear-gradient(#cce0f4,#eef7ff)', rangeBorder: '#6aa0d0',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffd36b,#ff8a2a)', thumbBorder: '#1e5a9c',
    switchOff: '#b8cce0', switchBorder: '#1e5a9c',
    tipBg: '#eef7ff', tipColor: '#3a5a78', tipBorder: '#b8d4ec',
    recColor: '#b4421f', scrollThumb: '#6aa0d0', accent: '#ff8a2a',
  },
  voxel: {
    scheme: 'dark', emoji: '🎯',
    pageBg: 'linear-gradient(160deg,#1a2214 0%,#3a4a28 50%,#6a7a40 100%)',
    ink: '#e8f0d8',
    panelBg: 'linear-gradient(#2a3320,#1c2416)',
    panelBorder: '#8a9a40', panelShadow: '#0e140a',
    titleBg: 'linear-gradient(#6a7a30,#3a4a18)', titleColor: '#e8f6a0', titleShadow: '#1a2208', titleSmall: '#c8d680',
    cardBg: '#242c1c', cardBorder: '#5a6a30', cardTitle: '#d4e080',
    btnBg: 'linear-gradient(#6a7a30,#3a4a18)', btnBorder: '#1a2208', btnColor: '#f4ffc8',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#3a4a28,#2a3320)', btnGhostColor: '#e8f0d8', btnGhostBorder: '#6a7a40',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#1c2416', statusBorder: '#5a6a30', statusColor: '#d4e080',
    toolsBg: '#2a3320', toolsBorder: '#5a6a30',
    inputBg: '#1a2214', inputBorder: '#6a7a40', inputColor: '#e8f0d8',
    catBg: 'linear-gradient(90deg,#3a4a18,#8a9a40 70%,transparent)',
    detailsBorder: '#5a6a30', detailsBg: '#242c1c', detailsOpen: '#8a9a40',
    summaryBg: 'linear-gradient(#3a4a28,#2a3320)', summaryColor: '#e8f6a0',
    iconBg: '#1c2416', iconBorder: '#8a9a40', countColor: '#d4e080',
    rowLabel: '#c8d6a8', rowOdd: 'rgba(138,154,64,.08)',
    rangeBg: 'linear-gradient(#3a4a28,#2a3320)', rangeBorder: '#6a7a40',
    thumbBg: 'radial-gradient(circle at 35% 35%,#e8f6a0,#6a7a30)', thumbBorder: '#8a9a40',
    switchOff: '#3a4a28', switchBorder: '#6a7a40',
    tipBg: '#1c2416', tipColor: '#a8b880', tipBorder: '#5a6a30',
    recColor: '#ffb0a0', scrollThumb: '#6a7a40', accent: '#c8d64a',
  },
  zuma: {
    scheme: 'dark', emoji: '🐸',
    pageBg: 'linear-gradient(160deg,#143018 0%,#1e6a32 45%,#c4a024 100%)',
    ink: '#f4ffe8',
    panelBg: 'linear-gradient(#1c3a22,#122818)',
    panelBorder: '#c4a024', panelShadow: '#0a1a0c',
    titleBg: 'linear-gradient(#2a8a3a,#146022)', titleColor: '#ffe56a', titleShadow: '#0a3010', titleSmall: '#e8f8c0',
    cardBg: '#183420', cardBorder: '#3a8a48', cardTitle: '#ffe56a',
    btnBg: 'linear-gradient(#2a8a3a,#146022)', btnBorder: '#0a3010', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#245830,#183420)', btnGhostColor: '#e8f8c0', btnGhostBorder: '#3a8a48',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#122818', statusBorder: '#3a8a48', statusColor: '#e8f8c0',
    toolsBg: '#183420', toolsBorder: '#3a8a48',
    inputBg: '#122818', inputBorder: '#3a8a48', inputColor: '#f4ffe8',
    catBg: 'linear-gradient(90deg,#146022,#c4a024 70%,transparent)',
    detailsBorder: '#3a8a48', detailsBg: '#183420', detailsOpen: '#c4a024',
    summaryBg: 'linear-gradient(#245830,#183420)', summaryColor: '#ffe56a',
    iconBg: '#122818', iconBorder: '#c4a024', countColor: '#ffe56a',
    rowLabel: '#d0e8c0', rowOdd: 'rgba(196,160,36,.08)',
    rangeBg: 'linear-gradient(#245830,#183420)', rangeBorder: '#3a8a48',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffe56a,#c4a024)', thumbBorder: '#146022',
    switchOff: '#2a4a30', switchBorder: '#3a8a48',
    tipBg: '#122818', tipColor: '#b8d8a0', tipBorder: '#3a8a48',
    recColor: '#ffb0a0', scrollThumb: '#3a8a48', accent: '#c4a024',
  },
  arrow: {
    scheme: 'light', emoji: '➡',
    pageBg: 'linear-gradient(160deg,#0e5a62 0%,#1aa0a8 45%,#7ee0d8 100%)',
    ink: '#0e3a40',
    panelBg: 'linear-gradient(#f0fffc,#c8f0ee)',
    panelBorder: '#0e7a80', panelShadow: '#084448',
    titleBg: 'linear-gradient(#14b0b0,#0e7a80)', titleColor: '#fff', titleShadow: '#084448', titleSmall: '#e0fffc',
    cardBg: '#f7fffe', cardBorder: '#7ec8c8', cardTitle: '#0e5a62',
    btnBg: 'linear-gradient(#14b0b0,#0e7a80)', btnBorder: '#084448', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#f0fffc,#c8ece8)', btnGhostColor: '#0e5a62', btnGhostBorder: '#5ab8b8',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#e0f8f6', statusBorder: '#7ec8c8', statusColor: '#0e5a62',
    toolsBg: '#c8ece8', toolsBorder: '#7ec8c8',
    inputBg: '#f7fffe', inputBorder: '#5ab8b8', inputColor: '#0e3a40',
    catBg: 'linear-gradient(90deg,#0e7a80,#14b0b0 70%,transparent)',
    detailsBorder: '#7ec8c8', detailsBg: '#f7fffe', detailsOpen: '#14b0b0',
    summaryBg: 'linear-gradient(#f0fffc,#c8f0ee)', summaryColor: '#0e5a62',
    iconBg: '#fff', iconBorder: '#14b0b0', countColor: '#0e5a62',
    rowLabel: '#0e4a50', rowOdd: 'rgba(14,122,128,.07)',
    rangeBg: 'linear-gradient(#c8ece8,#f0fffc)', rangeBorder: '#5ab8b8',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffe08a,#e8861f)', thumbBorder: '#0e7a80',
    switchOff: '#b8d8d8', switchBorder: '#0e7a80',
    tipBg: '#f0fffc', tipColor: '#3a6a6c', tipBorder: '#b8e0e0',
    recColor: '#b4421f', scrollThumb: '#5ab8b8', accent: '#14b0b0',
  },
  pin: {
    scheme: 'light', emoji: '📌',
    pageBg: 'linear-gradient(160deg,#6a2848 0%,#c45a7a 45%,#f7c8d0 100%)',
    ink: '#4a1830',
    panelBg: 'linear-gradient(#fff6f8,#f8d0d8)',
    panelBorder: '#a04060', panelShadow: '#5a2038',
    titleBg: 'linear-gradient(#d45a7a,#a04060)', titleColor: '#fff', titleShadow: '#5a2038', titleSmall: '#ffe0e8',
    cardBg: '#fffafb', cardBorder: '#e8a0b0', cardTitle: '#a04060',
    btnBg: 'linear-gradient(#d45a7a,#a04060)', btnBorder: '#5a2038', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#fff6f8,#f0c8d0)', btnGhostColor: '#a04060', btnGhostBorder: '#e08aa0',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#ffe8ee', statusBorder: '#e8a0b0', statusColor: '#a04060',
    toolsBg: '#f0c8d0', toolsBorder: '#e8a0b0',
    inputBg: '#fffafb', inputBorder: '#e08aa0', inputColor: '#4a1830',
    catBg: 'linear-gradient(90deg,#a04060,#d45a7a 70%,transparent)',
    detailsBorder: '#e8a0b0', detailsBg: '#fffafb', detailsOpen: '#d45a7a',
    summaryBg: 'linear-gradient(#fff6f8,#f8d0d8)', summaryColor: '#a04060',
    iconBg: '#fff', iconBorder: '#d45a7a', countColor: '#a04060',
    rowLabel: '#6a2840', rowOdd: 'rgba(212,90,122,.08)',
    rangeBg: 'linear-gradient(#f0c8d0,#fff6f8)', rangeBorder: '#e08aa0',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffd0d8,#d45a7a)', thumbBorder: '#a04060',
    switchOff: '#e0c0c8', switchBorder: '#a04060',
    tipBg: '#fff6f8', tipColor: '#8a4a5c', tipBorder: '#f0c8d0',
    recColor: '#b4421f', scrollThumb: '#e08aa0', accent: '#d45a7a',
  },
  zipper: {
    scheme: 'dark', emoji: '🤐',
    pageBg: 'linear-gradient(160deg,#1a2740 0%,#2a4a7a 50%,#c4a024 100%)',
    ink: '#e8eef8',
    panelBg: 'linear-gradient(#1e2a40,#151c2c)',
    panelBorder: '#c4a024', panelShadow: '#0a1020',
    titleBg: 'linear-gradient(#2a4a7a,#1a3058)', titleColor: '#ffe56a', titleShadow: '#0a1020', titleSmall: '#d0d8e8',
    cardBg: '#1a2438', cardBorder: '#3a5080', cardTitle: '#ffe56a',
    btnBg: 'linear-gradient(#3a5a90,#1e3a68)', btnBorder: '#0a1020', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#2a3a58,#1a2438)', btnGhostColor: '#e8eef8', btnGhostBorder: '#3a5080',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#151c2c', statusBorder: '#3a5080', statusColor: '#d0d8e8',
    toolsBg: '#1a2438', toolsBorder: '#3a5080',
    inputBg: '#12182a', inputBorder: '#3a5080', inputColor: '#e8eef8',
    catBg: 'linear-gradient(90deg,#1a3058,#c4a024 70%,transparent)',
    detailsBorder: '#3a5080', detailsBg: '#1a2438', detailsOpen: '#c4a024',
    summaryBg: 'linear-gradient(#2a3a58,#1a2438)', summaryColor: '#ffe56a',
    iconBg: '#12182a', iconBorder: '#c4a024', countColor: '#ffe56a',
    rowLabel: '#c8d0e0', rowOdd: 'rgba(196,160,36,.07)',
    rangeBg: 'linear-gradient(#2a3a58,#1a2438)', rangeBorder: '#3a5080',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffe56a,#c4a024)', thumbBorder: '#1a3058',
    switchOff: '#2a3a58', switchBorder: '#3a5080',
    tipBg: '#151c2c', tipColor: '#9aa8c0', tipBorder: '#3a5080',
    recColor: '#ffb0a0', scrollThumb: '#3a5080', accent: '#c4a024',
  },
  'ring-belt': {
    scheme: 'dark', emoji: '⭕',
    pageBg: 'linear-gradient(160deg,#1a140c 0%,#3a2a14 45%,#c4a024 100%)',
    ink: '#f4ead0',
    panelBg: 'linear-gradient(#2a2216,#1a140c)',
    panelBorder: '#c4a024', panelShadow: '#0c0a06',
    titleBg: 'linear-gradient(#c4a024,#8a6a14)', titleColor: '#2a1a08', titleShadow: 'transparent', titleSmall: '#3a2a10',
    cardBg: '#241c12', cardBorder: '#6a5a28', cardTitle: '#f5d76a',
    btnBg: 'linear-gradient(#c4a024,#8a6a14)', btnBorder: '#3a2a08', btnColor: '#2a1a08',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#3a2e1a,#241c12)', btnGhostColor: '#f4ead0', btnGhostBorder: '#6a5a28',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#1a140c', statusBorder: '#6a5a28', statusColor: '#f5d76a',
    toolsBg: '#241c12', toolsBorder: '#6a5a28',
    inputBg: '#1a140c', inputBorder: '#6a5a28', inputColor: '#f4ead0',
    catBg: 'linear-gradient(90deg,#8a6a14,#c4a024 70%,transparent)',
    detailsBorder: '#6a5a28', detailsBg: '#241c12', detailsOpen: '#c4a024',
    summaryBg: 'linear-gradient(#3a2e1a,#241c12)', summaryColor: '#f5d76a',
    iconBg: '#1a140c', iconBorder: '#c4a024', countColor: '#f5d76a',
    rowLabel: '#e0d0a8', rowOdd: 'rgba(196,160,36,.08)',
    rangeBg: 'linear-gradient(#3a2e1a,#241c12)', rangeBorder: '#6a5a28',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffe56a,#c4a024)', thumbBorder: '#8a6a14',
    switchOff: '#3a2e1a', switchBorder: '#6a5a28',
    tipBg: '#1a140c', tipColor: '#c0b080', tipBorder: '#6a5a28',
    recColor: '#ffb0a0', scrollThumb: '#6a5a28', accent: '#c4a024',
  },
  'ring-untangle': {
    scheme: 'dark', emoji: '➰',
    pageBg: 'linear-gradient(160deg,#1a2830 0%,#2a5060 45%,#c47a3a 100%)',
    ink: '#e8f0f4',
    panelBg: 'linear-gradient(#1e2c34,#141c22)',
    panelBorder: '#c47a3a', panelShadow: '#0a1014',
    titleBg: 'linear-gradient(#2a6070,#1a3844)', titleColor: '#ffd0a0', titleShadow: '#0a1014', titleSmall: '#c8d8e0',
    cardBg: '#1a262c', cardBorder: '#3a5860', cardTitle: '#ffd0a0',
    btnBg: 'linear-gradient(#c47a3a,#8a4e20)', btnBorder: '#3a2410', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#2a3c44,#1a262c)', btnGhostColor: '#e8f0f4', btnGhostBorder: '#3a5860',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#141c22', statusBorder: '#3a5860', statusColor: '#ffd0a0',
    toolsBg: '#1a262c', toolsBorder: '#3a5860',
    inputBg: '#141c22', inputBorder: '#3a5860', inputColor: '#e8f0f4',
    catBg: 'linear-gradient(90deg,#1a3844,#c47a3a 70%,transparent)',
    detailsBorder: '#3a5860', detailsBg: '#1a262c', detailsOpen: '#c47a3a',
    summaryBg: 'linear-gradient(#2a3c44,#1a262c)', summaryColor: '#ffd0a0',
    iconBg: '#141c22', iconBorder: '#c47a3a', countColor: '#ffd0a0',
    rowLabel: '#c8d8e0', rowOdd: 'rgba(196,122,58,.08)',
    rangeBg: 'linear-gradient(#2a3c44,#1a262c)', rangeBorder: '#3a5860',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffd0a0,#c47a3a)', thumbBorder: '#8a4e20',
    switchOff: '#2a3c44', switchBorder: '#3a5860',
    tipBg: '#141c22', tipColor: '#9ab0b8', tipBorder: '#3a5860',
    recColor: '#ffb0a0', scrollThumb: '#3a5860', accent: '#c47a3a',
  },
  corgi: {
    scheme: 'light', emoji: '🐕',
    pageBg: 'linear-gradient(160deg,#8a4a18 0%,#e89840 45%,#ffe0b0 100%)',
    ink: '#4a2a10',
    panelBg: 'linear-gradient(#fff8ee,#ffd8a0)',
    panelBorder: '#c46a20', panelShadow: '#7a3a10',
    titleBg: 'linear-gradient(#e89840,#c46a20)', titleColor: '#fff', titleShadow: '#7a3a10', titleSmall: '#fff0d0',
    cardBg: '#fffaf3', cardBorder: '#f0b060', cardTitle: '#c46a20',
    btnBg: 'linear-gradient(#e89840,#c46a20)', btnBorder: '#7a3a10', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#fff8ee,#ffd8a0)', btnGhostColor: '#c46a20', btnGhostBorder: '#f0b060',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#fff0d8', statusBorder: '#f0b060', statusColor: '#8a4a18',
    toolsBg: '#ffd8a0', toolsBorder: '#f0b060',
    inputBg: '#fffaf3', inputBorder: '#f0b060', inputColor: '#4a2a10',
    catBg: 'linear-gradient(90deg,#c46a20,#e89840 70%,transparent)',
    detailsBorder: '#f0b060', detailsBg: '#fffaf3', detailsOpen: '#e89840',
    summaryBg: 'linear-gradient(#fff8ee,#ffd8a0)', summaryColor: '#c46a20',
    iconBg: '#fff', iconBorder: '#e89840', countColor: '#c46a20',
    rowLabel: '#6a3a14', rowOdd: 'rgba(232,152,64,.10)',
    rangeBg: 'linear-gradient(#ffd8a0,#fff8ee)', rangeBorder: '#f0b060',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffe0b0,#e89840)', thumbBorder: '#c46a20',
    switchOff: '#e8c898', switchBorder: '#c46a20',
    tipBg: '#fff8ee', tipColor: '#8a6a40', tipBorder: '#ffd8a0',
    recColor: '#b4421f', scrollThumb: '#f0b060', accent: '#e89840',
  },
  wood: {
    scheme: 'light', emoji: '🪵',
    pageBg: 'linear-gradient(160deg,#2f86cc 0%,#5db8f2 45%,#a9dcf7 100%)',
    ink: '#4a2a10',
    panelBg: 'linear-gradient(#fff6dc,#ffe9b8)',
    panelBorder: '#8a5426', panelShadow: '#5d3615',
    titleBg: 'linear-gradient(#5db8f2,#8fd3fa)', titleColor: '#fff', titleShadow: '#2c6ea6', titleSmall: '#e9f7ff',
    cardBg: '#fffaf0', cardBorder: '#d9b26a', cardTitle: '#9a5a20',
    btnBg: 'linear-gradient(#b98652,#8a5426)', btnBorder: '#5d3615', btnColor: '#fff',
    btnPrimaryBg: 'linear-gradient(#7ee063,#3fa83a)', btnPrimaryBorder: '#256d24',
    btnBlueBg: 'linear-gradient(#6db8ff,#3a7fd6)', btnBlueBorder: '#245a9c',
    btnOrangeBg: 'linear-gradient(#ffc36b,#e8861f)', btnOrangeBorder: '#9a5310',
    btnGhostBg: 'linear-gradient(#fff3d6,#f3d9a4)', btnGhostColor: '#7a4a1c', btnGhostBorder: '#b98652',
    btnOnBg: 'linear-gradient(#ff8080,#d63a3a)', btnOnBorder: '#8f2222',
    statusBg: '#e6f6ff', statusBorder: '#8fc7ec', statusColor: '#1f5d8c',
    toolsBg: '#f3d9a4', toolsBorder: '#d9b26a',
    inputBg: '#fffaf0', inputBorder: '#b98652', inputColor: '#4a2a10',
    catBg: 'linear-gradient(90deg,#8a5426,#b98652 70%,transparent)',
    detailsBorder: '#d9b26a', detailsBg: '#fffaf0', detailsOpen: '#c48a3e',
    summaryBg: 'linear-gradient(#fff3d6,#f6dfae)', summaryColor: '#7a4a1c',
    iconBg: '#fff', iconBorder: '#c48a3e', countColor: '#9a5a20',
    rowLabel: '#5a3414', rowOdd: 'rgba(243,217,164,.18)',
    rangeBg: 'linear-gradient(#ecd3a2,#f7e6c4)', rangeBorder: '#b98652',
    thumbBg: 'radial-gradient(circle at 35% 35%,#ffd36b,#e8861f)', thumbBorder: '#8a5426',
    switchOff: '#d8c39a', switchBorder: '#8a5426',
    tipBg: '#fff8e6', tipColor: '#8a6a40', tipBorder: '#e3c385',
    recColor: '#b4421f', scrollThumb: '#c9995a', accent: '#8a5426',
  },
};

export function themeCss(themeKey = 'wood') {
  const t = typeof themeKey === 'string' ? (THEMES[themeKey] || THEMES.wood) : themeKey;
  return `:root,#panel{--p-ink:${t.ink};--p-panel-bg:${t.panelBg};--p-border:${t.panelBorder};--p-shadow:${t.panelShadow};--p-title-bg:${t.titleBg};--p-title:${t.titleColor};--p-title-shadow:${t.titleShadow};--p-title-small:${t.titleSmall};--p-card:${t.cardBg};--p-card-border:${t.cardBorder};--p-card-title:${t.cardTitle};--p-btn:${t.btnBg};--p-btn-border:${t.btnBorder};--p-btn-color:${t.btnColor};--p-primary:${t.btnPrimaryBg};--p-primary-border:${t.btnPrimaryBorder};--p-blue:${t.btnBlueBg};--p-blue-border:${t.btnBlueBorder};--p-orange:${t.btnOrangeBg};--p-orange-border:${t.btnOrangeBorder};--p-ghost:${t.btnGhostBg};--p-ghost-color:${t.btnGhostColor};--p-ghost-border:${t.btnGhostBorder};--p-on:${t.btnOnBg};--p-on-border:${t.btnOnBorder};--p-status:${t.statusBg};--p-status-border:${t.statusBorder};--p-status-color:${t.statusColor};--p-tools:${t.toolsBg};--p-tools-border:${t.toolsBorder};--p-input:${t.inputBg};--p-input-border:${t.inputBorder};--p-input-color:${t.inputColor};--p-cat:${t.catBg};--p-details-border:${t.detailsBorder};--p-details:${t.detailsBg};--p-details-open:${t.detailsOpen};--p-summary:${t.summaryBg};--p-summary-color:${t.summaryColor};--p-icon:${t.iconBg};--p-icon-border:${t.iconBorder};--p-count:${t.countColor};--p-label:${t.rowLabel};--p-odd:${t.rowOdd};--p-range:${t.rangeBg};--p-range-border:${t.rangeBorder};--p-thumb:${t.thumbBg};--p-thumb-border:${t.thumbBorder};--p-switch:${t.switchOff};--p-switch-border:${t.switchBorder};--p-tip:${t.tipBg};--p-tip-color:${t.tipColor};--p-tip-border:${t.tipBorder};--p-rec:${t.recColor};--p-scroll:${t.scrollThumb};--p-accent:${t.accent}}
html,body{background:${t.pageBg} fixed;color:var(--p-ink)}
#panel{width:430px;flex:none;display:flex;flex-direction:column;background:var(--p-panel-bg);border:5px solid var(--p-border);border-radius:22px;overflow:hidden;box-shadow:0 8px 0 var(--p-shadow),0 16px 40px rgba(0,0,0,.35);color:var(--p-ink)}
#panelHead{padding:0 0 8px;background:transparent;border-bottom:4px solid var(--p-border)}
#panelHead h1{margin:0;padding:9px 14px;font-size:20px;font-weight:800;color:var(--p-title);letter-spacing:1px;background:var(--p-title-bg);border-bottom:4px solid var(--p-border);text-shadow:0 2px 0 var(--p-title-shadow);display:flex;align-items:center;gap:8px}
#panelHead h1 small,#panelHead h1 #ver{font-size:12px;font-weight:700;letter-spacing:0;color:var(--p-title-small);text-shadow:none;margin-left:auto;background:transparent;padding:0}
#panelHead h1 #ver{background:rgba(255,255,255,.18);border-radius:12px;padding:1px 8px}
.pcard{margin:6px 10px 0;padding:5px 7px 7px;background:var(--p-card);border:3px solid var(--p-card-border);border-radius:14px}
.pcard .ptitle{font-size:12px;font-weight:800;color:var(--p-card-title);margin:0 0 5px 2px;display:flex;align-items:center;gap:5px}
#panel .btns, .btns{display:flex;flex-wrap:wrap;gap:6px}
#panel .btns button, .btns button{flex:1 1 30%}
.pcard.slim .btns{align-items:center}.pcard.slim button{flex:1 1 0;min-width:0;font-size:12px;padding:2px 6px;border-bottom-width:4px;border-radius:10px}
#panel button, button{font:inherit;font-weight:800;color:var(--p-btn-color);background:var(--p-btn);border:3px solid var(--p-btn-border);border-bottom-width:5px;border-radius:12px;padding:5px 9px;cursor:pointer;white-space:nowrap;text-shadow:0 1px 0 rgba(0,0,0,.25);box-shadow:none}
#panel button:hover, button:hover{filter:brightness(1.08)}
#panel button:active, button:active{transform:translateY(2px);border-bottom-width:3px}
#panel button.primary, button.primary{background:var(--p-primary);border-color:var(--p-primary-border);color:#fff}
#panel button.big, button.big{font-size:15px;padding:7px 10px}
#panel button.blue, button.blue{background:var(--p-blue);border-color:var(--p-blue-border);color:#fff}
#panel button.orange, button.orange{background:var(--p-orange);border-color:var(--p-orange-border);color:#fff}
#panel button.ghost, button.ghost{background:var(--p-ghost);color:var(--p-ghost-color);text-shadow:none;border-color:var(--p-ghost-border)}
#panel button.on, button.on{background:var(--p-on);border-color:var(--p-on-border);color:#fff}
#levelSel,.pselect,#panel select#levelSel{flex:1 1 40%;min-width:0;font:inherit;font-weight:800;font-size:14px;color:var(--p-input-color);background:#fff;border:3px solid var(--p-border);border-radius:12px;padding:5px 8px;cursor:pointer}
#status{margin:6px 10px 0;padding:5px 10px;border-radius:12px;background:var(--p-status);border:2px solid var(--p-status-border);color:var(--p-status-color);font-size:12px;font-weight:700}
#recInfo{margin:4px 12px 0;color:var(--p-rec);font-size:12px;font-weight:700}
#recInfo:empty{display:none}
#recList{margin:0 10px}
#recList a{display:block;color:var(--p-status-color);font-size:12px;font-weight:700;margin-top:3px;word-break:break-all;background:var(--p-card);border:2px dashed var(--p-status-border);border-radius:10px;padding:3px 8px;text-decoration:none}
#panelTools{display:flex;gap:6px;align-items:center;padding:7px 10px;background:var(--p-tools);border-bottom:3px solid var(--p-tools-border)}
#panelTools input{flex:1;min-width:0;font:inherit;font-weight:700;color:var(--p-input-color);background:var(--p-input);border:3px solid var(--p-input-border);border-radius:12px;padding:4px 10px}
#panelTools button{font-size:12px;padding:2px 8px;border-bottom-width:4px;border-radius:10px}
#panelBody{overflow-y:auto;flex:1;padding:4px 10px 30px}
#panelBody::-webkit-scrollbar{width:10px}#panelBody::-webkit-scrollbar-thumb{background:var(--p-scroll);border-radius:10px}
.pcat{margin:12px 2px 2px;font-size:12px;font-weight:800;color:#fff;background:var(--p-cat);padding:3px 10px;border-radius:10px;letter-spacing:1px;text-shadow:0 1px 0 rgba(0,0,0,.3)}
#panel details, details{border:3px solid var(--p-details-border);border-radius:14px;margin:7px 0;background:var(--p-details);overflow:hidden;box-shadow:none}
#panel details[open], details[open]{border-color:var(--p-details-open);box-shadow:0 3px 0 color-mix(in srgb, var(--p-details-open) 35%, transparent)}
#panel summary, summary{cursor:pointer;padding:7px 10px;font-weight:800;font-size:14px;color:var(--p-summary-color);user-select:none;list-style:none;display:flex;align-items:center;gap:8px;background:var(--p-summary);border-radius:0}
#panel summary::-webkit-details-marker, summary::-webkit-details-marker{display:none}
summary .gi, summary .ico{width:26px;height:26px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:9px;background:var(--p-icon);border:2px solid var(--p-icon-border);font-size:15px;color:inherit;padding:0}
summary .gn, summary .sum-t{flex:1}
summary .gc{font-size:11px;font-weight:800;color:var(--p-count);background:var(--p-icon);border:2px solid var(--p-icon-border);border-radius:10px;padding:0 7px}
summary .chev{display:none}
summary::after{content:"▸";font-size:14px;color:var(--p-count);transition:transform .15s;margin-left:auto}
details[open]>summary::after{transform:rotate(90deg)}
details[open]>summary{border-bottom:2px dashed var(--p-tip-border)}
#panel .row, .row{display:flex;align-items:center;gap:6px;padding:4px 10px}
#panel .row:nth-child(odd), .row:nth-child(odd){background:var(--p-odd)}
#panel .row label, #panel .row>span:first-child, .row label{flex:0 0 150px;color:var(--p-label);font-size:12px;font-weight:700}
#panel .row input[type=range], .row input[type=range]{flex:1;min-width:60px;-webkit-appearance:none;appearance:none;height:10px;border-radius:8px;background:var(--p-range);border:2px solid var(--p-range-border);outline:none;cursor:pointer;accent-color:var(--p-accent)}
#panel .row input[type=range]::-webkit-slider-thumb, .row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--p-thumb);border:3px solid var(--p-thumb-border);box-shadow:0 2px 0 var(--p-shadow)}
#panel .row input.val, .row input.val{width:64px;font:inherit;font-weight:700;background:var(--p-input);color:var(--p-input-color);border:2px solid var(--p-input-border);border-radius:8px;padding:2px 4px}
#panel .row input[type=text],#panel .row input[type=number]:not(.val),#panel .row select,#panel .row textarea,
.row input[type=text],.row input[type=number]:not(.val),.row select,.row textarea{flex:1;min-width:0;background:var(--p-input);color:var(--p-input-color);border:2px solid var(--p-input-border);border-radius:9px;padding:3px 6px;font:inherit;font-weight:700}
#panel .row input[type=checkbox]:not(.switch-input){width:20px;height:20px;accent-color:#3fa83a;cursor:pointer}
#panel .row input[type=color]{width:46px;height:26px;border:2px solid var(--p-border);border-radius:8px;background:var(--p-input);padding:1px;cursor:pointer}
#panel .row input[type=file]{flex:1;min-width:0;font-size:11px;color:var(--p-label)}
#panel .row input[type=file]::file-selector-button{font:inherit;font-weight:800;color:var(--p-ghost-color);background:var(--p-ghost);border:2px solid var(--p-ghost-border);border-radius:9px;padding:2px 8px;cursor:pointer}
#panel .row button{padding:2px 9px;font-size:12px;border-bottom-width:4px;border-radius:10px}
.row.hidden-by-filter,details.hidden-by-filter,.pcat.hidden-by-filter{display:none !important}
.handprev{align-items:flex-start}
#handPrev{border-radius:10px;border:3px solid var(--p-border);cursor:crosshair;width:150px;height:190px}
.row.t-switch label,.row.t-switch>span:first-child{flex:1}
.switch{position:relative;display:inline-block;width:50px;height:28px;flex:none;cursor:pointer}
.switch .switch-input{opacity:0;width:0;height:0;position:absolute}
.switch .slider{position:absolute;inset:0;background:var(--p-switch);border:2px solid var(--p-switch-border);border-radius:28px;transition:background .2s}
.switch .slider:before,.switch .thumb{content:"";position:absolute;width:20px;height:20px;left:2px;top:2px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 2px 0 var(--p-shadow)}
.switch .switch-input:checked+.slider{background:var(--p-primary);border-color:var(--p-primary-border)}
.switch .switch-input:checked+.slider:before,.switch .switch-input:checked+.slider .thumb,.switch .switch-input:checked+.slider+.thumb{transform:translateX(22px)}
.switch .switch-input:focus-visible+.slider{outline:3px solid #ffd02a;outline-offset:2px}
.row.dimmed{opacity:.45;pointer-events:none}
.tip{font-size:11px;color:var(--p-tip-color);padding:6px 10px;background:var(--p-tip);border-top:2px dashed var(--p-tip-border)}
.theme-picker{padding:6px 10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
.theme-picker .tp-l{grid-column:1/-1;color:var(--p-label);font-size:12px}
.theme-card{display:flex;flex-direction:column;gap:6px;padding:7px;border-radius:11px;text-align:left;background:var(--p-input);border:2px solid var(--p-input-border);color:var(--p-input-color)}
.theme-card .sw{display:block;height:46px;border-radius:7px}
.theme-card.on{border-color:var(--p-accent);box-shadow:0 0 0 3px color-mix(in srgb, var(--p-accent) 30%, transparent)}
.sec-body{overflow:hidden}
.rec-time{display:inline-block;min-width:5.2ch;text-align:left;font-variant-numeric:tabular-nums}
#levelSel.hidden-level{display:none}
@media(max-width:820px){html,body{height:auto}#app{flex-direction:column;height:auto;padding:6px;gap:12px;min-height:100vh}#stageWrap{flex:none}#stage{height:auto;width:100%;max-height:calc(100vh - 12px)}#panel{width:100%;border-radius:18px}#panelBody{max-height:none;overflow:visible}
  #panel .row,.row{flex-wrap:wrap}#panel .row label,.row label{flex:1 1 100%}#panel .row.t-switch label,#panel .row.t-checkbox label{flex:1 1 0}#panel .btns button,.btns button{flex:1 1 30%;padding:7px 6px}#panelTools{position:sticky;top:0;z-index:2}}
`;
}

export function styleTag(themeKey) {
  return `<style id="unified-panel-css">${themeCss(themeKey)}</style>`;
}
