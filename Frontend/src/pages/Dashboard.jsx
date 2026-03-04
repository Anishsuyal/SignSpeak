import { useRef, useState } from "react";
import Navbar from "../components/Navbar";
import { FaStopCircle } from "react-icons/fa";

export default function Dashboard() {
  const videoRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      alert("Camera access denied or not available.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current.srcObject;

    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-body">

        {/* LEFT CAMERA */}
        <div className="camera-section">

          <div className="section-header">
            CAMERA FEED

            <div className="camera-controls">
              <button className="start-btn" onClick={startCamera}>
                📷 Start Camera
              </button>

              {cameraOn && (
                <button className="stop-btn" onClick={stopCamera}>
                  <FaStopCircle />
                </button>
              )}
            </div>

          </div>

          <div className="camera-box">
            {!cameraOn && (
              <div className="camera-placeholder">
                Click "Start Camera" to begin
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="camera-video"
            />
          </div>
        </div>

        {/* RIGHT TRANSLATION */}
        <div className="text-section">
          <div className="section-header">
            TRANSLATED TEXT
          </div>

          <div className="text-box">
            <p>
              Translated text will appear here as you sign in front of the
              camera
            </p>
          </div>

          <div className="bottom-info">
            Start the camera to begin translating sign language.
          </div>
        </div>

      </div>
    </div>
  );
}