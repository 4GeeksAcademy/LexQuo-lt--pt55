import PropTypes from "prop-types";

function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (["pending"].includes(s)) return "pending";
  if (["processing", "in_process"].includes(s)) return "processing";
  if (["approved", "success"].includes(s)) return "approved";
  if (["rejected", "failed", "error"].includes(s)) return "rejected";
  return "unknown";
}

export default function PaymentBadge({ status, outline = true, className = "" }) {
  const st = normalizeStatus(status);

  // map a Phoenix variants
  const map = {
    pending: {
      cls: "badge-phoenix badge badge-phoenix-info",
      label: <>Pending <i className="bi bi-clock" /></>,
    },
    processing: {
      cls: "badge-phoenix badge badge-phoenix-warning",
      label: <>Processing <i className="bi bi-arrow-repeat" /></>,
    },
    approved: {
      cls: "badge-phoenix badge badge-phoenix-success",
      label: <>Approved <i className="bi bi-check2-circle" /></>,
    },
    rejected: {
      cls: "badge-phoenix badge badge-phoenix-danger",
      label: <>Rejected <i className="bi bi-x-octagon" /></>,
    },
    unknown: {
      cls: "badge-phoenix badge badge-phoenix-secondary",
      label: <>Unknown <i className="bi bi-question-circle" /></>,
    },
  };

  const cfg = map[st] || map.unknown;

  // Phoenix badges no usan outline directamente, pero podés controlar tamaño o fs acá
  return (
    <span className={`${cfg.cls} ${className}`}>
      {cfg.label}
    </span>
  );
}

PaymentBadge.propTypes = {
  status: PropTypes.any,
  outline: PropTypes.bool,
  className: PropTypes.string,
};
