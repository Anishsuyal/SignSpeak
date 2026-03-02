import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">

      <div className="landing-content text-center text-white">

        <div className="logo">✋</div>

        <h1 className="brand">SignSpeak</h1>

        <p className="tagline">
          Real-time sign language to text conversion powered by AI.
          <br />
          Break communication barriers effortlessly.
        </p>

        <div className="mt-4">
          <button
            className="btn btn-success me-3 px-4"
            onClick={() => navigate("/register")}
          >
            Get Started →
          </button>

          <button
            className="btn btn-secondary px-4"
            onClick={() => navigate("/login")}
          >
            Sign In
          </button>
        </div>

      </div>

    </div>
  );
}