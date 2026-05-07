from __future__ import annotations

import argparse
import json
import time
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import HandLandmarker
from mediapipe.tasks.python.vision import HandLandmarkerOptions
from mediapipe.tasks.python.vision import RunningMode

from signspeak_ml.config import MLConfig

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)


def ensure_model(config: MLConfig) -> Path:
    model_path = config.models_dir / "hand_landmarker.task"
    model_path.parent.mkdir(parents=True, exist_ok=True)

    if not model_path.exists():
        print(f"Downloading hand landmarker model to {model_path} ...")
        urllib.request.urlretrieve(MODEL_URL, model_path)

    return model_path


def flatten_landmarks(landmarks) -> list[float]:
    points = []
    for landmark in landmarks:
        points.extend([landmark.x, landmark.y, landmark.z])
    return points


def create_landmarker(model_path: Path) -> HandLandmarker:
    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model_path)),
        running_mode=RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    return HandLandmarker.create_from_options(options)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect sign landmark sequences from a webcam")
    parser.add_argument("--label", required=True, help="Target sign label, for example HELLO or A")
    parser.add_argument("--samples", type=int, default=20, help="Number of clips to collect")
    parser.add_argument("--frames", type=int, default=32, help="Frames per clip")
    args = parser.parse_args()

    config = MLConfig()
    target_dir = config.raw_data_dir / args.label
    target_dir.mkdir(parents=True, exist_ok=True)
    model_path = ensure_model(config)
    landmarker = create_landmarker(model_path)
    capture = cv2.VideoCapture(0)

    try:
        for sample_index in range(args.samples):
            frames = []

            while len(frames) < args.frames:
                ok, frame = capture.read()
                if not ok:
                    continue

                frame = cv2.flip(frame, 1)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                timestamp_ms = int(time.time() * 1000)
                result = landmarker.detect_for_video(mp_image, timestamp_ms)

                if result.hand_landmarks:
                    flattened = flatten_landmarks(result.hand_landmarks[0])
                    frames.append(flattened)

                cv2.putText(
                    frame,
                    f"Label: {args.label} | Sample {sample_index + 1}/{args.samples} | Frame {len(frames)}/{args.frames}",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2,
                )
                cv2.putText(
                    frame,
                    "Press q to stop collection",
                    (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2,
                )
                cv2.imshow("SignSpeak Data Collection", frame)

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    raise KeyboardInterrupt

            output = {
                "label": args.label,
                "frames": frames,
                "metadata": {
                    "source": "webcam",
                    "sequence_length": len(frames),
                    "captured_at": int(time.time()),
                },
            }
            file_path = target_dir / f"{args.label.lower()}_{sample_index + 1:03d}.json"
            file_path.write_text(json.dumps(output), encoding="utf-8")
            print(f"Saved {file_path}")
    finally:
        landmarker.close()
        capture.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
