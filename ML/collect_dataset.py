from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from signspeak_ml.labels import DEFAULT_LABELS


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect a batch of sign clips label by label")
    parser.add_argument(
        "--labels",
        nargs="*",
        default=DEFAULT_LABELS,
        help="Labels to collect, for example A B HELLO THANK_YOU",
    )
    parser.add_argument("--samples", type=int, default=5, help="Samples per label")
    parser.add_argument("--frames", type=int, default=32, help="Frames per sample")
    parser.add_argument(
        "--plan-output",
        default="exports/collection_plan.json",
        help="Path to save the generated collection plan",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    plan_path = root / args.plan_output
    plan_path.parent.mkdir(parents=True, exist_ok=True)
    plan = {
        "labels": args.labels,
        "samples_per_label": args.samples,
        "frames_per_sample": args.frames,
    }
    plan_path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(f"Saved collection plan to {plan_path}")

    for index, label in enumerate(args.labels, start=1):
        print(f"\n[{index}/{len(args.labels)}] Collecting label: {label}")
        print("Press Enter to open the webcam collector for this label, or type q to stop.")
        user_input = input("> ").strip().lower()
        if user_input == "q":
            print("Collection stopped by user.")
            return

        command = [
            sys.executable,
            "collect_landmarks.py",
            "--label",
            label,
            "--samples",
            str(args.samples),
            "--frames",
            str(args.frames),
        ]
        result = subprocess.run(command, cwd=root, check=False)
        if result.returncode != 0:
            print(f"Collection failed for label {label} with exit code {result.returncode}")
            return

    print("\nFinished batch data collection.")


if __name__ == "__main__":
    main()
