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

  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();
  const isMyProfile = role === "lawyer" && me?.id === Number(lawyerId);

  const returnTo = location.state?.returnTo || "/lawyers";

  const [relationId, setRelationId] = useState(location.state?.relationId || null);
  const [linkedCourtfile, setLinkedCourtfile] = useState(
    location.state?.courtfileId
      ? { id: location.state.courtfileId, number: location.state.courtfileNumber, title: location.state.courtfileTitle }
      : null
  );


  const [lawyer, setLawyer] = useState(null);
  const [linkedRelations, setLinkedRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch {
        setLinkedRelations([]);
      }
    };
    if (token && lawyerId) fetchRelations();
  }, [API, token, lawyerId, role]);

  const handleDelete = async () => {
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
      alert("Lawyer unlinked from case.");
    } catch (e) {
      alert(e.message || "Error unlinking lawyer");
    }
  };

  const goToCourtfile = (cfId) => {
    navigate(`/courtfiles/ViewCourtfileLawyer/${cfId}`, { state: { returnTo } });
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading lawyer...</p>
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
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/lawyers">Lawyers</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Lawyer details</li>
        </ol>
      </nav>

      {/* Header con acciones AL ANCHO DE LA CARD (col-7) */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-xxl-7 col-xl-7">
          <div className="d-flex flex-wrap align-items-center justify-content-between">
            <h2 className="mb-3 mt-2">Lawyer details</h2>
            {(role === "admin_user" || isMyProfile) && (
              <div className="d-flex gap-2 flex-wrap">
                <Link
                  to={`/lawyers/${lawyer.id}/password`}
                  state={{ returnTo }}
                  className="btn btn-phoenix-secondary btn-sm"
                >
                  <i className="bi bi-key" /> Change Password
                </Link>
                <Link
                  to={`/lawyers/${lawyer.id}`}
                  state={{ returnTo }}
                  className="btn btn-phoenix-secondary btn-sm"
                >
                  <i className="bi bi-pencil" /> Edit
                </Link>
                <button className="btn btn-phoenix-danger btn-sm" onClick={handleDelete}>
                  <i className="bi bi-trash" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card perfil (col-7) */}
      <div className="row g-4">
        <div className="col-12 col-xxl-7 col-xl-7">
          <div className="card h-100">
            <div className="card-body pb-3 d-flex flex-column justify-content-between">
              <div className="row g-5 align-items-center text-center text-sm-start mb-3">
                {/* Avatar */}
                <div className="col-sm-auto col-12 mb-sm-3">
                  <div className="avatar avatar-5xl">
                    {lawyer.url_img ? (
                      <img src={lawyer.url_img} alt="Lawyer Profile" className="rounded-circle" />
                    ) : (
                      <i className="bi bi-person-circle text-muted d-block" style={{ fontSize: 90 }} />
                    )}
                  </div>
                </div>

                {/* Nombre + estado */}
                <div className="col-sm-auto col-12 flex-1 ps-sm-5">
                  <h3 className="mb-1">
                    {(lawyer.firstname || "-") + " " + (lawyer.lastname || "")}
                  </h3>
                  <div className="d-inline-flex gap-2 mt-2">
                      {lawyer.is_active ? (
                        <span className="badge badge-phoenix badge-phoenix-success">Active</span>
                      ) : (
                        <span className="badge badge-phoenix badge-phoenix-danger">Inactive</span>
                      )}
                    </div>
                </div>
              </div>

              {/* Datos */}
              <div className="border-top border-dashed pt-4 mt-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-semibold">Email</span>
                  <span className="fw-medium">
                    {lawyer.email ? (
                      <a href={`mailto:${lawyer.email}`} className="link-underline-opacity-0">
                        {lawyer.email}
                      </a>
                    ) : "-"}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="fw-semibold">Phone</span>
                  <span className="fw-medium">{lawyer.phone || "-"}</span>
                </div>
              </div>
            </div>            
          </div>
        </div>
      </div>

      {/* Courtfiles ABAJO de la card, mismo ancho col-7 */}
      {!isMyProfile && (
        <div className="row g-3 mt-4">
          <div className="col-12 col-xxl-7 col-xl-7">
            <h3 className="mb-3 fs-5">
              {role === "lawyer" ? "Courtfiles in common" : "Courtfiles"}{" "}
              <span className="text-body-tertiary fw-normal fs-10">
                ({linkedRelations.length})
              </span>
            </h3>
            <p className="fs-8">Only lawyers can unlink themselves of courtfiles.</p>

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
                              <i className="bi bi-link-45deg" /> Unlink
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
      )}
    </div>
  </AppNavsShell>
);
};