import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


class RenderMockupBridgeTest(unittest.TestCase):
    def test_single_operation_preserves_alpha_and_placement(self):
        repo = Path(__file__).resolve().parents[3]
        engine = repo.parent / "automated_mockups"
        bridge = repo / "Backend" / "src" / "integrations" / "mockup-engine" / "render_mockup.py"
        template = repo / "Backend" / "src" / "mockups" / "assets" / "mug-white-basic-v1.png"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            artwork = root / "artwork.png"
            output = root / "output.png"
            request = root / "request.json"
            source = Image.new("RGBA", (300, 150), (0, 0, 0, 0))
            ImageDraw.Draw(source).rectangle((40, 20, 260, 130), fill=(220, 30, 60, 220))
            source.save(artwork, "PNG")
            request.write_text(json.dumps({"artworkPath": str(artwork), "templatePath": str(template), "outputPath": str(output), "placement": {"bbox": [210, 300, 690, 900], "width": 600, "height": 480, "rotation": 0, "center": [600, 450], "alignment": "center", "scaleMode": "fit"}}), encoding="utf-8")
            completed = subprocess.run([sys.executable, str(bridge), "--engine-root", str(engine), "--request", str(request)], capture_output=True, text=True, timeout=20, check=False)
            self.assertEqual(completed.returncode, 0, completed.stderr)
            with Image.open(output) as result:
                self.assertEqual(result.size, (1200, 900))
                self.assertEqual(result.mode, "RGBA")
                center = result.getpixel((600, 450))
                self.assertGreater(center[0], center[1])
                self.assertGreater(center[3], 200)
                self.assertGreater(result.getpixel((600, 230))[0], 240)

    def test_invalid_artwork_returns_controlled_nonzero_exit(self):
        repo = Path(__file__).resolve().parents[3]
        engine = repo.parent / "automated_mockups"
        bridge = repo / "Backend" / "src" / "integrations" / "mockup-engine" / "render_mockup.py"
        template = repo / "Backend" / "src" / "mockups" / "assets" / "mug-white-basic-v1.png"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            artwork = root / "artwork.png"
            artwork.write_bytes(b"not-png")
            request = root / "request.json"
            request.write_text(json.dumps({"artworkPath": str(artwork), "templatePath": str(template), "outputPath": str(root / "output.png"), "placement": {"bbox": [210, 300, 690, 900], "width": 600, "height": 480, "rotation": 0, "center": [600, 450], "alignment": "center", "scaleMode": "fit"}}), encoding="utf-8")
            completed = subprocess.run([sys.executable, str(bridge), "--engine-root", str(engine), "--request", str(request)], capture_output=True, text=True, timeout=20, check=False)
            self.assertNotEqual(completed.returncode, 0)
            self.assertIn('"success": false', completed.stderr)


if __name__ == "__main__":
    unittest.main()

