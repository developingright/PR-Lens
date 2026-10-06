"""Resize the generated logo for Chrome. Requires Pillow only for regeneration."""
from pathlib import Path
from PIL import Image

project = Path(__file__).resolve().parent.parent
output = project / 'public'
output.mkdir(exist_ok=True)
image = Image.open(project / 'assets/branding/pr-lens-logo.png').convert('RGBA')
for resolution in (16, 32, 48, 128):
    image.resize((resolution, resolution), Image.Resampling.LANCZOS).save(output / f'pr-lens-{resolution}.png')
