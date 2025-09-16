import React, { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const LawyerLinkOrInviteLawyer = () => {
  const API = import.meta.env.VITE_BACKEND_URL;
  const { store } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();

  const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
  const token = auth?.token;

  // Sólo abogados
  if (auth?.role !== "lawyer") return <Navigate to="/403" replace />;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/DashboardLawyer";

  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");

  const [foundLawyer, setFoundLawyer] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createForm, setCreateForm] = useState({
    firstname: "",
    lastname: "",
    license: "",
    phone: ""
  });

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
  };

  const capitalize = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

  // --- 1) Buscar lawyer por email ---
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchErr(""); setFoundLawyer(null); setNotFound(false);

    const emailTrim = (email || "").trim().toLowerCase();
    if (!emailTrim) { setSearchErr("Enter an email"); return; }

    try {
      setSearching(true);

      // /lawyers/lookup?email=
      const resp = await fetch(`${API}/api/lawyers/lookup?email=${encodeURIComponent(emailTrim)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);

      if (data?.found && data?.lawyer) {
        setFoundLawyer(data.lawyer);
        setNotFound(false);
      } else {
        setFoundLawyer(null);
        setNotFound(true);
      }
    } catch (err) {
      setSearchErr(err.message || "Search error");
    } finally {
      setSearching(false);
    }
  };

  // --- 2) Linkear lawyer existente al expediente ---
  const linkLawyerToCase = async (lawyerId) => {
    if (!preselectedCourtfileId) {
      alert("No courtfile provided.");
      return;
    }
    try {
      // Usa tu POST /lawyers-courtfiles
      const resp = await fetch(`${API}/api/lawyers-courtfiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          lawyer_id: Number(lawyerId),           // <- target lawyer
          courtfile_id: Number(preselectedCourtfileId)
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);

      alert("Lawyer linked to case! ✅");
      navigate(returnTo);
    } catch (err) {
      alert(err.message || "Error linking lawyer");
    }
  };

  // --- 3) Crear + linkear si no existe ---
  const handleCreateAndLink = async (e) => {
    e.preventDefault();
    setCreateErr("");

    const firstname = createForm.firstname.trim();
    const lastname = createForm.lastname.trim();
    const license = createForm.license.trim();
    const phone = createForm.phone.trim();

    if (!firstname || !lastname) {
      setCreateErr("Firstname and lastname are required");
      return;
    }
    if (!email) {
      setCreateErr("Email is required");
      return;
    }

    // Password por defecto: LexQuoNombreApellido
    const password = `LexQuo${capitalize(firstname)}${capitalize(lastname)}`;

    try {
      setCreating(true);

      // 3.1) Crear lawyer
      const createResp = await fetch(`${API}/api/lawyers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          firstname,
          lastname,
          email: email.trim().toLowerCase(),
          license,
          phone,
          password,
          role: "lawyer"
        })
      });
      const newLawyer = await createResp.json().catch(() => ({}));
      if (!createResp.ok) throw new Error(newLawyer.error || `HTTP ${createResp.status}`);

      // 3.2) Linkear al expediente
      await linkLawyerToCase(newLawyer.id);
    } catch (err) {
      setCreateErr(err.message || "Error creating lawyer");
    } finally {
      setCreating(false);
    }
  };

  // --- 4) Opción alternativa: invitar por email (redirigir a signup) ---
  const handleInvite = () => {
    if (!preselectedCourtfileId) {
      alert("No courtfile provided.");
      return;
    }
    const emailTrim = (email || "").trim().toLowerCase();
    if (!emailTrim) {
      alert("Enter an email first");
      return;
    }
    const params = new URLSearchParams({
      role: "lawyer",
      email: emailTrim,
      courtfile_id: String(preselectedCourtfileId),
      returnTo
    });
    navigate(`/SignUpLawyer?${params.toString()}`);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Link or Create Lawyer</h1>
          {preselectedCourtfileId && (
            <span className="badge bg-info mt-2">
              Case {preselectedCourtfileNumber || `#${preselectedCourtfileId}`}
              {preselectedCourtfileTitle ? ` — ${preselectedCourtfileTitle}` : ""}
            </span>
          )}
        </div>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Back
        </Link>
      </div>

      {/* Buscar por email */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Lawyer Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lawyer@email.com"
                  required
                  disabled={searching || creating}
                />
              </div>
              <div className="col-md-auto">
                <button className="btn btn-primary" type="submit" disabled={searching || creating}>
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
              {searchErr && <div className="col-12 mt-2"><div className="alert alert-danger">{searchErr}</div></div>}
            </div>
          </form>
        </div>
      </div>

      {/* Resultado: lawyer encontrado */}
      {foundLawyer && (
        <div className="card mb-4 border-success">
          <div className="card-header bg-success text-white">Lawyer found</div>
          <div className="card-body">
            <p className="mb-1"><strong>Name:</strong> {foundLawyer.firstname} {foundLawyer.lastname}</p>
            <p className="mb-1"><strong>Email:</strong> {foundLawyer.email}</p>
            <p className="mb-1"><strong>License:</strong> {foundLawyer.license || "—"}</p>
            <p className="mb-3"><strong>Phone:</strong> {foundLawyer.phone || "—"}</p>

            <button
              className="btn btn-success"
              onClick={() => linkLawyerToCase(foundLawyer.id)}
              disabled={creating}
            >
              Link to this Case
            </button>
          </div>
        </div>
      )}

      {/* No encontrado: mostrar formulario corto para crear */}
      {notFound && (
        <div className="card">
          <div className="card-header bg-warning">Lawyer not found — Create & Link</div>
          <div className="card-body">
            {createErr && <div className="alert alert-danger">{createErr}</div>}
            
            <div className="mb-3">
              <p className="mb-2">
                No lawyer with <strong>{email}</strong> was found. You can:
              </p>
            </div>
            
            <div className="mb-4">
              <h5>Option 1: Create a new lawyer account</h5>
              <form onSubmit={handleCreateAndLink}>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">Firstname *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="firstname"
                      value={createForm.firstname}
                      onChange={handleCreateChange}
                      required
                      disabled={creating}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Lastname *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="lastname"
                      value={createForm.lastname}
                      onChange={handleCreateChange}
                      required
                      disabled={creating}
                    />
                  </div>
                  
                  <div className="col-md-3">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      name="phone"
                      value={createForm.phone}
                      onChange={handleCreateChange}
                      placeholder="+54 9 11 5555-5555"
                      disabled={creating}
                    />
                  </div>
                </div>

                <div className="form-text mt-2">
                  Default password will be: <code>LexQuoNombreApellido</code>
                </div>

                <div className="mt-3 d-flex justify-content-end">
                  <button type="submit" className="btn btn-primary me-2" disabled={creating}>
                    {creating ? "Creating & Linking..." : "Create & Link"}
                  </button>
                </div>
              </form>
            </div>
            
            
          </div>
        </div>
      )}
    </div>
  );
};