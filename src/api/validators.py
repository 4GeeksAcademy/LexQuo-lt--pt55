from datetime import datetime, time
import re
from flask import jsonify

def parse_iso_date(date_str):
    """Convierte YYYY-MM-DD a objeto date"""
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return None

def parse_24h_time(time_str):
    """Convierte hora en formato 24h (HH:MM) a objeto time"""
    try:
        time_str = time_str.strip()
        return datetime.strptime(time_str, '%H:%M').time()
    except ValueError:
        return None

def is_valid_24h_time(time_str):
    """Valida formato de hora 24 horas"""
    if not time_str:
        return False
    pattern = r'^([01]?[0-9]|2[0-3]):([0-5][0-9])$'
    return re.match(pattern, time_str.strip()) is not None

def validate_required_fields(data, required_fields):
    """Valida que los campos requeridos estén presentes"""
    missing_fields = []
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            missing_fields.append(field)
    return missing_fields

def validate_time_order(start_time, end_time):
    """Valida que la hora de inicio sea antes que la de fin"""
    return start_time < end_time

def create_error_response(message, status_code=400):
    """Crea una respuesta de error consistente"""
    return jsonify({'error': message}), status_code