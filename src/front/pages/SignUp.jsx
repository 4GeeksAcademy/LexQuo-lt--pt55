import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";
import { toast } from 'react-toastify';

export default function SignUp() {
  const API = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState("");
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);


  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!accountType) return "Please choose an account type.";
    if (!form.firstname || !form.lastname || !form.email || !form.password)
      return "All fields marked with * are required.";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Invalid email.";
    if (!form.phone?.trim())
      return "Phone is required.";
    if (form.password.length < 8) return "Password must have at least 8 characters.";
    if (form.password !== form.confirm) return "Passwords don't match.";
    if (!API) return "VITE_BACKEND_URL is not defined.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const v = validate();
    if (v) return setErrMsg(v);

    setLoading(true);
    try {
      const endpoint =
        accountType === "lawyer" ? `${API}/api/lawyers` : `${API}/api/clients`;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || data?.msg || "The user could not be created.");
      }

      toast.success("User created successfully. You can now log in.");
      setForm((f) => ({ ...f, password: "", confirm: "" }));
      setTimeout(() => navigate("/sign-in"), 1200);
    } catch (err) {
      toast.error(err.message || "Unexpected error");
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
                <h3 className="text-body-highlight">Sign Up</h3>
                <p className="text-body-tertiary">Create your account today</p>
              </div>

              <div className="position-relative mb-4">
                <hr className="bg-body-primary" />
                <div className="divider-content-center">fill your details</div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3 text-start">
                  <label className="form-label" htmlFor="firstname">Name *</label>
                  <input
                    className="form-control"
                    id="firstname"
                    name="firstname"
                    type="text"
                    placeholder="Name"
                    value={form.firstname}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="mb-3 text-start">
                  <label className="form-label" htmlFor="lastname">Lastname *</label>
                  <input
                    className="form-control"
                    id="lastname"
                    name="lastname"
                    type="text"
                    placeholder="Lastname"
                    value={form.lastname}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="mb-3 text-start">
                  <label className="form-label" htmlFor="email">Email address *</label>
                  <input
                    className="form-control"
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="mb-3 text-start">
                  <label className="form-label" htmlFor="phone">
                    Phone{accountType === "lawyer" ? " *" : ""}
                  </label>
                  <input
                    className="form-control"
                    id="phone"
                    name="phone"
                    type="text"
                    placeholder="+54 9 11 5555-5555"
                    value={form.phone}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="mb-3 text-start">
                  <label className="form-label" htmlFor="password">Password *</label>
                  <div className="position-relative" data-password="data-password">
                    <input
                      className="form-control form-icon-input pe-6"
                      id="password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={onChange}
                      autoComplete="new-password"
                      required
                      data-password-input="data-password-input"
                    />
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

                <div className="mb-3 text-start">
                  <label className="form-label" htmlFor="confirm">Confirm Password *</label>
                  <div className="position-relative" data-password="data-password">
                    <input
                      className="form-control form-icon-input pe-6"
                      id="confirm"
                      name="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={form.confirm}
                      onChange={onChange}
                      autoComplete="new-password"
                      required
                      data-password-input="data-password-input"
                    />
                    <button
                      type="button"
                      className="btn px-3 py-0 h-100 position-absolute top-0 end-0 fs-7 text-body-tertiary"
                      onClick={() => setShowConfirm(v => !v)}
                      data-password-toggle="data-password-toggle"
                    >
                      <span className={showConfirm ? "uil uil-eye-slash" : "uil uil-eye"}></span>
                    </button>
                  </div>
                </div>

                <div className="mb-4 text-center">
                  <label className="form-label">Account type *</label>
                  <div className="d-flex justify-content-evenly gap-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="accountType"
                        id="typeClient"
                        value="client"
                        checked={accountType === "client"}
                        onChange={(e) => setAccountType(e.target.value)}
                        required
                      />
                      <label className="form-check-label" htmlFor="typeClient">
                        I am a Client
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="accountType"
                        id="typeLawyer"
                        value="lawyer"
                        checked={accountType === "lawyer"}
                        onChange={(e) => setAccountType(e.target.value)}
                        required
                      />
                      <label className="form-check-label" htmlFor="typeLawyer">
                        I am a Lawyer
                      </label>
                    </div>
                  </div>
                </div>


                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-3"
                  disabled={loading || !accountType}
                >
                  {loading ? "Creating Account..." : "Sign up"}
                </button>

                <div className="text-center">
                  <Link className="fs-9 fw-bold" to="/sign-in">
                    Sign in to an existing account
                  </Link>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}