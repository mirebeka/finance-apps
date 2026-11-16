import React, { useState } from "react";
import axios from "axios";
import "./SPO_Login.css";
import { API_URL } from "./config";


function SPO_Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [showResetModal,setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("")

  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [loginSucceeded, setLoginSucceeded] = useState(false);

  

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(API_URL + "/api/spo/login", {
        email: email.trim(),
        password,
      });

      // stored after a successful login

      if (res.data.passwordNotYetChanged) {
        setResetEmail(email.trim());
        setResetStep(2);
        setShowResetModal(true);
        setLoginSucceeded(true);
        return;
      }

      localStorage.setItem("spo_user", res.data.username);
      localStorage.setItem("spo_logged_in", "true");
      localStorage.setItem("spo_role", res.data.role);


      onLoginSuccess?.(res.data.username);

    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    }
  };


  const closeResetModal = () => {
    setShowResetModal(false);
    setResetStep(1);
    setResetEmail("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetMessage("");
    setResetError("");
  };

  const handleCheckResetEmail = async () => {
  setResetError("");
  setResetMessage("");

  if (!resetEmail.trim()) {
    setResetError("Please enter your email address.");
    return;
  }

  try {
    setResetLoading(true);

    const res = await axios.post(
      API_URL + "/api/spo/check-first-password-reset",
      {
        email: resetEmail.trim(),
      }
    );

    setResetMessage(res.data.message || "Email verified.");
    setResetStep(2);
  } catch (err) {
    setResetError(
      err.response?.data?.message || "Failed to verify email."
    );
  } finally {
    setResetLoading(false);
  }
};

  const handleFirstPasswordChange = async () => {
  setResetError("");
  setResetMessage("");

  if (!newPassword || !confirmNewPassword) {
    setResetError("Please fill in both password fields.");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    setResetError("The two passwords do not match.");
    return;
  }

  try {
    setResetLoading(true);

    const res = await axios.post(
      API_URL + "/api/spo/change-first-password",
      {
        email: resetEmail,
        newPassword,
      }
    );

    setResetMessage(res.data.message || "Password successfully updated.");

    setTimeout(() => {
      const wasLoginSucceeded = loginSucceeded;
      closeResetModal();

      if (wasLoginSucceeded) {
        onLoginSuccess?.(localStorage.getItem("spo_user"));
      }
    }, 1000);

  } catch (err) {
    setResetError(
      err.response?.data?.message || "Failed to update password."
    );
  } finally {
    setResetLoading(false);
  }
};

  return (
    <div className="spo-login-page">
      <h2 className="spo-login-title">SPO Login</h2>
        <form className="spo-login-card" onSubmit={handleLogin}>

            <div className="spo-login-field">
            <label className="spo-login-label">Email</label>
            <input
                className="spo-login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
            />
            </div>

            <div className="spo-login-field">
            <label className="spo-login-label">Password</label>
            <input
                className="spo-login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
            />
            </div>

            {error ? <div className="spo-login-error">{error}</div> : null}

            <button className="spo-login-button" type="submit">
            Log in
            </button>

      
        </form>

        {showResetModal && (
          <div className="spo-modal-overlay">
            <div className="spo-modal-box" onClick={(e) => e.stopPropagation()}>
              <h3 className="spo-modal-title">Reset password</h3>

              {resetStep === 1 && (
                <>
                  <div className="spo-login-field">
                    <label className="spo-login-label">Email</label>
                    <input
                      className="spo-login-input"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  {resetError ? (
                    <div className="spo-login-error">{resetError}</div>
                  ) : null}

                  {resetMessage ? (
                    <div className="spo-login-success">{resetMessage}</div>
                  ) : null}

                  <div className="spo-modal-actions">
                    <button
                      className="spo-forgot-password"
                      type="button"
                      onClick={closeResetModal}
                    >
                      Cancel
                    </button>

                    <button
                      className="spo-login-button"
                      type="button"
                      onClick={handleCheckResetEmail}
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Checking..." : "Next"}
                    </button>
                  </div>
                </>
              )}

              {resetStep === 2 && (
                <>
                  <div className="spo-login-field">
                    <label className="spo-login-label">Email</label>
                    <input
                      className="spo-login-input"
                      type="email"
                      value={resetEmail}
                      disabled
                    />
                  </div>

                  <div className="spo-login-field">
                    <label className="spo-login-label">New Password</label>
                    <input
                      className="spo-login-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="spo-login-field">
                    <label className="spo-login-label">Confirm New Password</label>
                    <input
                      className="spo-login-input"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  {resetError ? (
                    <div className="spo-login-error">{resetError}</div>
                  ) : null}

                  {resetMessage ? (
                    <div className="spo-login-success">{resetMessage}</div>
                  ) : null}

                  <div className="spo-modal-actions">
                    {!loginSucceeded && (
                      <button
                        className="spo-forgot-password"
                        type="button"
                        onClick={closeResetModal}
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      className="spo-login-button"
                      type="button"
                      onClick={handleFirstPasswordChange}
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Saving..." : "Save new password"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>



    );
    }

export default SPO_Login;