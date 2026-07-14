import React, { useState, useEffect } from "react";
import { auth } from "../firebase/firebaseConfig";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import background from "../assets/background.png";
import logo from "../assets/logo.png";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const navigate = useNavigate();

  // Component load hote hi saved email check karo agar remember me true tha to
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    
    if (savedRememberMe && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Google Font Load
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setError("");
      setLoading(true);

      // Firebase persistence set karo remember me ke hisaab se
      if (rememberMe) {
        await setPersistence(auth, browserLocalPersistence);
        // Email save karo localStorage mein agar remember me checked hai
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberMe", "true");
      } else {
        await setPersistence(auth, browserSessionPersistence);
        // Agar remember me unchecked hai to saved data hata do
        localStorage.removeItem("rememberedEmail");
        localStorage.setItem("rememberMe", "false");
      }

      await signInWithEmailAndPassword(auth, email, password);

      navigate("/dashboard");
    } catch (err: any) {
      setError("Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        ...styles.container,
        backgroundImage: `url(${background})`
      }}
    >
      <div style={styles.card}>
        {/* Logo only - no app name text */}
        <img src={logo} alt="BeauTech Logo" style={styles.logo} />

        {/* Welcome text with larger size */}
        <div style={styles.welcomeContainer}>
          <p style={styles.welcome}>Welcome back, Admin</p>
          <p style={styles.subText}>Please sign in to continue</p>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.inputWrapper}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            className="custom-input"
          />
        </div>

        <div style={styles.inputWrapper}>
          <label style={styles.label}>Password</label>
          <div style={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.passwordInput}
              className="custom-input"
            />
            <span
              style={styles.eye}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div style={styles.rowContainer}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxText}>Remember me</span>
          </label>
          <a href="#" style={styles.forgotLink}>Forgot Password?</a>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Loading..." : "Sign In"}
        </button>

        {/* Additional professional elements */}
        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine}></span>
        </div>

        <div style={styles.helpSection}>
          <p style={styles.helpText}>
            Need help? <a href="#" style={styles.helpLink}>Contact Support</a>
          </p>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            © 2024 BeauTech. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        .custom-input:focus {
          border-color: #6A3C17 !important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(106, 60, 23, 0.1);
        }
        
        .custom-input:hover {
          border-color: #8a5424;
        }

        input[type="checkbox"] {
          cursor: pointer;
          accent-color: #6A3C17;
        }

        .forgot-link:hover {
          text-decoration: underline !important;
        }

        .help-link:hover {
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
};

const styles: any = {
  container: {
    height: "100vh",
    width: "100vw",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Poppins', sans-serif",
    position: "relative"
  },

  card: {
    position: "relative",
    zIndex: 1,
    width: "340px",
    padding: "25px 25px",
    borderRadius: "16px",
    background: "rgba(245, 239, 230, 0.85)", // Transparent version of #F5EFE6
    backdropFilter: "blur(10px)", // Adds blur effect behind the card
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    border: "1px solid rgba(255, 255, 255, 0.2)" // Subtle border for glass effect
  },

  logo: {
    width: "120px",
    marginBottom: "2px"
  },

  welcomeContainer: {
    textAlign: "center" as const,
    marginBottom: "2px"
  },

  welcome: {
    margin: 0,
    color: "#6A3C17",
    fontSize: "20px",
    fontWeight: "600",
    letterSpacing: "0.3px",
    textShadow: "0 2px 4px rgba(255,255,255,0.5)" // Light text shadow for better readability
  },

  subText: {
    margin: "3px 0 0 0",
    color: "#8B6B4D",
    fontSize: "13px",
    fontWeight: "400",
    textShadow: "0 1px 2px rgba(255,255,255,0.5)"
  },

  inputWrapper: {
    width: "100%",
    marginBottom: "2px"
  },

  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "500",
    color: "#6A3C17",
    marginBottom: "3px",
    marginLeft: "2px",
    textShadow: "0 1px 2px rgba(255,255,255,0.5)"
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(224, 214, 200, 0.6)", // Slightly transparent border
    fontSize: "14px",
    outline: "none",
    background: "rgba(255, 255, 255, 0.9)", // Slightly transparent white
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.05)",
    transition: "all 0.2s ease",
    boxSizing: "border-box" as const,
  },

  passwordWrapper: {
    width: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center"
  },

  passwordInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(224, 214, 200, 0.6)", // Slightly transparent border
    fontSize: "14px",
    outline: "none",
    background: "rgba(255, 255, 255, 0.9)", // Slightly transparent white
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.05)",
    transition: "all 0.2s ease",
    boxSizing: "border-box" as const,
  },

  eye: {
    position: "absolute",
    right: "16px",
    cursor: "pointer",
    fontSize: "18px",
    opacity: 0.7,
    transition: "opacity 0.2s ease",
  },

  rowContainer: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "2px",
    marginBottom: "2px"
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer"
  },

  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
    accentColor: "#6A3C17"
  },

  checkboxText: {
    fontSize: "12px",
    color: "#5f4b3a",
    textShadow: "0 1px 2px rgba(255,255,255,0.5)"
  },

  forgotLink: {
    fontSize: "12px",
    color: "#6A3C17",
    textDecoration: "none",
    fontWeight: "500",
    transition: "color 0.2s ease",
    cursor: "pointer",
    textShadow: "0 1px 2px rgba(255,255,255,0.5)"
  },

  button: {
    width: "100%",
    padding: "8px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #6A3C17, #8a5424)", // Original solid colors - NO TRANSPARENCY
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "2px",
    boxShadow: "0 5px 15px rgba(106,60,23,0.3)",
    transition: "all 0.2s ease",
    letterSpacing: "0.3px"
    // Removed backdropFilter
  },

  divider: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "6px"
  },

  dividerLine: {
    flex: 1,
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(192, 176, 156, 0.5), transparent)" // Semi-transparent line
  },

  dividerText: {
    fontSize: "11px",
    color: "rgba(139, 107, 77, 0.8)", // Semi-transparent text
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px"
  },

  helpSection: {
    width: "100%",
    textAlign: "center" as const,
    marginTop: "2px"
  },

  helpText: {
    fontSize: "11px",
    color: "rgba(139, 107, 77, 0.8)", // Semi-transparent text
    margin: 0
  },

  helpLink: {
    color: "#6A3C17",
    textDecoration: "none",
    fontWeight: "500",
    marginLeft: "3px",
    textShadow: "0 1px 2px rgba(255,255,255,0.5)"
  },

  footer: {
    width: "100%",
    textAlign: "center" as const,
    marginTop: "2px"
  },

  footerText: {
    fontSize: "9px",
    color: "rgba(163, 139, 118, 0.8)", // Semi-transparent text
    margin: 0,
    letterSpacing: "0.3px"
  },

  error: {
    color: "#d32f2f",
    fontSize: "11px",
    margin: "2px 0",
    textAlign: "center" as const,
    width: "100%",
    padding: "4px",
    background: "rgba(211, 47, 47, 0.1)", // Semi-transparent background
    borderRadius: "4px"
  }
};

export default Login;