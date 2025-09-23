export function storageKey(userId, cfid) {
  return `chat_last_read_${userId}_${cfid}`;
}

export function setLastRead(userId, cfid, isoTs) {
  if (!userId || !cfid || !isoTs) return;
  try { localStorage.setItem(storageKey(userId, cfid), String(isoTs)); } catch (_) {}
}

export function getLastRead(userId, cfid) {
  if (!userId || !cfid) return null;
  try { return localStorage.getItem(storageKey(userId, cfid)) || null; } catch (_) { return null; }
}

export function markNow(userId, cfid) {
  // Esto actualiza sólo el localStorage para feedback instantáneo.
  // El back se actualiza con POST /messages/read (ver abajo).
  if (!userId || !cfid) return;
  setLastRead(userId, cfid, new Date().toISOString());
}

/**
 * NUEVO: usa /messages/unread del backend.
 * Retorna Map<number, {hasUnread:boolean, count:number}>
 */
export async function fetchUnreadMap({ API, auth, courtfileIds, role }) {
  const userId =
    auth?.user?.id ??
    auth?.lawyer?.id ??
    auth?.client?.id ??
    auth?.id ?? null;

  if (!API || !auth?.token || !userId || !Array.isArray(courtfileIds) || courtfileIds.length === 0) {
    return new Map();
  }

  const headers = { Authorization: `Bearer ${auth.token}` };
  const qs = new URLSearchParams({
    role: String(role || "").toLowerCase(),
    user_id: String(userId),
    courtfile_ids: courtfileIds.join(","),
  });

  const url = `${API}/api/messages/unread?${qs.toString()}`;
  try {
    const resp = await fetch(url, { headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json(); // { "21": {hasUnread, count}, ... }

    const map = new Map();
    for (const [k, v] of Object.entries(data)) {
      map.set(Number(k), { hasUnread: !!v?.hasUnread, count: Number(v?.count || 0) });
    }
    return map;
  } catch {
    return new Map();
  }
}