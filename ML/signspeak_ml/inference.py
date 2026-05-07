from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch

from .config import MLConfig
from .features import normalize_landmarks, resize_sequence
from .model import SignSequenceModel


class SignPredictor:
    def __init__(self, config: MLConfig | None = None, model_path: Path | None = None) -> None:
        self.config = config or MLConfig()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.labels = self._load_labels()
        self.model = SignSequenceModel(
            input_size=self.config.feature_size,
            num_classes=len(self.labels),
            hidden_size=self.config.hidden_size,
            lstm_layers=self.config.lstm_layers,
            dropout=self.config.dropout,
        ).to(self.device)
        self.model.eval()

        checkpoint_path = model_path or self.config.model_path
        if checkpoint_path.exists():
            checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
            self.model.load_state_dict(checkpoint["model_state"])

    def _load_labels(self) -> list[str]:
        if self.config.labels_path.exists():
            return json.loads(self.config.labels_path.read_text(encoding="utf-8"))
        return self.config.labels

    def predict_sequence(self, frames: list[list[float]] | np.ndarray) -> dict[str, object]:
        sequence = np.asarray(frames, dtype=np.float32)
        sequence = resize_sequence(sequence, self.config.sequence_length)
        sequence = normalize_landmarks(sequence)

        tensor = torch.tensor(sequence, dtype=torch.float32).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits, _ = self.model(tensor)
            probabilities = torch.softmax(logits, dim=-1).squeeze(0).cpu().numpy()

        best_index = int(np.argmax(probabilities))
        top_indices = np.argsort(probabilities)[::-1][:5]
        top_predictions = [
            {
                "label": self.labels[int(index)],
                "confidence": float(probabilities[int(index)]),
            }
            for index in top_indices
        ]

        return {
            "label": self.labels[best_index],
            "confidence": float(probabilities[best_index]),
            "top_predictions": top_predictions,
        }
