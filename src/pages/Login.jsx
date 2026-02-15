// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import logo from "/images/logo.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Hardcoded accounts
  const accounts = [
    { email: "admin@clinic.com", password: "admin123", role: "admin" },
    { email: "staff1@clinic.com", password: "staff123", role: "staff" },
    { email: "staff2@clinic.com", password: "staff123", role: "staff" },
  ];

  const handleLogin = (e) => {
    e.preventDefault();

    const user = accounts.find(
      (acc) => acc.email === email && acc.password === password
    );

    if (user) {
      localStorage.setItem("userRole", user.role); // FIXED
      localStorage.setItem("userEmail", user.email);
      navigate("/dashboard");
    } else {
      alert("Invalid email or password");
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleLogin}>
        <img src={logo} alt="logo" style={{ width: "250px" }} />
        <h1>Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
