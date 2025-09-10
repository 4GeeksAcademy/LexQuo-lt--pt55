import { useNavigate, Link } from "react-router-dom";
import React, { useEffect, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const Admins = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const fetchAdmins = async () => {
    try {
      const response = await fetch(`${API}/api/admins`);
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_ADMINS", payload: data });
      } else {
        console.error("Error fetching admins");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;

    try {
      const response = await fetch(`${API}/api/admins/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        dispatch({ type: "DELETE_ADMIN", payload: id });
        alert("Admin deleted successfully!");
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      alert(`Error deleting admin: ${error.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">ADMINS</h1>

      <Link to="/admins/addAdmin" className="btn btn-primary mb-3">
        <i className="bi bi-plus-circle"></i> New Admin
      </Link>

      {store.admins && store.admins.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Firstname</th>
                <th>Lastname</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <strong>{admin.id}</strong>
                  </td>
                  <td>{admin.firstname}</td>
                  <td>{admin.lastname}</td>
                  <td>{admin.email}</td>
                  <td>
                    <span
                      className={`badge ${admin.is_active ? "bg-success" : "bg-danger"
                        }`}
                    >
                      {admin.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/admins/view/${admin.id}`}
                      className="btn btn-sm btn-info me-1"
                      title="View details"
                    >
                      <i className="bi bi-eye"></i>
                    </Link>
                    <Link
                      to={`/admins/${admin.id}`}
                      className="btn btn-sm btn-warning me-1"
                      title="Edit"
                    >
                      <i className="bi bi-pencil"></i>
                    </Link>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Delete"
                      onClick={() => {
                        handleDeleteAdmin(admin.id);
                      }}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> No Admins found. Create your
          first one!
        </div>
      )}
    </div>
  );
};