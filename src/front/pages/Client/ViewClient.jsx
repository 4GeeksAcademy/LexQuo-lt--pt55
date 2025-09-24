import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewClient = () => {
  const { dispatch } = useGlobalReducer();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/clients";


  const API = import.meta.env.VITE_BACKEND_URL;

  // Contexto (opcional, si venís desde un expediente)
  const courtfileId = location.state?.courtfileId || null;
  const [relationId, setRelationId] = useState(location.state?.relationId || null);

  // Badge rápido si vino por state
  const [linkedCourtfile, setLinkedCourtfile] = useState(
    location.state?.courtfileId
      ? {
        id: location.state.courtfileId,
        number: location.state.courtfileNumber,
        title: location.state.courtfileTitle,
      }
      : null
  );

  // Todas las relaciones del cliente
  const [linkedRelations, setLinkedRelations] = useState([]);

  // Auth
  const ssAuth = JSON.parse(sessionStorage.getItem("auth") || "null");
  const token = ssAuth?.token || null;
  const { store } = useGlobalReducer();
  const role = (store?.me?.role || "").toLowerCase();

  if (!token) {
    return (
      <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />
    );
  }

  // Datos del cliente
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlinking, setUnlinking] = useState(false);

  // 1) Traer cliente
  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setClient(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching client:", err);
        setError("Failed to load client data");
      } finally {
        setLoading(false);
      }
    };

    if (clientId) fetchClient();
  }, [API, clientId]);

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
      } catch (e) {
        // noop
      }
    };
    loadCf();
  }, [API, linkedCourtfile?.id]);

  // 3) Siempre traer TODAS las relaciones de este cliente
  useEffect(() => {
    const fetchAllRelations = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const resp = await fetch(`${API}/api/clients-courtfiles`, { headers });
        if (!resp.ok) return;

        const rows = await resp.json();

        // Filtrar SOLO las relaciones de este cliente
        const list = (rows || [])
          .filter((r) => Number(r.client_id) === Number(clientId))
          .map((r) => ({
            relation_id: r.id,
            courtfile_id: r.courtfile_id,
            number: r.courtfile_number,
            title: r.courtfile_title,
          }));

        setLinkedRelations(list);

        // Si venís desde un courtfile y todavía no tenés relationId, lo inferimos
        if (role === "lawyer" && courtfileId && !relationId) {
          const match = list.find((x) => Number(x.courtfile_id) === Number(courtfileId));
          if (match?.relation_id) setRelationId(match.relation_id);
        }

        // Opcional: si no vino nada por state, podés mostrar el primero en el badge
        if (!linkedCourtfile && list.length > 0) {
          setLinkedCourtfile({
            id: list[0].courtfile_id,
            number: list[0].number,
            title: list[0].title,
          });
        }
      } catch (_) {
        // noop
      }
    };

    fetchAllRelations();
  }, [API, clientId, token, role, courtfileId, relationId, linkedCourtfile]);

  // 4) Acciones
  const handleDelete = async () => {
    if (role === "lawyer") return;
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      const response = await fetch(`${API}/api/clients/${clientId}`, { 
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (response.ok) {
        dispatch({ type: "DELETE_CLIENT", payload: Number(clientId) || clientId });
        navigate(returnTo, { replace: true });
        alert("Client deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete client");
      }
    } catch (err) {
      console.error("Error deleting client:", err);
      alert(`Error deleting client: ${err.message}`);
    }
  };

  // botón grande: unlink de la relación actual (si venís desde un caso)
  const handleUnlink = async () => {
    if (role !== "lawyer") return;
    if (!relationId) {
      alert("No relation to unlink. Open this client from a case context.");
      return;
    }
    if (!window.confirm("Unlink this client from the case?")) return;
    try {
      setUnlinking(true);
      const resp = await fetch(`${API}/api/clients-courtfiles/${relationId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      alert("Client unlinked from case.");
      navigate(returnTo, { replace: true });
    } catch (e) {
      alert(e.message || "Error unlinking client");
    } finally {
      setUnlinking(false);
    }
  };

  // unlink por fila en la tabla
  const handleUnlinkOne = async (relId) => {
    if (role !== "lawyer") return;
    if (!window.confirm("Unlink this client from the case?")) return;

    try {
      const resp = await fetch(`${API}/api/clients-courtfiles/${relId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      // refrescar localmente
      setLinkedRelations((prev) => prev.filter((x) => x.relation_id !== relId));
      if (relationId === relId) setRelationId(null);
      alert("Client unlinked from case.");
    } catch (e) {
      alert(e.message || "Error unlinking client");
    }
  };

  // 5) Render
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading client...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Client not found"}
        </div>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Client Details</h1>
            </div>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          {/* Tabla con TODAS las relaciones */}
          {linkedRelations.length > 0 ? (
            <div className="card mb-3">
              <div className="card-header">
                <strong>Linked Cases ({linkedRelations.length})</strong>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: "160px" }}>Case Number</th>
                        <th>Title</th>
                        {role === "lawyer" && (
                          <th className="text-end" style={{ width: "140px" }}>
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {linkedRelations.map((rel) => (
                        <tr key={rel.relation_id}>
                          <td>{rel.number || `#${rel.courtfile_id}`}</td>
                          <td>{rel.title || "—"}</td>
                          {role === "lawyer" && (
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleUnlinkOne(rel.relation_id)}
                                title="Unlink from this case"
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
            </div>
          ) : (
            <div className="alert alert-info mb-3">This client is not linked to any case.</div>
          )}

          {/* Card con datos del cliente */}
          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-person-badge"></i> Client Information
              </h5>
            </div>

            <div className="card-body">
              <div className="d-flex justify-content-center mb-4">
                {client.url_img ? (
                  <img
                    src={client.url_img}
                    alt="Client Profile"
                    className="rounded-circle border border-2 shadow-sm"
                    style={{ width: "150px", height: "150px", objectFit: "cover" }}
                  />
                ) : (
                  <i className="bi bi-person-circle text-muted" style={{ fontSize: "150px" }}></i>
                )}
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">First Name</label>
                    <p className="fs-6">{client.firstname || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Last Name</label>
                    <p className="fs-6">{client.lastname || "-"}</p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Email</label>
                    <p className="fs-6">{client.email || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Phone</label>
                    <p className="fs-6">{client.phone || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Status</label>
                    <p className="fs-6">
                      {client.is_active ? (
                        <span className="badge text-bg-success">Active</span>
                      ) : (
                        <span className="badge text-bg-secondary">Inactive</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">
                {role === "lawyer" ? (
                  <button
                    className="btn btn-danger"
                    disabled={unlinking}
                    onClick={handleUnlink}
                    title={relationId ? "Unlink from case" : "Open from a case to unlink"}
                  >
                    {unlinking ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      <i className="bi bi-link-45deg"></i>
                    )}{" "}
                    Unlink from case
                  </button>
                ) : (
                  <>
                    <Link
                      to={`/clients/${client.id}/password`}
                      state={{ returnTo }}
                      className="btn btn-outline-secondary"
                    >
                      <i className="bi bi-key"></i> Change Password
                    </Link>
                    <Link
                      to={`/clients/${client.id}`}
                      state={{ returnTo }}
                      className="btn btn-warning"
                    >
                      <i className="bi bi-pencil"></i> Edit
                    </Link>
                    <button className="btn btn-danger" onClick={handleDelete}>
                      <i className="bi bi-trash"></i> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
