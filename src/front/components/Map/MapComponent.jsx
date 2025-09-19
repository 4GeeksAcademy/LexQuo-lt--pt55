import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const MapComponent = ({ position, onPositionChange, readonly = false }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstance = useRef(null);
  const clickHandlerRef = useRef(null);

  // Función auxiliar para normalizar la posición
  const normPos = (pos) => {
    if (!pos) return null;
    if (Array.isArray(pos) && pos.length === 2) return { lat: pos[0], lng: pos[1] };
    if (typeof pos === 'object' && 'lat' in pos && 'lng' in pos) return { lat: pos.lat, lng: pos.lng };
    return null;
  };

  // Efecto para inicializar el mapa
  useEffect(() => {
    // Verificar que Leaflet está disponible globalmente
    if (typeof L === 'undefined') {
      console.error('Leaflet no está cargado. Asegúrate de incluir el CDN en index.html');
      return;
    }

    // Configurar los íconos del marcador de Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // Inicializar el mapa
    mapInstance.current = L.map(mapRef.current).setView(
      normPos(position) || [-34.6037, -58.3816],
      13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance.current);

    // Ajustar el tamaño del mapa después de la inicialización
    setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 0);

    // Función de limpieza
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      markerRef.current = null;
      clickHandlerRef.current = null;
    };
  }, []); // El array de dependencias vacío asegura que se ejecute una sola vez

  // Efecto para gestionar el evento de click en el mapa
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remover el handler de click anterior si existe
    if (clickHandlerRef.current) {
      mapInstance.current.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    // Si no es de solo lectura, agregar el nuevo handler
    if (!readonly) {
      const handler = (e) => {
        onPositionChange && onPositionChange(e.latlng.lat, e.latlng.lng);
      };
      mapInstance.current.on('click', handler);
      clickHandlerRef.current = handler;
    }
  }, [readonly, onPositionChange]);

  // Efecto para manejar el marcador y el centrado del mapa cuando cambia 'position'
  useEffect(() => {
    if (!mapInstance.current || typeof L === 'undefined') return;

    const p = normPos(position);

    if (p) {
      // Crear o actualizar el marcador
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
        // Actualizar la capacidad de arrastre según 'readonly'
        if (markerRef.current.dragging) {
          if (readonly) {
            markerRef.current.dragging.disable();
          } else {
            markerRef.current.dragging.enable();
          }
        }
      }

      // Actualizar el popup del marcador
      const latTxt = p.lat.toFixed(6);
      const lngTxt = p.lng.toFixed(6);
      markerRef.current.bindPopup(
        `<div style="text-align:center;">
          <strong>Ubicación seleccionada</strong><br/>
          Lat: ${latTxt}<br/>
          Lng: ${lngTxt}
        </div>`
      );

      // Recenter el mapa de forma suave si la posición ha cambiado significativamente
      const current = mapInstance.current.getCenter();
      const dist = mapInstance.current.distance(current, L.latLng(p.lat, p.lng));
      if (dist > 5) { // Un umbral para evitar saltos bruscos
        mapInstance.current.setView([p.lat, p.lng], mapInstance.current.getZoom(), { animate: true });
      }

    } else {
      // Remover el marcador si la posición es nula
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