import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export default function PrivateRoute() {
  const location = useLocation();
  const { dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;

  // ✅ Solo token desde sessionStorage (nunca datos de usuario)
  const token = JSON.parse(localStorage.getItem("auth") || "null")?.token || null;

  // 1) Si no hay token -> a Login con returnTo
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  // 2) Verificar token e hidratar store SIEMPRE que entres a una ruta privada
  //    (se dispara en el primer render y cuando cambia el path)
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState(null);

  useEffect(() => {
    

    const verify = async () => {
      try {
        setChecking(true);
        const resp = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || "Auth failed");

        dispatch({ type: "SET_AUTH", payload: { token, role: data.role } });
        dispatch({ type: "SET_ME", payload: data.user });
        setInvalid(false);
      } catch (err) {
                
        setInvalid(true);
        dispatch({ type: "CLEAR_AUTH" });
      } finally {
        setChecking(false);
      }
    };

    verify();

    // Cleanup: si cambia la ruta o se desmonta, cancelamos la request en curso

  }, []);


  // 3) Si el token falló -> Login
  if (invalid == true) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  // 4) Mientras verifico, muestro un loader corto (evita “flash” sin datos)
  if (invalid == null) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 180 }}>
        <div className="spinner-border" role="status" aria-label="Verificando sesión..." />
      </div>
    );
  }

  // 5) Token válido + store hidratado -> dejo pasar
  return <Outlet />;
}