import AuthLayout from "../components/AuthLayout";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🔥 AUTO REMOVE ERROR AFTER 3 SECONDS
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = () => {
    setError("");

    if (!email || !password) {
      return setError("All fields are required.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError("Please enter a valid email address.");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    localStorage.setItem("auth", "true");
    navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <div className="form-box">
        <h2>Welcome back</h2>
        <p>Sign in to continue translating</p>

        {error && (
          <div className="alert alert-danger fade show">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="you@example.com"
          className="form-control mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="********"
          className="form-control mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="btn btn-success w-100"
          onClick={handleSubmit}
        >
          Sign In
        </button>

        <p className="text-center mt-3">
          Don't have an account?
          <Link to="/register"> Create one</Link>
        </p>
      </div>
    </AuthLayout>
  );
}