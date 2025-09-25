// src/pages/common/ChangePassword.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";

export default function ChangePassword({ kind }) {
  const { id } = useParams(); // :id
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `/${kind}s/view/${id}`;

  const API = import.meta.env.VITE_BACKEND_URL;
  
  // ---------- Guards ----------
    const allowed =
      role === "admin_user" ||
      role === "lawyer" ||
      role === "client";
      
    if (!allowed) return <Navigate to="/403" replace />;

  const [form, setForm] = useState({ current: "", newer: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // estados para show/hide
  const [show, setShow] = useState({
    current: false,
    newer: false,
    confirm: false,
  });

  const toggleShow = (field) =>
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.newer || form.newer.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    if (form.newer !== form.confirm) {
      setErr("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const resp = await fetch(`${API}/api/${kind}s/${id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ current: form.current, new: form.newer }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.error) throw new Error(data?.error || `HTTP ${resp.status}`);

      alert("Password updated ✅");
      navigate(returnTo, { replace: true });
    } catch (e) {
      setErr(e.message || "Error updating password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Change Password</h1>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Back
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          {err && <div className="alert alert-danger">{err}</div>}
          <form onSubmit={handleSubmit}>
            {/* Current password */}
            <div className="mb-3">
              <label className="form-label">Current password</label>
              <div className="input-group">
                <input
                  type={show.current ? "text" : "password"}
                  className="form-control"
                  name="current"
                  value={form.current}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => toggleShow("current")}
                  tabIndex={-1}
                >
                  <i className={`bi ${show.current ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="mb-3">
              <label className="form-label">New password</label>
              <div className="input-group">
                <input
                  type={show.newer ? "text" : "password"}
                  className="form-control"
                  name="newer"
                  value={form.newer}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  disabled={loading}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => toggleShow("newer")}
                  tabIndex={-1}
                >
                  <i className={`bi ${show.newer ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="mb-3">
              <label className="form-label">Confirm new password</label>
              <div className="input-group">
                <input
                  type={show.confirm ? "text" : "password"}
                  className="form-control"
                  name="confirm"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Repeat new password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => toggleShow("confirm")}
                  tabIndex={-1}
                >
                  <i className={`bi ${show.confirm ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            <div className="text-end">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Save new password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
