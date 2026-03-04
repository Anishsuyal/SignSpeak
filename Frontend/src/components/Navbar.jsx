import { FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../api/auth";

export default function Navbar(){

  const navigate = useNavigate();

  const handleLogout = async () => {

    try{
      await logoutUser();
      navigate("/");
    }
    catch(err){
      console.log(err);
    }

  }

  return(

    <div className="dashboard-navbar">

      <div className="logo-area">
        <span className="hand">✋</span>
        <h5>SignSpeak</h5>
      </div>

      <div className="logout" onClick={handleLogout}>
        <FaSignOutAlt/>
        <span>Logout</span>
      </div>

    </div>
  )
}