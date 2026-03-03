import { FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth"); // remove login
    navigate("/"); // go to landing
  };

  return (
    <div className="dashboard-navbar">
      <div className="logo-area">
        <span className="hand">✋</span>
        <h5>SignSpeak</h5>
      </div>

      <div className="logout" onClick={handleLogout}>
        <FaSignOutAlt />
        <span>Logout</span>
      </div>
    </div>
  );
}