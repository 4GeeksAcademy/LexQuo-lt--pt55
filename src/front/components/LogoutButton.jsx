import React from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const LogoutButton = ({ className = "btn btn-outline-danger", onLogout }) => {
  const navigate = useNavigate();
  const { dispatch } = useGlobalReducer();

  const handleLogout = () => {
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("user_name");

    dispatch({ type: "CLEAR_AUTH" });

    navigate("/");
  };

  return (
    <button type="button" className={className} onClick={handleLogout} style={{ border: "none" }}>
      Cerrar sesión
    </button>
  );
};