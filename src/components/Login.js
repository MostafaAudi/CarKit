import { useState, useEffect } from "react";
import "./Login.css";

export default function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    document.title = "Login - CarKit";
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { username, password } = formData;

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("http://localhost:1500/login/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Login successful! Welcome back.");
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        // Redirect based on role after short delay
        setTimeout(() => {
          const role = String(data.user?.RoleeName || data.user?.RoleName || data.user?.role || data.user?.RoleeID || "").toLowerCase();
          if (["admin", "administrator", "1"].includes(role)) {
            window.location.href = "/admin";
          } else if (["manager", "staff", "3"].includes(role)) {
            window.location.href = "/manager";
          } else {
            window.location.href = "/";
          }
        }, 1200);
      } else {
        setError(data.message || "Invalid username or password.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the backend server. Make sure it is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Log In</h2>
          <p>Access your CarKit account</p>
        </div>

        {error && <div className="error-message" role="alert">⚠️ {error}</div>}
        {success && <div className="success-message" role="status">🎉 {success}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username or Email</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username or email"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <a href="/signup">Sign Up</a>
        </div>
      </div>
    </div>
  );
}