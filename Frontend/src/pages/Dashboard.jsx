import { useEffect, useRef, useState } from "react";
import { FaRegTrashAlt, FaStopCircle } from "react-icons/fa";
import Navbar from "../components/Navbar";
import { getHandLandmarker } from "../ml/handLandmarker";
import { classifySign } from "../ml/signClassifier";

const STABLE_FRAMES_REQUIRED = 12;
const LETTER_COOLDOWN_MS = 1400;
const FRAME_INTERVAL_MS = 120;

export default function Dashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const lastAcceptedRef = useRef({ label: "", time: 0 });
  const candidateRef = useRef({ label: "", count: 0 });

  const [cameraOn, setCameraOn] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [livePrediction, setLivePrediction] = useState("Waiting for hand sign...");
  const [predictionConfidence, setPredictionConfidence] = useState(null);
  const [modelStatus, setModelStatus] = useState("Model not loaded");
  const [recognitionMode, setRecognitionMode] = useState("idle");

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
        candidateRef.current = { label: "", count: 0 };
        setLivePrediction("No hand detected");
        setPredictionConfidence(null);
        setRecognitionMode("searching");
        return;
      }

      const prediction = classifySign(landmarks);

      if (!prediction) {
        candidateRef.current = { label: "", count: 0 };
        setLivePrediction("Hand detected, sign not matched yet");
        setPredictionConfidence(null);
        setRecognitionMode("tracking");
        return;
      }

      setLivePrediction(prediction.label);
      setPredictionConfidence(prediction.confidence);
      setRecognitionMode("tracking");

      if (candidateRef.current.label === prediction.label) {
        candidateRef.current.count += 1;
      } else {
        candidateRef.current = { label: prediction.label, count: 1 };
      }

      const now = Date.now();
      const recentlyAccepted =
        lastAcceptedRef.current.label === prediction.label &&
        now - lastAcceptedRef.current.time < LETTER_COOLDOWN_MS;

      if (
        candidateRef.current.count >= STABLE_FRAMES_REQUIRED &&
        !recentlyAccepted
      ) {
        setTranslatedText((current) => `${current}${prediction.label}`);
        lastAcceptedRef.current = { label: prediction.label, time: now };
        candidateRef.current = { label: "", count: 0 };
        setRecognitionMode("accepted");
      }
    } catch (error) {
      console.error(error);
      setModelStatus("Model failed to run");
      setRecognitionMode("error");
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
      setModelStatus("Loading hand landmark model...");
      await getHandLandmarker();
      setModelStatus("Model ready");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 960 },
          height: { ideal: 540 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setRecognitionMode("searching");
      startRecognitionLoop();
    } catch (err) {
      alert("Camera or model could not start. Check camera permission and internet connection.");
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
    candidateRef.current = { label: "", count: 0 };
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

  const appendSpace = () => {
    setTranslatedText((current) => (current.endsWith(" ") || current.length === 0 ? current : `${current} `));
  };

  const clearText = () => {
    setTranslatedText("");
    lastAcceptedRef.current = { label: "", time: 0 };
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
                Start the camera to load the recognizer and begin translating hand signs.
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
            Starter signs: <strong>A, B, C, D, E, I, O, U, V</strong>
          </div>
        </div>

        <div className="text-section">
          <div className="section-header">
            <span>TRANSLATED TEXT</span>

            <div className="text-actions">
              <button className="secondary-btn" onClick={appendSpace}>
                Add Space
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
              <p>Recognized letters will appear here when you hold a supported sign steadily for a moment.</p>
            )}
          </div>

          <div className="bottom-info">
            Hold one sign steadily in frame. The app stabilizes predictions before adding letters so the output is less noisy.
          </div>
        </div>
      </div>
    </div>
  );
}
