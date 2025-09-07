import { useNavigate, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import React, { useEffect, useState } from "react"

export const Courtfiles = () => {
    // Access the global state and dispatch function using the useGlobalReducer hook.
    const { store, dispatch } = useGlobalReducer()
    const API = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        const fetchCourtfiles = async () => {
            try {
                const response = await fetch(`${API}/api/courtfiles`);
                if (response.ok) {
                    const data = await response.json();
                    dispatch({ type: 'SET_COURTFILES', payload: data });
                } else {
                    console.error("Error fetching courtfiles");
                }
            } catch (error) {
                console.error("Error:", error);
            }
        };

        fetchCourtfiles();
    }, [dispatch]);

    const handleDeleteCourtfile = async (id) => {
        if (!window.confirm('Are you sure you want to delete this courtfile?')) {
            return;
        }

        try {
            const response = await fetch(`${API}/api/courtfiles/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                dispatch({ type: 'DELETE_COURTFILE', payload: id });
                alert('Courtfile deleted successfully!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting courtfile:', error);
            alert(`Error deleting courtfile: ${error.message}`);
        }
    };



    return (
        <div className="container mt-4">
            <h1 className="mb-4">COURTFILES</h1>

            <Link to="/courtfiles/addcourtfile" className="btn btn-primary mb-3">
                <i className="bi bi-plus-circle"></i> New Courtfile
            </Link>



            {store.courtfiles && store.courtfiles.length > 0 ? (
                <div className="table-responsive">
                    <table className="table table-striped table-hover">
                        <thead className="table-dark">
                            <tr>
                                <th>Case Number</th>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Jurisdiction</th>
                                <th>Court</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {store.courtfiles.map((courtfile) => (
                                <tr key={courtfile.id}>
                                    <td>
                                        <strong>{courtfile.case_number}</strong>
                                    </td>
                                    <td>{courtfile.title}</td>
                                    <td>{courtfile.description}</td>
                                    <td>
                                        <span className="badge bg-secondary">
                                            {courtfile.jurisdiction}
                                        </span>
                                    </td>
                                    <td>{courtfile.court}</td>
                                    <td>
                                        <span className={`badge ${courtfile.status ? 'bg-success' : 'bg-danger'}`}>
                                            {courtfile.status ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <Link
                                            to={`/courtfiles/view/${courtfile.id}`}
                                            className="btn btn-sm btn-info me-1"
                                            title="View details"
                                        >
                                            <i className="bi bi-eye"></i>
                                        </Link>
                                        <Link
                                            to={`/courtfiles/${courtfile.id}`}
                                            className="btn btn-sm btn-warning me-1"
                                            title="Edit"
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </Link>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            title="Delete"
                                            onClick={() => { handleDeleteCourtfile(courtfile.id) }}
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
                    <i className="bi bi-info-circle"></i> No courtfiles found. Create your first one!
                </div>
            )}
        </div>
    );
};