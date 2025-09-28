// components/StatusPill.jsx
import PropTypes from "prop-types";

function normalizeStatus(raw) {
  if (raw === true) return "active";
  if (raw === false) return "inactive";
  if (raw == null) return "unknown";
  const s = String(raw).trim().toLowerCase();
  if (["1", "true", "active"].includes(s)) return "active";
  if (["0", "false", "inactive"].includes(s)) return "inactive";
  return s; // por si algún día llega otro estado
}

export default function StatusPill({ status, className = "" }) {
  const norm = normalizeStatus(status);
  const isActive = norm === "active";

  return (
    <span className={`status-pill ${isActive ? "status-success" : "status-secondary"} ${className}`}>
      <i className={`bi ${isActive ? "bi-check" : "bi-x"} me-1`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

StatusPill.propTypes = {
  status: PropTypes.any,
  className: PropTypes.string,
};


