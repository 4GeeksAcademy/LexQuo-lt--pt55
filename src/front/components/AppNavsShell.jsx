import NavbarLogin from "./NavbarLogin";
import SidebarLogin from "./SidebarLogin";
import "../index.css";
import "../Logued.css";

import React, { useEffect, useState, useMemo } from "react";

export default function AppNavsShell({ children }) {
  useEffect(() => {
    // cuando se abre un dropdown
    const handler = (e) => {
      // cerrá los demás
      document.querySelectorAll(".dropdown-menu.show").forEach((menu) => {
        if (menu !== e.target.nextElementSibling) {
          menu.classList.remove("show");
        }
      });
    };

    document.addEventListener("show.bs.dropdown", handler);
    return () => document.removeEventListener("show.bs.dropdown", handler);
  }, []);

  return (
    <>
      <NavbarLogin />
      <div className="main" id="top">
        <SidebarLogin />
        <main className="content">
          {children}
        </main>
      </div>
    </>
  );
}