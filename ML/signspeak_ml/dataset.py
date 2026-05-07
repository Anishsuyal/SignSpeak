from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import Dataset

from .config import MLConfig
from .features import augment_sequence, normalize_landmarks, resize_sequence


def load_sequence_file(file_path: Path) -> tuple[np.ndarray, str]:
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    frames = np.asarray(payload["frames"], dtype=np.float32)
    label = payload["label"]
    return frames, label


class SignSequenceDataset(Dataset):
    def __init__(self, config: MLConfig, files: list[Path], augment: bool = False) -> None:
        self.config = config
        self.files = files
        self.augment = augment
        self.label_to_index = {label: index for index, label in enumerate(config.labels)}

    def __len__(self) -> int:
        return len(self.files)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        file_path = self.files[index]
        frames, label = load_sequence_file(file_path)
        frames = resize_sequence(frames, self.config.sequence_length)
        frames = normalize_landmarks(frames)

        if self.augment:
            frames = augment_sequence(frames)

        label_index = self.label_to_index[label]
        return (
            torch.tensor(frames, dtype=torch.float32),
            torch.tensor(label_index, dtype=torch.long),
        )


def discover_sequence_files(config: MLConfig) -> list[Path]:
    return sorted(config.raw_data_dir.glob("*/*.json"))
