from __future__ import annotations

import torch
from torch import nn


class TemporalAttention(nn.Module):
    def __init__(self, hidden_size: int) -> None:
        super().__init__()
        self.score = nn.Linear(hidden_size * 2, 1)

    def forward(self, outputs: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        weights = torch.softmax(self.score(outputs).squeeze(-1), dim=1)
        context = torch.sum(outputs * weights.unsqueeze(-1), dim=1)
        return context, weights


class SignSequenceModel(nn.Module):
    def __init__(
        self,
        input_size: int,
        num_classes: int,
        hidden_size: int = 192,
        lstm_layers: int = 2,
        dropout: float = 0.25,
    ) -> None:
        super().__init__()
        self.input_projection = nn.Sequential(
            nn.LayerNorm(input_size),
            nn.Linear(input_size, hidden_size),
            nn.GELU(),
            nn.Dropout(dropout),
        )
        self.encoder = nn.LSTM(
            input_size=hidden_size,
            hidden_size=hidden_size,
            num_layers=lstm_layers,
            batch_first=True,
            dropout=dropout if lstm_layers > 1 else 0.0,
            bidirectional=True,
        )
        self.attention = TemporalAttention(hidden_size)
        self.head = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, num_classes),
        )

    def forward(self, sequence: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        projected = self.input_projection(sequence)
        outputs, _ = self.encoder(projected)
        context, weights = self.attention(outputs)
        logits = self.head(context)
        return logits, weights
