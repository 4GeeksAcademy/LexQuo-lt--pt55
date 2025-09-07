import { useNavigate, Link } from "react-router-dom";
import React, { useEffect, useState } from "react"
import useGlobalReducer from "../hooks/useGlobalReducer";


export const Lawyers = () => {
    const { store, dispatch } = useGlobalReducer()
    const API = import.meta.env.VITE_BACKEND_URL;

    const fetchLawyers = async () => {
        try {
            const response = await fetch(`${API}/api/lawyers`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'SET_LAWYERS', payload: data });
            } else {
                console.error("Error fetching lawyers");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    useEffect(() => {
        fetchLawyers();
    }, []);

    const handleDeleteLawyers = async (id) => {
        if (!window.confirm('Are you sure you want to delete this lawyer?')) return

        try {
            const response = await fetch(`${API}/api/lawyers/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                dispatch({ type: 'DELETE_LAWYER', payload: id });
                alert('Lawyer deleted successfully!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting lawyer:', error);
            alert(`Error deleting lawyer: ${error.message}`);
        }
    };



    return (
        <div className="container mt-4">
            <h1 className="mb-4">LAWYERS</h1>

            <Link to="/lawyers/addLawyer" className="btn btn-primary mb-3">
                <i className="bi bi-plus-circle"></i> New Lawyer
            </Link>



            {store.lawyers && store.lawyers.length > 0 ? (
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
                            {store.lawyers.map((lawyer) => (
                                <tr key={lawyer.id}>
                                    <td>
                                        <strong>{lawyer.id}</strong>
                                    </td>
                                    <td>{lawyer.firstname}</td>
                                    <td>{lawyer.lastname}</td>
                                    <td>{lawyer.email}</td>
                                    <td>
                                        <span className={`badge ${lawyer.is_active ? 'bg-success' : 'bg-danger'}`}>
                                            {lawyer.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <Link
                                            to={`/lawyers/view/${lawyer.id}`}
                                            className="btn btn-sm btn-info me-1"
                                            title="View details"
                                        >
                                            <i className="bi bi-eye"></i>
                                        </Link>
                                        <Link
                                            to={`/lawyers/${lawyer.id}`}
                                            className="btn btn-sm btn-warning me-1"
                                            title="Edit"
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </Link>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            title="Delete"
                                            onClick={() => { handleDeleteLawyers(lawyer.id) }}
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
                    <i className="bi bi-info-circle"></i> No Lawyers found. Create your first one!
                </div>
            )}
        </div>
    );
}