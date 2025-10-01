import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const MapComponent = ({ position, onPositionChange, readonly = false }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstance = useRef(null);
  const clickHandlerRef = useRef(null);
  const resizeObsRef = useRef(null);

  const normPos = (pos) => {
    if (!pos) return null;
    if (Array.isArray(pos) && pos.length === 2) return { lat: pos[0], lng: pos[1] };
    if (typeof pos === 'object' && 'lat' in pos && 'lng' in pos) return { lat: pos.lat, lng: pos.lng };
    return null;
  };

  useEffect(() => {
    if (typeof L === 'undefined') {
      console.error('Leaflet no está cargado. Asegúrate de incluir el CDN en index.html');
      return;
    }

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    const initial = normPos(position) || { lat: -34.6037, lng: -58.3816 };
    const centerArr = [initial.lat, initial.lng];

    // 1) Crear mapa ya con un setView básico
    mapInstance.current = L.map(mapRef.current, {
      zoom: 13,
      center: centerArr,
      zoomAnimation: true,
      fadeAnimation: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    // 2) whenReady: invalidar tamaño y re-centrar sin animación
    mapInstance.current.whenReady(() => {
      // primer frame de layout real
      requestAnimationFrame(() => {
        if (!mapInstance.current) return;
        mapInstance.current.invalidateSize();
        mapInstance.current.setView(centerArr, mapInstance.current.getZoom(), { animate: false });
      });
    });

    // Crear marcador inicial si hay position
    if (position) {
      markerRef.current = L.marker(centerArr, { draggable: !readonly }).addTo(mapInstance.current);
      markerRef.current.bindPopup(
        `<div style="text-align:center;">
          <strong>Ubicación seleccionada</strong><br/>
          Lat: ${initial.lat.toFixed(6)}<br/>
          Lng: ${initial.lng.toFixed(6)}
        </div>`
      );
      if (!readonly && onPositionChange) {
        markerRef.current.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          onPositionChange(newPos.lat, newPos.lng);
        });
      }
    }

    // 3) Observador de resize del contenedor
    if ('ResizeObserver' in window && mapRef.current) {
      resizeObsRef.current = new ResizeObserver(() => {
        if (!mapInstance.current) return;
        mapInstance.current.invalidateSize();
      });
      resizeObsRef.current.observe(mapRef.current);
    }

    return () => {
      if (resizeObsRef.current && mapRef.current) {
        try { resizeObsRef.current.unobserve(mapRef.current); } catch {}
        resizeObsRef.current = null;
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      markerRef.current = null;
      clickHandlerRef.current = null;
    };
  }, []); // solo una vez

  // Click para elegir posición (si no es readonly)
  useEffect(() => {
    if (!mapInstance.current) return;
    if (clickHandlerRef.current) {
      mapInstance.current.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    if (!readonly) {
      const handler = (e) => {
        onPositionChange && onPositionChange(e.latlng.lat, e.latlng.lng);
      };
      mapInstance.current.on('click', handler);
      clickHandlerRef.current = handler;
    }
  }, [readonly, onPositionChange]);

  // Sincronizar marcador/centro cuando cambia position
  useEffect(() => {
    if (!mapInstance.current || typeof L === 'undefined') return;

    const p = normPos(position);
    if (p) {
      const next = [p.lat, p.lng];

      if (!markerRef.current) {
        markerRef.current = L.marker(next, { draggable: !readonly }).addTo(mapInstance.current);
        if (!readonly && onPositionChange) {
          markerRef.current.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            onPositionChange(newPos.lat, newPos.lng);
          });
        }
      } else {
        markerRef.current.setLatLng(next);
        if (markerRef.current.dragging) {
          if (readonly) markerRef.current.dragging.disable();
          else markerRef.current.dragging.enable();
        }
      }

      markerRef.current.bindPopup(
        `<div style="text-align:center;">
          <strong>Ubicación seleccionada</strong><br/>
          Lat: ${p.lat.toFixed(6)}<br/>
          Lng: ${p.lng.toFixed(6)}
        </div>`
      );

      // Recentrar sin “salto” tras poder medir tamaño real
      requestAnimationFrame(() => {
        if (!mapInstance.current) return;
        mapInstance.current.invalidateSize();
        const current = mapInstance.current.getCenter();
        const dist = mapInstance.current.distance(current, L.latLng(p.lat, p.lng));
        if (dist > 5) {
          mapInstance.current.setView(next, mapInstance.current.getZoom(), { animate: true });
        }
      });
    } else {
      if (markerRef.current) {
        mapInstance.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    }
  }, [position, readonly, onPositionChange]);

  return (
    <div
      ref={mapRef}
      style={{
        height: '220px',         // el alto chico que usás en ViewAppointment
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',       // evita “sangrado” de tiles
        border: '1px solid #ccc'
      }}
    />
  );
};

export default MapComponent;
