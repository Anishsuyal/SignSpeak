import AuthLayout from "../components/AuthLayout";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
export default function Login() {
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <div className="form-box">
        <h2>Welcome back</h2>
        <p>Sign in to continue translating</p>

        <input
          type="email"
          placeholder="you@example.com"
          className="form-control mb-3"
        />

        <input
          type="password"
          placeholder="********"
          className="form-control mb-4"
        />

        <button
          className="btn btn-success w-100"
          onClick={() => navigate("/dashboard")}
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
