export function RoleSwitch({ lawyer, client, admin, fallback = null }) {
  const { store } = useGlobalReducer();
  const role = store?.me?.role;
  if (role === "lawyer") return lawyer ?? fallback;
  if (role === "client") return client ?? fallback;
  if (role === "admin")  return admin  ?? fallback;
  return fallback;
}

export function IfRole({ allow = [], children, fallback = null }) {
  const { store } = useGlobalReducer();
  const role = store?.me?.role;
  return allow.includes(role) ? children : fallback;
}