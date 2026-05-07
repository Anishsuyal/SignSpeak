from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader

from signspeak_ml.config import MLConfig
from signspeak_ml.dataset import SignSequenceDataset, discover_sequence_files
from signspeak_ml.model import SignSequenceModel


def split_files(files, validation_split, seed=42):
    shuffled = list(files)
    random.Random(seed).shuffle(shuffled)
    split_index = max(1, int(len(shuffled) * (1 - validation_split)))
    split_index = min(split_index, len(shuffled) - 1)
    return shuffled[:split_index], shuffled[split_index:]


def make_json_safe(value):
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {key: make_json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [make_json_safe(item) for item in value]
    return value


def infer_labels_from_files(files):
    present_labels = sorted({file.parent.name for file in files})
    return present_labels


def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_count = 0

    with torch.no_grad():
        for inputs, labels in loader:
            inputs = inputs.to(device)
            labels = labels.to(device)
            logits, _ = model(inputs)
            loss = criterion(logits, labels)

            total_loss += loss.item() * labels.size(0)
            total_correct += (logits.argmax(dim=-1) == labels).sum().item()
            total_count += labels.size(0)

    return total_loss / max(total_count, 1), total_correct / max(total_count, 1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the SignSpeak sequence model")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    args = parser.parse_args()

    config = MLConfig()
    if args.epochs:
        config.epochs = args.epochs
    if args.batch_size:
        config.batch_size = args.batch_size

    files = discover_sequence_files(config)
    if len(files) < 4:
        raise RuntimeError("Add more labeled JSON clips to ML/data/raw before training")

    config.labels = infer_labels_from_files(files)
    print(f"Training on labels: {', '.join(config.labels)}")

    train_files, val_files = split_files(files, config.validation_split, seed=42)

    train_dataset = SignSequenceDataset(config, train_files, augment=True)
    val_dataset = SignSequenceDataset(config, val_files, augment=False)

    train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config.batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SignSequenceModel(
        input_size=config.feature_size,
        num_classes=len(config.labels),
        hidden_size=config.hidden_size,
        lstm_layers=config.lstm_layers,
        dropout=config.dropout,
    ).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate)
    best_val_accuracy = 0.0

    config.models_dir.mkdir(parents=True, exist_ok=True)
    config.labels_path.write_text(json.dumps(config.labels), encoding="utf-8")

    for epoch in range(1, config.epochs + 1):
        model.train()
        total_loss = 0.0
        total_correct = 0
        total_count = 0

        for inputs, labels in train_loader:
            inputs = inputs.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            logits, _ = model(inputs)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * labels.size(0)
            total_correct += (logits.argmax(dim=-1) == labels).sum().item()
            total_count += labels.size(0)

        train_loss = total_loss / max(total_count, 1)
        train_accuracy = total_correct / max(total_count, 1)
        val_loss, val_accuracy = evaluate(model, val_loader, criterion, device)

        print(
            f"Epoch {epoch:02d} | train_loss={train_loss:.4f} | "
            f"train_acc={train_accuracy:.4f} | val_loss={val_loss:.4f} | val_acc={val_accuracy:.4f}"
        )

        if val_accuracy >= best_val_accuracy:
            best_val_accuracy = val_accuracy
            torch.save(
                {
                    "model_state": model.state_dict(),
                    "val_accuracy": val_accuracy,
                    "config": make_json_safe(config.__dict__),
                },
                config.model_path,
            )

    print(f"Best validation accuracy: {best_val_accuracy:.4f}")
    print(f"Saved model to {config.model_path}")


if __name__ == "__main__":
    main()
