import React, { useState, useRef, useEffect } from 'react';

const LocationAutocomplete = ({ onLocationSelect, value, onChange }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'LexQuoApp/1.0 (ayelen@example.com)' 
          }
        }

      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    }
  };


  const timeoutRef = useRef(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    onChange(value);
    setShowSuggestions(true);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.display_name);
    onLocationSelect({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      address: suggestion.display_name
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div ref={autocompleteRef} className="position-relative">
      <input
        type="text"
        className="form-control"
        value={value}
        onChange={handleInputChange}
        placeholder="Buscar ubicación..."
        onFocus={() => setShowSuggestions(true)}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="list-group position-absolute w-100" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="list-group-item list-group-item-action"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;