from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from signspeak_ml.decoder import SentenceDecoder
from signspeak_ml.inference import SignPredictor
from signspeak_ml.speech import SpeechEngine


predictor = SignPredictor()
decoder = SentenceDecoder()
speaker = SpeechEngine()


class SignSpeakHandler(BaseHTTPRequestHandler):
    server_version = "SignSpeakML/1.0"

    def _read_json(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self._send_json({"status": "ok"})

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json({"status": "ok"})
            return

        self._send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        if self.path == "/predict-sequence":
            payload = self._read_json()
            frames = payload.get("frames", [])
            prediction = predictor.predict_sequence(frames)
            top_predictions = prediction.get("top_predictions", [])
            top_margin = 1.0
            if len(top_predictions) > 1:
                top_margin = top_predictions[0]["confidence"] - top_predictions[1]["confidence"]

            decoded = decoder.update(
                prediction["label"],
                prediction["confidence"],
                top_margin=top_margin,
            )
            self._send_json({"prediction": prediction, "decoded": decoded})
            return

        if self.path == "/decoder/reset":
            decoder.reset()
            self._send_json({"status": "reset"})
            return

        if self.path == "/speak":
            payload = self._read_json()
            speaker.speak(payload.get("text", ""), blocking=False)
            self._send_json({"status": "queued"})
            return

        self._send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)


def run(host: str = "0.0.0.0", port: int = 8001) -> None:
    server = ThreadingHTTPServer((host, port), SignSpeakHandler)
    print(f"SignSpeak ML API running on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
