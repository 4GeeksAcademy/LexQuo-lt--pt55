"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import request, jsonify
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from flask_jwt_extended import jwt_required
from flask import jsonify, request
from sqlalchemy import and_
import os
import cloudinary
import cloudinary.uploader
import stripe
from urllib.parse import urlencode
from sqlalchemy import select, func, and_, or_, literal, case
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import Courtfile, PaymentCourtfile, PaymentStatus, db, Lawyer, Client, AdminUser, Deadlines, Appointment, Document, ClientCourtfile, DeadlineCourtfile, LawyerCourtfile, AppointmentCourtfile, LawyerClient, CourtfileDocument, Payment, Message, ChatRead
from api.utils import generate_sitemap, APIException
from datetime import datetime, timedelta, timezone
UTC = timezone.utc
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.orm import joinedload
from api.mails_utils import render_email_template, send_email
import logging

from api.validators import parse_iso_date, parse_24h_time, is_valid_24h_time, validate_required_fields, validate_time_order, create_error_response

api = Blueprint('api', __name__)
stripe_bp = Blueprint("stripe_bp", __name__)

# Allow CORS requests to this API
CORS(api)
 
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
)
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

os.getenv("FLASK_DEBUG")

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL") or os.getenv("FRONTEND_ORIGIN")

def _base_url():
    b = FRONTEND_BASE_URL or request.url_root
    return b.rstrip("/")


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200

# ----------------------HELPERS PARA PROTECCION DE RUTAS-----------------------------


def _role():
    claims = get_jwt() or {}
    return (claims.get("role") or "").lower()


def _is_admin():
    return _role() == "admin_user"


def _current_user_id():
    # identity fue guardado como str(user.id)
    ident = get_jwt_identity()
    try:
        return int(ident)
    except (TypeError, ValueError):
        return ident  # por las dudas


def _is_linked_to_courtfile_id(courtfile_id: int) -> bool:
    """
    Lawyer/Client sólo si están vinculados al courtfile (tablas puente).
    Admin siempre True (lo tratamos afuera).
    """
    r = _role()
    uid = _current_user_id()
    if r == "lawyer":
        return db.session.query(LawyerCourtfile).filter_by(
            courtfile_id=courtfile_id, lawyer_id=uid
        ).first() is not None
    if r == "client":
        return db.session.query(ClientCourtfile).filter_by(
            courtfile_id=courtfile_id, client_id=uid
        ).first() is not None
    return False


def _shares_courtfile_with(lawyer_id=None, client_id=None) -> bool:
    """
    Devuelve True si el current_user comparte al menos un courtfile
    con el lawyer_id o client_id pasado.
    """
    uid = _current_user_id()
    r = _role()

    # client viendo lawyer
    if r == "client" and lawyer_id:
        return db.session.query(ClientCourtfile).join(
            LawyerCourtfile,
            ClientCourtfile.courtfile_id == LawyerCourtfile.courtfile_id
        ).filter(
            ClientCourtfile.client_id == uid,
            LawyerCourtfile.lawyer_id == lawyer_id
        ).first() is not None

    # lawyer viendo client
    if r == "lawyer" and client_id:
        return db.session.query(LawyerCourtfile).join(
            ClientCourtfile,
            LawyerCourtfile.courtfile_id == ClientCourtfile.courtfile_id
        ).filter(
            LawyerCourtfile.lawyer_id == uid,
            ClientCourtfile.client_id == client_id
        ).first() is not None

    return False


def _is_linked_to_resource(resource_id: int, pivot_model, pivot_field: str) -> bool:
    """
    Verifica si el usuario actual (lawyer/client) está vinculado a un recurso 
    (appointment, deadline, document, payment, etc.) a través de un courtfile.

    - resource_id: id del recurso (appointment_id, deadline_id…)
    - pivot_model: modelo SQLAlchemy de la tabla puente (AppointmentCourtfile, DeadlineCourtfile…)
    - pivot_field: nombre del campo en pivot_model que apunta al recurso (e.g. "appointment_id")
    """
    r = _role()
    uid = _current_user_id()

    q = db.session.query(pivot_model).filter(
        getattr(pivot_model, pivot_field) == resource_id
    )

    if r == "lawyer":
        q = q.join(LawyerCourtfile, pivot_model.courtfile_id ==
                   LawyerCourtfile.courtfile_id)
        q = q.filter(LawyerCourtfile.lawyer_id == uid)
        return q.first() is not None

    if r == "client":
        q = q.join(ClientCourtfile, pivot_model.courtfile_id ==
                   ClientCourtfile.courtfile_id)
        q = q.filter(ClientCourtfile.client_id == uid)
        return q.first() is not None

    return False

# -----------------ROUTES PARA COURTFILES--------------------------------------------


