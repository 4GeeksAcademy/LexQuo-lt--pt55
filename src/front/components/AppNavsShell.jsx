import NavbarLogin from "./NavbarLogin";
import SidebarLogin from "./SidebarLogin";
import "../Logued.css";

export default function AppNavsShell({ children }) {
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