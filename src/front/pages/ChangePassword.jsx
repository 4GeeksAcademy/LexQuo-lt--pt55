// src/pages/common/ChangePassword.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import AppNavsShell from "../components/AppNavsShell";
import { toast } from 'react-toastify';

export default function ChangePassword({ kind }) {
  const { id } = useParams(); // :id
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `/${kind}s/view/${id}`;
  const { store } = useGlobalReducer();

  const API = import.meta.env.VITE_BACKEND_URL;

  // ---------- AUTH + ME ----------
  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer" || role === "client";
  if (!allowed) return <Navigate to="/403" replace />;

  const [form, setForm] = useState({ current: "", newer: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  // estados para show/hide
  const [show, setShow] = useState({
    current: false,
    newer: false,
    confirm: false,
  });

  const toggleShow = (field) => setShow((prev) => ({ ...prev, [field]: !prev[field] }));
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.newer || form.newer.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (form.newer !== form.confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const resp = await fetch(`${API}/api/${kind}s/${id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current: form.current, new: form.newer }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.error) throw new Error(data?.error || `HTTP ${resp.status}`);

      toast.success("Password updated ✅");
      navigate(returnTo, { replace: true });
    } catch (e) {
      toast.error(e.message || "Error updating password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppNavsShell>
      <div className="container main-content">
        <div className="row">
          <div className="col-12 col-lg-7">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="mb-2">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to={`/${kind}s`}>
                    {(kind || "").charAt(0).toUpperCase() + (kind || "").slice(1)}s
                  </Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Change password
                </li>
              </ol>
            </nav>

            {/* Header */}
            <div className="d-flex flex-wrap align-items-center justify-content-between g-3 mb-4 mt-4">
              <h2 className="mb-0">Change Password</h2>
            </div>


            <form onSubmit={handleSubmit}>
              {/* Current password */}
              <div className="input-group mb-3">
                <div className="form-floating flex-grow-1">
                  <input
                    type={show.current ? "text" : "password"}
                    className="form-control"
                    id="currentPassword"
                    name="current"
                    value={form.current}
                    onChange={handleChange}
                    placeholder=" "
                    disabled={loading}
                    required
                  />
                  <label htmlFor="currentPassword">Current password</label>
                </div>
                <button
                  type="button"
                  className="btn btn-phoenix-secondary"
                  onClick={() => toggleShow("current")}
                  tabIndex={-1}
                >
                  <i className={`bi ${show.current ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>

              {/* New password */}
              <div className="input-group mb-3">
                <div className="form-floating flex-grow-1">
                  <input
                    type={show.newer ? "text" : "password"}
                    className="form-control"
                    id="newPassword"
                    name="newer"
                    value={form.newer}
                    onChange={handleChange}
                    placeholder=" "
                    disabled={loading}
                    required
                    minLength={8}
                  />
                  <label htmlFor="newPassword">New password</label>
                </div>
                <button
                  type="button"
                  className="btn btn-phoenix-secondary"
                  onClick={() => toggleShow("newer")}
                  tabIndex={-1}
                >
                  <i className={`bi ${show.newer ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>

              {/* Confirm password */}
              <div className="input-group mb-3">
                <div className="form-floating flex-grow-1">
                  <input
                    type={show.confirm ? "text" : "password"}
                    className="form-control"
                    id="confirmPassword"
                    name="confirm"
                    value={form.confirm}
                    onChange={handleChange}
                    placeholder=" "
                    disabled={loading}
                    required
                  />
                  <label htmlFor="confirmPassword">Confirm new password</label>
                </div>
                <button
                  type="button"
                  className="btn btn-phoenix-secondary"
                  onClick={() => toggleShow("confirm")}
                  tabIndex={-1}
                >
                  <i className={`bi ${show.confirm ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
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
    </AppNavsShell>
  );
};
