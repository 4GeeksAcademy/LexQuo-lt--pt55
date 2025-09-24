import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export default function PrivateRoute() {
  const location = useLocation();
  const { dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  // ✅ Solo token desde sessionStorage (nunca datos de usuario)
  const token = JSON.parse(sessionStorage.getItem("auth") || "null")?.token || null;

  // 1) Si no hay token -> a Login con returnTo
  if (!token) {
    return (
      <Navigate
        to="/Login"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  // 2) Verificar token e hidratar store SIEMPRE que entres a una ruta privada
  //    (se dispara en el primer render y cuando cambia el path)
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let abort = false;

    const verify = async () => {
      try {
        setChecking(true);
        const resp = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || "Auth failed");

        if (abort) return;
        // Hidrato SIEMPRE el store con los datos frescos del backend
        dispatch({ type: "SET_AUTH", payload: { token, role: data.role } });
        dispatch({ type: "SET_ME", payload: data.user });
        setInvalid(false);
      } catch {
        if (abort) return;
        setInvalid(true);
        dispatch({ type: "CLEAR_AUTH" }); // limpia store + sessionStorage
      } finally {
        if (!abort) setChecking(false);
      }
    };

    verify();
    return () => { abort = true; };
  // disparar en cada acceso: cambia pathname o search
  }, [API, token, location.pathname, location.search, dispatch]);

  // 3) Si el token falló -> Login
  if (invalid) {
    return (
      <Navigate
        to="/Login"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  // 4) Mientras verifico, muestro un loader corto (evita “flash” sin datos)
  if (checking) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 180 }}>
        <div className="spinner-border" role="status" aria-label="Verificando sesión..." />
      </div>
    );
  }

  // 5) Token válido + store hidratado -> dejo pasar
  return <Outlet />;
}