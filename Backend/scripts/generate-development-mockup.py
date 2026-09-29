"""Generate the deterministic, non-production technical mockup fixture."""
from pathlib import Path
from PIL import Image, ImageDraw

destination = Path(__file__).resolve().parents[1] / "src" / "mockups" / "assets" / "mug-white-basic-v1.png"
destination.parent.mkdir(parents=True, exist_ok=True)
image = Image.new("RGBA", (1200, 900), (242, 244, 247, 255))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((200, 110, 1000, 790), radius=72, fill=(255, 255, 255, 255), outline=(205, 211, 220, 255), width=8)
draw.ellipse((900, 260, 1150, 650), fill=(242, 244, 247, 255), outline=(205, 211, 220, 255), width=42)
draw.line((300, 210, 900, 210), fill=(226, 230, 236, 255), width=2)
draw.line((300, 690, 900, 690), fill=(226, 230, 236, 255), width=2)
image.save(destination, "PNG", optimize=True)
print(destination)
