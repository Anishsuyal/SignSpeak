import { useEffect, useRef, useState } from "react";
import { FaRegTrashAlt, FaStopCircle, FaVolumeUp } from "react-icons/fa";
import Navbar from "../components/Navbar";
import { predictSequence, resetDecoder, speakText } from "../api/ml";
import { getHandLandmarker } from "../vision/handLandmarker";

const FRAME_INTERVAL_MS = 120;
const SEQUENCE_LENGTH = 32;
const PREDICT_EVERY_N_FRAMES = 4;
const MIN_LIVE_CONFIDENCE = 0.78;
const MIN_TOP_MARGIN = 0.1;

function flattenLandmarks(landmarks) {
  return landmarks.flatMap((point) => [point.x, point.y, point.z ?? 0]);
}

export default function Dashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const sequenceRef = useRef([]);
  const requestInFlightRef = useRef(false);
  const frameCounterRef = useRef(0);
  const lastSpokenSentenceRef = useRef("");

  const [cameraOn, setCameraOn] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [livePrediction, setLivePrediction] = useState("Waiting for hand sign...");
  const [predictionConfidence, setPredictionConfidence] = useState(null);
  const [modelStatus, setModelStatus] = useState("Model not loaded");
  const [recognitionMode, setRecognitionMode] = useState("idle");
  const [tokenTrail, setTokenTrail] = useState([]);

  const drawHand = (landmarks) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) {
      return;
    }

    const context = canvas.getContext("2d");
    const { videoWidth, videoHeight } = video;

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks?.length) {
      return;
    }

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17],
    ];

    context.strokeStyle = "#59f0c2";
    context.lineWidth = 3;

    connections.forEach(([start, end]) => {
      const first = landmarks[start];
      const second = landmarks[end];

      context.beginPath();
      context.moveTo(first.x * canvas.width, first.y * canvas.height);
      context.lineTo(second.x * canvas.width, second.y * canvas.height);
      context.stroke();
    });

    context.fillStyle = "#fef4b0";

    landmarks.forEach((point) => {
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, Math.PI * 2);
      context.fill();
    });
  };

  const processFrame = async () => {
    const video = videoRef.current;

    if (!video || video.readyState < 2) {
      return;
    }

    try {
      const handLandmarker = await getHandLandmarker();
      const result = handLandmarker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks?.[0];

      drawHand(landmarks);

      if (!landmarks) {
        sequenceRef.current = [];
        setLivePrediction("No hand detected");
        setPredictionConfidence(null);
        setRecognitionMode("searching");
        return;
      }

      const flattened = flattenLandmarks(landmarks);
      sequenceRef.current = [...sequenceRef.current, flattened].slice(-SEQUENCE_LENGTH);
      frameCounterRef.current += 1;

      if (
        sequenceRef.current.length < SEQUENCE_LENGTH ||
        requestInFlightRef.current ||
        frameCounterRef.current % PREDICT_EVERY_N_FRAMES !== 0
      ) {
        setRecognitionMode("tracking");
        return;
      }

      requestInFlightRef.current = true;
      const response = await predictSequence(sequenceRef.current);
      const { prediction, decoded } = response;
      const topPredictions = prediction.top_predictions ?? [];
      const topMargin =
        topPredictions.length > 1
          ? topPredictions[0].confidence - topPredictions[1].confidence
          : 1;
      const confidentEnough =
        prediction.confidence >= MIN_LIVE_CONFIDENCE && topMargin >= MIN_TOP_MARGIN;

      setLivePrediction(confidentEnough ? prediction.label : "Prediction too uncertain");
      setPredictionConfidence(confidentEnough ? prediction.confidence : null);
      setRecognitionMode(decoded.accepted ? "accepted" : "tracking");

      if (confidentEnough) {
        setTranslatedText(decoded.sentence);
        setTokenTrail(decoded.tokens);
      }

      if (
        confidentEnough &&
        decoded.accepted &&
        decoded.sentence &&
        decoded.sentence !== lastSpokenSentenceRef.current
      ) {
        lastSpokenSentenceRef.current = decoded.sentence;
        await speakText(decoded.sentence);
      }
    } catch (error) {
      console.error(error);
      setModelStatus("Python ML API unavailable");
      setRecognitionMode("error");
    } finally {
      requestInFlightRef.current = false;
    }
  };

  const startRecognitionLoop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      processFrame();
    }, FRAME_INTERVAL_MS);
  };

  const stopRecognitionLoop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setModelStatus("Loading browser hand landmarks...");
      await getHandLandmarker();
      await resetDecoder();
      setModelStatus("Python ML model connected");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 960 },
          height: { ideal: 540 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      sequenceRef.current = [];
      frameCounterRef.current = 0;
      lastSpokenSentenceRef.current = "";

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setRecognitionMode("searching");
      startRecognitionLoop();
    } catch (err) {
      alert("Camera or Python ML API could not start. Make sure api.py is running on port 8001.");
      console.error(err);
      setModelStatus("Model unavailable");
    }
  };

  const stopCamera = () => {
    stopRecognitionLoop();

    const stream = streamRef.current ?? videoRef.current?.srcObject;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    streamRef.current = null;
    sequenceRef.current = [];
    frameCounterRef.current = 0;
    setCameraOn(false);
    setLivePrediction("Waiting for hand sign...");
    setPredictionConfidence(null);
    setRecognitionMode("idle");
  };

  useEffect(() => {
    return () => {
      stopRecognitionLoop();

      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const clearText = async () => {
    setTranslatedText("");
    setTokenTrail([]);
    lastSpokenSentenceRef.current = "";

    try {
      await resetDecoder();
    } catch (error) {
      console.error(error);
    }
  };

  const speakCurrentText = async () => {
    if (!translatedText) {
      return;
    }

    try {
      await speakText(translatedText);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-body">
        <div className="camera-section">
          <div className="section-header">
            <span>CAMERA FEED</span>

            <div className="camera-controls">
              <button className="start-btn" onClick={startCamera} disabled={cameraOn}>
                Start Camera
              </button>

              {cameraOn && (
                <button className="stop-btn" onClick={stopCamera} aria-label="Stop camera">
                  <FaStopCircle />
                </button>
              )}
            </div>
          </div>

          <div className="camera-box">
            {!cameraOn && (
              <div className="camera-placeholder">
                Start the camera after the Python ML server is running to begin model-based translation.
              </div>
            )}

            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            <canvas ref={canvasRef} className="camera-overlay" />
          </div>

          <div className="recognition-status">
            <div className={`status-pill status-${recognitionMode}`}>
              {modelStatus}
            </div>
            <div className="status-note">
              Live prediction: <strong>{livePrediction}</strong>
              {predictionConfidence ? ` (${Math.round(predictionConfidence * 100)}%)` : ""}
            </div>
          </div>

          <div className="supported-signs">
            Sequence window: <strong>{SEQUENCE_LENGTH}</strong> frames. Current decoded tokens:{" "}
            <strong>{tokenTrail.length ? tokenTrail.join(" | ") : "none yet"}</strong>
          </div>
        </div>

        <div className="text-section">
          <div className="section-header">
            <span>TRANSLATED TEXT</span>

            <div className="text-actions">
              <button className="secondary-btn" onClick={speakCurrentText}>
                <FaVolumeUp />
                Speak
              </button>
              <button className="secondary-btn danger-btn" onClick={clearText}>
                <FaRegTrashAlt />
                Clear
              </button>
            </div>
          </div>

          <div className="text-box translated-output">
            {translatedText ? (
              <p>{translatedText}</p>
            ) : (
              <p>The Python model will build sentence text here from rolling landmark sequences.</p>
            )}
          </div>

          <div className="bottom-info">
            Real accuracy will improve after you record real samples with the Python collector and retrain the model.
          </div>
        </div>
      </div>
    </div>
  );
}
