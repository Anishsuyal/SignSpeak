from __future__ import annotations

import threading


class SpeechEngine:
    def __init__(self, rate: int = 165) -> None:
        self._rate = rate
        self._engine = None

    def _ensure_engine(self):
        if self._engine is None:
            import pyttsx3

            self._engine = pyttsx3.init()
            self._engine.setProperty("rate", self._rate)
        return self._engine

    def speak(self, text: str, blocking: bool = False) -> None:
        if not text:
            return

        def run() -> None:
            engine = self._ensure_engine()
            engine.say(text)
            engine.runAndWait()

        if blocking:
            run()
        else:
            threading.Thread(target=run, daemon=True).start()
