import useGlobalReducer from "../../hooks/useGlobalReducer";  // Custom hook for accessing the global state.
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";


export const SignUpAdminUser = () => {

    const API = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();

    const [form, setForm] = useState({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        password: "",
        confirm: ""
    });
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");
    const [okMsg, setOkMsg] = useState("");

    const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const validate = () => {
        if (!form.firstname || !form.lastname || !form.email || !form.password)
            return "All fields are required";
        if (!/\S+@\S+\.\S+/.test(form.email))
            return "Email inválido.";
        if (form.password.length < 8)
            return "Password must have at least 8 characters";
        if (form.password !== form.confirm)
            return "Passwords doesn't match";
        if (!API)
            return "VITE_BACKEND_URL no está definido.";
        return null;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrMsg(""); setOkMsg("");

        const v = validate();
        if (v) { setErrMsg(v); return; }

        setLoading(true);

        fetch(`${API}/api/admins`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstname: form.firstname.trim(),
                lastname: form.lastname.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone?.trim() || "",
                password: form.password
            })
        })
            .then((resp) =>
                resp
                    .json()
                    .catch(() => ({}))
                    .then((data) => ({ ok: resp.ok, data }))
            )
            .then(({ ok, data }) => {
                if (!ok) {
                    throw new Error(data?.error || data?.msg || "The user could not be created.");
                }
                setOkMsg("User created successfully. You can now log in.");
                setForm((f) => ({ ...f, password: "", confirm: "" }));
                setTimeout(() => navigate("/loginAdmin"), 1200);
            })
            .catch((err) => setErrMsg(err.message || "Error inesperado"))
            .finally(() => setLoading(false));
    };

    return (
        <div className="container mt-5">
            <h2 className="mb-5">Create Admin User Account</h2>
            <form className="mt-3" onSubmit={handleSubmit}>
                <div className="mb-3 row">
                    <label htmlFor="firstname" className="col-sm-2 col-form-label">Name</label>
                    <div className="col-sm-10">
                        <input id="firstname" name="firstname" type="text" className="form-control"
                            value={form.firstname} onChange={onChange} required />
                    </div>
                </div>

                <div className="mb-3 row">
                    <label htmlFor="lastname" className="col-sm-2 col-form-label">Lastname</label>
                    <div className="col-sm-10">
                        <input id="lastname" name="lastname" type="text" className="form-control"
                            value={form.lastname} onChange={onChange} required />
                    </div>
                </div>

                <div className="mb-3 row">
                    <label htmlFor="email" className="col-sm-2 col-form-label">Email</label>
                    <div className="col-sm-10">
                        <input id="email" name="email" type="email" className="form-control"
                            value={form.email} onChange={onChange} required />
                    </div>
                </div>

                <div className="mb-3 row">
                    <label htmlFor="phone" className="col-sm-2 col-form-label">Phone</label>
                    <div className="col-sm-10">
                        <input id="phone" name="phone" type="text" className="form-control"
                            value={form.phone} onChange={onChange} />
                    </div>
                </div>

                <div className="mb-3 row">
                    <label htmlFor="password" className="col-sm-2 col-form-label">Password</label>
                    <div className="col-sm-10">
                        <div className="input-group">
                            <input
                                id="password"
                                name="password"
                                type={showPwd ? "text" : "password"}
                                className="form-control"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={onChange}
                                autoComplete="new-password"
                                required
                            />
                            <button type="button" className="btn btn-outline-secondary"
                                onClick={() => setShowPwd(v => !v)}>
                                {showPwd ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-3 row">
                    <label htmlFor="confirm" className="col-sm-2 col-form-label">Confirm</label>
                    <div className="col-sm-10">
                        <div className="input-group">
                            <input
                                id="confirm"
                                name="confirm"
                                type={showConfirm ? "text" : "password"}
                                className="form-control"
                                placeholder="Repeat password"
                                value={form.confirm}
                                onChange={onChange}
                                autoComplete="new-password"
                                required
                            />
                            <button type="button" className="btn btn-outline-secondary"
                                onClick={() => setShowConfirm(v => !v)}>
                                {showConfirm ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                </div>

                {errMsg && <div className="alert alert-danger py-2">{errMsg}</div>}
                {okMsg && <div className="alert alert-success py-2">{okMsg}</div>}

                <div className="d-flex gap-2 mt-5 justify-content-center">
                    <button type="submit" className="btn btn-success" disabled={loading}>
                        {loading ? "Creating..." : "Create Account"}
                    </button>
                    <Link to="/" className="btn btn-outline-secondary">Cancel</Link>
                </div>
            </form>

            <div className="d-flex justify-content-end mt-5">
                <Link to="/LoginAdminUser" className="btn btn-sm btn-outline-primary" style={{ border: "none" }}>Already have an account? Sign in!</Link>  {/* 👈 Enlace a LoginAdminUser */}
            </div>
        </div>
    );
};