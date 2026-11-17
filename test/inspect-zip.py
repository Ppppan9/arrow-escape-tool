#!/usr/bin/env python3
"""List zip members, recursively into nested zips. Optional: extract first .glb."""
import zipfile, sys, io, os
root = sys.argv[1]
mode = sys.argv[2] if len(sys.argv) > 2 else 'list'
dest = sys.argv[3] if len(sys.argv) > 3 else '.'

def walk(z, prefix=''):
    out = []
    for n in z.namelist():
        out.append(prefix + n)
        if n.lower().endswith('.zip'):
            try:
                out.extend(walk(zipfile.ZipFile(io.BytesIO(z.read(n))), prefix + n + '/'))
            except Exception:
                pass
    return out

def hunt_glb(z):
    for n in z.namelist():
        low = n.lower()
        if low.endswith('.glb'):
            path = os.path.join(dest, 'scene.glb')
            os.makedirs(dest, exist_ok=True)
            open(path, 'wb').write(z.read(n))
            return n
        if low.endswith('.zip'):
            try:
                found = hunt_glb(zipfile.ZipFile(io.BytesIO(z.read(n))))
                if found:
                    return n + '/' + found
            except Exception:
                pass
    return None

if mode == 'extract-glb':
    found = hunt_glb(zipfile.ZipFile(root))
    sys.exit(0 if found else 2)
else:
    print('\n'.join(walk(zipfile.ZipFile(root))))
