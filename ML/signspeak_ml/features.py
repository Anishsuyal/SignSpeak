from __future__ import annotations

import numpy as np


def normalize_landmarks(sequence: np.ndarray) -> np.ndarray:
    """Normalize each frame around the wrist and scale by palm size."""
    data = np.asarray(sequence, dtype=np.float32).copy()
    if data.ndim != 2:
        raise ValueError("Expected shape [frames, features]")

    frames = data.reshape(data.shape[0], -1, 3)
    wrist = frames[:, 0:1, :]
    centered = frames - wrist

    palm = np.linalg.norm(frames[:, 9, :] - frames[:, 0, :], axis=1, keepdims=True)
    palm = np.clip(palm, 1e-4, None)
    normalized = centered / palm[:, None, :]
    return normalized.reshape(data.shape[0], -1)


def resize_sequence(sequence: np.ndarray, target_length: int) -> np.ndarray:
    """Resize sequence by index sampling so every clip has the same length."""
    data = np.asarray(sequence, dtype=np.float32)
    if len(data) == target_length:
        return data
    if len(data) == 0:
        raise ValueError("Sequence must contain at least one frame")

    indices = np.linspace(0, len(data) - 1, target_length).astype(np.int32)
    return data[indices]


def augment_sequence(sequence: np.ndarray, noise_scale: float = 0.01) -> np.ndarray:
    noise = np.random.normal(0.0, noise_scale, size=sequence.shape).astype(np.float32)
    scale = np.random.uniform(0.97, 1.03)
    return (sequence * scale) + noise
