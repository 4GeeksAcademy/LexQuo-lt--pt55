// src/chatUnread.jsx
export function storageKey(userId, cfid) {
  return `chat_last_read_${userId}_${cfid}`;
}

export function setLastRead(userId, cfid, isoTs) {
  if (!userId || !cfid || !isoTs) return;
  try {
    localStorage.setItem(storageKey(userId, cfid), String(isoTs));
  } catch (_) {}
}

export function getLastRead(userId, cfid) {
  if (!userId || !cfid) return null;
  try {
    return localStorage.getItem(storageKey(userId, cfid)) || null;
  } catch (_) {
    return null;
  }
}

export function markNow(userId, cfid) {
  setLastRead(userId, cfid, new Date().toISOString());
}

export async function fetchUnreadMap({ API, auth, courtfileIds, role }) {
  const userId = auth?.user?.id;
  if (!API || !auth?.token || !userId || !Array.isArray(courtfileIds) || courtfileIds.length === 0) {
    return new Map();
  }

  const MAX_PAR = 6;
  const results = new Map();
  const headers = { Authorization: `Bearer ${auth.token}` };

  const chunks = [];
  for (let i = 0; i < courtfileIds.length; i += MAX_PAR) {
    chunks.push(courtfileIds.slice(i, i + MAX_PAR));
  }

  for (const group of chunks) {
    const promises = group.map(async (cfid) => {
      const since = getLastRead(userId, cfid);
      let url = `${API}/api/messages?courtfile_id=${cfid}`;
      if (since) url += `&since=${encodeURIComponent(since)}`;

      try {
        const resp = await fetch(url, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const rows = await resp.json();
        const unread = Array.isArray(rows)
          ? rows.filter(m => {
              if (!m || !m.sender_role) return false;
              const sameRole = String(m.sender_role).toLowerCase() === String(role).toLowerCase();
              const sameUser = sameRole && (m.sender_id === userId);
              return !sameUser;
            })
          : [];
        results.set(cfid, { hasUnread: unread.length > 0, count: unread.length });
      } catch {
        results.set(cfid, { hasUnread: false, count: 0 });
      }
    });

    await Promise.all(promises);
  }

  return results;
}
