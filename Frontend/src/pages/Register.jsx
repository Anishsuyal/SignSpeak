import AuthLayout from "../components/AuthLayout";
import { Link, useNavigate } from "react-router-dom";
import { useState,useEffect } from "react";
import { registerUser } from "../api/auth";

export default function Register(){

  const navigate = useNavigate();

  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");

  useEffect(()=>{
    if(error){
      const timer = setTimeout(()=>setError(""),2000);
      return ()=>clearTimeout(timer);
    }
  },[error])

  const handleSubmit = async ()=>{

    if(!name || !email || !password){
      return setError("All fields are required");
    }

    try{

      const res = await registerUser({
        name,
        email,
        password
      });

      console.log(res.data);

      navigate("/dashboard");

    }
    catch(err){

      setError(
        err.response?.data?.message || "Registration failed"
      )

    }

  }

  return(

    <AuthLayout>

      <div className="form-box">

        <h2>Create account</h2>
        <p>Start translating sign language today</p>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="John Doe"
          className="form-control mb-3"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="you@example.com"
          className="form-control mb-3"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="********"
          className="form-control mb-4"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          className="btn btn-success w-100"
          onClick={handleSubmit}
        >
          Create Account
        </button>

        <p className="text-center mt-3">
          Already have an account?
          <Link to="/login"> Sign in</Link>
        </p>

      </div>

    </AuthLayout>
  )
}