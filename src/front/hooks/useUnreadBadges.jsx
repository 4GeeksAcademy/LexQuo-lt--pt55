// src/useUnreadBadges.jsx
import { useEffect, useState } from "react";
import { fetchUnreadMap } from "./chatUnread.jsx";

/**
 * Hook para traer estado de mensajes no leídos.
 *
 * @param {string} API - Base URL del backend (ej: import.meta.env.VITE_BACKEND_URL)
 * @param {object} auth - Objeto auth del usuario (con token y user.id)
 * @param {string} role - Rol actual ("lawyer", "client", etc.)
 * @param {number[]} courtfileIds - Lista de IDs de expedientes a trackear
 *
 * Retorna:
 * - unreadByCase: Map(cfid -> { hasUnread:boolean, count:number })
 * - totalUnread: number (suma, recortada a 99)
 * - refresh: función para refrescar manualmente
 */
export default function useUnreadBadges({ API, token, userId, role, courtfileIds }) {
  const [unreadByCase, setUnreadByCase] = useState(new Map());
  const [totalUnread, setTotalUnread] = useState(0);

  const refresh = async () => {
    try {
      const map = await fetchUnreadMap({ API, token, userId, courtfileIds, role });
      setUnreadByCase(map);

      let total = 0;
      for (const v of map.values()) {
        total += v?.count || 0;
      }
      setTotalUnread(Math.min(total, 99));
    } catch {
      setUnreadByCase(new Map());
      setTotalUnread(0);
    }
  };

  useEffect(() => {
    if (!API || !token || !Array.isArray(courtfileIds)) return;
    refresh();

    // refresco automático cada 30 segundos
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
    // ⚠️ stringify en deps para detectar cambios de array
  }, [API, token, JSON.stringify(courtfileIds), role]);

  return { unreadByCase, totalUnread, refresh };
}