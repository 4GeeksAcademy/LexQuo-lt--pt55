import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";
import StatusPill from "../../components/StatusPill";
import { toast } from 'react-toastify';

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
      } catch (err) {
        console.error("Error fetching client:", err);
        toast.error("Failed to load client data");
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
        toast.success("Client deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete client");
      }
    } catch (err) {
      console.error("Error deleting client:", err);
      token.error(`Error deleting client: ${err.message}`);
    }
  };

  // botón grande: unlink de la relación actual (si venís desde un caso)
  const handleUnlink = async () => {
    if (role !== "lawyer") return;
    if (!relationId) {
      toast.warn("No relation to unlink. Open this client from a case context.");
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
      toast.success("Client unlinked from case.");
      navigate(returnTo, { replace: true });
    } catch (e) {
      toast.error(e.message || "Error unlinking client");
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
      toast.success("Client unlinked from case.");
    } catch (e) {
      toast.error(e.message || "Error unlinking client");
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
      <AppNavsShell>

      <div className="container add-page">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading client...</p>
        </div>
      </div>
      </AppNavsShell>
    );
  }

 
  return (
    <AppNavsShell>
      <div className="container-fluid add-page">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/clients">Clients</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Client details</li>
          </ol>
        </nav>

        {/* Header con acciones AL ANCHO DE LA CARD (col-7) */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-xxl-7 col-xl-7">
            <div className="d-flex flex-wrap align-items-center justify-content-between">
              <h2 className="mb-3 mt-2">Client details</h2>

              <div className="d-flex gap-2 flex-wrap">
                {/* Botón de unlink (solo lawyer con relationId) */}
                {role === "lawyer" && relationId && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleUnlink}
                    disabled={unlinking}
                    title="Unlink this client from the current case"
                  >
                    <i className="bi bi-link-45deg" /> {unlinking ? "Unlinking..." : "Unlink from case"}
                  </button>
                )}

                {/* Acciones de admin (antes estaban en el footer) */}
                {role !== "lawyer" && (
                  <>
                    <Link
                      to={`/clients/${client.id}/password`}
                      state={{ returnTo }}
                      className="btn btn-phoenix-secondary"
                    >
                      <i className="bi bi-key" /> Change Password
                    </Link>
                    <Link
                      to={`/clients/${client.id}`}
                      state={{ returnTo }}
                      className="btn btn-phoenix-secondary"
                    >
                      <i className="bi bi-pencil" /> Edit
                    </Link>
                    <button className="btn btn-phoenix-danger btn-sm" onClick={handleDelete}>
                      <i className="bi bi-trash" /> Delete
                    </button>
                  </>
                )}
              </div>
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
                    <div className="d-inline-flex">
                      <div className="avatar avatar-5xl">
                        {client.url_img ? (
                          <img src={client.url_img} alt="Client Profile" className="rounded-circle" />
                        ) : (
                          <i className="bi bi-person-circle text-muted d-block" style={{ fontSize: 90 }} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nombre + estado */}
                  <div className="col-sm-auto col-12 flex-1 ps-sm-5">
                    <h3 className="mb-1">
                      {(client.firstname || "-") + " " + (client.lastname || "")}
                    </h3>
                    <div className="d-inline-flex gap-2 mt-2">
                      {client.is_active ? (
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
                      {client.email ? (
                        <a href={`mailto:${client.email}`} className="link-underline-opacity-0">
                          {client.email}
                        </a>
                      ) : "-"}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="fw-semibold">Phone</span>
                    <span className="fw-medium">{client.phone || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Quitamos footer: las acciones ahora están arriba alineadas a col-7 */}
            </div>
          </div>
        </div>

        {/* Courtfiles ABAJO de la card, mismo ancho col-7 */}
        <div className="row g-3 mt-4">
          <div className="col-12 col-xxl-7 col-xl-7">
            <h3 className="mb-3 fs-5">
              Courtfiles{" "}
              <span className="text-body-tertiary fw-normal fs-10">
                ({linkedRelations.length})
              </span>
            </h3>

            {linkedRelations.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle table-modern mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-3" style={{ width: 200 }}>Case Number</th>
                      <th className="px-3">Title</th>
                      {role === "lawyer" && (
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
                        style={{ cursor: role === "lawyer" ? "pointer" : "default" }}
                      >
                        <td className="fw-semibold px-3">
                          {rel.number ?? `#${rel.courtfile_id}`}
                        </td>
                        <td className="text-body-secondary px-3">
                          {rel.title ?? "—"}
                        </td>
                        {role === "lawyer" && (
                          <td className="text-end px-3">
                            <button
                              className="btn btn-phoenix btn-phoenix-danger"
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
              <div className="alert text-secondary bg-transparent border-0 mt-2">
                This client is not linked to any case.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};