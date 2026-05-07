from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field


COMMON_PHRASE_FIXES = {
    "I LOVE YOU": "I LOVE YOU",
    "THANK YOU": "THANK YOU",
}


@dataclass
class SentenceDecoder:
    stability_window: int = 6
    accept_threshold: float = 0.82
    min_top_margin: float = 0.12
    cooldown_updates: int = 4
    history: deque[tuple[str, float, float]] = field(default_factory=deque)
    accepted_tokens: list[str] = field(default_factory=list)
    cooldown_remaining: int = 0

    def update(self, label: str, confidence: float, top_margin: float = 1.0) -> dict[str, object]:
        self.history.append((label, confidence, top_margin))
        while len(self.history) > self.stability_window:
            self.history.popleft()

        if self.cooldown_remaining > 0:
            self.cooldown_remaining -= 1

        matching = [
            item
            for item in self.history
            if item[0] == label and item[1] >= self.accept_threshold and item[2] >= self.min_top_margin
        ]
        accepted = False

        if self.cooldown_remaining == 0 and len(matching) >= max(3, self.stability_window // 2):
            if not self.accepted_tokens or self.accepted_tokens[-1] != label:
                self.accepted_tokens.append(label)
                accepted = True
                self.cooldown_remaining = self.cooldown_updates

        sentence = self.render_sentence()
        return {
            "accepted": accepted,
            "tokens": self.accepted_tokens.copy(),
            "sentence": sentence,
        }

    def render_sentence(self) -> str:
        words = []
        letter_buffer = []

        for token in self.accepted_tokens:
            if len(token) == 1:
                letter_buffer.append(token)
            else:
                if letter_buffer:
                    words.append("".join(letter_buffer))
                    letter_buffer = []
                words.append(token.replace("_", " "))

        if letter_buffer:
            words.append("".join(letter_buffer))

        sentence = " ".join(words).strip()
        return COMMON_PHRASE_FIXES.get(sentence, sentence)

    def reset(self) -> None:
        self.history.clear()
        self.accepted_tokens.clear()
        self.cooldown_remaining = 0
