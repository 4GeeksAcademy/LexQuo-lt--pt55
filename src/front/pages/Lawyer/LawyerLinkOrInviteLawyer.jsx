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

      if (resp.status === 404) {
        setFoundLawyer(null);
        setNotFound(true);
        return;
      }

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

      if (lw?.email) {
        try {
          await notifyLawyerLinkedEmail({
            email: lw.email,
            firstname: lw.firstname,
            lastname: lw.lastname,
            courtfileId: preselectedCourtfileId,
            courtfileNumber: preselectedCourtfileNumber
          });
          alert("Lawyer linked to case and notification email sent ✅");
        } catch (e) {
          alert(`Lawyer linked, but email failed: ${e.message}`);
        }
      } else {
        alert("Lawyer linked to case! ✅");
      }
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
    const phone = createForm.phone.trim();

    if (!firstname || !lastname) {
      setCreateErr("Firstname and lastname are required");
      return;
    }
    if (!email) {
      setCreateErr("Email is required");
      return;
    }

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
          phone,
          password,
          role: "lawyer"
        })
      });
      const newLawyer = await createResp.json().catch(() => ({}));
      if (!createResp.ok) throw new Error(newLawyer.error || `HTTP ${createResp.status}`);

      // 3.2) Linkear al expediente
      await linkLawyerToCase(newLawyer.id);

      // 3.3) Enviar invitación por mail (inline)
      const inviteResp = await fetch(`${API}/api/emails/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          role: "lawyer",
          email: email.trim().toLowerCase(),
          firstname,
          lastname,
          courtfile_id: Number(preselectedCourtfileId),
          courtfile_number: preselectedCourtfileNumber
        })
      });

      let inviteJson = {};
      try { inviteJson = await inviteResp.json(); } catch { }
      if (!inviteResp.ok || inviteJson?.error) {
        throw new Error(inviteJson?.error || `Invite failed (HTTP ${inviteResp.status})`);
      }

      alert("Lawyer created, linked and invitation email sent ✅");
      navigate(returnTo);
    } catch (err) {
      setCreateErr(err.message || "Error creating lawyer");
    } finally {
      setCreating(false);
    }
  };

  // Envía el correo cuando un LAWYER existente fue linkeado a un expediente
  const notifyLawyerLinkedEmail = async ({ email, firstname, lastname, courtfileId, courtfileNumber }) => {
    const resp = await fetch(`${API}/api/emails/linked`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        role: "lawyer",
        email: (email || "").trim().toLowerCase(),
        firstname: firstname || "",
        lastname: lastname || "",
        courtfile_id: Number(courtfileId),
        courtfile_number: courtfileNumber || null
      })
    });

    let data = {};
    try { data = await resp.json(); } catch { }
    if (!resp.ok || data?.error) {
      throw new Error(data?.error || `Linked email failed (HTTP ${resp.status})`);
    }
    return data; // { ok: true, sent_to: ... }
  };



  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Link or Create Lawyer</h1>
        </div>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Back
        </Link>
      </div>

      {preselectedCourtfileId && (
        <span className="badge bg-dark mt-2 mb-2">
          Related to Courtfile {preselectedCourtfileNumber || `#${preselectedCourtfileId}`}
          {preselectedCourtfileTitle ? ` — ${preselectedCourtfileTitle}` : ""}
        </span>
      )}

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
            <p className="mb-3"><strong>Phone:</strong> {foundLawyer.phone || "—"}</p>

            <button
              className="btn btn-success"
              onClick={() => linkLawyerToCase(foundLawyer)}
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
          <div className="card-header bg-warning">Lawyer not found — Create, Link and Invite</div>
          <div className="card-body">
            {createErr && <div className="alert alert-danger">{createErr}</div>}


            {/* ---------- Create & Link ---------- */}
            <div className="mb-4">

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
                  Default password will be:{" "}
                  <code>{`LexQuo${capitalize(createForm.firstname)}${capitalize(createForm.lastname)}`}</code>
                </div>

                <div className="mt-3 d-flex justify-content-end">
                  <button type="submit" className="btn btn-primary" disabled={creating}>
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