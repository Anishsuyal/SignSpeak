import AuthLayout from "../components/AuthLayout";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
export default function Register() {
  const navigate = useNavigate();
  return (
    <AuthLayout>

      <div className="form-box">
        <h2>Create account</h2>
        <p>Start translating sign language today</p>

        <input
          type="text"
          placeholder="John Doe"
          className="form-control mb-3"
        />

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
          Create Account
        </button>

        <p className="text-center mt-3">
          Already have an account?
          <Link to="/login"> Sign in</Link>
        </p>
      </div>

    </AuthLayout>
  );
}