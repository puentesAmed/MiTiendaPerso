"""Single-operation bridge to the existing automated_mockups Python API."""

import argparse
import json
import sys
from types import SimpleNamespace
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine-root", required=True)
    parser.add_argument("--request", required=True)
    args = parser.parse_args()

    engine_root = Path(args.engine_root).resolve(strict=True)
    request_path = Path(args.request).resolve(strict=True)
    sys.path.insert(0, str(engine_root))

    # automated_mockups 1.0 annotates a private scikit-image type that moved in 0.26.
    # The annotation is not used at runtime; keep the integration compatible without
    # changing the external repository or the generator's behavior.
    from skimage import measure
    if not hasattr(measure, "_regionprops"):
        measure._regionprops = SimpleNamespace(RegionProperties=object)

    from mockup_generator.calculator import BoxParameters
    from mockup_generator.generator import Alignment, MockupGenerator, ScaleMode

    request = json.loads(request_path.read_text(encoding="utf-8"))
    template_path = Path(request["templatePath"]).resolve(strict=True)
    artwork_path = Path(request["artworkPath"]).resolve(strict=True)
    output_path = Path(request["outputPath"]).resolve()
    placement = request["placement"]
    params = BoxParameters(
        filename=template_path.name,
        bbox=tuple(placement["bbox"]),
        width=placement["width"],
        height=placement["height"],
        rotation=placement["rotation"],
        center=tuple(placement["center"]),
    )
    generator = MockupGenerator(
        {template_path.name: params},
        alignment=Alignment(placement["alignment"]),
        scale_mode=ScaleMode(placement["scaleMode"]),
        output_format="PNG",
    )
    result = generator.generate_mockup(artwork_path, template_path, output_path)
    if not result.success:
        raise RuntimeError(result.error or "Mockup generation failed")
    print(json.dumps({"success": True, "output": output_path.name}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"success": False, "error": str(error)})[:4000], file=sys.stderr)
        raise SystemExit(1)

