import React, { useEffect, useRef } from 'react';

const MapComponent = ({ position, onPositionChange, readonly = false }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    // Verificar que Leaflet está disponible globalmente
    if (typeof L === 'undefined') {
      console.error('Leaflet no está cargado. Asegúrate de incluir el CDN en index.html');
      return;
    }

    // CONFIGURAR LOS ICONOS CORRECTAMENTE - ¡ESTO ES LO QUE FALTA!
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

    // Evento de click en el mapa para añadir marker
    if (!readonly) {
      mapInstance.current.on('click', (e) => {
        if (onPositionChange) {
          onPositionChange(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || typeof L === 'undefined') return;

    // Manejar el marker
    if (position) {
      if (markerRef.current) {
        markerRef.current.setLatLng(position);
      } else {
        markerRef.current = L.marker(position, {
          draggable: !readonly
        }).addTo(mapInstance.current);

        if (!readonly) {
          markerRef.current.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            if (onPositionChange) {
              onPositionChange(newPos.lat, newPos.lng);
            }
          });
        }

        // Popup con información
        markerRef.current.bindPopup(`
          <div style="text-align: center;">
            <strong>Ubicación seleccionada</strong><br/>
            Lat: ${position[0].toFixed(6)}<br/>
            Lng: ${position[1].toFixed(6)}
          </div>
        `);
      }

      // Centrar el mapa en la posición
      mapInstance.current.setView(position, 13);
    } else if (markerRef.current) {
      // Remover marker si no hay posición
      mapInstance.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }, [position, onPositionChange, readonly]);

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