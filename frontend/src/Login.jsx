import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (
      email === "admin@xeno.com" &&
      password === "123456"
    ) {
      localStorage.setItem("loggedIn", "true");
      navigate("/dashboard");
    } else {
      alert("Invalid Credentials");
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "24px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative Glowing Orbs */}
      <div style={{
        position: "absolute",
        top: "15%",
        left: "15%",
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, var(--primary-glow) 0%, rgba(0,0,0,0) 70%)",
        borderRadius: "50%",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        bottom: "15%",
        right: "15%",
        width: "350px",
        height: "350px",
        background: "radial-gradient(circle, var(--panel-glow) 0%, rgba(0,0,0,0) 70%)",
        borderRadius: "50%",
        zIndex: 0
      }} />

      {/* Login Card */}
      <div className="glass-panel animate-fade-in" style={{
        width: "100%",
        maxWidth: "420px",
        padding: "40px 32px",
        zIndex: 1,
        textAlign: "center"
      }}>
        {/* Brand Logo */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "56px",
          height: "56px",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: "14px",
          marginBottom: "20px",
          boxShadow: "0 0 20px rgba(99, 102, 241, 0.15)"
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>

        <h1 style={{
          fontSize: "28px",
          fontWeight: 700,
          marginBottom: "8px",
          letterSpacing: "-0.5px",
          color: "var(--text-primary)"
        }}>
          Welcome Back
        </h1>
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "14px",
          marginBottom: "32px"
        }}>
          Please log in to manage your AI CRM campaigns.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ width: "100%" }}>
          {/* Input Fields */}
          <div style={{ textAlign: "left", marginBottom: "20px", position: "relative" }}>
            <label className="input-label">Email Address</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                color: "var(--text-secondary)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                className="input-field"
                style={{ paddingLeft: "42px" }}
                placeholder="admin@xeno.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ textAlign: "left", marginBottom: "28px", position: "relative" }}>
            <label className="input-label">Password</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                color: "var(--text-secondary)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: "42px" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "14px", marginBottom: "24px" }}
          >
            Sign In
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>

        <div style={{
          fontSize: "14px",
          color: "var(--text-secondary)"
        }}>
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            style={{
              color: "var(--primary)",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
              transition: "color var(--transition-fast)"
            }}
            onMouseOver={(e) => e.target.style.color = "#818cf8"}
            onMouseOut={(e) => e.target.style.color = "var(--primary)"}
          >
            Create account
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;