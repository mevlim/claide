"""Упаковывает картинки из art/*.webp в art.js (data: URI), который подключает build2.py."""
import glob, os, base64, json
os.chdir(os.path.dirname(os.path.abspath(__file__)))
d = {os.path.basename(f)[:-5]: 'data:image/webp;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
     for f in sorted(glob.glob('art/*.webp'))}
open('art.js', 'w').write('const ART=' + json.dumps(d) + ';\n')
print('art.js:', ', '.join(d))
