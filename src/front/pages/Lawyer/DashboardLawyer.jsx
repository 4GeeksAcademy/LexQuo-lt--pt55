import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../components/LogoutButton";
import { Link, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useEffect, useState, useMemo } from "react";

export const DashboardLawyer = () => {

    const API = import.meta.env.VITE_BACKEND_URL;
    const { store, dispatch } = useGlobalReducer();

    const [auth, setAuth] = useState(() => {
        try { return store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null"); }
        catch { return null; }
    });

    useEffect(() => {
        if (!store?.auth && auth?.token) {
            dispatch({ type: "SET_AUTH", payload: auth });
        }
    }, [store?.auth, auth, dispatch]);

    const authed = !!auth?.token;

    const name =
        auth?.user
            ? `Dr/a. ${auth.user?.firstname ?? ""} ${auth.user?.lastname ?? ""}`.trim()
            : sessionStorage.getItem("user_name") || "";



    return (
        <div className="container text-center mt-5">
            <h1>DASHBOARD LAWYER</h1>
            <h1>¡HELLO {authed ? (name) : "Dr/a., you must log in"}!</h1>

            {authed ? (
                <div className="text-end">
                    <LogoutButton className="btn btn-sm btn-outline-danger mt-5" />
                </div>
            ) : (
                <div className="d-flex gap-2 mt-5 justify-content-end">
                    <Link
                        to="/SignUpLawyer"
                        className="btn btn-sm btn-outline-warning mt-3"
                        style={{ border: "none" }}
                    >
                        Create User
                    </Link>
                    <Link
                        to="/"
                        className="btn btn-sm btn-outline-primary mt-3"
                        style={{ border: "none" }}
                    >
                        Sign in
                    </Link>
                </div>
            )}
        </div>
    )
};