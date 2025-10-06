import React from 'react'
import { Link } from 'react-router-dom'
import useGlobalReducer from '../hooks/useGlobalReducer';

export const PublicNavbar = () => {
    const { store } = useGlobalReducer();

    const token = store?.auth?.token || null;
    const me = store?.me || null;

    const getRole = () => {
        if (me?.role) return me.role.toLowerCase();
        if (store?.auth?.role) return store.auth.role.toLowerCase();
        try {
            const persistedAuth = JSON.parse(localStorage.getItem("auth") || "null");
            if (persistedAuth?.role) return persistedAuth.role.toLowerCase();
        } catch (error) {
            console.error('Error reading from localStorage:', error);
        }

        return null;
    };

    const role = getRole();
    const isAuthenticated = !!token;

    const getDashboardRoute = () => {
        switch (role) {
            case 'admin':
            case 'admin_user':
                return '/admins/dashboard';
            case 'lawyer':
                return '/DashboardLawyer';
            case 'client':
                return '/DashboardClient';
            default:
                return '/sign-up';
        }
    };

    return (
        <div className="bg-body-emphasis sticky-top">
            <nav className="navbar navbar-expand-lg container-small px-3 px-lg-7 px-xxl-3">
                <Link className="navbar-brand flex-1 flex-lg-grow-0" to="/">
                    <div className="d-flex align-items-center">
                        <img src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759017461/LogoLexQuoN_hhfcks.png" alt="LexQuo" style={{ width: "90px" }} />
                    </div>
                </Link>

                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <div className="border-bottom border-translucent border-bottom-lg-0 mb-2">
                        <div className="search-box d-inline d-lg-none">
                            <form className="position-relative">
                            </form>
                        </div>
                    </div>

                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item border-bottom border-translucent border-bottom-lg-0">
                            <Link className="nav-link lh-1 py-0 fs-9 fw-bold py-3" aria-current="page" to="/">Home</Link>
                        </li>
                        <li className="nav-item border-bottom border-translucent border-bottom-lg-0">
                            <Link className="nav-link lh-1 py-0 fs-9 fw-bold py-3" to="/about-us">About us</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link lh-1 py-0 fs-9 fw-bold py-3" to="/contact-us">Contact us</Link>
                        </li>
                        <li className="nav-item border-bottom border-translucent border-bottom-lg-0">
                            <Link className="nav-link lh-1 py-0 fs-9 fw-bold py-3" to="/team">Team</Link>
                        </li>
                    </ul>

                    <div className="d-grid d-lg-flex align-items-center">
                        {isAuthenticated ? (
                            // Usuario autenticado - mostrar Dashboard
                            <Link
                                className="btn btn-phoenix-primary order-0"
                                to={getDashboardRoute()}
                            >
                                <span className="fw-bold">Dashboard</span>
                            </Link>
                        ) : (
                            // Usuario no autenticado - mostrar Sign in/Sign up
                            <>
                                <Link className="btn btn-link text-body order-1 order-lg-0 ps-4 me-lg-2" to="/sign-in">
                                    Sign in
                                </Link>
                                <Link className="btn btn-phoenix-primary order-0" to="/sign-up">
                                    <span className="fw-bold">Sign up</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </div>
    )
}