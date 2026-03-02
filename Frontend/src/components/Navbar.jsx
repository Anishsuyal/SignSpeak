import { FaSignOutAlt } from "react-icons/fa";

export default function Navbar() {
  return (
    <div className="dashboard-navbar">

      <div className="logo-area">
        <span className="hand">✋</span>
        <h5>SignSpeak</h5>
      </div>

      <div className="logout">
        <FaSignOutAlt />
        <span>Logout</span>
      </div>

    </div>
  );
}