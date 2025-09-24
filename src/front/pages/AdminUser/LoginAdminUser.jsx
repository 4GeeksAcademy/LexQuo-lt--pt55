import React, { useEffect, useState } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer.jsx";
import { useNavigate, Link } from "react-router-dom";
import { LogoutButton } from "../../components/LogoutButton";

export const LoginAdminUser = () => {

    const navigate = useNavigate();
    const API = import.meta.env.VITE_BACKEND_URL;
    const { dispatch } = useGlobalReducer();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");
    const [okMsg, setOkMsg] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrMsg(""); setOkMsg("");

        if (!API) { setErrMsg("VITE_BACKEND_URL no está definido."); return; }
        if (!email || !password) { setErrMsg("Complete email and password"); return; }

        setLoading(true);

        fetch(`${API}/api/admins/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase(), password })
        })
            .then((resp) =>
                resp
                    .json()
                    .catch(() => ({}))
                    .then((data) => ({ ok: resp.ok, data }))
            )
            .then(({ ok, data }) => {
                if (!ok) {
                    throw new Error(data?.msg || data?.error || "not valid credentials");
                }

                // ======= AUTH UNIFICADO ======= //
                const role = data?.role;
                const user = data?.adminUser;
                const token = data?.token;
                const auth = { role, token, user };

                sessionStorage.setItem("auth", JSON.stringify(auth));

                const name = `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim();
                sessionStorage.setItem("user_name", name);

                sessionStorage.removeItem("token");
                sessionStorage.removeItem("user_id");
                sessionStorage.removeItem("lawyer");

                dispatch({ type: "SET_AUTH", payload: auth });

                setOkMsg("Session started successfully");
                navigate("/admins/dashboard");

            })
            .catch((err) => setErrMsg(err.message || "unexpected error"))
            .finally(() => setLoading(false));
    };

    return (
        <div className="container mt-5">
            <h1 className="mb-5">Sign in as Admin User</h1>  

            <form className="mt-3" onSubmit={handleSubmit}>
                <div className="mb-3 row">
                    <label htmlFor="email" className="col-sm-2 col-form-label">Email</label>
                    <div className="col-sm-10">
                        <input
                            id="email"
                            type="email"
                            className="form-control"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>
                </div>

                <div className="mb-3 row">
                    <label htmlFor="password" className="col-sm-2 col-form-label">Password</label>
                    <div className="col-sm-10">
                        <div className="input-group">
                            <input
                                id="password"
                                type={showPwd ? "text" : "password"}
                                className="form-control"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPwd((v) => !v)}
                                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {showPwd ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                </div>

                {errMsg && <div className="alert alert-danger py-2">{errMsg}</div>}
                {okMsg && <div className="alert alert-success py-2">{okMsg}</div>}

                <div className="d-flex gap-2 mt-5 justify-content-center">
                    <button type="submit" className="btn btn-success" disabled={loading}>
                        {loading ? "Entering..." : "Sign in"}
                    </button>
                    <Link to="/" className="btn btn-outline-secondary">Cancel</Link>
                </div>
            </form>

            <div className="d-flex gap-2 mt-5 justify-content-end">
                <Link to="/SignUpClient" className="btn btn-sm btn-outline-warning mt-3" style={{ border: "none" }}>Create Account</Link>
            </div>

        </div>
    );
};