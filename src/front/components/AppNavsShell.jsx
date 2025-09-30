// src/front/components/AppNavsShell.jsx
import NavbarLogin from "./NavbarLogin";
import SidebarLogin from "./SidebarLogin";
import Footer from "./Footer";         // <- default
import "../index.css";
import "../Logued.css";
import React, { useEffect } from "react";

export default function AppNavsShell({ children }) {
  useEffect(() => {
    const handler = (e) => {
      document.querySelectorAll(".dropdown-menu.show").forEach((menu) => {
        if (menu !== e.target.nextElementSibling) menu.classList.remove("show");
      });
    };
    document.addEventListener("show.bs.dropdown", handler);
    return () => document.removeEventListener("show.bs.dropdown", handler);
  }, []);

  return (
    <>
      <NavbarLogin />
      <div className="main d-flex" id="top">
        <SidebarLogin />
        <div className="content-wrapper d-flex flex-column flex-grow-1" style={{ minHeight: "100dvh" }}>
          <main className="content flex-grow-1">{children}</main>
          <Footer />
        </div>
      </div>
    </>
  );
}
