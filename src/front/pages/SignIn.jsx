import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { PublicLayout } from "../components/PublicLayout";
import { toast } from 'react-toastify';

export default function SigIn() {
  const API = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useGlobalReducer();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!API) {
      toast.error("VITE_BACKEND_URL is not defined.");
      return;
    }
    if (!email || !password) {
      toast.warn("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Invalid credentials");

      const token = data?.token;
      const user = data?.user;
      const role = user?.role || data?.role || null;

      if (!token) throw new Error("Invalid response (missing token)");
      if (!role) throw new Error("Invalid response (missing role)");

      localStorage.setItem("auth", JSON.stringify({ token, role }));

      dispatch({ type: "SET_AUTH", payload: { token, role } });
      dispatch({ type: "SET_ME", payload: user });

      const byRole =
        role === "lawyer" ? "/DashboardLawyer" :
          role === "client" ? "/DashboardClient" :
            role === "admin_user" ? "/admins/dashboard" : "/";

      const returnTo = location.state?.returnTo || byRole;
      toast.success("Signed in successfully");
      navigate(returnTo, { replace: true });
    } catch (e) {
      toast.error(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div style={{ backgroundColor: 'white', minHeight: '100vh' }}>
        <div className="container bg-white w-100" style={{ backgroundColor: 'white' }}>
          <div className="row justify-content-center align-items-center min-vh-100 m-0">
            <div className="col-sm-10 col-md-8 col-lg-5 col-xl-5 col-xxl-3 p-4">
              <Link className="d-flex flex-center text-decoration-none mb-4" to="/">
                <div className="d-flex align-items-center fw-bolder fs-3 d-inline-block">
                  <img src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759017461/LogoLexQuoN_hhfcks.png" alt="LexQuo" width="240" />
                </div>
              </Link>

              <div className="text-center mb-7">
                <h3 className="text-body-highlight">Sign In</h3>
                <p className="text-body-tertiary">Get access to your account</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3 text-start">
                  <label className="form-label" htmlFor="email">Email address</label>
                  <div className="form-icon-container">
                    <input
                      id="email"
                      type="email"
                      className="form-control form-icon-input"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                    <span className="fas fa-user text-body fs-9 form-icon"></span>
                  </div>
                </div>

                <div className="mb-3 text-start">
                  <label className="form-label" htmlFor="password">Password</label>
                  <div className="form-icon-container" data-password="data-password">
                    <input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      className="form-control form-icon-input pe-6"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <span className="fas fa-key text-body fs-9 form-icon"></span>
                    <button
                      type="button"
                      className="btn px-3 py-0 h-100 position-absolute top-0 end-0 fs-7 text-body-tertiary"
                      onClick={() => setShowPwd(v => !v)}
                      data-password-toggle="data-password-toggle"
                    >
                      <span className={showPwd ? "uil uil-eye-slash" : "uil uil-eye"}></span>
                    </button>
                  </div>
                </div>

                <div className="row flex-between-center mb-7">
                  <div className="col-auto">
                    <Link className="fs-9 fw-semibold" to="/forgot-password">Forgot Password?</Link>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>

                <div className="text-center">
                  <Link className="fs-9 fw-bold" to="/sign-up">Create an account</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}