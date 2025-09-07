import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewLawyer = () => {
  const { store, dispatch } = useGlobalReducer();
  const { lawyerId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const [lawyer, setLawyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLawyer = async () => {
      try {
        setLoading(true);

        const response = await fetch(`${API}/api/lawyer/${lawyerId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setLawyer(data);
        setError(null);
      } catch (error) {
        console.error("Error fetching lawyer:", error);
        setError("Failed to load lawyer data");
      } finally {
        setLoading(false);
      }
    };

    if (lawyerId) fetchLawyer();
  }, [lawyerId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this lawyer?")) return;

    try {
      const response = await fetch(`${API}/api/lawyer/${lawyerId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        dispatch({ type: "DELETE_LAWYER", payload: lawyerId });
        navigate("/lawyers");
        alert("Lawyer deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete lawyer");
      }
    } catch (error) {
      console.error("Error deleting lawyer:", error);
      alert(`Error deleting lawyer: ${error.message}`);
    }
  };

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
          <i className="bi bi-exclamation-triangle"></i>{" "}
          {error || "Lawyer not found"}
        </div>
        <Link to="/lawyers" className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Lawyers
        </Link>
      </div>
    );
  }

  
  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Lawyer Details</h1>
              <p className="text-muted">ID #{lawyer.id}</p>
            </div>
            <Link to="/lawyers" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-person-badge"></i> Lawyer Information
              </h5>
            </div>

            <div className="card-body">
              <div className="row">

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">First Name</label>
                    <p className="fs-6">{lawyer.firstname || "-"}</p>
                  </div>

                  <div className="mb-3">
                    <label className="fw-bold text-muted">Last Name</label>
                    <p className="fs-6">{lawyer.lastname || "-"}</p>
                  </div>
                </div>

                
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Email</label>
                    <p className="fs-6">{lawyer.email || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">
                <Link to="/lawyers" className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-left"></i> Back
                </Link>

                <Link to={`/lawyers/${lawyer.id}`} className="btn btn-warning">
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
