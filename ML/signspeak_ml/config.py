from dataclasses import dataclass, field
from pathlib import Path

from .labels import DEFAULT_LABELS


@dataclass
class MLConfig:
    root_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = field(init=False)
    raw_data_dir: Path = field(init=False)
    processed_data_dir: Path = field(init=False)
    models_dir: Path = field(init=False)
    exports_dir: Path = field(init=False)

    labels: list[str] = field(default_factory=lambda: DEFAULT_LABELS.copy())
    sequence_length: int = 32
    feature_size: int = 63
    hidden_size: int = 192
    lstm_layers: int = 2
    dropout: float = 0.25
    learning_rate: float = 1e-3
    batch_size: int = 16
    epochs: int = 30
    validation_split: float = 0.2

    def __post_init__(self) -> None:
        self.data_dir = self.root_dir / "data"
        self.raw_data_dir = self.data_dir / "raw"
        self.processed_data_dir = self.data_dir / "processed"
        self.models_dir = self.root_dir / "models"
        self.exports_dir = self.root_dir / "exports"

    @property
    def model_path(self) -> Path:
        return self.models_dir / "best_model.pt"

    @property
    def labels_path(self) -> Path:
        return self.models_dir / "labels.json"
