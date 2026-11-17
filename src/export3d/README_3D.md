# 3D 动画导出说明

zip 内容：`scene.glb`（glTF 2.0，含动画）、`scene3d.json`（帧率 / 相机 / 节点）、`timeline.json`（同一次 AE 记录）、`blender_import.py`、以及本次记录的 `audio/`（若有）。

- 坐标：根节点缩放 0.01（1 合成像素 = 1 cm）；绕 X 轴 -90°（页面 z 向上 → glTF Y 向上）。
- 图层：AE 时间轴里的素材平面 / 纯色平面 / 简单形状（三角形、椭圆、折线挤出），带位置、缩放、旋转、不透明度关键帧。
- 相机 `camera_ortho`：与页面同一正交俯视取景。
- Blender：在 Scripting 里运行与 `scene.glb` 同目录的 `blender_import.py`，会导入 GLB、设帧率与分辨率、把音频加入视频序列编辑器。
