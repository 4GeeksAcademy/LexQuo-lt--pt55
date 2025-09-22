"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
import cloudinary
import cloudinary.uploader
import stripe
from urllib.parse import urlencode
from sqlalchemy import select, func
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import Courtfile, PaymentCourtfile, db, Lawyer, Client, AdminUser, Deadlines, Appointment, Document, ClientCourtfile, DeadlineCourtfile, LawyerCourtfile, AppointmentCourtfile, LawyerClient, CourtfileDocument, Payment, Message
from api.utils import generate_sitemap, APIException
from datetime import datetime, UTC, timedelta
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.orm import joinedload



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


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200

# -----------------ROUTES PARA COURTFILES--------------------------------------------


@api.route('/courtfiles', methods=['GET'])
def get_courtfiles():
    try:
        courtfiles = Courtfile.query.all()
        return jsonify([courtfile.serialize() for courtfile in courtfiles]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/courtfiles/<int:courtfile_id>', methods=['GET'])
def get_courtfile(courtfile_id):
    try:
        courtfile = Courtfile.query.get_or_404(courtfile_id)
        return jsonify(courtfile.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/courtfiles', methods=['POST'])
def create_courtfile():
    try:
        data = request.get_json()

        required_fields = ['case_number', 'title',
                           'description', 'jurisdiction', 'court', 'status']
        for field in required_fields:
            if field not in data:
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
def update_courtfile(courtfile_id):
    try:
        courtfile = Courtfile.query.get_or_404(courtfile_id)
        data = request.get_json()

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
def delete_courtfile(courtfile_id):
    try:
        courtfile = Courtfile.query.get_or_404(courtfile_id)

        db.session.delete(courtfile)
        db.session.commit()

        return jsonify({'message': 'Courtfile succesfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# -----------------ROUTES PARA LAWYER's--------------------------------------------


@api.route('/lawyers', methods=['GET'])
def get_lawyers():
    try:
        lawyers = Lawyer.query.all()
        return jsonify([lawyer.serialize() for lawyer in lawyers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers/<int:lawyer_id>', methods=['GET'])
def get_lawyer(lawyer_id):
    try:
        lawyer = Lawyer.query.get_or_404(lawyer_id)
        return jsonify(lawyer.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/lawyers/lookup', methods=['GET'])
@jwt_required(optional=True)
def lookup_lawyer_by_email():
    try:
        email = (request.args.get('email') or '').strip().lower()
        if not email:
            return jsonify({'error': 'email required'}), 400

        lawyer = Lawyer.query.filter(func.lower(Lawyer.email) == email).first()
        if not lawyer:
            return jsonify({'found': False}), 200

        return jsonify({'found': True, 'lawyer': lawyer.serialize()}), 200
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
def update_lawyer(lawyer_id):
    try:
        lawyer = Lawyer.query.get_or_404(lawyer_id)

        data = request.form
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

        if 'email' in data:
            new_email = (data.get('email') or '').strip().lower()
            if new_email != lawyer.email:
                existing = Lawyer.query.filter_by(email=new_email).first()
                if existing:
                    return jsonify({'error': 'Email already exists'}), 409
            lawyer.email = new_email

        if 'firstname' in data:
            lawyer.firstname = data['firstname']

        if 'lastname' in data:
            lawyer.lastname = data['lastname']

        if 'phone' in data:
            lawyer.phone = data['phone']

        if 'is_active' in data:
            lawyer.is_active = data['is_active'].lower() in ['true', '1']

        if 'password' in data and data['password']:
            lawyer.password = generate_password_hash(data['password'])

        db.session.commit()

        return jsonify(lawyer.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers/<int:lawyer_id>', methods=['DELETE'])
def delete_lawyer(lawyer_id):
    try:
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
            'role': 'lawyer',
            'lawyer': lawyer.serialize()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA CLIENTS--------------------------------------------
@api.route('/clients', methods=['GET'])
def get_clients():
    try:
        clients = Client.query.all()
        return jsonify([client.serialize() for client in clients]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/clients/<int:client_id>', methods=['GET'])
def get_client(client_id):
    try:
        client = Client.query.get_or_404(client_id)
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
        if not client:
            return jsonify({'found': False}), 200

        return jsonify({'found': True, 'client': client.serialize()}), 200
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
def update_client(client_id):
    try:

        client = Client.query.get_or_404(client_id)

        data = request.form
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

        if 'email' in data:
            if data['email'] != client.email:
                existing = Client.query.filter_by(email=data['email']).first()
                if existing:
                    return jsonify({'error': 'Email already exists'}), 409
            client.email = data['email']

        if 'firstname' in data:
            client.firstname = data['firstname']

        if 'lastname' in data:
            client.lastname = data['lastname']

        if 'phone' in data:
            client.phone = data['phone']

        if 'is_active' in data:
            client.is_active = bool(data['is_active'])

        if 'password' in data:
            client.password = generate_password_hash(data['password'])

        db.session.commit()

        return jsonify(client.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    try:
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
            'role': 'client',
            'client': client.serialize()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -----------------ROUTES PARA COURTFILES, APPOINTMENTS Y DOCUMENTS DEL CLIENT--------------------------------------------


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
                                          db.joinedload(
                                              AppointmentCourtfile.appointment),
                                          db.joinedload(
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
def get_admins():
    try:
        admins = AdminUser.query.all()
        return jsonify([admin.serialize() for admin in admins]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/admins/<int:admin_id>', methods=['GET'])
def get_admin(admin_id):
    try:
        admin = AdminUser.query.get_or_404(admin_id)
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
def update_admin(admin_id):
    try:
        admin = AdminUser.query.get_or_404(admin_id)
        data = request.get_json()

        if 'email' in data:
            if data['email'] != admin.email:
                existing = AdminUser.query.filter_by(
                    email=data['email']).first()
                if existing:
                    return jsonify({'error': 'Email already exists'}), 409
            admin.email = data['email']

        if 'firstname' in data:
            admin.firstname = data['firstname']

        if 'lastname' in data:
            admin.lastname = data['lastname']

        if 'is_active' in data:
            admin.is_active = bool(data['is_active'])

        if 'password' in data:
            admin.password = generate_password_hash(data['password'])

        db.session.commit()

        return jsonify(admin.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/admins/<int:admin_id>', methods=['DELETE'])
def delete_admin(admin_id):
    try:
        admin = AdminUser.query.get_or_404(admin_id)

        db.session.delete(admin)
        db.session.commit()

        return jsonify({'message': 'Admin user successfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA APPOINTMENTS--------------------------------------------

@api.route('/appointments', methods=['GET'])
def get_appointments():
    appointments = Appointment.query.order_by(
        Appointment.date, Appointment.starts_at).all()
    return jsonify([appt.serialize() for appt in appointments])


@api.route('/appointments/<int:appointment_id>', methods=['GET'])
def get_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    return jsonify(appointment.serialize()), 200


@api.route('/appointments', methods=['POST'])
def create_appointment():
    try:
        data = request.get_json()

        required_fields = ['title', 'date', 'starts_at', 'location', 'ends_at']
        missing_fields = validate_required_fields(data, required_fields)

        if missing_fields:
            return create_error_response(
                f'Required fields are missing: {", ".join(missing_fields)}'
            )

        appointment_date = parse_iso_date(data['date'])
        if not appointment_date:
            return create_error_response(
                'Invalid date format. Use YYYY-MM-DD (e.g., 2024-01-15)'
            )

        if not is_valid_24h_time(data['starts_at']):
            return create_error_response(
                'Invalid start time format. Use HH:MM in 24h format (e.g., 09:30 or 14:45)'
            )

        if not is_valid_24h_time(data['ends_at']):
            return create_error_response(
                'Invalid end time format. Use HH:MM in 24h format (e.g., 09:30 or 14:45)'
            )

        start_time = parse_24h_time(data['starts_at'])
        end_time = parse_24h_time(data['ends_at'])

        if not validate_time_order(start_time, end_time):
            return create_error_response(
                'Start time must be before end time'
            )

        latitud = None
        longitud = None

        if 'latitud' in data:
            try:
                latitud = float(data['latitud'])
                if not (-90 <= latitud <= 90):
                    return create_error_response('Latitude must be between -90 and 90')
            except (ValueError, TypeError):
                return create_error_response('Latitude must be a valid number')

        if 'longitud' in data:
            try:
                longitud = float(data['longitud'])
                if not (-180 <= longitud <= 180):
                    return create_error_response('Longitude must be between -180 and 180')
            except (ValueError, TypeError):
                return create_error_response('Longitude must be a valid number')

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

        return jsonify(new_appointment.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return create_error_response(f'Error interno del servidor: {str(e)}', 500)


@api.route('/appointments/<int:id>', methods=['PUT'])
def update_appointment(id):
    try:
        appointment = Appointment.query.get_or_404(id)
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
            try:
                latitud = float(data['latitud'])
                if not (-90 <= latitud <= 90):
                    return create_error_response('Latitude must be between -90 and 90')
                appointment.latitud = latitud
            except (ValueError, TypeError):
                return create_error_response('Latitude must be a valid number')

        if 'longitud' in data:
            try:
                longitud = float(data['longitud'])
                if not (-180 <= longitud <= 180):
                    return create_error_response('Longitude must be between -180 and 180')
                appointment.longitud = longitud
            except (ValueError, TypeError):
                return create_error_response('Longitude must be a valid number')

        if not validate_time_order(appointment.starts_at, appointment.ends_at):
            return create_error_response('Start time must be before end time')

        db.session.commit()

        return jsonify(appointment.serialize())

    except Exception as e:
        db.session.rollback()
        return create_error_response(f'Server error: {str(e)}', 500)


@api.route('/appointments/<int:id>', methods=['DELETE'])
def delete_appointment(id):
    appointment = Appointment.query.get_or_404(id)
    db.session.delete(appointment)
    db.session.commit()
    return jsonify({'message': 'Appointment eliminado exitosamente'})
# -----------------ROUTES PARA DEADLINES--------------------------------------------


@api.route('/deadlines', methods=['GET'])
def get_deadlines():
    try:
        deadlines = Deadlines.query.all()
        return jsonify([deadline.serialize() for deadline in deadlines]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/deadlines/<int:deadline_id>', methods=['GET'])
def get_deadline(deadline_id):
    try:
        deadline = Deadlines.query.get_or_404(deadline_id)
        return jsonify(deadline.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/deadlines', methods=['POST'])
def create_deadline():
    try:
        data = request.get_json()

        required_fields = ['deadline_type',
                           'deadline_date', 'deadline_hour', 'priority']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

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
            priority=data['priority'],
        )

        db.session.add(deadline)
        db.session.commit()

        return jsonify(deadline.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/deadlines/<int:deadline_id>', methods=['PUT'])
def update_deadline(deadline_id):
    try:
        deadline = Deadlines.query.get_or_404(deadline_id)
        data = request.get_json()

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
def delete_deadline(deadline_id):
    try:
        deadline = Deadlines.query.get_or_404(deadline_id)

        db.session.delete(deadline)
        db.session.commit()

        return jsonify({'message': 'Deadline successfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA DOCUMENTS--------------------------------------------

@api.route('/documents', methods=['GET'])
def get_documents():
    try:
        documents = Document.query.all()
        return jsonify([document.serialize() for document in documents]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/documents/<int:document_id>', methods=['GET'])
def get_document(document_id):
    try:
        document = Document.query.get_or_404(document_id)
        return jsonify(document.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/documents', methods=['POST'])
def create_document():
    try:
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
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''

            if not file_extension or file_extension not in allowed_extensions:
                return jsonify({'error': 'File type not allowed'}), 400

            resource_type = "raw" if file_extension in [
                'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'
            ] else "auto"

            upload_result = cloudinary.uploader.upload(   # <— antes fallaba porque file=None
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
def update_document(document_id):
    try:
        document = Document.query.get_or_404(document_id)

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
                document.original_filename if hasattr(document, 'original_filename') else None
            )  
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating document: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/documents/<int:document_id>', methods=['DELETE'])
def delete_document(document_id):
    try:
        document = Document.query.get_or_404(document_id)

        db.session.delete(document)
        db.session.commit()

        return jsonify({'message': 'Document succesfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# -----------------ROUTES PARA CLIENTS-COURTFILES--------------------------------------------


@api.route('/clients-courtfiles', methods=['GET'])
@jwt_required(optional=True)
def get_client_courtfiles():
    try:
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            requested_lawyer_id = int(current_id)

        q = ClientCourtfile.query.options(
            joinedload(ClientCourtfile.client),
            joinedload(ClientCourtfile.courtfile)
        )

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
            'courtfile_number': cc.courtfile.case_number if cc.courtfile else None,
            'courtfile_title': cc.courtfile.title if cc.courtfile else None
        } for cc in client_courtfiles]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/clients-courtfiles', methods=['POST'])
@jwt_required(optional=True)
def create_client_courtfile():
    try:
        data = request.get_json() or {}
        client_id = data.get('client_id')
        courtfile_id = data.get('courtfile_id')
        if not client_id or not courtfile_id:
            return jsonify({'error': 'client_id and courtfile_id required'}), 400

        client = Client.query.get(client_id)
        courtfile = Courtfile.query.get(courtfile_id)
        if not client or not courtfile:
            return jsonify({'error': 'Client or Courtfile not found'}), 404

        # Permiso: si es lawyer, debe estar vinculado al expediente
        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403

        existing = ClientCourtfile.query.filter_by(
            client_id=client_id, courtfile_id=courtfile_id
        ).first()
        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

        new_relation = ClientCourtfile(
            client_id=client_id, courtfile_id=courtfile_id)
        db.session.add(new_relation)
        db.session.commit()

        return jsonify({'message': 'Relationship created successfully', 'id': new_relation.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/clients-courtfiles/<int:id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_client_courtfile(id):
    try:
        relation = ClientCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(relation.courtfile_id)
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
@jwt_required(optional=True)
def get_lawyers_courtfiles():
    try:
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()
        query = LawyerCourtfile.query

        if role == "lawyer":
            if requested_courtfile_id:
                # Solo si el lawyer actual está vinculado a ese caso puede ver sus miembros
                is_linked = LawyerCourtfile.query.filter_by(
                    lawyer_id=int(current_id), courtfile_id=requested_courtfile_id
                ).first()
                if not is_linked:
                    return jsonify({'error': 'You are not linked to this courtfile'}), 403
                query = query.filter_by(courtfile_id=requested_courtfile_id)
            else:
                # Sin courtfile_id: limitar a ver sus propios vínculos
                requested_lawyer_id = int(current_id)

        if requested_lawyer_id is not None:
            query = query.filter_by(lawyer_id=requested_lawyer_id)
        if requested_courtfile_id is not None:
            query = query.filter_by(courtfile_id=requested_courtfile_id)

        rows = query.all()
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
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
def create_lawyer_courtfile():
    try:
        data = request.get_json() or {}
        lawyer_id = data.get('lawyer_id')
        courtfile_id = data.get('courtfile_id')

        role, current_id = _get_role_and_identity()

        if role == "lawyer":
            if not lawyer_id:
                # sin target explícito, se asume self
                lawyer_id = int(current_id)
            elif int(lawyer_id) != int(current_id):
                # invitante debe estar vinculado a ese expediente
                inviter_rel = LawyerCourtfile.query.filter_by(
                    lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
                ).first()
                if not inviter_rel:
                    return jsonify({'error': 'You are not linked to this courtfile'}), 403
        # ------------------------------------------------------------------------------

        if not lawyer_id or not courtfile_id:
            return jsonify({'error': 'lawyer_id and courtfile_id required'}), 400

        lawyer = Lawyer.query.get(lawyer_id)
        courtfile = Courtfile.query.get(courtfile_id)
        if not lawyer or not courtfile:
            return jsonify({'error': 'Lawyer or Courtfile not found'}), 404

        existing = LawyerCourtfile.query.filter_by(
            lawyer_id=lawyer_id, courtfile_id=courtfile_id
        ).first()
        if existing:
            # <- 200 en vez de 400
            return jsonify({'message': 'Relationship already exists'}), 200

        new_relation = LawyerCourtfile(
            lawyer_id=lawyer_id, courtfile_id=courtfile_id)
        db.session.add(new_relation)
        db.session.commit()

        return jsonify({'message': 'Relationship created successfully', 'id': new_relation.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/lawyers-courtfiles/<int:id>', methods=['DELETE'])
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
def delete_lawyer_courtfile(id):
    try:
        relation = LawyerCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()

        # Si es lawyer autenticado, solo puede borrar relaciones suyas
        if role == "lawyer" and str(relation.lawyer_id) != str(current_id):
            return jsonify({'error': 'Forbidden'}), 403

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# -----------------ROUTES PARA Deadlines-COURTFILES--------------------------------------------


@api.route('/deadlines-courtfiles', methods=['GET'])
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
def get_deadlines_courtfiles():
    try:
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            requested_lawyer_id = int(current_id)

        query = DeadlineCourtfile.query

        if requested_lawyer_id is not None:
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == requested_lawyer_id
            )
            query = query.filter(DeadlineCourtfile.courtfile_id.in_(subq))

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
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
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
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403

        existing = DeadlineCourtfile.query.filter_by(
            deadline_id=deadline_id,
            courtfile_id=courtfile_id
        ).first()

        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

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
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
def delete_deadline_courtfile(id):
    try:
        relation = DeadlineCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()  # [NUEVO]

        # [NUEVO] si es lawyer, solo puede borrar si está vinculado a ese courtfile
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(relation.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# -----------------ROUTES PARA APPOINTMENTS-COURTFILES--------------------------------------------


@api.route('/appointments-courtfiles', methods=['GET'])
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
def get_appointments_courtfiles():
    try:
        requested_lawyer_id = request.args.get('lawyer_id', type=int)
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            requested_lawyer_id = int(current_id)

        query = AppointmentCourtfile.query

        if requested_lawyer_id is not None:
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == requested_lawyer_id
            )
            query = query.filter(AppointmentCourtfile.courtfile_id.in_(subq))

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
            'starts_at': ac.appointment.starts_at.strftime('%H:%M'),
            'ends_at': ac.appointment.ends_at.strftime('%H:%M'),
            'courtfile_number': ac.courtfile.case_number,
            'courtfile_title': ac.courtfile.title
        } for ac in appointments_courtfiles]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/appointments-courtfiles', methods=['POST'])
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
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
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403

        existing = AppointmentCourtfile.query.filter_by(
            appointment_id=appointment_id,
            courtfile_id=courtfile_id
        ).first()

        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

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
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
def delete_appointment_courtfile(id):
    try:
        relation = AppointmentCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()

        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(relation.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA COURTFILE-DOCUMENT--------------------------------------------


@api.route('/courtfile-document', methods=['GET'])
@jwt_required(optional=True)
def get_courtfile_document():
    try:
        requested_courtfile_id = request.args.get('courtfile_id', type=int)

        role, current_id = _get_role_and_identity()
        query = CourtfileDocument.query

        if role == "lawyer":
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == int(current_id)
            )
            query = query.filter(CourtfileDocument.courtfile_id.in_(subq))

        if requested_courtfile_id is not None:
            query = query.filter_by(courtfile_id=requested_courtfile_id)

        courtfile_document = query.all()
        return jsonify([{
            'id': cd.id,
            'courtfile_id': cd.courtfile_id,
            'document_id': cd.document_id,
            'courtfile_number': cd.courtfile.case_number if cd.courtfile else None,
            'courtfile_title': cd.courtfile.title if cd.courtfile else None,
            'document_name': cd.document.name if cd.document else None,
            'document_type': cd.document.type if cd.document else None,
            'document_url': cd.document.url_route if cd.document else None,
            'document_date': cd.document.document_date.isoformat() if (cd.document and cd.document.document_date) else None,
            'create_at': cd.document.create_at.isoformat() if (cd.document and cd.document.create_at) else None
        } for cd in courtfile_document]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/courtfile-document', methods=['POST'])
@jwt_required(optional=True)
def create_courtfile_document():
    try:
        data = request.get_json() or {}

        # Validaciones básicas
        courtfile_id = data.get('courtfile_id')
        document_id = data.get('document_id')
        if not courtfile_id or not document_id:
            return jsonify({'error': 'courtfile_id and document_id required'}), 400

        courtfile = Courtfile.query.get(courtfile_id)
        document = Document.query.get(document_id)

        if not courtfile or not document:
            return jsonify({'error': 'Courtfile or Document not found'}), 404

        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden for this courtfile'}), 403

        existing = CourtfileDocument.query.filter_by(
            courtfile_id=courtfile_id,
            document_id=document_id
        ).first()

        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

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

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/courtfile-document/<int:id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_courtfile_document(id):
    try:
        relation = CourtfileDocument.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            linked = LawyerCourtfile.query.filter_by(
                lawyer_id=int(current_id), courtfile_id=int(relation.courtfile_id)
            ).first()
            if not linked:
                return jsonify({'error': 'Forbidden'}), 403

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA PAYMENTS--------------------------------------------
@api.route('/payments', methods=['POST'])
def create_payment():
    try:
        data = request.get_json()

        required_fields = ['amount', 'currency', 'means']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        payment = Payment(
            amount=data['amount'],
            currency=data['currency'],
            # paid_at=datetime.now(UTC)
            means=data['means']
        )

        db.session.add(payment)
        db.session.commit()

        return jsonify(payment.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/payments', methods=['GET'])
def get_payments():
    try:
        payments = Payment.query.all()
        return jsonify([payment.serialize() for payment in payments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/payments/<int:payment_id>', methods=['GET'])
def get_payment(payment_id):
    try:
        payment = Payment.query.get_or_404(payment_id)
        return jsonify(payment.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/payments/<int:payment_id>', methods=['PUT'])
def update_payment(payment_id):
    try:
        payment = Payment.query.get_or_404(payment_id)
        data = request.get_json()

        if 'amount' in data:
            payment.amount = data['amount']

        if 'currency' in data:
            payment.currency = data['currency']

        if 'status' in data:
            payment.status = data['status']
            if data['status'] == "approved":
                payment.paid_at = datetime.now(UTC)

        if 'means' in data:
            payment.means = data['means']

        db.session.commit()

        return jsonify(payment.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/payments/<int:payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    try:
        payment = Payment.query.get_or_404(payment_id)

        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': 'Payment successfully deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
# end payments

# -----------------ROUTES PARA PAYMENTS COURTFILE--------------------------------------------


@api.route('/payments-courtfile', methods=['POST'])
@jwt_required(optional=True)
def create_payment_courtfile():
    try:
        data = request.get_json() or {}

        required_fields = ['payment_id', 'courtfile_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        payment = Payment.query.get(data['payment_id'])
        courtfile = Courtfile.query.get(data['courtfile_id'])
        if not payment or not courtfile:
            return jsonify({'error': 'Payment or Courtfile not found'}), 404

        role, current_id = _get_role_and_identity()
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


@api.route('/payments-courtfile', methods=['GET'])
@jwt_required(optional=True)
def get_payments_courtfile():
    try:
        courtfile_id = request.args.get('courtfile_id', type=int)
        expand = request.args.get('expand', default='')

        query = PaymentCourtfile.query
        if courtfile_id:
            query = query.filter_by(courtfile_id=courtfile_id)

        role, current_id = _get_role_and_identity()
        if role == "lawyer":
            subq = select(LawyerCourtfile.courtfile_id).where(
                LawyerCourtfile.lawyer_id == int(current_id)
            )
            query = query.filter(PaymentCourtfile.courtfile_id.in_(subq))

        pcs = query.all()
        result = []
        for pc in pcs:
            item = pc.serialize()
            if 'payment' in expand:
                item['payment'] = pc.payment.serialize()
            result.append(item)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/payments-courtfile/<int:id>', methods=['GET'])
@jwt_required(optional=True)
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

        return jsonify(pc.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@api.route('/payments-courtfile/<int:id>', methods=['PUT'])
@jwt_required(optional=True)
def update_payment_courtfile(id):
    try:
        payment_courtfile = PaymentCourtfile.query.get_or_404(id)
        data = request.get_json() or {}

        role, current_id = _get_role_and_identity()
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
@jwt_required(optional=True)
def delete_payment_courtfile(id):
    try:
        payment_courtfile = PaymentCourtfile.query.get_or_404(id)

        role, current_id = _get_role_and_identity()
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
    # acepta "2025-09-19T16:30:00" o "2025-09-19T16:30:00Z"
    try:
        ts = ts.rstrip("Z")
        return datetime.fromisoformat(ts)
    except Exception:
        return None

# GET /api/messages?courtfile_id=21&since=2025-09-19T16:30:00
@api.route("/messages", methods=["GET"])
def list_messages():
    courtfile_id = request.args.get("courtfile_id", type=int)
    if not courtfile_id:
        return jsonify({"error": "courtfile_id requerido"}), 400

    since_str = request.args.get("since")
    q = Message.query.filter(Message.id_courtfile == courtfile_id)
    if since_str:
        since_dt = _parse_iso(since_str)
        if since_dt:
            q = q.filter(Message.created_at > since_dt)

    rows = q.order_by(Message.created_at.asc()).limit(100).all()
    return jsonify([m.to_front_dict() for m in rows])

@api.route("/messages", methods=["POST"])
def create_message():
    data = request.get_json() or {}
    cfid = data.get("courtfile_id")
    text = (data.get("text") or "").strip()
    role = (data.get("sender_role") or "").strip().lower()

    if not cfid or not text or role not in {"lawyer", "client", "admin"}:
        return jsonify({"error": "courtfile_id, text y sender_role válidos son requeridos"}), 400
    
    lawyer_id = None
    client_id = None
    
    if role == "lawyer":
        lawyer_id = data.get("sender_id")  
    elif role == "client":
        client_id = data.get("sender_id")  

    msg = Message(
        id_courtfile=cfid,   
        texto=text,         
        sender=role,        
        lawyer_id=lawyer_id,
        client_id=client_id,
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_front_dict()), 201


    # -----------------------------STRIPE PAYMENT-----------------------------------------------------
@api.route("payments/<int:paymentId>/create-checkout-session", methods=["POST"])
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
                    print(f"Payment {paymentId} reset from processing to pending (timeout 30min)")
                else:
                    remaining_time = timedelta(minutes=30) - time_in_processing
                    remaining_minutes = int(remaining_time.total_seconds() / 60)
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
                        print(f"Payment {paymentId} reset from processing to pending (timeout 30min - fallback)")
                    else:
                        return jsonify({
                            'error': 'Payment is already being processed. Please try again in 30 minutes.'
                        }), 400
                else:
                    payment.status = PaymentStatus.pending
                    payment.stripe_payment_intent_id = None
                    db.session.commit()
                    print(f"Payment {paymentId} reset from processing to pending (no timestamp)")
        
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
        
        print(f"Payment {paymentId} set to processing, Stripe ID: {session.payment_intent}")

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
                    payment.means = 'stripe'
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
                    payment.means = 'stripe'

                    db.session.commit()
                    print(
                        f'Pago {payment_id} marcado como aprobado via payment_intent')

        except Exception as e:
            db.session.rollback()

    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        try:
            payment_intent_id = payment_intent['id']
            payment = Payment.query.filter_by(
                stripe_payment_intent_id=payment_intent_id).first()

            if payment:
                payment.status = PaymentStatus.rejected
                db.session.commit()
                print(f'❌ Pago {payment.id} marcado como rechazado')

        except Exception as e:
            print(f'❌ Error manejando payment intent failed: {e}')
            db.session.rollback()

    else:
        print(f'Unhandled event type: {event["type"]}')

    return jsonify(success=True)
