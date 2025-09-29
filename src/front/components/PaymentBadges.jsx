// components/PaymentBadge.jsx
import PropTypes from "prop-types";

function norm(raw) {
  if (!raw && raw !== 0) return "unknown";
  const s = String(raw).trim().toLowerCase();
  return s.includes(".") ? s.split(".").pop() : s; // por si llega "PaymentStatus.pending"
}

export default function PaymentBadge({ status, outline = true, className = "" }) {
  const st = norm(status);

  // estilos "outline" = los que usás en el dashboard (bg-transparent + border + text-*)
  const baseOutline = "bg-transparent d-inline-flex align-items-center gap-1";
  const map = {
    pending: {
      cls: outline ? `${baseOutline} text-info border border-info` : "bg-info",
      label: <>Pending <i className="bi bi-clock" /></>,
    },
    processing: {
      cls: outline ? `${baseOutline} text-warning border border-warning` : "bg-warning",
      label: <>Processing <i className="bi bi-arrow-repeat" /></>,
    },
    approved: {
      cls: outline ? `${baseOutline} text-success border border-success` : "bg-success",
      label: <>Approved <i className="bi bi-check2-circle" /></>,
    },
    rejected: {
      cls: outline ? `${baseOutline} text-danger border border-danger` : "bg-danger",
      label: <>Rejected <i className="bi bi-x-octagon" /></>,
    },
    unknown: {
      cls: outline ? `${baseOutline} text-secondary border border-secondary` : "bg-secondary",
      label: <>Unknown <i className="bi bi-question-circle" /></>,
    },
  };

  const cfg = map[st] || map.unknown;

  return <span className={`badge ${cfg.cls} ${className}`}>{cfg.label}</span>;
}

PaymentBadge.propTypes = {
  status: PropTypes.any,
  outline: PropTypes.bool,
  className: PropTypes.string,
};
