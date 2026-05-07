from __future__ import annotations

import argparse
import json
from pathlib import Path

from signspeak_ml.inference import SignPredictor


def main() -> None:
    parser = argparse.ArgumentParser(description="Run SignSpeak inference on a saved JSON clip")
    parser.add_argument("--input", required=True, help="Path to a JSON sequence file")
    args = parser.parse_args()

    predictor = SignPredictor()
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    result = predictor.predict_sequence(payload["frames"])
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
