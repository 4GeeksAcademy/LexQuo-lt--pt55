// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export default function Login() {
  const API = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useGlobalReducer();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg("");
    if (!API) return setErrMsg("VITE_BACKEND_URL no está definido.");
    if (!email || !password) return setErrMsg("Complete email and password");

    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/auth/login`, {          // ⬅️ endpoint unificado
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Credenciales inválidas");

      // data: { token, user: {..., role: 'client'|'lawyer'|'admin'} }
      const token = data?.token;
      const user = data?.user;
      const role = user?.role || data?.role || null;

      if (!token) throw new Error("Respuesta inválida (falta token)");
      if (!role) throw new Error("Respuesta inválida (falta role)");

      sessionStorage.setItem("auth", JSON.stringify({ token }));

      dispatch({ type: "SET_AUTH", payload: { token, role } });
      dispatch({ type: "SET_ME", payload: user });

      /// redirección: respecta returnTo si viene, sino por rol
      const byRole =
        role === "lawyer" ? "/DashboardLawyer" :
          role === "client" ? "/DashboardClient" :
            "/";

      const returnTo = location.state?.returnTo || byRole;
      navigate(returnTo, { replace: true });
    } catch (e) {
      setErrMsg(e.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="mb-5">Sign in</h1>
      <form className="mt-3" onSubmit={handleSubmit}>
        <div className="mb-3 row">
          <label htmlFor="email" className="col-sm-2 col-form-label">Email</label>
          <div className="col-sm-10">
            <input id="email" type="email" className="form-control"
              placeholder="you@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
        </div>

        <div className="mb-3 row">
          <label htmlFor="password" className="col-sm-2 col-form-label">Password</label>
          <div className="col-sm-10">
            <div className="input-group">
              <input id="password" type={showPwd ? "text" : "password"} className="form-control"
                placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        {errMsg && <div className="alert alert-danger py-2">{errMsg}</div>}

        <div className="d-flex gap-2 mt-5 justify-content-center">
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? "Entering..." : "Sign in"}
          </button>
          <Link to="/" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>

      <div className="d-flex gap-2 mt-5 justify-content-end">
        <Link to="/SignUpClient" className="btn btn-sm btn-outline-warning mt-3" style={{ border: "none" }}>
          Create Account
        </Link>
      </div>
    </div>
  );
}
