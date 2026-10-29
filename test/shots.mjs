// 与参考视频逐帧对比：左 = 参考视频帧（需 /workspace/game7-ref/f30），右 = 本工具（自动通关·参考序列，虚拟时钟同一时刻）
import { openPage, advance, shot } from './lib.mjs';
import { execSync } from 'child_process';
const T = { start: 0.05, slide: 7.3, blocked: 4.55, blocked2: 20.72, blocked3: 40.6, later: 38 };
const { b, p } = await openPage();
await p.evaluate(() => { localStorage.clear(); __game.setMany({}); __game.startAuto(); });
let last = 0;
for (const [k, t] of Object.entries(T).sort((a, b) => a[1] - b[1])) { await advance(p, t - last); last = t; await shot(p, `/tmp/tool_${k}.png`); }
await b.close();
for (const [k, t] of Object.entries(T)) execSync(`python3 -c "
from PIL import Image, ImageDraw
a=Image.open('/tmp/tool_${k}.png').convert('RGB'); n=min(int(round(${t}*30))+1,1297)
r=Image.open('/workspace/game7-ref/f30/g%04d.png'%n).convert('RGB').resize(a.size)
c=Image.new('RGB',(a.width*2+12,a.height+40),(40,40,40)); c.paste(r,(0,40)); c.paste(a,(a.width+12,40)); d=ImageDraw.Draw(c); d.text((10,10),'reference %.2fs'%${t},fill=(255,255,0)); d.text((a.width+22,10),'tool %.2fs'%${t},fill=(255,255,0))
c.resize((c.width//2,c.height//2)).save('screenshots/compare_${k}_${t}s.png')"`);
console.log('screenshots/compare_*.png');
