import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogoutButton } from "../../components/LogoutButton";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import HomeButtons from "../../components/HomeButtons";

export const DashboardAdminUser = () => {
  const API = import.meta.env.VITE_BACKEND_URL;
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();

  
  const [auth, setAuth] = useState(() => {
    try {
      return store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!store?.auth && auth?.token) {
      dispatch({ type: "SET_AUTH", payload: auth });
    }
  }, [store?.auth, auth, dispatch]);

  useEffect(() => {
    if (store?.auth && store.auth !== auth) {
      setAuth(store.auth);
    }
  }, [store?.auth]);

  const authed = !!auth?.token;
  const name = auth?.user ? `${auth.user?.firstname ?? ""} ${auth.user?.lastname ?? ""}`.trim() : "";

  // ------------------ States ------------------
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ------------------ Fetch Data ------------------
  const fetchAllDataForAdmin = async () => {
    if (!authed) return;
    setLoading(true);
    setError("");

    try {
      const token = auth.token;

      // Fetch clients
      const clientsRes = await fetch(`${API}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!clientsRes.ok) throw new Error("Failed to fetch clients");
      const clientsData = await clientsRes.json();
      setClients(clientsData);

      // Fetch lawyers
      const lawyersRes = await fetch(`${API}/api/lawyers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!lawyersRes.ok) throw new Error("Failed to fetch lawyers");
      const lawyersData = await lawyersRes.json();
      setLawyers(lawyersData);

      // Fetch courtfiles per client
      const courtfilesPromises = clientsData.map((client) =>
        fetch(`${API}/api/clients/${client.id}/get-courtfiles`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((res) => (res.ok ? res.json() : []))
      );
      const allCourtfiles = await Promise.all(courtfilesPromises);
      const flattenedCourtfiles = allCourtfiles.flat();
      setCases(flattenedCourtfiles);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDataForAdmin();
  }, [authed]);

  // ------------------ Section Table ------------------
  const SectionTable = ({ title, data, columns, renderRow }) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="mt-5">
         <div className="container text-center mt-5">
            <h1>DASHBOARD ADMIN</h1>
            <h1>¡Hello {authed ? name : "you must log in"}!</h1>
              <div className=""></div>
              {authed && (
               <div className="mb-4">
              <h4>Quick Navigation</h4>
              <HomeButtons/>
                </div>
  
              )}
         </div>
        <div className="d-flex justify-content-between align-items-center">
          <h3>{title}</h3>
        </div>
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>{data.map(renderRow)}</tbody>
          </table>
        </div>
      </div>
    );
  };

  // ------------------ Dashboard Admin ------------------
  const DashboardAdmin = () => (
    <div className="container text-center mt-5">

      {authed ? (
        <div className="mt-5 text-start">
          {error && <div className="alert alert-danger">{error}</div>}
          {loading && <div className="alert alert-info">Loading data...</div>}

          {/* COURTFILES */}
          <SectionTable
            title="COURTFILES"
            data={cases}
            columns={["ID", "Case Number", "Title", "Jurisdiction", "Court", "Status", "Assigned Lawyers", "Actions"]}
            renderRow={(cf) => (
              <tr key={cf.id}>
                <td>{cf.id}</td>
                <td>{cf.case_number}</td>
                <td>{cf.title}</td>
                <td>{cf.jurisdiction}</td>
                <td>{cf.court}</td>
                <td>
                  <span className={`badge ${cf.status ? "bg-success" : "bg-secondary"}`}>
                    {cf.status ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  {cf.assigned_lawyers?.map((lawyer) => (
                    <div key={lawyer.id} className="mb-1">
                      <strong>{lawyer.name}</strong>
                    </div>
                  )) || "No lawyers assigned"}
                </td>
                <td className="text-end">
                  <Link to={`/courtfiles/viewclient/${cf.id}`} className="btn btn-sm btn-info me-1">
                    View
                  </Link>
                </td>
              </tr>
            )}
          />

          {/* CLIENTS */}
          <SectionTable
            title="CLIENTS"
            data={clients}
            columns={["ID", "Name", "Email", "Phone", "Status", "Actions"]}
            renderRow={(client) => (
              <tr key={client.id}>
                <td>{client.id}</td>
                <td>{client.name}</td>
                <td>{client.email}</td>
                <td>{client.phone}</td>
                <td>
                  <span className={`badge ${client.active ? "bg-success" : "bg-secondary"}`}>
                    {client.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-end">
                  <Link to={`/clients/view/${client.id}`} className="btn btn-sm btn-info me-1">
                    View
                  </Link>
                </td>
              </tr>
            )}
          />

          {/* LAWYERS */}
          <SectionTable
            title="LAWYERS"
            data={lawyers}
            columns={["ID", "Name", "Email", "Specialty", "Status", "Actions"]}
            renderRow={(lawyer) => (
              <tr key={lawyer.id}>
                <td>{lawyer.id}</td>
                <td>{lawyer.name}</td>
                <td>{lawyer.email}</td>
                <td>{lawyer.specialty}</td>
                <td>
                  <span className={`badge ${lawyer.active ? "bg-success" : "bg-secondary"}`}>
                    {lawyer.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-end">
                  <Link to={`/lawyers/view/${lawyer.id}`} className="btn btn-sm btn-info me-1">
                    View
                  </Link>
                </td>
              </tr>
            )}
          />

          <div className="text-end">
            <LogoutButton className="btn btn-sm btn-outline-danger mt-5" />
          </div>
        </div>
      ) : (
        <div className="d-flex gap-2 mt-5 justify-content-end">
          <Link to="/SignUpClient" className="btn btn-sm btn-outline-warning mt-3" style={{ border: "none" }}>
            Create User
          </Link>
          <Link to="/LoginClient" className="btn btn-sm btn-outline-primary mt-3" style={{ border: "none" }}>
            Login
          </Link>
        </div>
      )}
    </div>
  );

  return <DashboardAdmin />;
};