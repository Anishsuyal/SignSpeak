import Navbar from "../components/Navbar";


export default function Dashboard() {
  return (
    <div className="dashboard-container">

      <Navbar />

      <div className="dashboard-body">

        {/* LEFT CAMERA */}
        <div className="camera-section">

          <div className="section-header">
            CAMERA FEED
            <button className="start-btn">
              📷 Start Camera
            </button>
          </div>

          <div className="camera-box">
            <p>Click "Start Camera" to begin</p>
          </div>

        </div>

        {/* RIGHT TRANSLATION */}
        <div className="text-section">

          <div className="section-header">
            TRANSLATED TEXT
          </div>

          <div className="text-box">
            <p>
              Translated text will appear here as you sign in
              front of the camera
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