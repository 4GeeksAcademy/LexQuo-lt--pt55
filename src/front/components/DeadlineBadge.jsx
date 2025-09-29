// components/DeadlineBadge.jsx
import PropTypes from "prop-types";

export default function DeadlineBadge({ priority, outline = false }) {
  const norm = (priority || "").toLowerCase();

  const map = {
    low:    { text: "Low",    color: "secondary", icon: "bi-dash-circle" },
    medium: { text: "Medium", color: "info",      icon: "bi-circle" },
    high:   { text: "High",   color: "warning",   icon: "bi-exclamation-triangle" },
    urgent: { text: "Urgent", color: "danger",    icon: "bi-exclamation-octagon" },
  };

  const cfg = map[norm] || { text: priority, color: "secondary", icon: "bi-flag" };
  const base = outline ? `badge border border-${cfg.color} text-${cfg.color}` : `badge bg-${cfg.color}`;

  return (
    <span className={`${base} d-inline-flex align-items-center gap-1 px-2 py-1`}>
      <i className={`bi ${cfg.icon}`} />
      {cfg.text}
    </span>
  );
}

DeadlineBadge.propTypes = {
  priority: PropTypes.string,
  outline: PropTypes.bool,
};
