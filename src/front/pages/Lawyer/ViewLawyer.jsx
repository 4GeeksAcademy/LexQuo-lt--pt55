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
    <div className="container-fluid px-0 px-md-3">
      {/* Breadcrumb + Header */}
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/lawyers">Lawyers</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Lawyer details</li>
        </ol>
      </nav>

      {/* Topbar: título + back + acciones de contexto */}
      <div className="d-flex flex-wrap align-items-center justify-content-between g-3 mb-4 row">
        <div className="col-auto">
          <h2 className="mb-0">Lawyer details</h2>
        </div>
        <div className="col-auto d-flex gap-2 flex-wrap">
          
          {role === "admin_user" && relationId && (
            <button
              type="button"
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

      {/* Main grid */}
      <div className="row g-4">
        {/* LEFT: Perfil / datos (misma card que ViewClient) */}
        <div className="col-7 col-xxl-4">
          <div className="row g-4 h-100">
            <div className="col-12">
              <div className="card h-100">
                <div className="card-body pb-3 d-flex flex-column justify-content-between">
                  <div className="row g-5 align-items-center text-center text-sm-start mb-3">
                    {/* Avatar */}
                    <div className="col-sm-auto col-12 mb-sm-3">
                      <div className="d-inline-flex">
                        <div className="avatar avatar-5xl">
                          {lawyer.url_img ? (
                            <img
                              src={lawyer.url_img}
                              alt="Lawyer Profile"
                              className="rounded-circle"
                            />
                          ) : (
                            <i
                              className="bi bi-person-circle text-muted d-block"
                              style={{ fontSize: 90 }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nombre + estado */}
                    <div className="col-sm-auto col-12 flex-1 ps-5">
                      <h3 className="mb-1">
                        {(lawyer.firstname || "-") + " " + (lawyer.lastname || "")}
                      </h3>
                      <p className="text-body-secondary mb-2"></p>
                      <div className="d-inline-flex gap-2">
                        <StatusPill status={lawyer.is_active} />
                      </div>
                    </div>
                  </div>

                  <div className="border-top border-dashed pt-4 mt-3">
                    <div className="d-flex justify-content-between mb-2">
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
                  <div className="card-footer bg-body-tertiary d-flex flex-wrap justify-content-end gap-2">
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
          </div>
        </div>

        {/* RIGHT: Courtfiles (sin card, solo tabla) */}
        <div className="col-12 col-xxl-8 mt-5">
          <h3 className="mb-3 fs-5 mt-5">
            {role === "lawyer" ? "Courtfiles in common" : "Courtfiles"}{" "}
            <span className="text-body-tertiary fw-normal fs-10">
              ({linkedRelations.length})
            </span>
          </h3>
          <p className="fs-10">Only lawyers can unlink themselves of courtfiles.</p>

          {linkedRelations.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle table-modern mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3" style={{ width: 200 }}>Case Number</th>
                    <th className="px-3">Title</th>
                    {role === "admin_user" && (
                      <th className="text-end px-3" style={{ width: 160 }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {linkedRelations.map((rel) => (
                    <tr
                      key={rel.relation_id}
                      onClick={() => goToCourtfile(rel.courtfile_id)}
                      className="table-row-clickable"
                      style={{ cursor: "pointer" }}
                    >
                      <td className="fw-semibold px-3">
                        {rel.number ?? `#${rel.courtfile_id}`}
                      </td>
                      <td className="text-body-secondary px-3">
                        {rel.title ?? "—"}
                      </td>
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
          ) : (
            <div className="alert alert-info mb-0">
              This lawyer is not linked to any case.
            </div>
          )}
        </div>
      </div>
    </div>
  </AppNavsShell>
);
};