@api.route('/courtfiles', methods=['GET'])
@jwt_required()
def get_courtfiles():
    try:
        role, current_id = _get_role_and_identity()

        # Admin: todo
        if role == 'admin_user':
            q = Courtfile.query

        # Lawyer: sólo courtfiles donde está vinculado
        elif role == 'lawyer':
            subq_cf = (db.session.query(LawyerCourtfile.courtfile_id)
                       .filter(LawyerCourtfile.lawyer_id == int(current_id))
                       .subquery())

            q = (db.session.query(Courtfile)
                 .filter(Courtfile.id.in_(subq_cf))
                 .distinct())

        # Client: sólo courtfiles donde está vinculado
        elif role == 'client':
            subq_cf = (db.session.query(ClientCourtfile.courtfile_id)
                       .filter(ClientCourtfile.client_id == int(current_id))
                       .subquery())

            q = (db.session.query(Courtfile)
                 .filter(Courtfile.id.in_(subq_cf))
                 .distinct())

        else:
            return jsonify({'error': 'forbidden'}), 403

        courtfiles = (q.order_by(Courtfile.id.desc()).all())
        return jsonify([c.serialize() for c in courtfiles]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/courtfiles/<int:courtfile_id>', methods=['GET'])
@jwt_required()
def get_courtfile(courtfile_id):
    try:
        courtfile = Courtfile.query.get_or_404(courtfile_id)
        if _is_admin() or _is_linked_to_courtfile_id(courtfile_id):
            return jsonify(courtfile.serialize()), 200
        return jsonify({'error': 'forbidden'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/courtfiles', methods=['POST'])
@jwt_required()
def create_courtfile():
    try:
        if _role() not in ('admin_user', 'lawyer'):
            return jsonify({'error': 'forbidden'}), 403
        data = request.get_json() or {}

        required_fields = ['case_number', 'title',
                           'description', 'jurisdiction', 'court', 'status']
        for field in required_fields:
            if field not in data or data[field] in (None, ""):
                return jsonify({'error': f'Required field: {field}'}), 400

        existing = Courtfile.query.filter_by(
            case_number=data['case_number']).first()
        if existing:
            return jsonify({'error': 'Case number already exists'}), 409

        courtfile = Courtfile(
            case_number=data['case_number'],
            title=data['title'],
            description=data['description'],
            jurisdiction=data['jurisdiction'],
            court=data['court'],
            status=data['status']
        )

        db.session.add(courtfile)
        db.session.commit()

        return jsonify(courtfile.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/courtfiles/<int:courtfile_id>', methods=['PUT'])
@jwt_required()
def update_courtfile(courtfile_id):
    try:
        courtfile = Courtfile.query.get_or_404(courtfile_id)
        if not (_is_admin() or _is_linked_to_courtfile_id(courtfile_id)):
            return jsonify({'error': 'forbidden'}), 403
        data = request.get_json() or {}

        if 'case_number' in data:
            if data['case_number'] != courtfile.case_number:
                existing = Courtfile.query.filter_by(
                    case_number=data['case_number']).first()
                if existing:
                    return jsonify({'error': 'Case number already exists'}), 409
            courtfile.case_number = data['case_number']

        if 'title' in data:
            courtfile.title = data['title']

        if 'description' in data:
            courtfile.description = data['description']

        if 'jurisdiction' in data:
            courtfile.jurisdiction = data['jurisdiction']

        if 'court' in data:
            courtfile.court = data['court']

        if 'status' in data:
            courtfile.status = data['status']

        db.session.commit()

        return jsonify(courtfile.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/courtfiles/<int:courtfile_id>', methods=['DELETE'])
@jwt_required()
def delete_courtfile(courtfile_id):
    try:
        if not _is_admin():
            return jsonify({'error': 'forbidden'}), 403
        courtfile = Courtfile.query.get_or_404(courtfile_id)
        db.session.delete(courtfile)
        db.session.commit()
        return jsonify({'message': 'Courtfile succesfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# -----------------ROUTES PARA LAWYER's--------------------------------------------


@api.route('/lawyers', methods=['GET'])
@jwt_required()
def get_lawyers():
    try:
        role, current_id = _get_role_and_identity()

        if role == 'admin_user':
            lawyers = Lawyer.query.all()

        elif role == 'lawyer':
            subq = db.session.query(LawyerCourtfile.courtfile_id).filter(
                LawyerCourtfile.lawyer_id == int(current_id)
            ).subquery()

            q = (db.session.query(Lawyer)
                 .join(LawyerCourtfile, Lawyer.id == LawyerCourtfile.lawyer_id)
                 .filter(LawyerCourtfile.courtfile_id.in_(subq))
                 .filter(Lawyer.id != int(current_id))
                 .distinct())
            lawyers = q.all()

        elif role == 'client':
            # todos los lawyers vinculados a expedientes del cliente
            subq = db.session.query(ClientCourtfile.courtfile_id).filter(
                ClientCourtfile.client_id == int(current_id)
            ).subquery()

            q = (db.session.query(Lawyer)
                 .join(LawyerCourtfile, Lawyer.id == LawyerCourtfile.lawyer_id)
                 .filter(LawyerCourtfile.courtfile_id.in_(subq))
                 .distinct())
            lawyers = q.all()

        else:
            return jsonify({'error': 'forbidden'}), 403

        return jsonify([l.serialize() for l in lawyers]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500




@api.route('/lawyers/<int:lawyer_id>', methods=['GET'])
@jwt_required()
def get_lawyer_detail(lawyer_id):
    try:
        role, current_id = _get_role_and_identity()
        current_id = int(current_id)

        # Admin ve a cualquiera
        if role == 'admin_user':
            lawyer = Lawyer.query.get_or_404(lawyer_id)
            return jsonify(lawyer.serialize()), 200

        # Lawyer: puede verse a sí mismo o a otro solo si comparten courtfile
        if role == 'lawyer':
            # si pide su propia ficha, permitido
            if lawyer_id == current_id:
                lawyer = Lawyer.query.get_or_404(lawyer_id)
                return jsonify(lawyer.serialize()), 200

            # subconsulta: courtfiles donde participa el abogado logueado
            subq = db.session.query(LawyerCourtfile.courtfile_id).filter(
                LawyerCourtfile.lawyer_id == current_id
            ).subquery()

            # ¿el abogado solicitado comparte alguno de esos courtfiles?
            shared = db.session.query(LawyerCourtfile).filter(
                LawyerCourtfile.lawyer_id == lawyer_id,
                LawyerCourtfile.courtfile_id.in_(subq)
            ).first()

            if not shared:
                return jsonify({'error': 'forbidden'}), 403

            lawyer = Lawyer.query.get_or_404(lawyer_id)
            return jsonify(lawyer.serialize()), 200
        
        # NEW: Client puede ver al abogado solo si comparten al menos un courtfile
        if role == 'client':
            client_cfs = db.session.query(ClientCourtfile.courtfile_id).filter(
                ClientCourtfile.client_id == current_id
            ).subquery()

            shared = db.session.query(LawyerCourtfile).filter(
                LawyerCourtfile.lawyer_id == lawyer_id,
                LawyerCourtfile.courtfile_id.in_(client_cfs)
            ).first()

            if not shared:
                return jsonify({'error': 'forbidden'}), 403

            lawyer = Lawyer.query.get_or_404(lawyer_id)
            return jsonify(lawyer.serialize()), 200

        # Otros roles: prohibido
        return jsonify({'error': 'forbidden'}), 403
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _mini_user(u):
    if not u:
        return None
    return {
        "id": u.id,
        "firstname": getattr(u, "firstname", None),
        "lastname": getattr(u, "lastname", None),
        "email": getattr(u, "email", None),
    }

def _mini_user(u):
    if not u:
        return None
    return {
        "id": u.id,
        "firstname": getattr(u, "firstname", None),
        "lastname": getattr(u, "lastname", None),
        "email": getattr(u, "email", None),
    }

@api.route('/lawyers/lookup', methods=['GET'])
@jwt_required(optional=True)
def lookup_lawyer_by_email():
    try:
        email = (request.args.get('email') or '').strip().lower()
        if not email:
            return jsonify({'error': 'email required'}), 400

        lawyer = Lawyer.query.filter(func.lower(Lawyer.email) == email).first()
        client = Client.query.filter(func.lower(Client.email) == email).first()

        return jsonify({
            'found': bool(lawyer),
            'lawyer': _mini_user(lawyer),
            'client_exists': bool(client),
            'client': _mini_user(client) if client else None,
            'conflict': bool(client and not lawyer) or bool(client and lawyer),
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers', methods=['POST'])
def create_lawyer():
    try:
        data = request.get_json()

        required_fields = ['firstname', 'lastname',
                           'email', 'phone', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        email = (data.get('email') or '').strip().lower()
        existing = Lawyer.query.filter_by(email=email).first()
        if existing:
            return jsonify({'error': 'Email already exists'}), 409

        lawyer = Lawyer(
            firstname=data['firstname'],
            lastname=data['lastname'],
            email=email,
            phone=data.get('phone'),
            password=generate_password_hash(data['password']),
            url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png",
            is_active=True if data.get('is_active', True) else False
        )

        db.session.add(lawyer)
        db.session.commit()

        return jsonify(lawyer.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers/<int:lawyer_id>', methods=['PUT'])
@jwt_required()
def update_lawyer(lawyer_id):
    try:
        lawyer = Lawyer.query.get_or_404(lawyer_id)

        if not (_is_admin() or (_role() == "lawyer" and _current_user_id() == lawyer.id)):
            return jsonify({'error': 'forbidden'}), 403

        data = request.form or {}
        file = request.files.get('file')

        if file:
            filename = file.filename
            file_ext = os.path.splitext(filename)[1].lower()
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

            if file_ext not in allowed_extensions:
                return jsonify({'error': 'Invalid file type. Only image formats are allowed.'}), 400

            upload_result = cloudinary.uploader.upload(
                file, resource_type='image')
            lawyer.url_img = upload_result['secure_url']

        # Email is immutable
        if 'email' in data:
            new_email = (data.get('email') or '').strip().lower()
            if new_email and new_email != (lawyer.email or "").lower():
                return jsonify({'error': 'Email cannot be changed'}), 400

        if 'firstname' in data:
            lawyer.firstname = data['firstname']

        if 'lastname' in data:
            lawyer.lastname = data['lastname']

        if 'phone' in data:
            lawyer.phone = data['phone']

        if 'is_active' in data:
            lawyer.is_active = data['is_active'].lower() in ['true', '1']

        if 'password' in data and data['password']:
            return jsonify({'error': 'Use /clients/<id>/password to change password'}), 400

        db.session.commit()

        return jsonify(lawyer.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers/<int:lawyer_id>', methods=['DELETE'])
@jwt_required()
def delete_lawyer(lawyer_id):
    try:
        if not _is_admin():
            return jsonify({'error': 'forbidden'}), 403
        lawyer = Lawyer.query.get_or_404(lawyer_id)
        db.session.delete(lawyer)
        db.session.commit()
        return jsonify({'message': 'Lawyer succesfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers/login', methods=['POST'])
def lawyer_login():
    try:
        data = request.get_json()

        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password required'}), 400

        email = (data.get('email') or '').strip().lower()

        lawyer = Lawyer.query.filter_by(email=email).first()

        if not lawyer:
            return jsonify({'error': 'Invalid credentials'}), 401

        if not check_password_hash(lawyer.password, data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401

        if hasattr(lawyer, 'is_active') and not lawyer.is_active:
            return jsonify({'error': 'Account deactivated'}), 403

        token = create_access_token(
            identity=str(lawyer.id),
            additional_claims={"role": "lawyer"}
        )

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'lawyer': lawyer.serialize()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers/<int:lawyer_id>/password', methods=['PUT'])
@jwt_required()
def change_lawyer_password(lawyer_id):
    if not (_is_admin() or (_role() == "lawyer" and _current_user_id() == lawyer_id)):
        return jsonify({'error': 'forbidden'}), 403

    data = request.get_json() or {}
    current = (data.get('current') or '').strip()
    new = (data.get('new') or '').strip()

    if not new or len(new) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    lawyer = Lawyer.query.get_or_404(lawyer_id)

    if not _is_admin():
        if lawyer.password and not check_password_hash(lawyer.password, current):
            return jsonify({'error': 'Current password is incorrect'}), 400

    lawyer.password = generate_password_hash(new)
    db.session.commit()
    return jsonify({'ok': True}), 200


# -----------------ROUTES PARA CLIENTS--------------------------------------------
@api.route('/clients', methods=['GET'])
@jwt_required()
def get_clients():
    try:
        role, current_id = _get_role_and_identity()

        if role == 'admin_user':
            q = Client.query

        elif role == 'lawyer':
            # Courtfiles del abogado logueado
            subq_cf = (db.session.query(LawyerCourtfile.courtfile_id)
                       .filter(LawyerCourtfile.lawyer_id == int(current_id))
                       .subquery())

            # Clientes vinculados a esos courtfiles
            q = (db.session.query(Client)
                 .join(ClientCourtfile, ClientCourtfile.client_id == Client.id)
                 .filter(ClientCourtfile.courtfile_id.in_(subq_cf))
                 .distinct())

        else:
            return jsonify({'error': 'forbidden'}), 403

        clients = (q.order_by(Client.lastname, Client.firstname).all())
        return jsonify([c.serialize() for c in clients]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/clients/<int:client_id>', methods=['GET'])
@jwt_required()
def get_client(client_id):
    try:
        client = Client.query.get_or_404(client_id)
        if _is_admin():
            return jsonify(client.serialize()), 200
        if _role() == "client" and _current_user_id() == client.id:
            return jsonify(client.serialize()), 200
        if _shares_courtfile_with(client_id=client_id):
            return jsonify(client.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/clients/lookup', methods=['GET'])
@jwt_required(optional=True)
def lookup_client_by_email():
    try:
        email = (request.args.get('email') or '').strip().lower()
        if not email:
            return jsonify({'error': 'email required'}), 400

        client = Client.query.filter(func.lower(Client.email) == email).first()
        lawyer = Lawyer.query.filter(func.lower(Lawyer.email) == email).first()

        return jsonify({
            'found': bool(client),
            'client': _mini_user(client),
            'lawyer_exists': bool(lawyer),
            'lawyer': _mini_user(lawyer) if lawyer else None,
            'conflict': bool(lawyer and not client) or bool(lawyer and client),
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/clients', methods=['POST'])
def create_client():
    try:
        data = request.get_json()

        required_fields = ['firstname', 'lastname', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        existing = Client.query.filter_by(email=data['email']).first()
        if existing:
            return jsonify({'error': 'Email already exists'}), 409

        client = Client(
            firstname=data['firstname'],
            lastname=data['lastname'],
            email=data['email'],
            phone=data['phone'],
            url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png",
            password=generate_password_hash(data['password']),
        )

        db.session.add(client)
        db.session.commit()

        return jsonify(client.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/clients/<int:client_id>', methods=['PUT'])
@jwt_required()
def update_client(client_id):
    try:

        client = Client.query.get_or_404(client_id)
        # 🔧 CHANGED: admin o client (self) pueden editar; lawyer NO
        if not (_is_admin() or (_role() == "client" and _current_user_id() == client.id)):
            return jsonify({'error': 'forbidden'}), 403

        data = request.form or {}
        file = request.files.get('file')

        if file:
            filename = file.filename
            file_ext = os.path.splitext(filename)[1].lower()
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

            if file_ext not in allowed_extensions:
                return jsonify({'error': 'Invalid file type. Only image formats are allowed.'}), 400

            upload_result = cloudinary.uploader.upload(
                file, resource_type='image')
            client.url_img = upload_result['secure_url']

        # Email is immutable
        if 'email' in data:
            new_email = (data.get('email') or '').strip().lower()
            if new_email and new_email != (client.email or "").lower():
                return jsonify({'error': 'Email cannot be changed'}), 400

        if 'firstname' in data:
            client.firstname = data['firstname']

        if 'lastname' in data:
            client.lastname = data['lastname']

        if 'phone' in data:
            client.phone = data['phone']

        if 'is_active' in data:
            client.is_active = bool(data['is_active'])

        if 'password' in data and data['password']:
            return jsonify({'error': 'Use /clients/<id>/password to change password'}), 400

        db.session.commit()

        return jsonify(client.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/clients/<int:client_id>', methods=['DELETE'])
@jwt_required()
def delete_client(client_id):
    try:
        if not _is_admin():
            return jsonify({'error': 'forbidden'}), 403
        client = Client.query.get_or_404(client_id)
        db.session.delete(client)
        db.session.commit()
        return jsonify({'message': 'Client successfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/clients/login', methods=['POST'])
def client_login():
    try:
        data = request.get_json()

        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password required'}), 400

        email = (data.get('email') or '').strip().lower()

        client = Client.query.filter_by(email=email).first()

        if not client:
            return jsonify({'error': 'Invalid credentials'}), 401

        if not check_password_hash(client.password, data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401

        if hasattr(client, 'is_active') and not client.is_active:
            return jsonify({'error': 'Account deactivated'}), 403

        token = create_access_token(
            identity=str(client.id),
            additional_claims={"role": "client"}
        )

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'client': client.serialize()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/clients/<int:client_id>/password', methods=['PUT'])
@jwt_required()
def change_client_password(client_id):
    if not (_is_admin() or (_role() == "client" and _current_user_id() == client_id)):
        return jsonify({'error': 'forbidden'}), 403

    data = request.get_json() or {}
    current = (data.get('current') or '').strip()
    new = (data.get('new') or '').strip()

    if not new or len(new) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    client = Client.query.get_or_404(client_id)

    if not _is_admin():
        if client.password and not check_password_hash(client.password, current):
            return jsonify({'error': 'Current password is incorrect'}), 400

    client.password = generate_password_hash(new)
    db.session.commit()
    return jsonify({'ok': True}), 200

# -----------------ROUTES PARA COURTFILES, APPOINTMENTS Y DOCUMENTS DEL CLIENT--------------------------------------------
# -------------------NO SE ESTAN USANDO...-------------------------------------------------------------------------------


@api.route('/clients/<int:client_id>/get-courtfiles', methods=['GET'])
@jwt_required(optional=True)
def get_courtfiles_client(client_id):
    try:
        claims = get_jwt()
        current_client_id = get_jwt_identity()

        if claims.get('role') != 'client' or int(current_client_id) != client_id:
            return jsonify({'error': 'Access denied'}), 403

        client_courtfiles = ClientCourtfile.query.filter_by(
            client_id=client_id).all()

        courtfiles = []
        for relation in client_courtfiles:
            courtfile_data = relation.courtfile.serialize()
            lawyers = LawyerCourtfile.query.filter_by(
                courtfile_id=relation.courtfile_id).all()
            courtfile_data['assigned_lawyers'] = [{
                'id': lc.lawyer.id,
                'name': f"{lc.lawyer.firstname} {lc.lawyer.lastname}",
                'email': lc.lawyer.email
            } for lc in lawyers]

            courtfiles.append(courtfile_data)

        return jsonify(courtfiles), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/clients/<int:client_id>/get-appointments', methods=['GET'])
@jwt_required()
def get_client_appointments(client_id):
    try:
        claims = get_jwt()
        current_client_id = get_jwt_identity()

        if claims.get('role') != 'client' or int(current_client_id) != client_id:
            return jsonify({'error': 'Access denied'}), 403

        client_courtfiles = ClientCourtfile.query.filter_by(
            client_id=client_id).all()
        courtfile_ids = [
            relation.courtfile_id for relation in client_courtfiles]

        appointments = []
        for courtfile_id in courtfile_ids:
            courtfile_appointments = (AppointmentCourtfile.query
                                      .filter_by(courtfile_id=courtfile_id)
                                      .options(
                                          joinedload(
                                              AppointmentCourtfile.appointment),
                                          joinedload(
                                              AppointmentCourtfile.courtfile)
                                      )
                                      .all())
            for relation in courtfile_appointments:
                appointment_data = relation.appointment.serialize()
                appointment_data['courtfile_case_number'] = relation.courtfile.case_number
                appointment_data['courtfile_title'] = relation.courtfile.title
                appointments.append(appointment_data)

        return jsonify(appointments), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA ADMINS--------------------------------------------


@api.route('/admins', methods=['GET'])
@jwt_required()
def get_admins():
    try:
        if not _is_admin():
            return jsonify({'error': 'forbidden'}), 403
        admins = AdminUser.query.all()
        return jsonify([admin.serialize() for admin in admins]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/admins/<int:admin_id>', methods=['GET'])
@jwt_required()
def get_admin(admin_id):
    try:
        admin = AdminUser.query.get_or_404(admin_id)
        if not _is_admin():
            return jsonify({'error': 'forbidden'}), 403
        return jsonify(admin.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/admins', methods=['POST'])
def create_admin():
    try:
        data = request.get_json()

        required_fields = ['firstname', 'lastname', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        existing = AdminUser.query.filter_by(email=data['email']).first()
        if existing:
            return jsonify({'error': 'Email already exists'}), 409

        admin = AdminUser(
            firstname=data['firstname'],
            lastname=data['lastname'],
            email=data['email'],
            password=generate_password_hash(data['password']),
        )

        db.session.add(admin)
        db.session.commit()

        return jsonify(admin.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/admins/<int:admin_id>', methods=['PUT'])
@jwt_required()
def update_admin(admin_id):
    try:
        admin = AdminUser.query.get_or_404(admin_id)
        if not _is_admin():
            return jsonify({'error': 'forbidden'}), 403
        data = request.get_json() or {}

        if 'email' in data and data['email'] != admin.email:
            return jsonify({'error': 'Email cannot be changed'}), 400

        if 'firstname' in data:
            admin.firstname = data['firstname']

        if 'lastname' in data:
            admin.lastname = data['lastname']

        if 'is_active' in data:
            admin.is_active = bool(data['is_active'])

        if 'password' in data and data['password']:
            return jsonify({'error': 'Use /admins/<id>/password to change password'}), 400

        db.session.commit()

        return jsonify(admin.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/admins/<int:admin_id>', methods=['DELETE'])
@jwt_required()
def delete_admin(admin_id):
    try:
        if not _is_admin():
            return jsonify({'error': 'forbidden'}), 403
        admin = AdminUser.query.get_or_404(admin_id)
        db.session.delete(admin)
        db.session.commit()
        return jsonify({'message': 'Admin user successfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/admins/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()

        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password required'}), 400

        email = (data.get('email') or '').strip().lower()

        admin = AdminUser.query.filter_by(email=email).first()

        if not admin:
            return jsonify({'error': 'Invalid credentials'}), 401

        if not check_password_hash(admin.password, data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401

        if hasattr(admin, 'is_active') and not admin.is_active:
            return jsonify({'error': 'Account deactivated'}), 403

        token = create_access_token(
            identity=str(admin.id),
            additional_claims={"role": "admin_user"}
        )

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'role': 'admin_user',
            'admin': admin.serialize()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA APPOINTMENTS--------------------------------------------

@api.route('/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    if _is_admin():
        appointments = Appointment.query.order_by(
            Appointment.date, Appointment.starts_at
        ).all()
        return jsonify([appt.serialize() for appt in appointments]), 200

    uid = _current_user_id()
    r = _role()

    if r == "lawyer":
        appointments = db.session.query(Appointment).join(
            AppointmentCourtfile
        ).join(LawyerCourtfile).filter(
            LawyerCourtfile.lawyer_id == uid
        ).all()
        return jsonify([appt.serialize() for appt in appointments]), 200

    if r == "client":
        appointments = db.session.query(Appointment).join(
            AppointmentCourtfile
        ).join(ClientCourtfile).filter(
            ClientCourtfile.client_id == uid
        ).all()
        return jsonify([appt.serialize() for appt in appointments]), 200

    return jsonify({'error': 'forbidden'}), 403


@api.route('/appointments/<int:appointment_id>', methods=['GET'])
@jwt_required()
def get_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    if _is_admin():
        return jsonify(appointment.serialize()), 200
    if _is_linked_to_resource(appointment_id, AppointmentCourtfile, "appointment_id"):
        return jsonify(appointment.serialize()), 200
    return jsonify({'error': 'forbidden'}), 403


@api.route('/appointments', methods=['POST'])
@jwt_required()
def create_appointment():
    try:
        if not (_is_admin() or _role() == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        data = request.get_json()

        # 🔒 Lawyer debe estar vinculado al courtfile donde lo crea
        if _role() == "lawyer":
            cf_id = data.get("courtfile_id")
            if not cf_id or not _is_linked_to_courtfile_id(cf_id):
                return jsonify({'error': 'forbidden'}), 403

        required_fields = ['title', 'date', 'starts_at', 'location', 'ends_at']
        missing_fields = validate_required_fields(data, required_fields)
        if missing_fields:
            return create_error_response(
                f'Required fields are missing: {", ".join(missing_fields)}'
            )

        appointment_date = parse_iso_date(data['date'])
        if not appointment_date:
            return create_error_response('Invalid date format. Use YYYY-MM-DD')

        if not is_valid_24h_time(data['starts_at']):
            return create_error_response('Invalid start time format')

        if not is_valid_24h_time(data['ends_at']):
            return create_error_response('Invalid end time format')

        start_time = parse_24h_time(data['starts_at'])
        end_time = parse_24h_time(data['ends_at'])

        if not validate_time_order(start_time, end_time):
            return create_error_response('Start time must be before end time')

        latitud = None
        longitud = None
        if 'latitud' in data:
            latitud = float(data['latitud'])
        if 'longitud' in data:
            longitud = float(data['longitud'])

        details = data.get('details', '').strip()

        new_appointment = Appointment(
            title=data['title'].strip(),
            date=appointment_date,
            location=data.get('location', '').strip(),
            details=details,
            starts_at=start_time,
            ends_at=end_time,
            latitud=latitud,
            longitud=longitud
        )

        db.session.add(new_appointment)
        db.session.commit()

        # 🔗 Vincular appointment a courtfile
        if _role() == "lawyer":
            link = AppointmentCourtfile(
                appointment_id=new_appointment.id,
                courtfile_id=cf_id
            )
            db.session.add(link)
            db.session.commit()

        return jsonify(new_appointment.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return create_error_response(f'Error interno del servidor: {str(e)}', 500)


@api.route('/appointments/<int:id>', methods=['PUT'])
@jwt_required()
def update_appointment(id):
    try:
        appointment = Appointment.query.get_or_404(id)

        if _is_admin():
            pass
        elif _role() == "lawyer":
            if not _is_linked_to_resource(id, AppointmentCourtfile, "appointment_id"):
                return jsonify({'error': 'forbidden'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        data = request.get_json()

        if 'title' in data:
            appointment.title = data['title'].strip()

        if 'date' in data:
            appointment_date = parse_iso_date(data['date'])
            if not appointment_date:
                return create_error_response('Invalid date format. Use YYYY-MM-DD')
            appointment.date = appointment_date

        if 'starts_at' in data:
            if not is_valid_24h_time(data['starts_at']):
                return create_error_response('Invalid start time format')
            appointment.starts_at = parse_24h_time(data['starts_at'])

        if 'ends_at' in data:
            if not is_valid_24h_time(data['ends_at']):
                return create_error_response('Invalid end time format')
            appointment.ends_at = parse_24h_time(data['ends_at'])

        if 'location' in data:
            appointment.location = data['location'].strip()

        if 'details' in data:
            appointment.details = data['details'].strip()

        if 'latitud' in data:
            appointment.latitud = float(data['latitud'])

        if 'longitud' in data:
            appointment.longitud = float(data['longitud'])

        if not validate_time_order(appointment.starts_at, appointment.ends_at):
            return create_error_response('Start time must be before end time')

        db.session.commit()
        return jsonify(appointment.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return create_error_response(f'Server error: {str(e)}', 500)


@api.route('/appointments/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_appointment(id):
    appointment = Appointment.query.get_or_404(id)

    if _is_admin():
        db.session.delete(appointment)
        db.session.commit()
        return jsonify({'message': 'Appointment eliminado exitosamente'}), 200

    if _role() == "lawyer":
        # Lawyer solo puede borrar el vínculo, no el appointment global
        link = AppointmentCourtfile.query.filter_by(
            appointment_id=id
        ).join(
            LawyerCourtfile, AppointmentCourtfile.courtfile_id == LawyerCourtfile.courtfile_id
        ).filter(
            LawyerCourtfile.lawyer_id == _current_user_id()
        ).first()
        if link:
            db.session.delete(link)
            db.session.commit()
            return jsonify({'message': 'Vínculo con courtfile eliminado'}), 200

    return jsonify({'error': 'forbidden'}), 403


# -----------------ROUTES PARA DEADLINES--------------------------------------------

@api.route('/deadlines', methods=['GET'])
@jwt_required()
def get_deadlines():
    try:
        role, current_id = _get_role_and_identity()
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        # base: Deadlines + relación
        base = db.session.query(Deadlines) \
            .join(DeadlineCourtfile, DeadlineCourtfile.deadline_id == Deadlines.id)

        # ⚠️ agregamos join con Courtfile para poder traer case_number
        base = base.join(Courtfile, Courtfile.id == DeadlineCourtfile.courtfile_id)

        if role == "admin_user":
            q = base
            if requested_lawyer_id is not None:
                q = q.join(LawyerCourtfile,
                           LawyerCourtfile.courtfile_id == DeadlineCourtfile.courtfile_id) \
                     .filter(LawyerCourtfile.lawyer_id == requested_lawyer_id)

            if requested_courtfile_id is not None:
                q = q.filter(DeadlineCourtfile.courtfile_id == requested_courtfile_id)

            rows = q.with_entities(
                Deadlines,
                DeadlineCourtfile.courtfile_id,
                Courtfile.case_number
            ).all()

        elif role == "lawyer":
            subq_cf = db.session.query(LawyerCourtfile.courtfile_id) \
                .filter(LawyerCourtfile.lawyer_id == int(current_id)) \
                .subquery()

            q = base.filter(DeadlineCourtfile.courtfile_id.in_(subq_cf))

            if requested_courtfile_id is not None:
                q = q.filter(DeadlineCourtfile.courtfile_id == requested_courtfile_id)

            rows = q.with_entities(
                Deadlines,
                DeadlineCourtfile.courtfile_id,
                Courtfile.case_number
            ).all()

        else:
            return jsonify({'error': 'forbidden'}), 403

        by_deadline = {}
        for d, cf_id, cf_number in rows:
            if d.id not in by_deadline:
                base_payload = d.serialize()
                by_deadline[d.id] = {
                    **base_payload,
                    "courtfile_id": cf_id,
                    "courtfile_number": cf_number,
                    "courtfiles": [{"id": cf_id, "case_number": cf_number}]
                }
            else:
                by_deadline[d.id]["courtfiles"].append(
                    {"id": cf_id, "case_number": cf_number}
                )

        return jsonify(list(by_deadline.values())), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/deadlines/<int:deadline_id>', methods=['GET'])
@jwt_required()
def get_deadline(deadline_id):
    deadline = Deadlines.query.get_or_404(deadline_id)
    if _is_admin():
        return jsonify(deadline.serialize()), 200
    if _role() == "lawyer" and _is_linked_to_resource(deadline_id, DeadlineCourtfile, "deadline_id"):
        return jsonify(deadline.serialize()), 200
    return jsonify({'error': 'forbidden'}), 403


@api.route('/deadlines', methods=['POST'])
@jwt_required()
def create_deadline():
    try:
        if not (_is_admin() or _role() == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        data = request.get_json()
        required_fields = ['deadline_type', 'deadline_date',
                           'deadline_hour', 'priority', 'courtfile_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        # Lawyer solo en courtfiles vinculados
        cf_id = data['courtfile_id']
        if _role() == "lawyer" and not _is_linked_to_courtfile_id(cf_id):
            return jsonify({'error': 'forbidden'}), 403

        deadline_date = data['deadline_date']
        if isinstance(deadline_date, str):
            deadline_date = datetime.strptime(deadline_date, '%Y-%m-%d').date()

        deadline_hour = data['deadline_hour']
        if isinstance(deadline_hour, str):
            deadline_hour = datetime.strptime(deadline_hour, '%H:%M').time()

        deadline = Deadlines(
            deadline_type=data['deadline_type'],
            deadline_date=deadline_date,
            deadline_hour=deadline_hour,
            priority=data['priority']
        )

        db.session.add(deadline)
        db.session.commit()

        # Vincular al courtfile
        link = DeadlineCourtfile(deadline_id=deadline.id, courtfile_id=cf_id)
        db.session.add(link)
        db.session.commit()

        return jsonify(deadline.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/deadlines/<int:deadline_id>', methods=['PUT'])
@jwt_required()
def update_deadline(deadline_id):
    try:
        deadline = Deadlines.query.get_or_404(deadline_id)

        if _is_admin():
            pass
        elif _role() == "lawyer":
            if not _is_linked_to_resource(deadline_id, DeadlineCourtfile, "deadline_id"):
                return jsonify({'error': 'forbidden'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        data = request.get_json() or {}

        if 'deadline_type' in data:
            deadline.deadline_type = data['deadline_type']

        if 'deadline_date' in data:
            deadline_date = data['deadline_date']
            if isinstance(deadline_date, str):
                deadline_date = datetime.strptime(
                    deadline_date, '%Y-%m-%d').date()
            deadline.deadline_date = deadline_date

        if 'deadline_hour' in data:
            deadline_hour = data['deadline_hour']
            if isinstance(deadline_hour, str):
                deadline_hour = datetime.strptime(
                    deadline_hour, '%H:%M').time()
            deadline.deadline_hour = deadline_hour

        if 'priority' in data:
            deadline.priority = data['priority']

        db.session.commit()
        return jsonify(deadline.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/deadlines/<int:deadline_id>', methods=['DELETE'])
@jwt_required()
def delete_deadline(deadline_id):
    deadline = Deadlines.query.get_or_404(deadline_id)

    if _is_admin():
        db.session.delete(deadline)
        db.session.commit()
        return jsonify({'message': 'Deadline eliminado exitosamente'}), 200

    if _role() == "lawyer":
        # Lawyer solo puede eliminar el vínculo
        link = DeadlineCourtfile.query.filter_by(deadline_id=deadline_id).join(
            LawyerCourtfile, DeadlineCourtfile.courtfile_id == LawyerCourtfile.courtfile_id
        ).filter(
            LawyerCourtfile.lawyer_id == _current_user_id()
        ).first()
        if link:
            db.session.delete(link)
            db.session.commit()
            return jsonify({'message': 'Vínculo con courtfile eliminado'}), 200

    return jsonify({'error': 'forbidden'}), 403


# -----------------ROUTES PARA DOCUMENTS--------------------------------------------
@api.route('/documents', methods=['GET'])
@jwt_required()
def get_documents():
    try:
        if _is_admin():
            documents = Document.query.all()
            return jsonify([document.serialize() for document in documents]), 200

        uid = _current_user_id()
        r = _role()

        if r == "lawyer":
            documents = db.session.query(Document).join(
                CourtfileDocument
            ).join(LawyerCourtfile).filter(
                LawyerCourtfile.lawyer_id == uid
            ).all()
            return jsonify([doc.serialize() for doc in documents]), 200

        # Client no accede
        return jsonify({'error': 'forbidden'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/documents/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    try:
        document = Document.query.get_or_404(document_id)
        if _is_admin():
            return jsonify(document.serialize()), 200
        if _role() == "lawyer" and _is_linked_to_resource(document_id, CourtfileDocument, "document_id"):
            return jsonify(document.serialize()), 200
        return jsonify({'error': 'forbidden'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/documents', methods=['POST'])
@jwt_required()
def create_document():
    try:
        if not (_is_admin() or _role() == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        # 🔽 código original intacto
        original_filename = None
        file = request.files.get('file')
        if file and file.filename.strip() == '':
            file = None

        allowed_extensions = {
            'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx',
            'ppt', 'pptx', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'bmp',
            'tiff', 'webp', 'svg', 'mp3', 'wav', 'ogg', 'flac', 'aac',
            'm4a', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'
        }

        original_filename = None
        file_extension = None
        file_url = None

        name = request.form.get('name')
        description = request.form.get('description', None)
        category = request.form.get('category', None)
        document_date = request.form.get('document_date', None)

        if not name:
            return jsonify({'error': 'Document name is required'}), 400

        if file:
            original_filename = secure_filename(file.filename)
            file_extension = original_filename.rsplit(
                '.', 1)[1].lower() if '.' in original_filename else ''

            if not file_extension or file_extension not in allowed_extensions:
                return jsonify({'error': 'File type not allowed'}), 400

            resource_type = "raw" if file_extension in [
                'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'
            ] else "auto"

            upload_result = cloudinary.uploader.upload(
                file,
                folder="documents/",
                resource_type=resource_type,
                use_filename=True,
                unique_filename=True,
                filename_override=original_filename
            )

            file_url = upload_result['secure_url']

            if resource_type == "raw":
                file_url += f"?fl_attachment={original_filename}"
        else:
            file_extension = 'note'
            file_url = ""

        new_document = Document(
            name=name,
            type=file_extension,
            url_route=file_url,
            description=description,
            category=category,
            document_date=document_date
        )

        if document_date:
            try:
                new_document.document_date = datetime.strptime(
                    document_date, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        db.session.add(new_document)
        db.session.commit()

        return jsonify({
            **new_document.serialize(),
            'original_filename': original_filename
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating document: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/documents/<int:document_id>', methods=['PUT'])
@jwt_required()
def update_document(document_id):
    try:
        document = Document.query.get_or_404(document_id)

        if not (_is_admin() or (_role() == "lawyer" and _is_linked_to_resource(document_id, CourtfileDocument, "document_id"))):
            return jsonify({'error': 'forbidden'}), 403

        # 🔽 código original intacto
        uploaded_original_filename = None

        if 'file' in request.files:
            file = request.files['file']

            if file and file.filename != '':
                allowed_extensions = {
                    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx',
                    'ppt', 'pptx', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'bmp',
                    'tiff', 'webp', 'svg', 'mp3', 'wav', 'ogg', 'flac', 'aac',
                    'm4a', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'
                }

                original_filename = secure_filename(file.filename)
                file_extension = original_filename.rsplit(
                    '.', 1)[1].lower() if '.' in original_filename else ''

                if not file_extension or file_extension not in allowed_extensions:
                    return jsonify({'error': 'File type not allowed.'}), 400

                resource_type = "raw" if file_extension in [
                    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'] else "auto"

                upload_params = {
                    'folder': "documents/",
                    'resource_type': resource_type,
                    'use_filename': True,
                    'unique_filename': True,
                    'filename_override': original_filename
                }

                upload_result = cloudinary.uploader.upload(
                    file, **upload_params)

                file_url = upload_result['secure_url']

                office_extensions = ['doc', 'docx',
                                     'xls', 'xlsx', 'ppt', 'pptx', 'csv']
                if file_extension in office_extensions:
                    file_url += f"?fl_attachment={original_filename}"
                elif file_extension == 'pdf':
                    file_url = upload_result['secure_url']

                document.url_route = file_url
                document.type = file_extension

                uploaded_original_filename = original_filename

                if hasattr(document, 'original_filename'):
                    document.original_filename = original_filename

        if request.form:
            if 'name' in request.form:
                document.name = request.form['name']
            if 'description' in request.form:
                document.description = request.form['description']
            if 'category' in request.form:
                document.category = request.form['category']
            if 'document_date' in request.form and request.form['document_date']:
                try:
                    document.document_date = datetime.strptime(
                        request.form['document_date'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        db.session.commit()

        return jsonify({
            **document.serialize(),
            'original_filename': uploaded_original_filename or (
                document.original_filename if hasattr(
                    document, 'original_filename') else None
            )
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating document: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    try:
        document = Document.query.get_or_404(document_id)

        if _is_admin():
            db.session.delete(document)
            db.session.commit()
            return jsonify({'message': 'Document succesfully deleted'}), 200

        if _role() == "lawyer" and _is_linked_to_resource(document_id, CourtfileDocument, "document_id"):
            # Lawyer solo corta vínculo, no borra el doc global
            link = CourtfileDocument.query.filter_by(
                document_id=document_id).first()
            if link:
                db.session.delete(link)
                db.session.commit()
                return jsonify({'message': 'Vínculo con courtfile eliminado'}), 200

        return jsonify({'error': 'forbidden'}), 403

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA CLIENTS-COURTFILES--------------------------------------------

@api.route('/clients-courtfiles', methods=['GET'])
@jwt_required()
def get_client_courtfiles():
    try:
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()

        q = ClientCourtfile.query.options(
            joinedload(ClientCourtfile.client),
            joinedload(ClientCourtfile.courtfile)
        )

        # 🔒 Client → sólo sus vínculos
        if role == "client":
            q = q.filter(ClientCourtfile.client_id == int(current_id))

        # Lawyer → solo expedientes donde esté vinculado
        if role == "lawyer":
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == current_id
            )
            q = q.filter(ClientCourtfile.courtfile_id.in_(subq))

        # Admin → no filtramos nada

        if requested_lawyer_id is not None:
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == requested_lawyer_id
            )
            q = q.filter(ClientCourtfile.courtfile_id.in_(subq))

        if requested_courtfile_id is not None:
            q = q.filter(ClientCourtfile.courtfile_id ==
                         requested_courtfile_id)

        client_courtfiles = q.all()
        return jsonify([{
            'id': cc.id,
            'client_id': cc.client_id,
            'courtfile_id': cc.courtfile_id,
            'client_name': f"{cc.client.firstname} {cc.client.lastname}" if cc.client else None,
            'client_email': cc.client.email if cc.client else None,
            'client_phone': cc.client.phone if cc.client else None,
            # 🔁 Unificamos shape con /lawyers-courtfiles
            'courtfile': cc.courtfile.serialize() if cc.courtfile else None,
        } for cc in client_courtfiles]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/clients-courtfiles', methods=['POST'])
@jwt_required()
def create_client_courtfile():
    try:
        role, current_id = _get_role_and_identity()
        if not (_is_admin() or role == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        data = request.get_json() or {}
        client_id = data.get('client_id')
        courtfile_id = data.get('courtfile_id')
        if not client_id or not courtfile_id:
            return jsonify({'error': 'client_id and courtfile_id required'}), 400

        client = Client.query.get(client_id)
        courtfile = Courtfile.query.get(courtfile_id)
        if not client or not courtfile:
            return jsonify({'error': 'Client or Courtfile not found'}), 404

        # Lawyer → solo si está vinculado al expediente
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=current_id, courtfile_id=courtfile_id
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403

        existing = ClientCourtfile.query.filter_by(
            client_id=client_id, courtfile_id=courtfile_id
        ).first()
        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

        new_relation = ClientCourtfile(
            client_id=client_id, courtfile_id=courtfile_id
        )
        db.session.add(new_relation)
        db.session.commit()

        return jsonify({'message': 'Relationship created successfully', 'id': new_relation.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/clients-courtfiles/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_client_courtfile(id):
    try:
        relation = ClientCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()
        if not (_is_admin() or role == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=current_id, courtfile_id=relation.courtfile_id
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403

        db.session.delete(relation)
        db.session.commit()
        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA LAWYERS-COURTFILES--------------------------------------------

def _get_role_and_identity():
    try:
        claims = get_jwt()
        return claims.get("role"), get_jwt_identity()
    except Exception:
        return None, None


@api.route('/lawyers-courtfiles', methods=['GET'])
@jwt_required()
def get_lawyers_courtfiles():
    try:
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)
        only_common = request.args.get('only_common', default='0') == '1'

        role, current_id = _get_role_and_identity()
        q = LawyerCourtfile.query

        if role == "admin_user":
            pass

        elif role == "lawyer":
            # chequeos de seguridad igual que antes
            if requested_courtfile_id:
                is_linked = LawyerCourtfile.query.filter_by(
                    lawyer_id=int(current_id), courtfile_id=requested_courtfile_id
                ).first()
                if not is_linked:
                    return jsonify({'error': 'You are not linked to this courtfile'}), 403
                q = q.filter_by(courtfile_id=requested_courtfile_id)

            elif requested_lawyer_id and requested_lawyer_id != int(current_id) and only_common:
                subq = (db.session.query(LawyerCourtfile.courtfile_id)
                        .filter(LawyerCourtfile.lawyer_id == int(current_id))
                        .subquery())
                q = (db.session.query(LawyerCourtfile)
                     .filter(LawyerCourtfile.lawyer_id == requested_lawyer_id)
                     .filter(LawyerCourtfile.courtfile_id.in_(subq)))
            else:
                requested_lawyer_id = int(current_id)

        elif role == "client":
            # validar que el cliente esté vinculado al courtfile
            subq = db.session.query(ClientCourtfile.courtfile_id).filter(
                ClientCourtfile.client_id == int(current_id)
            ).subquery()
            q = q.filter(LawyerCourtfile.courtfile_id.in_(subq))

            if requested_courtfile_id:
                q = q.filter(LawyerCourtfile.courtfile_id == requested_courtfile_id)

        else:
            return jsonify({'error': 'forbidden'}), 403

        if requested_lawyer_id is not None:
            q = q.filter(LawyerCourtfile.lawyer_id == requested_lawyer_id)
        if requested_courtfile_id is not None:
            q = q.filter(LawyerCourtfile.courtfile_id == requested_courtfile_id)

        rows = q.all()
        return jsonify([{
            'id': r.id,
            'lawyer_id': r.lawyer_id,
            'courtfile_id': r.courtfile_id,
            'lawyer_name': f"{r.lawyer.firstname} {r.lawyer.lastname}".strip(),
            'lawyer_email': r.lawyer.email,
            'lawyer_phone': r.lawyer.phone,
            'courtfile': r.courtfile.serialize(),
        } for r in rows]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers-courtfiles', methods=['POST'])
@jwt_required()
def create_lawyer_courtfile():
    try:
        data = request.get_json() or {}
        lawyer_id = data.get('lawyer_id')
        courtfile_id = data.get('courtfile_id')

        if not lawyer_id or not courtfile_id:
            return jsonify({'error': 'lawyer_id and courtfile_id required'}), 400

        role, current_id = _get_role_and_identity()

        if role == "admin_user":
            pass  # admin puede todo
        elif role == "lawyer":
            if int(lawyer_id) != int(current_id):
                # invitante debe estar vinculado al expediente
                inviter_rel = LawyerCourtfile.query.filter_by(
                    lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
                ).first()
                if not inviter_rel:
                    return jsonify({'error': 'You are not linked to this courtfile'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        lawyer = Lawyer.query.get(lawyer_id)
        courtfile = Courtfile.query.get(courtfile_id)
        if not lawyer or not courtfile:
            return jsonify({'error': 'Lawyer or Courtfile not found'}), 404

        existing = LawyerCourtfile.query.filter_by(
            lawyer_id=lawyer_id, courtfile_id=courtfile_id
        ).first()
        if existing:
            return jsonify({'message': 'Relationship already exists'}), 200

        new_relation = LawyerCourtfile(
            lawyer_id=lawyer_id, courtfile_id=courtfile_id
        )
        db.session.add(new_relation)
        db.session.commit()

        return jsonify({'message': 'Relationship created successfully', 'id': new_relation.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers-courtfiles/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_lawyer_courtfile(id):
    try:
        relation = LawyerCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()

        if role == "admin_user":
            pass  # admin puede borrar cualquier relación
        elif role == "lawyer":
            # solo puede borrarse a sí mismo
            if str(relation.lawyer_id) != str(current_id):
                return jsonify({'error': 'Forbidden'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA DEADLINES-COURTFILES--------------------------------------------

@api.route('/deadlines-courtfiles', methods=['GET'])
@jwt_required()
def get_deadlines_courtfiles():
    try:
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()
        query = DeadlineCourtfile.query

        if role == "admin_user":
            pass  # Admin ve todo
        elif role == "lawyer":
            if requested_lawyer_id is None:
                requested_lawyer_id = int(current_id)
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == requested_lawyer_id
            )
            query = query.filter(DeadlineCourtfile.courtfile_id.in_(subq))
        else:
            return jsonify({'error': 'forbidden'}), 403

        if requested_courtfile_id is not None:
            query = query.filter_by(courtfile_id=requested_courtfile_id)

        deadlines_courtfiles = query.all()
        return jsonify([{
            'id': dc.id,
            'deadline_id': dc.deadline_id,
            'courtfile_id': dc.courtfile_id,
            'deadline_type': dc.deadlines.deadline_type,
            'deadline_date': dc.deadlines.deadline_date.isoformat(),
            'deadline_hour': dc.deadlines.deadline_hour.strftime('%H:%M'),
            'priority': dc.deadlines.priority,
            'courtfile_number': dc.courtfile.case_number,
            'courtfile_title': dc.courtfile.title
        } for dc in deadlines_courtfiles]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/deadlines-courtfiles', methods=['POST'])
@jwt_required()
def create_deadline_courtfile():
    try:
        data = request.get_json() or {}
        deadline_id = data.get('deadline_id')
        courtfile_id = data.get('courtfile_id')

        if not deadline_id or not courtfile_id:
            return jsonify({'error': 'deadline_id and courtfile_id required'}), 400

        deadline = Deadlines.query.get(deadline_id)
        courtfile = Courtfile.query.get(courtfile_id)
        if not deadline or not courtfile:
            return jsonify({'error': 'Deadline or Courtfile not found'}), 404

        role, current_id = _get_role_and_identity()
        if role == "admin_user":
            pass
        elif role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        existing = DeadlineCourtfile.query.filter_by(
            deadline_id=deadline_id,
            courtfile_id=courtfile_id
        ).first()
        if existing:
            return jsonify({'message': 'Relationship already exists'}), 200

        new_relation = DeadlineCourtfile(
            deadline_id=deadline_id,
            courtfile_id=courtfile_id
        )
        db.session.add(new_relation)
        db.session.commit()

        return jsonify({
            'message': 'Relationship created successfully',
            'id': new_relation.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/deadlines-courtfiles/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_deadline_courtfile(id):
    try:
        relation = DeadlineCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()

        if role == "admin_user":
            pass
        elif role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(relation.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        db.session.delete(relation)
        db.session.commit()
        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA APPOINTMENTS-COURTFILES--------------------------------------------

@api.route('/appointments-courtfiles', methods=['GET'])
@jwt_required()
def get_appointments_courtfiles():
    try:
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()
        query = AppointmentCourtfile.query

        if role == "admin_user":
            pass  # Admin ve todo
        elif role == "lawyer":
            if requested_lawyer_id is None:
                requested_lawyer_id = int(current_id)
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == requested_lawyer_id
            )
            query = query.filter(AppointmentCourtfile.courtfile_id.in_(subq))
        elif role == "client":
            subq = select(ClientCourtfile.courtfile_id).where(
                ClientCourtfile.client_id == int(current_id)
            )
            query = query.filter(AppointmentCourtfile.courtfile_id.in_(subq))
        else:
            return jsonify({'error': 'forbidden'}), 403

        if requested_courtfile_id is not None:
            query = query.filter_by(courtfile_id=requested_courtfile_id)

        appointments_courtfiles = query.all()
        return jsonify([{
            'id': ac.id,
            'appointment_id': ac.appointment_id,
            'courtfile_id': ac.courtfile_id,
            'appointment_title': ac.appointment.title,
            'appointment_date': ac.appointment.date.isoformat(),
            'appointment_location': ac.appointment.location,
            'appointment_details': ac.appointment.details,
            'starts_at': ac.appointment.starts_at.strftime('%H:%M'),
            'ends_at': ac.appointment.ends_at.strftime('%H:%M'),
            'courtfile_number': ac.courtfile.case_number,
            'courtfile_title': ac.courtfile.title
        } for ac in appointments_courtfiles]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/appointments-courtfiles', methods=['POST'])
@jwt_required()
def create_appointment_courtfile():
    try:
        data = request.get_json() or {}
        appointment_id = data.get('appointment_id')
        courtfile_id = data.get('courtfile_id')

        if not appointment_id or not courtfile_id:
            return jsonify({'error': 'appointment_id and courtfile_id required'}), 400

        appointment = Appointment.query.get(appointment_id)
        courtfile = Courtfile.query.get(courtfile_id)
        if not appointment or not courtfile:
            return jsonify({'error': 'Appointment or Courtfile not found'}), 404

        role, current_id = _get_role_and_identity()
        if role == "admin_user":
            pass
        elif role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        existing = AppointmentCourtfile.query.filter_by(
            appointment_id=appointment_id,
            courtfile_id=courtfile_id
        ).first()
        if existing:
            return jsonify({'message': 'Relationship already exists'}), 200

        new_relation = AppointmentCourtfile(
            appointment_id=appointment_id,
            courtfile_id=courtfile_id
        )
        db.session.add(new_relation)
        db.session.commit()

        return jsonify({
            'message': 'Relationship created successfully',
            'id': new_relation.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/appointments-courtfiles/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_appointment_courtfile(id):
    try:
        relation = AppointmentCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()

        if role == "admin_user":
            pass
        elif role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(relation.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        db.session.delete(relation)
        db.session.commit()
        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA COURTFILE-DOCUMENT--------------------------------------------


@api.route('/courtfile-document', methods=['GET'])
@jwt_required()
def get_courtfile_document():
    try:
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()

        q = (CourtfileDocument.query
             .options(
                 selectinload(CourtfileDocument.courtfile),
                 selectinload(CourtfileDocument.document)
             ))

        if role == "admin_user":
            pass  # ve todo
        elif role == "lawyer":
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == int(current_id)
            )
            q = q.filter(CourtfileDocument.courtfile_id.in_(subq))
        else:
            return jsonify({'error': 'forbidden'}), 403

        if requested_courtfile_id is not None:
            q = q.filter(CourtfileDocument.courtfile_id ==
                         requested_courtfile_id)

        rows = q.all()

        def iso_or_none(dt):
            return dt.isoformat() if dt else None

        out = []
        for cd in rows:
            d = cd.document
            cf = cd.courtfile
            # tolerar create_at vs created_at
            created = getattr(d, "created_at", None) or getattr(
                d, "create_at", None)

            out.append({
                "id": cd.id,
                "courtfile_id": cd.courtfile_id,
                "document_id": cd.document_id,

                "courtfile_number": getattr(cf, "case_number", None),
                "courtfile_title": getattr(cf, "title", None),

                "document_name": getattr(d, "name", None),
                "document_url": getattr(d, "url_route", None),

                # fechas
                "document_date": iso_or_none(getattr(d, "document_date", None)),
                "created_at": iso_or_none(created),

                # tipo / categoría / metadata
                # ej: 'application/pdf' o 'pdf'
                "document_type": getattr(d, "type", None),
                # si lo guardás aparte
                "mime_type": getattr(d, "mime_type", None),
                "original_filename": getattr(d, "original_filename", None),
                # <---- ¡LO NUEVO!
                "category": getattr(d, "category", None),
            })
        return jsonify(out), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/courtfile-document', methods=['POST'])
@jwt_required()
def create_courtfile_document():
    try:
        data = request.get_json() or {}

        courtfile_id = data.get('courtfile_id')
        document_id = data.get('document_id')
        if not courtfile_id or not document_id:
            return jsonify({'error': 'courtfile_id and document_id required'}), 400

        courtfile = Courtfile.query.get(courtfile_id)
        document = Document.query.get(document_id)
        if not courtfile or not document:
            return jsonify({'error': 'Courtfile or Document not found'}), 404

        role, current_id = _get_role_and_identity()
        if role == "admin_user":
            pass
        elif role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403  # client u otro rol

        existing = CourtfileDocument.query.filter_by(
            courtfile_id=courtfile_id,
            document_id=document_id
        ).first()
        if existing:
            return jsonify({'message': 'Relationship already exists'}), 200

        new_relation = CourtfileDocument(
            courtfile_id=courtfile_id,
            document_id=document_id
        )

        db.session.add(new_relation)
        db.session.commit()

        return jsonify({
            'message': 'Relationship created successfully',
            'id': new_relation.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/courtfile-document/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_courtfile_document(id):
    try:
        relation = CourtfileDocument.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()
        if role == "admin_user":
            pass
        elif role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(relation.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403  # client u otro rol

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ----------------- ROUTES PARA PAYMENTS --------------------------------------------
@api.route('/payments', methods=['POST'])
@jwt_required()
def create_payment():
    try:
        role, current_id = _get_role_and_identity()
        if not (_is_admin() or role == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        data = request.get_json() or {}
        required_fields = ['amount', 'currency', 'means']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        payment = Payment(
            amount=data['amount'],
            currency=data['currency'],
            means=data['means'],
            status="pending"
        )

        db.session.add(payment)

        # Lawyer: debe venir courtfile_id y estar vinculado; autolink
        if role == "lawyer":
            cf_id = data.get('courtfile_id')
            if not cf_id:
                return jsonify({'error': 'courtfile_id required for lawyer'}), 400
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(cf_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403
            db.session.add(PaymentCourtfile(
                payment_id=payment.id, courtfile_id=int(cf_id)))

        db.session.commit()
        return jsonify(payment.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/payments', methods=['GET'])
@jwt_required()
def get_payments():
    try:
        role, uid = _get_role_and_identity()

        if role == "admin_user":
            q = Payment.query
        elif role == "lawyer":
            q = (
                db.session.query(Payment)
                .join(PaymentCourtfile, PaymentCourtfile.payment_id == Payment.id)
                .join(LawyerCourtfile, LawyerCourtfile.courtfile_id == PaymentCourtfile.courtfile_id)
                .filter(LawyerCourtfile.lawyer_id == int(uid))
                .distinct()
                .order_by(Payment.created_at.desc())
            )
        elif role == "client":
            q = (
                db.session.query(Payment)
                .join(PaymentCourtfile, PaymentCourtfile.payment_id == Payment.id)
                .join(ClientCourtfile, ClientCourtfile.courtfile_id == PaymentCourtfile.courtfile_id)
                .filter(ClientCourtfile.client_id == int(uid))
                .distinct()
            )
        else:
            return jsonify({'error': 'forbidden'}), 403

        payments = q.all()
        return jsonify([p.serialize() for p in payments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/payments/<int:payment_id>', methods=['GET'])
@jwt_required()
def get_payment(payment_id):
    try:
        role, uid = _get_role_and_identity()
        payment = Payment.query.get_or_404(payment_id)

        if role == "admin_user":
            return jsonify(payment.serialize()), 200

        if role == "lawyer":
            linked = (
                db.session.query(PaymentCourtfile)
                .join(LawyerCourtfile, LawyerCourtfile.courtfile_id == PaymentCourtfile.courtfile_id)
                .filter(PaymentCourtfile.payment_id == payment_id,
                        LawyerCourtfile.lawyer_id == int(uid))
                .first()
            )
            if not linked:
                return jsonify({'error': 'forbidden'}), 403
            return jsonify(payment.serialize()), 200

        if role == "client":
            linked = (
                db.session.query(PaymentCourtfile)
                .join(ClientCourtfile, ClientCourtfile.courtfile_id == PaymentCourtfile.courtfile_id)
                .filter(PaymentCourtfile.payment_id == payment_id,
                        ClientCourtfile.client_id == int(uid))
                .first()
            )
            if not linked:
                return jsonify({'error': 'forbidden'}), 403
            return jsonify(payment.serialize()), 200

        return jsonify({'error': 'forbidden'}), 403

    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/payments/<int:payment_id>', methods=['PUT'])
@jwt_required()
def update_payment(payment_id):
    try:
        role, uid = _get_role_and_identity()
        payment = Payment.query.get_or_404(payment_id)

        if _is_admin() and 'status' in data:
            try:
                new_status = PaymentStatus(data['status'].lower())
            except Exception:
                return jsonify({'error': 'invalid status'}), 400
            payment.status = new_status
            if new_status == PaymentStatus.approved:
                payment.paid_at = datetime.now(UTC)
        elif role == "lawyer":
            linked = (
                db.session.query(PaymentCourtfile)
                .join(LawyerCourtfile, LawyerCourtfile.courtfile_id == PaymentCourtfile.courtfile_id)
                .filter(PaymentCourtfile.payment_id == payment_id,
                        LawyerCourtfile.lawyer_id == int(uid))
                .first()
            )
            if not linked:
                return jsonify({'error': 'forbidden'}), 403

            # 👇 comparación correcta con Enum
            if payment.status != PaymentStatus.pending:
                return jsonify({'error': 'Only pending payments can be edited by lawyer'}), 403
        else:
            return jsonify({'error': 'forbidden'}), 403

        data = request.get_json() or {}

        if 'amount' in data:
            payment.amount = data['amount']
        if 'currency' in data:
            payment.currency = data['currency']
        if 'means' in data:
            payment.means = data['means']

        # Solo admin puede cambiar status y siempre mapeando a Enum
        if _is_admin() and 'status' in data:
            try:
                # acepta "pending"/"approved"/etc. sin importar mayúsculas
                new_status = PaymentStatus(data['status'].lower())
            except Exception:
                return jsonify({'error': 'invalid status'}), 400
            payment.status = new_status
            if new_status == PaymentStatus.approved:
                payment.paid_at = datetime.now(UTC)

        db.session.commit()
        return jsonify(payment.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/payments/<int:payment_id>', methods=['DELETE'])
@jwt_required()
def delete_payment(payment_id):
    try:
        role, uid = _get_role_and_identity()
        payment = Payment.query.get_or_404(payment_id)

        if _is_admin():
            pass  # admin borra siempre
        elif role == "lawyer":
            # lawyer: sólo si está vinculado y pending
            linked = (
                db.session.query(PaymentCourtfile)
                .join(LawyerCourtfile, LawyerCourtfile.courtfile_id == PaymentCourtfile.courtfile_id)
                .filter(PaymentCourtfile.payment_id == payment_id,
                        LawyerCourtfile.lawyer_id == int(uid))
                .first()
            )
            if not linked:
                return jsonify({'error': 'forbidden'}), 403
            if payment.status != PaymentStatus.pending:
                return jsonify({'error': 'Only pending payments can be deleted by lawyer'}), 403

        else:
            return jsonify({'error': 'forbidden'}), 403

        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': 'Payment successfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ----------------- ROUTES PARA PAYMENTS COURTFILE --------------------------------------------
@api.route('/payments-courtfile', methods=['POST'])
@jwt_required()
def create_payment_courtfile():
    try:
        role, current_id = _get_role_and_identity()
        if not (_is_admin() or role == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        data = request.get_json() or {}
        required_fields = ['payment_id', 'courtfile_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        payment = Payment.query.get(data['payment_id'])
        courtfile = Courtfile.query.get(data['courtfile_id'])
        if not payment or not courtfile:
            return jsonify({'error': 'Payment or Courtfile not found'}), 404

        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(data['courtfile_id'])
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403

        exists = PaymentCourtfile.query.filter_by(
            payment_id=data['payment_id'],
            courtfile_id=data['courtfile_id']
        ).first()
        if exists:
            return jsonify(exists.serialize()), 200

        payment_courtfile = PaymentCourtfile(
            payment_id=data['payment_id'],
            courtfile_id=data['courtfile_id']
        )

        db.session.add(payment_courtfile)
        db.session.commit()
        return jsonify(payment_courtfile.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


from sqlalchemy.orm import joinedload

@api.route('/payments-courtfile', methods=['GET'])
@jwt_required()
def get_payments_courtfile():
    try:
        courtfile_id = request.args.get('courtfile_id', type=int)
        expand_raw = request.args.get('expand', default='')
        expand = {s.strip().lower() for s in expand_raw.split(',')} if expand_raw else set()

        role, current_id = _get_role_and_identity()
        query = PaymentCourtfile.query

        if role == "lawyer":
            query = (
                query.join(LawyerCourtfile, LawyerCourtfile.courtfile_id == PaymentCourtfile.courtfile_id)
                .filter(LawyerCourtfile.lawyer_id == int(current_id))
            )

        elif role == "client":
            subq = db.session.query(ClientCourtfile.courtfile_id).filter(
                ClientCourtfile.client_id == int(current_id)
            ).subquery()
            query = query.filter(PaymentCourtfile.courtfile_id.in_(subq))

        elif role == "admin_user":
            pass
        else:
            return jsonify({'error': 'forbidden'}), 403

        if courtfile_id is not None:
            query = query.filter(PaymentCourtfile.courtfile_id == courtfile_id)

        if 'payment' in expand:
            query = query.options(joinedload(PaymentCourtfile.payment))

        # 👇 join con Courtfile para traer también su número
        query = (
            query.join(Payment, Payment.id == PaymentCourtfile.payment_id)
                 .join(Courtfile, Courtfile.id == PaymentCourtfile.courtfile_id)
                 .order_by(Payment.created_at.desc())
        )

        pcs = query.all()

        result = []
        for pc in pcs:
            item = pc.serialize()
            if 'payment' in expand and pc.payment:
                item['payment'] = pc.payment.serialize()
            # 👇 agregamos número de expediente
            if pc.courtfile:
                item['courtfile_number'] = pc.courtfile.case_number
            result.append(item)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@api.route('/payments-courtfile/<int:id>', methods=['GET'])
@jwt_required()
def get_payment_courtfile(id):
    try:
        pc = PaymentCourtfile.query.get_or_404(id)

        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(pc.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403

        if role == "client":
            linked = ClientCourtfile.query.filter_by(
                client_id=int(current_id), courtfile_id=int(pc.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403

        return jsonify(pc.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/payments-courtfile/<int:id>', methods=['PUT'])
@jwt_required()
def update_payment_courtfile(id):
    try:
        role, current_id = _get_role_and_identity()
        if not (_is_admin() or role == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        payment_courtfile = PaymentCourtfile.query.get_or_404(id)
        data = request.get_json() or {}

        if role == "lawyer":
            linked_old = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(payment_courtfile.courtfile_id)
            ).first()
            if not linked_old:
                return jsonify({'error': 'Forbidden'}), 403

        if 'payment_id' in data:
            payment = Payment.query.get(data['payment_id'])
            if not payment:
                return jsonify({'error': 'Payment not found'}), 404
            payment_courtfile.payment_id = data['payment_id']

        if 'courtfile_id' in data:
            cf = Courtfile.query.get(data['courtfile_id'])
            if not cf:
                return jsonify({'error': 'Courtfile not found'}), 404
            if role == "lawyer":
                linked_new = LawyerCourtfile.query.filter_by(
                    lawyer_id=int(current_id), courtfile_id=int(data['courtfile_id'])
                ).first()
                if not linked_new:
                    return jsonify({'error': 'Forbidden for target courtfile'}), 403
            payment_courtfile.courtfile_id = data['courtfile_id']

        db.session.commit()
        return jsonify(payment_courtfile.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/payments-courtfile/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_payment_courtfile(id):
    try:
        role, current_id = _get_role_and_identity()
        if not (_is_admin() or role == "lawyer"):
            return jsonify({'error': 'forbidden'}), 403

        payment_courtfile = PaymentCourtfile.query.get_or_404(id)

        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(payment_courtfile.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403

        db.session.delete(payment_courtfile)
        db.session.commit()
        return jsonify({'message': 'PaymentCourtfile successfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------------------RUTAS MENSAJES-----------------------------------------------------
def _parse_iso(ts: str):
    """
    Acepta:
      - 2025-09-19T16:30:00Z   (UTC)
      - 2025-09-19T16:30:00+00:00
      - 2025-09-19T16:30:00    (lo tratamos como UTC)
    Devuelve datetime timezone-aware (UTC).
    """
    if not ts:
        return None
    ts = ts.strip()
    try:
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        dt = datetime.fromisoformat(ts)
        if dt.tzinfo is None:
            # Si vino naive, asumimos UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


@api.route("/messages", methods=["GET"])
@jwt_required()
def list_messages():
    courtfile_id = request.args.get("courtfile_id", type=int)
    if not courtfile_id:
        return jsonify({"error": "courtfile_id requerido"}), 400

    role, current_id = _get_role_and_identity()

    # 🔒 Permisos
    if not _is_admin():
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=courtfile_id
            ).first()
            if not linked:
                return jsonify({"error": "forbidden"}), 403
        elif role == "client":
            linked = ClientCourtfile.query.filter_by(
                client_id=int(current_id), courtfile_id=courtfile_id
            ).first()
            if not linked:
                return jsonify({"error": "forbidden"}), 403

    since_str = request.args.get("since")
    q = Message.query.filter(Message.id_courtfile == courtfile_id)
    if since_str:
        since_dt = _parse_iso(since_str)
        if since_dt:
            q = q.filter(Message.created_at > since_dt)

    rows = q.order_by(Message.created_at.asc()).limit(100).all()
    return jsonify([m.to_front_dict() for m in rows]), 200


@api.route("/messages", methods=["POST"])
@jwt_required()
def create_message():
    data = request.get_json() or {}
    cfid = data.get("courtfile_id")
    text = (data.get("text") or "").strip()
    role, current_id = _get_role_and_identity()

    if not cfid or not text:
        return jsonify({"error": "courtfile_id y text requeridos"}), 400

    # 🔒 Permisos
    if not _is_admin():
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=cfid
            ).first()
            if not linked:
                return jsonify({"error": "forbidden"}), 403
        elif role == "client":
            linked = ClientCourtfile.query.filter_by(
                client_id=int(current_id), courtfile_id=cfid
            ).first()
            if not linked:
                return jsonify({"error": "forbidden"}), 403

    msg = Message(
        id_courtfile=cfid,
        texto=text,
        sender=role,
        lawyer_id=(current_id if role == "lawyer" else None),
        client_id=(current_id if role == "client" else None),
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_front_dict()), 201


@api.route("/messages/unread", methods=["GET"])
@jwt_required()
def unread_counts():
    role, current_id = _get_role_and_identity()
    ids_str = (request.args.get("courtfile_ids") or "").strip()
    if not ids_str:
        return jsonify({"error": "courtfile_ids requeridos"}), 400

    try:
        cfids = [int(x) for x in ids_str.split(",") if x.strip().isdigit()]
    except Exception:
        return jsonify({"error": "courtfile_ids inválidos"}), 400

    if not cfids:
        return jsonify({})

    # 🔒 Permisos: limitar cfids
    if not _is_admin():
        if role == "lawyer":
            linked_ids = db.session.query(LawyerCourtfile.courtfile_id).filter_by(
                lawyer_id=int(current_id)
            ).all()
            allowed_ids = {cid for (cid,) in linked_ids}
        elif role == "client":
            linked_ids = db.session.query(ClientCourtfile.courtfile_id).filter_by(
                client_id=int(current_id)
            ).all()
            allowed_ids = {cid for (cid,) in linked_ids}
        else:
            return jsonify({"error": "forbidden"}), 403
        cfids = [cid for cid in cfids if cid in allowed_ids]

    if not cfids:
        return jsonify({})

    # subquery con last_read por cfid
    last_read_sq = (
        select(ChatRead.id_courtfile, ChatRead.last_read_at)
        .where(and_(ChatRead.role == role, ChatRead.user_id == current_id, ChatRead.id_courtfile.in_(cfids)))
        .subquery()
    )

    # Mensajes “del otro lado”
    msgs = (
        select(
            Message.id_courtfile.label("cfid"),
            func.count(Message.id).label("cnt")
        )
        .outerjoin(last_read_sq, last_read_sq.c.id_courtfile == Message.id_courtfile)
        .where(
            and_(
                Message.id_courtfile.in_(cfids),
                Message.sender != role,
                or_(
                    last_read_sq.c.last_read_at.is_(None),
                    Message.created_at > last_read_sq.c.last_read_at,
                ),
            )
        )
        .group_by(Message.id_courtfile)
    )
    rows = db.session.execute(msgs).all()
    counts_by_cfid = {cfid: 0 for cfid in cfids}
    for cfid, cnt in rows:
        counts_by_cfid[int(cfid)] = int(cnt)

    # última actividad
    last_msg_sq = (
        select(
            Message.id_courtfile.label("cfid"),
            func.max(Message.created_at).label("last_message_at")
        )
        .where(Message.id_courtfile.in_(cfids))
        .group_by(Message.id_courtfile)
    )
    last_rows = db.session.execute(last_msg_sq).all()
    last_by_cfid = {int(cfid): ts for cfid, ts in last_rows}

    resp = {}
    for cfid in cfids:
        c = counts_by_cfid.get(cfid, 0)
        ts = last_by_cfid.get(cfid)
        resp[str(cfid)] = {
            "hasUnread": c > 0,
            "count": min(c, 99),
            "last_message_at": (ts.isoformat() if ts else None),
        }

    return jsonify(resp), 200


@api.route("/messages/read", methods=["POST"])
@jwt_required()
def mark_read():
    data = request.get_json() or {}
    cfid = data.get("courtfile_id")
    until = data.get("until")

    role, current_id = _get_role_and_identity()

    if not cfid:
        return jsonify({"error": "courtfile_id requerido"}), 400

    # 🔒 Permisos
    if not _is_admin():
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=cfid
            ).first()
            if not linked:
                return jsonify({"error": "forbidden"}), 403
        elif role == "client":
            linked = ClientCourtfile.query.filter_by(
                client_id=int(current_id), courtfile_id=cfid
            ).first()
            if not linked:
                return jsonify({"error": "forbidden"}), 403

    if until:
        try:
            ts = datetime.fromisoformat(until.replace("Z", "+00:00"))
        except Exception:
            return jsonify({"error": "until debe ser ISO8601"}), 400
    else:
        ts = datetime.now(timezone.utc)

    row = ChatRead.query.filter_by(
        id_courtfile=cfid, role=role, user_id=current_id
    ).first()
    if row:
        if ts > row.last_read_at:
            row.last_read_at = ts
    else:
        row = ChatRead(id_courtfile=cfid, role=role,
                       user_id=current_id, last_read_at=ts)
        db.session.add(row)

    db.session.commit()
    return jsonify({"ok": True, "courtfile_id": cfid, "last_read_at": row.last_read_at.isoformat()}), 200


# ------------------------------STRIPE PAYMENT-----------------------------------------------------


@api.route("/payments/<int:paymentId>/create-checkout-session", methods=["POST"])
@jwt_required()
def create_checkout_session(paymentId):
    try:
        payment = Payment.query.get(paymentId)

        if not payment:
            return jsonify({'error': 'Payment not found'}), 404

        if payment.status == PaymentStatus.processing:
            if payment.updated_at:
                time_in_processing = datetime.utcnow() - payment.updated_at
                if time_in_processing > timedelta(minutes=30):
                    payment.status = PaymentStatus.pending
                    payment.stripe_payment_intent_id = None
                    db.session.commit()
                    print(
                        f"Payment {paymentId} reset from processing to pending (timeout 30min)")
                else:
                    remaining_time = timedelta(minutes=30) - time_in_processing
                    remaining_minutes = int(
                        remaining_time.total_seconds() / 60)
                    return jsonify({
                        'error': f'Payment is already being processed. Please wait {remaining_minutes} minutes or try again later.'
                    }), 400
            else:
                if payment.created_at:
                    time_in_processing = datetime.utcnow() - payment.created_at
                    if time_in_processing > timedelta(minutes=30):
                        payment.status = PaymentStatus.pending
                        payment.stripe_payment_intent_id = None
                        db.session.commit()
                        print(
                            f"Payment {paymentId} reset from processing to pending (timeout 30min - fallback)")
                    else:
                        return jsonify({
                            'error': 'Payment is already being processed. Please try again in 30 minutes.'
                        }), 400
                else:
                    payment.status = PaymentStatus.pending
                    payment.stripe_payment_intent_id = None
                    db.session.commit()
                    print(
                        f"Payment {paymentId} reset from processing to pending (no timestamp)")

        if payment.status == PaymentStatus.approved:
            return jsonify({
                'error': 'Payment is already approved. Cannot proceed with checkout.'
            }), 400

        courtfile_name = f"LexQuo Payment {paymentId}"
        payment_courtfile = PaymentCourtfile.query.filter_by(
            payment_id=paymentId
        ).first()

        if payment_courtfile:
            courtfile = Courtfile.query.get(payment_courtfile.courtfile_id)
            if courtfile:
                courtfile_name = courtfile.case_number or courtfile.title or f"Case {courtfile.id}"

        product_name = f"LexQuo - Case {courtfile_name}"

        session = stripe.checkout.Session.create(
            line_items=[{
                'price_data': {
                    'currency': payment.currency.lower() if payment.currency else 'usd',
                    'product_data': {
                        'name': product_name,
                    },
                    'unit_amount': int(float(payment.amount) * 100)
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='https://congenial-acorn-57j7rv6jjx2vq49-3000.app.github.dev/payments',
            cancel_url='https://congenial-acorn-57j7rv6jjx2vq49-3000.app.github.dev/',
            metadata={
                'payment_id': str(payment.id),
                'courtfile_id': str(payment_courtfile.courtfile_id) if payment_courtfile else 'none'
            }
        )

        payment.status = PaymentStatus.processing
        payment.stripe_payment_intent_id = session.payment_intent
        payment.updated_at = datetime.utcnow()

        db.session.commit()

        print(
            f"Payment {paymentId} set to processing, Stripe ID: {session.payment_intent}")

        return jsonify({
            "url": session.url,
            "session_id": session.id,
            "payment_intent": session.payment_intent,
            "product_name": product_name
        })

    except stripe.error.StripeError as e:
        print(f"Stripe error in create-checkout-session: {e}")
        db.session.rollback()
        return jsonify({"error": f"Stripe error: {str(e)}"}), 400
    except Exception as e:
        print(f"Unexpected error in create-checkout-session: {e}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


@api.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data(as_text=True)
    print("Payload:")
    print(payload)
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        return jsonify(success=False), 400
    except stripe.error.SignatureVerificationError as e:
        return jsonify(success=False), 400
    print("Evento:")
    print(event)
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        try:
            payment_intent_id = session.get('payment_intent')
            payment_id = session.get('metadata', {}).get('payment_id')
            courtfile_id = session.get('metadata', {}).get('courtfile_id')

            print(
                f'Checkout completed - Payment ID: {payment_id}, Intent ID: {payment_intent_id}, Courtfile ID: {courtfile_id}')

            if payment_id:
                payment = Payment.query.get(int(payment_id))
                if payment:
                    payment.status = PaymentStatus.approved
                    payment.paid_at = datetime.utcnow()
                    payment.means = 'TDC'
                    payment.stripe_payment_intent_id = payment_intent_id

                    db.session.commit()

        except Exception as e:
            db.session.rollback()

    elif event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        try:
            payment_intent_id = payment_intent['id']
            metadata = payment_intent.get('metadata', {})
            payment_id = metadata.get('payment_id')

            print(
                f'Payment intent succeeded - Payment ID: {payment_id}, Intent ID: {payment_intent_id}')

            if payment_id:
                payment = Payment.query.filter_by(
                    stripe_payment_intent_id=payment_intent_id).first()
                if payment and payment.status != PaymentStatus.approved:
                    payment.status = PaymentStatus.approved
                    payment.paid_at = datetime.utcnow()
                    payment.means = 'TDC'

                    db.session.commit()
                    print(
                        f'Pago {payment_id} marcado como aprobado via payment_intent')

        except Exception as e:
            db.session.rollback()

    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        try:
            payment_intent_id = payment_intent['id']
            metadata = payment_intent.get('metadata', {})
            payment_id = metadata.get('payment_id')

            print(
                f'🔴 Payment intent failed - Payment ID: {payment_id}, Intent ID: {payment_intent_id}')
            print(f'Metadata del payment_intent: {metadata}')

            payment = None

            if payment_id:
                payment = Payment.query.get(payment_id)
                if payment:
                    print(f'✅ Encontrado pago {payment.id} por metadata')

            if not payment:
                print("Buscando en pagos recientes en estado processing...")
                recent_payments = Payment.query.filter(
                    Payment.status == PaymentStatus.processing or Payment.status == PaymentStatus.rejected,
                    Payment.created_at >= datetime.utcnow() - timedelta(hours=24)
                ).order_by(Payment.created_at.desc()).all()

                print(
                    f"Encontrados {len(recent_payments)} pagos recientes en processing")

                if recent_payments:
                    payment = recent_payments[0]
                    print(f'✅ Usando pago más reciente: {payment.id}')

            if not payment:
                print("Creando nuevo registro de pago fallido...")
                amount = payment_intent['amount'] / 100
                currency = payment_intent['currency']

                payment = Payment(
                    amount=amount,
                    currency=currency.upper(),
                    status=PaymentStatus.rejected,
                    means='TDC',
                    stripe_payment_intent_id=payment_intent_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.session.add(payment)
                print(f'Creado nuevo pago fallido: {payment.id}')

            payment.status = PaymentStatus.rejected
            payment.stripe_payment_intent_id = payment_intent_id  # ⚠️ GUARDAR EL ID AQUÍ
            payment.updated_at = datetime.utcnow()

            # Guardar información del error para debugging
            last_error = payment_intent.get('last_payment_error', {})
            payment.error_message = f"{last_error.get('code', 'unknown')}: {last_error.get('message', 'Unknown error')}"

            db.session.commit()

        except Exception as e:
            db.session.rollback()

    else:
        print(f'Unhandled event type: {event["type"]}')
    return jsonify(success=True)


# ===================== RUTAS PARA MAILS ======================
from urllib.parse import quote as _urlq
from flask import current_app

def _cap(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


@api.route("/emails/invite", methods=["POST"])
@jwt_required()
def send_invite_email():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    firstname = (data.get("firstname") or "").strip()
    lastname = (data.get("lastname") or "").strip()
    cf_number = data.get("courtfile_number")  # opcional
    cf_id = data.get("courtfile_id")          # opcional

    if not email or not firstname or not lastname:
        return jsonify({"error": "email, firstname y lastname son obligatorios"}), 400

    # 🔒 Permisos
    role, current_id = _get_role_and_identity()
    if not _is_admin():
        if role != "lawyer":
            return jsonify({"error": "forbidden"}), 403
        if cf_id:
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(cf_id)
            ).first()
            if not linked:
                return jsonify({"error": "forbidden"}), 403

    default_pwd = f"LexQuo{_cap(firstname)}{_cap(lastname)}"

    base = _base_url()
    invite_url = f"{base}/accept-invite?email={_urlq(email)}"
    if cf_id:
        invite_url += f"&courtfile_id={cf_id}"

    subject = "Invitación a LexQuo"

    # Render desde la plantilla HTML ya compilada (MJML→HTML)
    html = render_email_template(
        "invite_template.html",
        firstname=firstname,
        lastname=lastname,
        email=email,
        default_pwd=default_pwd,
        invite_url=invite_url,
        courtfile_number=cf_number or ""
    )

    try:
        send_email(
            to_email=email,
            subject=subject,
            html_body=html,
            timeout_seconds=12,  # evita colgar el worker si el SMTP no responde
        )
        return jsonify({"ok": True, "sent_to": email})
    except Exception as e:
        current_app.logger.exception("Error al enviar correo (invite)")
        return jsonify({"error": str(e)}), 500


@api.route("/emails/linked", methods=["POST"])
@jwt_required()
def send_linked_email():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    firstname = (data.get("firstname") or "").strip()
    lastname = (data.get("lastname") or "").strip()
    cf_number = data.get("courtfile_number")  # opcional
    cf_id = data.get("courtfile_id")          # opcional

    if not email or not firstname or not lastname:
        return jsonify({"error": "email, firstname y lastname son obligatorios"}), 400

    # 🔒 Permisos
    role, current_id = _get_role_and_identity()
    if not _is_admin():
        if role != "lawyer":
            return jsonify({"error": "forbidden"}), 403
        if cf_id:
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(cf_id)
            ).first()
            if not linked:
                return jsonify({"error": "forbidden"}), 403

    base = _base_url()
    case_url = f"{base}/courtfiles/{cf_id}" if cf_id else base
    subject = f"Acceso habilitado en LexQuo{f' – Expediente #{cf_number}' if cf_number else ''}"

    html = render_email_template(
        "linked_template.html",
        firstname=firstname,
        lastname=lastname,
        courtfile_number=cf_number or "",
        case_url=case_url
    )

    try:
        send_email(
            to_email=email,
            subject=subject,
            html_body=html,
            timeout_seconds=12,  # igual que arriba
        )
        return jsonify({"ok": True, "sent_to": email})
    except Exception as e:
        current_app.logger.exception("Error al enviar correo (linked)")
        return jsonify({"error": str(e)}), 500


# =================LOGIN GENERAL =====================================


@api.route('/auth/login', methods=['POST'])
def unified_login():
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400

        # Buscar en las tres tablas
        admin = AdminUser.query.filter_by(email=email).first()
        lawyer = Lawyer.query.filter_by(email=email).first()
        client = Client.query.filter_by(email=email).first()

        # Si aparece en más de una, conflicto explícito
        found = [x for x in (admin, lawyer, client) if x is not None]
        if len(found) > 1:
            return jsonify({'error': 'Email is linked to multiple roles'}), 409

        # Determinar user/role
        if admin:
            user, role = admin, 'admin_user'
        elif lawyer:
            user, role = lawyer, 'lawyer'
        elif client:
            user, role = client, 'client'
        else:
            return jsonify({'error': 'Invalid credentials'}), 401

        # Password
        if not check_password_hash(user.password, password):
            return jsonify({'error': 'Invalid credentials'}), 401

        # is_active si existe
        if hasattr(user, 'is_active') and user.is_active is False:
            return jsonify({'error': 'Account deactivated'}), 403

        # JWT con claim de role
        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": role}
        )

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'role': role,
            'user': user.serialize()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/auth/me', methods=['GET'])
@jwt_required()
def auth_me():
    jwt = get_jwt()
    role = jwt.get("role")
    user_id = get_jwt_identity()

    if not role or not user_id:
        return jsonify({"error": "Invalid token"}), 401

    if role == "lawyer":
        user = Lawyer.query.get(int(user_id))
    elif role == "client":
        user = Client.query.get(int(user_id))
    elif role == "admin_user":
        user = AdminUser.query.get(int(user_id))

    if not user or getattr(user, "is_active", True) is False:
        return jsonify({"error": "User not found or deactivated"}), 404

    return jsonify({"role": role, "user": user.serialize()}), 200
