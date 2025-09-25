import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const Payments = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;

  // Función para capitalizar la primera letra
  const capitalizeFirstLetter = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Función para formatear la fecha
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";

    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API}/api/payments`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_PAYMENTS", payload: data });
      } else {
        console.error("Error fetching payments");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;

    try {
      const response = await fetch(`${API}/api/payments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },

      });

      if (response.ok) {
        dispatch({ type: "DELETE_PAYMENT", payload: id });
        alert("Payment deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert(`Error deleting payment: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="mb-4">PAYMENTS</h1>

      <Link to="/payments/addPayment" className="btn btn-primary mb-3">
        <i className="bi bi-plus-circle"></i> New payment
      </Link>

      {store.payments && store.payments.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Means</th>
                <th>Created At</th> {/* Nueva columna */}
                <th>Paid At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.payments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.id}</strong></td>
                  <td>{payment.amount}</td>
                  <td>{payment.currency}</td>
                  <td>
                    <span className={`badge ${payment.status === 'approved' ? 'bg-success' :
                        payment.status === 'pending' ? 'bg-warning' :
                          payment.status === 'processing' ? 'bg-info' :
                            payment.status === 'rejected' ? 'bg-danger' : 'bg-secondary'
                      }`}>
                      {capitalizeFirstLetter(payment.status)}
                    </span>
                  </td>
                  <td>{capitalizeFirstLetter(payment.means)}</td>
                  <td>{formatDateTime(payment.created_at)}</td> {/* Nueva columna */}
                  <td>{formatDateTime(payment.paid_at)}</td>
                  <td>
                    <Link to={`/payments/view/${payment.id}`} className="btn btn-sm btn-info me-1" title="View">
                      <i className="bi bi-eye"></i>
                    </Link>
                    <Link to={`/payments/${payment.id}`} className="btn btn-sm btn-warning me-1" title="Edit">
                      <i className="bi bi-pencil"></i>
                    </Link>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Delete"
                      onClick={() => handleDeletePayment(payment.id)}
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
          <i className="bi bi-info-circle"></i> No Payments found. Create your first one!
        </div>
      )}
    </div>
  );
};