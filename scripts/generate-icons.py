"""Optional icon regeneration: Python + Pillow; not needed to build the extension."""
from pathlib import Path
from PIL import Image, ImageDraw

output = Path(__file__).resolve().parent.parent / 'public'
output.mkdir(exist_ok=True)
size = 512
image = Image.new('RGBA', (size, size))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((0, 0, 511, 511), radius=112, fill='#284832')
draw.rounded_rectangle((120, 108, 346, 296), radius=24, outline='#8baa85', width=16)
draw.rounded_rectangle((162, 160, 390, 350), radius=24, fill='#284832', outline='#e4f0df', width=16)
draw.ellipse((208, 198, 238, 228), fill='#e4f0df')
draw.line((185, 318, 260, 246, 304, 286, 347, 242, 372, 268), fill='#e4f0df', width=15, joint='curve')
for resolution in (16, 32, 48, 128):
    image.resize((resolution, resolution), Image.Resampling.LANCZOS).save(output / f'icon-{resolution}.png')
