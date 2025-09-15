import { Link } from "react-router-dom";

export const Forbidden = () => {
  return (
    <div className="container mt-5">
      <div className="alert alert-warning">
        <h4 className="alert-heading">Acceso restringido</h4>
        <p>Esta sección es para <strong>abogados</strong>. Ingrese en la sección de <strong>clientes</strong>.</p>
        <hr />
        <div className="d-flex gap-2">
          {/* Ajustá estas rutas a las tuyas */}
          <Link to="/LoginClient" className="btn btn-primary">Ingresar como cliente</Link>
          <Link to="/" className="btn btn-outline-secondary">Ir al inicio</Link>
        </div>
      </div>
    </div>
  );
};