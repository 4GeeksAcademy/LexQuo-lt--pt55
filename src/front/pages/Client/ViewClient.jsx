import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";
import StatusPill from "../../components/StatusPill";

export const ViewClient = () => {
  const { store, dispatch } = useGlobalReducer();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const API = import.meta.env.VITE_BACKEND_URL;

  // -------------------- AUTH + ME (alineado con DashboardClient) --------------------
  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // returnTo (igual que antes)
  const returnTo = location.state?.returnTo || "/clients";

  // Contexto opcional (si venís desde un expediente)
  const courtfileId = location.state?.courtfileId || null;
  const [relationId, setRelationId] = useState(location.state?.relationId || null);

  // Badge rápido si vino por state
  const [linkedCourtfile, setLinkedCourtfile] = useState(
    location.state?.courtfileId
      ? { id: location.state.courtfileId, number: location.state.courtfileNumber, title: location.state.courtfileTitle }
      : null
  );

  const allowed =
    role === "admin_user" ||
    role === "lawyer" ||
    (role === "client" && String(me?.id) === String(clientId));

  if (!allowed) return <Navigate to="/403" replace />;

  // -------------------- State local --------------------
  const [linkedRelations, setLinkedRelations] = useState([]);
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
        const headers = { Authorization: `Bearer ${token}` }
        const resp = await fetch(`${API}/api/clients-courtfiles`, { headers });
        if (!resp.ok) return;

        const rows = await resp.json();

        // Filtrar SOLO las relaciones de este cliente
        const list = (rows || [])
          .filter((r) => Number(r.client_id) === Number(clientId))
          .map((r) => ({
            relation_id: r.id,
            courtfile_id: r.courtfile_id,
            // ← ahora priorizamos los campos del objeto courtfile
            number: r.courtfile?.case_number ?? r.courtfile_number ?? null,
            title: r.courtfile?.title ?? r.courtfile_title ?? null,
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
        headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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

  const goToCourtfile = (cfId) => {
    if (role !== "lawyer") return;              // sólo abogados navegan ahí
    navigate(`/courtfiles/ViewCourtfileLawyer/${cfId}`, {
      state: { returnTo },                      // volvés fácil
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
    <AppNavsShell>
      <div className="page-add">
        {/* Topbar: título + back + badge contextual */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-3">
            <h1 className="h2 mb-2">Client details</h1>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
            {role === "lawyer" && relationId && (
              <button
                className="btn btn-outline-danger"
                onClick={handleUnlink}
                disabled={unlinking}
                title="Unlink this client from the current case"
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
                <div className="d-flex align-items-center gap-3 mb-4">  {/* +gap y +mb */}
                  <div className="avatar-xl rounded-circle overflow-hidden border">
                    {client.url_img ? (
                      <img src={client.url_img} alt="Client Profile" className="w-100 h-100 object-fit-cover" />
                    ) : (
                      <i className="bi bi-person-circle text-muted d-block text-center w-100" style={{ fontSize: 72 }} />
                    )}
                  </div>
                  <div className="ms-4">
                    <h2 className="h3 mb-3">{(client.firstname || "-") + " " + (client.lastname || "")}</h2>
                    <div className="d-flex flex-wrap gap-2">
                      <StatusPill status={client.is_active} />
                    </div>
                  </div>
                </div>

                {/* Contacto */}

                <div className="vstack gap-2 mt-4">
                  <div className="d-flex justify-content-between mt-4">
                    <span className="fw-semibold">Email</span>
                    <span className="fw-medium">
                      {client.email ? (
                        <a href={`mailto:${client.email}`} className="link-underline-opacity-0">
                          {client.email}
                        </a>
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="fw-semibold">Phone</span>
                    <span className="fw-medium">{client.phone || "-"}</span>
                  </div>
                </div>
              </div>


              {/* Footer acciones (admin) */}
              {role !== "lawyer" && (
                <div className="card-footer bg-light d-flex flex-wrap justify-content-end gap-2">
                  <Link
                    to={`/clients/${client.id}/password`}
                    state={{ returnTo }}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    <i className="bi bi-key"></i> Change Password
                  </Link>
                  <Link
                    to={`/clients/${client.id}`}
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
            <div className="card shadow-sm h-100 card-roomy">   {/* <- mismo aire */}
              <div className="card-header p-3">
                <span className="fs-6 fw-bold">
                  Courtfiles{" "}
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
                          {role === "lawyer" && <th className="text-end px-3" style={{ width: 140 }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {linkedRelations.map((rel) => (
                          <tr key={rel.relation_id}
                            onClick={() => goToCourtfile(rel.courtfile_id)}
                            className="table-row-clickable">
                            <td className="fw-semibold px-3">{rel.number ?? `#${rel.courtfile_id}`}</td>
                            <td className="text-body-secondary px-3">{rel.title ?? "—"}</td>
                            {role === "lawyer" && (
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
                  <div className="alert alert-info mb-0">This client is not linked to any case.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div >
    </AppNavsShell >
  );

};
