// src/front/pages/lawyers/ViewLawyer.jsx
import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useEffect, useState } from "react";
import AppNavsShell from "../../components/AppNavsShell";
import StatusPill from "../../components/StatusPill";

export const ViewLawyer = () => {
  const { store, dispatch } = useGlobalReducer();
  const { lawyerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const API = import.meta.env.VITE_BACKEND_URL;

  // ---------- AUTH + ME (mismo esquema que ViewClient) ----------
  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // vuelta por defecto
  const returnTo = location.state?.returnTo || "/lawyers";

  // Contexto opcional (si venís desde un expediente)
  const courtfileId = location.state?.courtfileId || null;
  const [relationId, setRelationId] = useState(location.state?.relationId || null);

  // Badge rápido si vino por state
  const [linkedCourtfile, setLinkedCourtfile] = useState(
    location.state?.courtfileId
      ? { id: location.state.courtfileId, number: location.state.courtfileNumber, title: location.state.courtfileTitle }
      : null
  );

  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  // ---------- State local ----------
  const [lawyer, setLawyer] = useState(null);
  const [linkedRelations, setLinkedRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState(null);

  // 1) Traer lawyer
  useEffect(() => {
    const fetchLawyer = async () => {
      try {
        setLoading(true);
        const resp = await fetch(`${API}/api/lawyers/${lawyerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setLawyer(data);
        setError(null);
      } catch (e) {
        console.error("Error fetching lawyer:", e);
        setError("Failed to load lawyer data");
      } finally {
        setLoading(false);
      }
    };
    if (lawyerId && token) fetchLawyer();
  }, [API, lawyerId, token]);

  // 2) Completar número/título del badge si solo vino id
  useEffect(() => {
    const loadCf = async () => {
      try {
        if (linkedCourtfile?.id && (!linkedCourtfile.number || !linkedCourtfile.title)) {
          const resp = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}`);
          if (resp.ok) {
            const d = await resp.json();
            setLinkedCourtfile((cf) => ({
              ...(cf || {}),
              number: d.case_number,
              title: d.title,
            }));
          }
        }
      } catch {
        // noop
      }
    };
    loadCf();
  }, [API, linkedCourtfile?.id]);

  // 3) Siempre traer TODAS las relaciones de este lawyer
  useEffect(() => {
    const fetchRelations = async () => {
      try {
        const url = role === "lawyer"
          ? `${API}/api/lawyers-courtfiles?lawyer_id=${lawyerId}&only_common=1`
          : `${API}/api/lawyers-courtfiles?lawyer_id=${lawyerId}`;

        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) { setLinkedRelations([]); return; }

        const rows = await resp.json();
        const list = (rows || []).map(r => ({
          relation_id: r.id,
          courtfile_id: r.courtfile_id,
          number: r.courtfile?.case_number ?? null,
          title: r.courtfile?.title ?? null,
        }));

        setLinkedRelations(list);
        if (!linkedCourtfile && list.length > 0) {
          setLinkedCourtfile({
            id: list[0].courtfile_id,
            number: list[0].number,
            title: list[0].title,
          });
          if (!relationId && list[0].relation_id) setRelationId(list[0].relation_id);
        }
      } catch {
        setLinkedRelations([]);
      }
    };
    if (token && lawyerId) fetchRelations();
  }, [API, token, lawyerId, role, linkedCourtfile, relationId]);

  // 4) Acciones
  const handleDelete = async () => {
    // igual que client: sólo admin_user (o tu política) puede borrar
    if (role !== "admin_user") return;
    if (!window.confirm("Are you sure you want to delete this lawyer?")) return;
    try {
      const response = await fetch(`${API}/api/lawyers/${lawyerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        dispatch({ type: "DELETE_LAWYER", payload: Number(lawyerId) || lawyerId });
        navigate(returnTo, { replace: true });
        alert("Lawyer deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete lawyer");
      }
    } catch (err) {
      console.error("Error deleting lawyer:", err);
      alert(`Error deleting lawyer: ${err.message}`);
    }
  };

  // botón grande: unlink de la relación actual (si venís desde un caso)
  const handleUnlink = async () => {
    // por seguridad: sólo admin_user hace unlink de abogados↔expedientes
    if (role !== "admin_user") return;
    if (!relationId) {
      alert("No relation to unlink. Open this lawyer from a case context.");
      return;
    }
    if (!window.confirm("Unlink this lawyer from the case?")) return;
    try {
      setUnlinking(true);
      const resp = await fetch(`${API}/api/lawyers-courtfiles/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      alert("Lawyer unlinked from case.");
      navigate(returnTo, { replace: true });
    } catch (e) {
      alert(e.message || "Error unlinking lawyer");
    } finally {
      setUnlinking(false);
    }
  };

  // unlink por fila en la tabla
  const handleUnlinkOne = async (relId) => {
    if (role !== "admin_user") return;
    if (!window.confirm("Unlink this lawyer from the case?")) return;
    try {
      const resp = await fetch(`${API}/api/lawyers-courtfiles/${relId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      setLinkedRelations((prev) => prev.filter((x) => x.relation_id !== relId));
      if (relationId === relId) setRelationId(null);
      alert("Lawyer unlinked from case.");
    } catch (e) {
      alert(e.message || "Error unlinking lawyer");
    }
  };

  const goToCourtfile = (cfId) => {
    navigate(`/courtfiles/ViewCourtfileLawyer/${cfId}`, {
      state: { returnTo },
    });
  };

  // 5) Render
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading lawyer...</p>
        </div>
      </div>
    );
  }

  if (error || !lawyer) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Lawyer not found"}
        </div>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Back to Lawyers
        </Link>
      </div>
    );
  }

  return (
    <AppNavsShell>
      <div className="page-add">
        {/* Topbar: título + back + badge contextual + unlink si vino de caso */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h1 className="h2 mb-2">Lawyer details</h1>
            <p className="text-muted small mt-1">
              Only a lawyer can unlink themselves from a courtfile.
            </p>
          </div>


          <div className="d-flex align-items-center gap-2">
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
            {role === "admin_user" && relationId && (
              <button
                className="btn btn-outline-danger"
                onClick={handleUnlink}
                disabled={unlinking}
                title="Unlink this lawyer from the current case"
              >
                <i className="bi bi-link-45deg"></i> {unlinking ? "Unlinking..." : "Unlink from case"}
              </button>
            )}
          </div>
        </div>

        <div className="row g-3">
          {/* LEFT: Perfil / datos */}
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm card-roomy">
              <div className="card-body">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="avatar-xl rounded-circle overflow-hidden border">
                    {lawyer.url_img ? (
                      <img src={lawyer.url_img} alt="Lawyer Profile" className="w-100 h-100 object-fit-cover" />
                    ) : (
                      <i className="bi bi-person-circle text-muted d-block text-center w-100" style={{ fontSize: 72 }} />
                    )}
                  </div>
                  <div className="ms-4">
                    <h2 className="h3 mb-3">{(lawyer.firstname || "-") + " " + (lawyer.lastname || "")}</h2>
                    <div className="d-flex flex-wrap gap-2">
                      <StatusPill status={lawyer.is_active} />
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div className="vstack gap-2 mt-4">
                  <div className="d-flex justify-content-between mt-4">
                    <span className="fw-semibold">Email</span>
                    <span className="fw-medium">
                      {lawyer.email ? (
                        <a href={`mailto:${lawyer.email}`} className="link-underline-opacity-0">
                          {lawyer.email}
                        </a>
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="fw-semibold">Phone</span>
                    <span className="fw-medium">{lawyer.phone || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Footer acciones (solo admin) */}
              {role === "admin_user" && (
                <div className="card-footer bg-light d-flex flex-wrap justify-content-end gap-2">
                  <Link
                    to={`/lawyers/${lawyer.id}/password`}
                    state={{ returnTo }}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    <i className="bi bi-key"></i> Change Password
                  </Link>
                  <Link
                    to={`/lawyers/${lawyer.id}`}
                    state={{ returnTo }}
                    className="btn btn-warning btn-sm"
                  >
                    <i className="bi bi-pencil"></i> Edit
                  </Link>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                    <i className="bi bi-trash"></i> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Courtfiles */}
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm h-100 card-roomy">
              <div className="card-header p-3">
                <span className="fs-6 fw-bold">
                  {role === "lawyer" ? "Courtfiles in common" : "Courtfiles"}{" "}
                  <small className="text-muted fs-8">({linkedRelations.length})</small>
                </span>
              </div>

              {linkedRelations.length > 0 ? (
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0 table-edge">
                      <thead className="table-light">
                        <tr>
                          <th className="px-3" style={{ width: 180 }}>Case Number</th>
                          <th className="px-3">Title</th>
                          {role === "admin_user" && <th className="text-end px-3" style={{ width: 140 }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {linkedRelations.map((rel) => (
                          <tr
                            key={rel.relation_id}
                            onClick={() => goToCourtfile(rel.courtfile_id)}
                            className="table-row-clickable"
                          >
                            <td className="fw-semibold px-3">{rel.number ?? `#${rel.courtfile_id}`}</td>
                            <td className="text-body-secondary px-3">{rel.title ?? "—"}</td>
                            {role === "admin_user" && (
                              <td className="text-end px-3">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnlinkOne(rel.relation_id);
                                  }}
                                >
                                  <i className="bi bi-link-45deg"></i> Unlink
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card-body">
                  <div className="alert mb-0">This lawyer is not linked to any case.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppNavsShell >
  );
};
