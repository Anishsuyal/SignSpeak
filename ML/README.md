# SignSpeak ML

This folder contains the Python ML pipeline for turning landmark sequences into sign predictions, sentence-level output, and speech.

## What is included

- `collect_landmarks.py`: collect custom training data from a webcam using MediaPipe.
- `collect_dataset.py`: guide a full multi-label webcam collection session.
- `train.py`: train a sequence model on landmark clips.
- `predict.py`: run local inference on saved clips.
- `api.py`: start a lightweight Python inference server for the frontend/backend.
- `signspeak_ml/decoder.py`: smooth frame predictions into words and sentence text.
- `signspeak_ml/speech.py`: optional text-to-speech output using `pyttsx3`.

## Suggested folder layout

```text
ML/
  data/
    raw/
      A/
      B/
      HELLO/
      THANK_YOU/
    processed/
  models/
  exports/
```

Each training sample is stored as JSON:

```json
{
  "label": "HELLO",
  "frames": [
    [0.12, 0.88, -0.02, ...],
    [0.11, 0.86, -0.02, ...]
  ],
  "metadata": {
    "source": "webcam",
    "sequence_length": 32
  }
}
```

## Recommended classes

Start with a small but useful vocabulary:

- Letters: `A B C D E F G H I L O U V W Y`
- Words/phrases: `HELLO THANK_YOU YES NO HELP PLEASE I_LOVE_YOU`

## Install

Create a Python virtual environment after Python 3.10+ is installed:

```powershell
cd C:\Users\Anish\Desktop\SignSpeak\ML
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Train

```powershell
python train.py --epochs 30 --batch-size 16
```

The best model checkpoint is saved to `models/best_model.pt`.

## Run API

```powershell
python api.py
```

## Batch collection

For a guided session across multiple labels:

```powershell
python collect_dataset.py --labels A B HELLO THANK_YOU YES NO --samples 5 --frames 32
```

Default API endpoints:

- `GET /health`
- `POST /predict-sequence`
- `POST /speak`

## Integration with the current app

Recommended flow:

1. Frontend webcam or MediaPipe layer extracts landmarks for each frame.
2. Frontend sends a rolling sequence of 32 frames to the Python API at `POST /predict-sequence`.
3. The Python model returns the best sign plus sentence-decoder output.
4. When a sentence or word is accepted, call `POST /speak` to read it aloud.

The easiest way to evolve the current project is to keep browser-side landmark detection and move the actual prediction to this Python service.

## Accuracy roadmap

To improve accuracy:

1. Collect balanced samples for every label from multiple people and lighting conditions.
2. Add both left-hand and right-hand examples.
3. Keep each sign clip around 24 to 48 frames.
4. Use the decoder to smooth noisy frame predictions into stable words.
5. Expand from letters to full-word signs once the base model is stable.
6. Retrain after every new labeled batch instead of hardcoding more gesture rules.
