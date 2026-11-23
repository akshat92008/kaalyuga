"""Expose small frame previews in the job log when the artifact is inaccessible."""
from base64 import b64encode
from io import BytesIO
from pathlib import Path

from PIL import Image

directory = Path("phase1-captures")
for screenshot in sorted(directory.glob("*.png")):
    with Image.open(screenshot) as image:
        preview = image.convert("RGB")
        preview.thumbnail((720, 450), Image.Resampling.LANCZOS)
        jpeg = BytesIO()
        preview.save(jpeg, format="JPEG", quality=74, optimize=True)
    data = b64encode(jpeg.getvalue()).decode("ascii")
    for offset in range(0, len(data), 8000):
        print(f"PHASE1_FRAME {screenshot.stem} {offset:06d} {data[offset:offset + 8000]}")
