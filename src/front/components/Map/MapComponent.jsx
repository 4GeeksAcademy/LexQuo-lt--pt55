import React, { useEffect, useRef } from 'react';

const MapComponent = ({ position, onPositionChange, readonly = false }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstance = useRef(null);
  const clickHandlerRef = useRef(null);

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

    // Inicializar el mapa
    mapInstance.current = L.map(mapRef.current).setView(
      position || [-34.6037, -58.3816], 
      13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance.current);

    setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 0);

    return () => {
      // Limpieza
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      markerRef.current = null;
      clickHandlerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo una vez

  // CAMBIO: (Des)activar click para elegir punto según `readonly`
  useEffect(() => {
    if (!mapInstance.current) return;

    // quitar handler anterior si existe
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

  // CAMBIO: Gestionar marker y recentrado cuando cambia `position` (clave para View/Edit)
  useEffect(() => {
    if (!mapInstance.current || typeof L === 'undefined') return;

    const p = normPos(position);

    if (p) {
      // Crear o actualizar marker
      if (!markerRef.current) {
        markerRef.current = L.marker([p.lat, p.lng], { draggable: !readonly }).addTo(mapInstance.current);

        if (!readonly && onPositionChange) {
          markerRef.current.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            onPositionChange(newPos.lat, newPos.lng);
          });
        }
      } else {
        markerRef.current.setLatLng([p.lat, p.lng]);
        // CAMBIO: si cambió readonly, actualizar draggability
        if (markerRef.current.dragging) {
          if (readonly) {
            markerRef.current.dragging.disable();
          } else {
            markerRef.current.dragging.enable();
          }
        }
      }

      // CAMBIO: popup actualizado en cada cambio de posición
      const latTxt = p.lat.toFixed(6);
      const lngTxt = p.lng.toFixed(6);
      markerRef.current.bindPopup(
        `<div style="text-align:center;">
          <strong>Ubicación seleccionada</strong><br/>
          Lat: ${latTxt}<br/>
          Lng: ${lngTxt}
        </div>`
      );

      // CAMBIO: recenter suave sin “salto” brusco
      const current = mapInstance.current.getCenter();
      const dist = mapInstance.current.distance(current, L.latLng(p.lat, p.lng));
      if (dist > 5) {
        mapInstance.current.setView([p.lat, p.lng], mapInstance.current.getZoom(), { animate: true });
      }
    } else {
      // Si se borra la posición, quitar marker
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
        height: '400px',
        width: '100%',
        borderRadius: '8px',
        border: '1px solid #ccc'
      }}
    />
  );
};

export default MapComponent;