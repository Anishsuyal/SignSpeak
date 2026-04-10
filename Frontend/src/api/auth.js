import axios from "axios";

const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || "http://localhost:3000/api/auth";

const API = axios.create({
  baseURL: AUTH_API_URL,
  withCredentials: true,
});

export const loginUser = (data) => API.post("/login", data);

export const registerUser = (data) => API.post("/register", data);

export const logoutUser = () => API.post("/logout");

export const getProfile = () => API.get("/profile");
