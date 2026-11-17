# -*- coding: utf-8 -*-
"""核玩工具 3D 动画导入脚本（Blender 3.6 / 4.x）：与 scene.glb 同目录运行。"""
import bpy, json, os
HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() and __file__ else os.getcwd()
meta = json.load(open(os.path.join(HERE, "scene3d.json"), encoding="utf-8"))
scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
scene.render.fps = int(meta["fps"]); scene.render.fps_base = 1.0
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "scene.glb"))
scene.frame_start = 0; scene.frame_end = int(meta["frameEnd"])
scene.render.resolution_x = int(meta["width"]); scene.render.resolution_y = int(meta["height"])
cam = next((o for o in bpy.data.objects if o.type == "CAMERA"), None)
if cam:
    scene.camera = cam; cam.data.type = "ORTHO"; cam.data.ortho_scale = meta["camera"]["orthoScale"]; cam.data.sensor_fit = "AUTO"
if not scene.sequence_editor:
    scene.sequence_editor_create()
for i, a in enumerate(meta.get("audio", [])):
    p = os.path.join(HERE, a["file"])
    if os.path.exists(p):
        scene.sequence_editor.sequences.new_sound(a.get("name", "sfx")[:60], p, 1 + i % 30, int(round(a["t"] * scene.render.fps)))
print("3d import done:", meta.get("stats"))
