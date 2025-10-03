import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewAdmin = () => {
  const { store, dispatch } = useGlobalReducer();
  const { adminId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;
  const token = store?.auth?.token;

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/admins/${adminId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (response.status === 401) {
          navigate("/sign-in", { replace: true, state: { returnTo: location.pathname } });
          return;
        }
        if (response.status === 403) {
          navigate("/403", { replace: true });
          return;
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setAdmin(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching admin:", err);
        setError("Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    if (adminId) fetchAdmin();
  }, [adminId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;

    try {
      const response = await fetch(`${API}/api/admins/${adminId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        navigate("/sign-in", { replace: true, state: { returnTo: location.pathname } });
        return;
      }
      if (response.status === 403) {
        navigate("/403", { replace: true });
        return;
      }
      if (response.ok) {
        dispatch({ type: "DELETE_ADMIN", payload: Number(adminId) || adminId });
        navigate("/admins");
        alert("Admin deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete admin");
      }
    } catch (err) {
      console.error("Error deleting admin:", err);
      alert(`Error deleting admin: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading admin...</p>
        </div>
      </div>
    );
  }

  if (error || !admin) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Admin not found"}
        </div>
        <Link to="/admins" className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Admins
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
              <h1>Admin Details</h1>
              <p className="text-muted">ID #{admin.id}</p>
            </div>
            <Link to="/admins" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          {/* Card */}
          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-person-badge"></i> Admin Information
              </h5>
            </div>

            <div className="card-body">
              <div className="row">
                {/* Columna izquierda */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">First Name</label>
                    <p className="fs-6">{admin.firstname || "-"}</p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Last Name</label>
                    <p className="fs-6">{admin.lastname || "-"}</p>
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Email</label>
                    <p className="fs-6">{admin.email || "-"}</p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Status</label>
                    <p className="fs-6">
                      {admin.is_active ? (
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
                <Link to="/admins" className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-left"></i> Back
                </Link>

                <Link to={`/admins/${admin.id}`} className="btn btn-warning">
                  <i className="bi bi-pencil"></i> Edit
                </Link>

                <button className="btn btn-danger" onClick={handleDelete}>
                  <i className="bi bi-trash"></i> Delete
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};