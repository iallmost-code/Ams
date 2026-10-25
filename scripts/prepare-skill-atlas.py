"""Clean a generated 5x4 RGBA source, preserving relative animation sizes per row.
Requires Pillow. Usage: python3 scripts/prepare-skill-atlas.py INPUT.png [OUTPUT_DIR]
The 1536-wide canvas uses five equal 306px cells plus 3px outer side margins.
"""
from pathlib import Path
import json
import sys
from PIL import Image

source = Image.open(sys.argv[1]).convert('RGBA')
if source.size != (1536, 1024):
    raise ValueError('Expected the original 1536x1024 generated source')
outdir = Path(sys.argv[2] if len(sys.argv) > 2 else 'src/assets')
outdir.mkdir(parents=True, exist_ok=True)
canvas = Image.new('RGBA', source.size)
all_bounds, report = [], []
for row in range(4):
    sprites = []
    for col in range(5):
        tile = source.crop((round(col * 1536 / 5), row * 256,
                            round((col + 1) * 1536 / 5), (row + 1) * 256))
        alpha = tile.getchannel('A').point(lambda a: a if a >= 8 else 0)
        tile.putalpha(alpha)
        box = alpha.getbbox()
        if box is None:
            raise ValueError(f'Empty frame {row},{col}')
        sprites.append(tile.crop(box))
    scale = min(230 / max(i.width for i in sprites),
                176 / max(i.height for i in sprites), 1)
    row_bounds = []
    for col, sprite in enumerate(sprites):
        w, h = round(sprite.width * scale), round(sprite.height * scale)
        sprite = sprite.resize((w, h), Image.Resampling.LANCZOS)
        x, y = 3 + col * 306 + (306 - w) // 2, row * 256 + (256 - h) // 2
        canvas.paste(sprite, (x, y))
        row_bounds.append({'x': (306-w)//2, 'y': (256-h)//2, 'width': w, 'height': h})
        report.append({'row': row, 'frame': col, 'width': w, 'height': h,
                       'horizontalPadding': (306-w)//2, 'verticalPadding': (256-h)//2})
    all_bounds.append(row_bounds)
canvas.save(outdir / 'skills.png', optimize=True)
canvas.save(outdir / 'skills.webp', quality=90, method=6, exact=True)
webp = Image.open(outdir / 'skills.webp').convert('RGBA')
assert webp.size == canvas.size
assert webp.getchannel('A').tobytes() == canvas.getchannel('A').tobytes()
for row in range(4):
    for col in range(5):
        a = webp.getchannel('A').crop((3+col*306, row*256, 3+(col+1)*306, (row+1)*256))
        for strip in [(0,0,306,32),(0,224,306,256),(0,0,32,256),(274,0,306,256)]:
            assert a.crop(strip).getextrema()[1] == 0
metadata = {
    'image': 'skills.webp', 'source': 'skills.png', 'width':1536, 'height':1024,
    'columns':5, 'rows':4, 'origin': {'x':3,'y':0}, 'cellWidth':306, 'cellHeight':256,
    'frameDurationsMs':[100,125,650,200,175],
    'frames':['start','growing','full-power','breaking-apart','fading-sparkles'],
    'rowByClass':{'vanguard':0,'arcanist':1,'nightblade':2,'ranger':3},
    'direction':'right','runtimeGutter':12,'contentBounds':all_bounds,
}
(outdir / 'skills.atlas.json').write_text(json.dumps(metadata, indent=2)+'\n')
print(json.dumps({'pngBytes': (outdir/'skills.png').stat().st_size,
                  'webpBytes': (outdir/'skills.webp').stat().st_size,
                  'alphaPreserved':True,'frames':report}, indent=2))
