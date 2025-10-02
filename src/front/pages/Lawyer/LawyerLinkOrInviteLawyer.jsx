import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";

export const LawyerLinkOrInviteLawyer = () => {
  const RAW_API =
    import.meta.env.PROD
      ? (import.meta.env.VITE_BACKEND_URL || window.location.origin)  // prod: env o mismo origen
      : (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"); // dev: env o localhost

  const API = RAW_API.replace(/\/+$/, "");
  const { store } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();
  if (role !== "lawyer") return <Navigate to="/403" replace />;

  // -------- Contexto --------
  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/DashboardLawyer";
  const [clientConflict, setClientConflict] = useState(null);

  // SIEMPRE usamos selectedCourtfileId (preseleccionado o elegido del combo)
  const [selectedCourtfileId, setSelectedCourtfileId] = useState(
    preselectedCourtfileId ? String(preselectedCourtfileId) : ""
  );

  // Si solo llegó el ID, traemos número/título (como en AddDeadline)
  const [preselectedCf, setPreselectedCf] = useState(
    preselectedCourtfileNumber
      ? { case_number: preselectedCourtfileNumber, title: preselectedCourtfileTitle }
      : null
  );

  // URL para ver el courtfile si vino preseleccionado
  const cfViewUrl = preselectedCourtfileId
    ? `/courtfiles/ViewCourtfileLawyer/${preselectedCourtfileId}`
    : null;

  useEffect(() => {
    const fetchPref = async () => {
      if (!preselectedCourtfileId || preselectedCf) return;
      try {
        const r = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const d = await r.json();
          setPreselectedCf({ case_number: d.case_number, title: d.title });
        }
      } catch { }
    };
    fetchPref();
  }, [API, token, preselectedCourtfileId, preselectedCf]);

  // -------- Desplegable de expedientes del lawyer (si NO vino preseleccionado) --------
  const [myCases, setMyCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [casesErr, setCasesErr] = useState("");

  useEffect(() => {
    const fetchCases = async () => {
      if (preselectedCourtfileId) return;
      setCasesErr("");
      try {
        setLoadingCases(true);
        const resp = await fetch(`${API}/api/lawyers-courtfiles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json().catch(() => []);
        if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
        const mapped = (data || []).map((r) => ({
          id: r.courtfile.id,
          number: r.courtfile.case_number,
          title: r.courtfile.title,
        }));
        setMyCases(mapped);
      } catch (e) {
        setCasesErr(e.message || "Error fetching courtfiles");
      } finally {
        setLoadingCases(false);
      }
    };
    fetchCases();
  }, [API, token, preselectedCourtfileId]);

  // -------- Buscar por email --------
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");

  const [foundLawyer, setFoundLawyer] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchErr("");
    setFoundLawyer(null);
    setNotFound(false);
    setClientConflict(null);

    const emailTrim = (email || "").trim().toLowerCase();
    if (!emailTrim) {
      setSearchErr("Enter an email");
      return;
    }

    try {
      setSearching(true);
      const resp = await fetch(
        `${API}/api/lawyers/lookup?email=${encodeURIComponent(emailTrim)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (resp.status === 404) {
        setFoundLawyer(null);
        setNotFound(true);
        return;
      }

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);

      if (data?.client_exists) {
        setClientConflict(data.client);
        setFoundLawyer(null);
        setNotFound(false);
      } else if (data?.found && data?.lawyer) {
        setFoundLawyer(data.lawyer);
        setNotFound(false);
        setClientConflict(null);
      } else {
        setFoundLawyer(null);
        setNotFound(true);
        setClientConflict(null);
      }
    } catch (err) {
      setSearchErr(err.message || "Search error");
    } finally {
      setSearching(false);
    }
  };


  // -------- Helpers --------
  const capitalize = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  const notifyLawyerLinkedEmail = async ({ email, firstname, lastname, courtfileId, courtfileNumber }) => {
    const resp = await fetch(`${API}/api/emails/linked`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    if (!resp.ok || data?.error) throw new Error(data?.error || `Linked email failed (HTTP ${resp.status})`);
    return data;
  };

  // -------- Link existente (usa el courtfile seleccionado o el preseleccionado) --------
  const linkLawyerToCase = async (lawyerOrId) => {
    const targetCourtfileId = Number(selectedCourtfileId || preselectedCourtfileId);
    if (!targetCourtfileId) { alert("Please select a courtfile to link."); return; }

    const lawyer = typeof lawyerOrId === "object" ? lawyerOrId : null;
    const lawyerId = lawyer ? lawyer.id : lawyerOrId;

    try {
      const resp = await fetch(`${API}/api/lawyers-courtfiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lawyer_id: Number(lawyerId), courtfile_id: targetCourtfileId })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);

      if (lawyer?.email) {
        try {
          await notifyLawyerLinkedEmail({
            email: lawyer.email,
            firstname: lawyer.firstname,
            lastname: lawyer.lastname,
            courtfileId: targetCourtfileId,
            courtfileNumber:
              preselectedCf?.case_number || myCases.find(c => c.id === targetCourtfileId)?.number || preselectedCourtfileNumber || null
          });
          alert("Lawyer linked to case and notification email sent ✅");
        } catch (e) {
          alert(`Lawyer linked, but email failed: ${e.message}`);
        }
      } else {
        alert("Lawyer linked to case! ✅");
      }
      navigate(returnTo, { replace: true });
    } catch (err) {
      alert(err.message || "Error linking lawyer");
    }
  };

  // -------- Crear + Link + Invitar --------
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createForm, setCreateForm] = useState({ firstname: "", lastname: "", phone: "" });

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateAndLink = async (e) => {
    e.preventDefault();
    setCreateErr("");

    const targetCourtfileId = Number(selectedCourtfileId || preselectedCourtfileId);
    if (!targetCourtfileId) { setCreateErr("Please select a courtfile to link."); return; }

    const firstname = createForm.firstname.trim();
    const lastname = createForm.lastname.trim();
    const phone = createForm.phone.trim();
    if (!firstname || !lastname) { setCreateErr("Firstname and lastname are required"); return; }
    if (!email) { setCreateErr("Email is required"); return; }

    const password = `LexQuo${capitalize(firstname)}${capitalize(lastname)}`;

    try {
      setCreating(true);

      const createResp = await fetch(`${API}/api/lawyers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

      await linkLawyerToCase(newLawyer); // reutiliza lógica (incluye notificación)

      // Invitación explícita (si querés mantenerlo separado del "linked")
      const inviteResp = await fetch(`${API}/api/emails/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          role: "lawyer",
          email: email.trim().toLowerCase(),
          firstname,
          lastname,
          courtfile_id: targetCourtfileId,
          courtfile_number:
            preselectedCf?.case_number || myCases.find(c => c.id === targetCourtfileId)?.number || preselectedCourtfileNumber || null
        })
      });
      let inviteJson = {};
      try { inviteJson = await inviteResp.json(); } catch { }
      if (!inviteResp.ok || inviteJson?.error) {
        throw new Error(inviteJson?.error || `Invite failed (HTTP ${inviteResp.status})`);
      }

      alert("Lawyer created, linked and invitation email sent ✅");
      navigate(returnTo, { replace: true });
    } catch (err) {
      setCreateErr(err.message || "Error creating lawyer");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppNavsShell>
      <div className="container add-page">
        <div className="row">
          <div className="col-12 col-lg-8">
            {/* Header con Breadcrumbs */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="flex-grow-1">
                <nav aria-label="breadcrumb" className="mb-2">
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <Link to="/DashboardLawyer">Dashboard</Link>
                    </li>

                    {preselectedCourtfileId ? (
                      <>
                        <li className="breadcrumb-item">
                          <Link to="/courtfiles">Courtfiles</Link>
                        </li>
                        <li className="breadcrumb-item">
                          <Link to={cfViewUrl}>
                            {preselectedCf?.case_number || `#${preselectedCourtfileId}`}
                            {preselectedCf?.title ? ` — ${preselectedCf.title}` : ""}
                          </Link>
                        </li>
                        <li className="breadcrumb-item active" aria-current="page">
                          Link or Create Lawyer
                        </li>
                      </>
                    ) : (
                      <li className="breadcrumb-item active" aria-current="page">
                        Link or Create Lawyer
                      </li>
                    )}
                  </ol>
                </nav>

                <h1 className="display-5 fw-bold mb-0 mt-4">Link or Create Lawyer</h1>
              </div>
            </div>

            {/* Badge si vino desde un expediente */}
            {preselectedCourtfileId && (
              <span className="badge badge-phoenix-secondary mt-2 mb-3">
                Related to Courtfile {preselectedCf?.case_number || `#${preselectedCourtfileId}`}
                {preselectedCf?.title ? ` — ${preselectedCf.title}` : ""}
              </span>
            )}

            {/* Desplegable de courtfiles (solo si NO hay preseleccionado) */}
            {!preselectedCourtfileId && (
              <div className="row g-2 align-items-end mb-4 mt-2">
                <div className="col-md-8">
                  <div className="form-floating">
                    <select
                      className="form-select"
                      id="courtfile_id"
                      name="courtfile_id"
                      value={selectedCourtfileId}
                      onChange={(e) => setSelectedCourtfileId(e.target.value)}
                      disabled={loadingCases}
                      required
                    >
                      <option value=""></option>
                      {myCases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.number} — {c.title}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="courtfile_id">Link to Courtfile *</label>
                  </div>
                </div>
                {casesErr && (
                  <div className="col-12 mt-2">
                    <div className="alert alert-danger d-flex align-items-center" role="alert">
                      <i className="bi bi-exclamation-triangle me-2" /> {casesErr}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buscar por email */}

            <form onSubmit={handleSearch}>
              <div className="row g-2 align-items-end">
                <div className="col-md-7">
                  <div className="form-floating">
                    <input
                      type="email"
                      className="form-control"
                      id="lawyer_email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="lawyer@email.com"
                      required
                      disabled={searching || creating}
                    />
                    <label htmlFor="lawyer_email">Lawyer Email</label>
                  </div>
                </div>
                <div className="col-md-auto">
                  <button className="btn btn-phoenix-primary" type="submit" disabled={searching || creating}>
                    {searching ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-search me-2" />
                        Search
                      </>
                    )}
                  </button>
                </div>
                {searchErr && (
                  <div className="col-12 mt-2">
                    <div className="alert alert-danger d-flex align-items-center" role="alert">
                      <i className="bi bi-exclamation-triangle me-2" /> {searchErr}
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Conflict: email belongs to a Client */}
            {clientConflict && (
              <div className="mt-5 ms-2">
                <h4 className="mb-3 text-danger">
                  <i className="bi bi-exclamation-triangle me-2" />
                  This email is already registered as a Client
                </h4>
                <p className="mb-2 fs-9">
                  <strong>Name:</strong> {clientConflict.firstname} {clientConflict.lastname}
                </p>
                <p className="mb-3 fs-9">
                  <strong>Email:</strong> {clientConflict.email}
                </p>

                <div className="d-flex align-items-center text-dark">
                  <i className="bi bi-info-circle me-2" />
                  <span>
                    You cannot link this user as a Lawyer. Please go to the{" "}
                    <Link to="/clients" className="fw-bold text-decoration-none">
                      Clients section
                    </Link>{" "}
                    to link them to a Courtfile instead.
                  </span>
                </div>
              </div>
            )}


            {/* Resultado: lawyer encontrado */}
            {foundLawyer && (
              <div className="mt-5 ms-2">
                <h4 className="mb-3">
                  <i className="bi bi-check-circle me-2 text-success" />
                  Lawyer found
                </h4>
                <p className="mb-1 fs-9"><strong>Name:</strong> {foundLawyer.firstname} {foundLawyer.lastname}</p>
                <p className="mb-1 fs-9"><strong>Email:</strong> {foundLawyer.email}</p>
                <p className="mb-3 fs-9"><strong>Phone:</strong> {foundLawyer.phone || "—"}</p>

                <div className="d-flex justify-content-end">
                  <p className="form-text me-3 mb-0 d-inline-flex align-items-center">
                    <i className="bi bi-envelope me-1"></i>
                    The lawyer will receive an email invitation once linked to the case.
                  </p>
                  <button
                    className="btn btn-phoenix-success me-auto"
                    onClick={() => linkLawyerToCase(foundLawyer)}
                    disabled={creating || !(selectedCourtfileId || preselectedCourtfileId)}
                    title={!(selectedCourtfileId || preselectedCourtfileId) ? "Select a courtfile first" : ""}
                  >
                    <i className="bi bi-link-45deg me-2" />
                    Link to this Case
                  </button>
                </div>
              </div>
            )}

            {/* No encontrado: Create & Link & Invite */}
            {notFound && (
              <div className="mt-5">

                <h4 className="mb-3">
                  <i className="bi bi-person-plus me-2" />
                  Lawyer not found — Create, Link and Invite
                </h4>

                {/* Alerta si falta courtfile */}
                {!(selectedCourtfileId || preselectedCourtfileId) && (
                  <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle me-2" />
                    Please select a courtfile to link.
                  </div>
                )}

                {createErr && (
                  <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle me-2" /> {createErr}
                  </div>
                )}

                <form onSubmit={handleCreateAndLink}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="form-floating">
                        <input
                          type="text"
                          className="form-control"
                          id="firstname"
                          name="firstname"
                          value={createForm.firstname}
                          onChange={handleCreateChange}
                          placeholder=" "
                          required
                          disabled={creating}
                        />
                        <label htmlFor="firstname">Firstname *</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-floating">
                        <input
                          type="text"
                          className="form-control"
                          id="lastname"
                          name="lastname"
                          value={createForm.lastname}
                          onChange={handleCreateChange}
                          placeholder=" "
                          required
                          disabled={creating}
                        />
                        <label htmlFor="lastname">Lastname *</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-floating">
                        <input
                          type="tel"
                          className="form-control"
                          id="phone"
                          name="phone"
                          value={createForm.phone}
                          onChange={handleCreateChange}
                          placeholder="+54 9 11 5555-5555"
                          disabled={creating}
                        />
                        <label htmlFor="phone">Phone</label>
                      </div>
                    </div>
                  </div>

                  <div className="form-text mt-2">
                    Default password will be:{" "}
                    <code>{`LexQuo${capitalize(createForm.firstname)}${capitalize(createForm.lastname)}`}</code>
                  </div>

                  <div className="d-flex gap-2 justify-content-end mt-4">
                    <p className="form-text me-3 mb-0 d-inline-flex align-items-center">
                      <i className="bi bi-envelope me-1"></i>
                      The lawyer will receive an email invitation once linked to the case.
                    </p>
                    <Link to={returnTo} className="btn btn-phoenix-secondary">Cancel</Link>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={creating || !(selectedCourtfileId || preselectedCourtfileId)}
                      title={!(selectedCourtfileId || preselectedCourtfileId) ? "Select a courtfile first" : ""}
                    >
                      {creating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                          Creating & Linking...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle me-2" />
                          Create & Link
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
