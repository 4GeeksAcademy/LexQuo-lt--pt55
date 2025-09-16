"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from datetime import datetime
from sqlalchemy import select
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import Courtfile, db, Lawyer, Client, AdminUser, Deadlines, Appointment, Document, ClientCourtfile, DeadlineCourtfile, LawyerCourtfile, AppointmentCourtfile, LawyerClient, CourtfileDocument, Payment
from api.utils import generate_sitemap, APIException
from datetime import datetime, UTC
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from api.validators import parse_iso_date, parse_24h_time, is_valid_24h_time, validate_required_fields, validate_time_order, create_error_response

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


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
        data = request.get_json()

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
            lawyer.is_active = bool(data['is_active'])

        if 'password' in data:
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
        data = request.get_json()

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

        new_appointment = Appointment(
            title=data['title'].strip(),
            date=appointment_date,
            location=data.get('location', '').strip(),
            starts_at=start_time,
            ends_at=end_time
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
        data = request.get_json()

        required_fields = ['name', 'type', 'url_route']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        existing = Document.query.filter_by(
            url_route=data['url_route']).first()
        if existing:
            return jsonify({'error': 'URL route already exists'}), 409

        document = Document(
            name=data['name'],
            type=data['type'],
            url_route=data['url_route'],
            description=data.get('description'),
            category=data.get('category')
        )

        db.session.add(document)
        db.session.commit()

        return jsonify(document.serialize()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/documents/<int:document_id>', methods=['PUT'])
def update_document(document_id):
    try:
        document = Document.query.get_or_404(document_id)
        data = request.get_json()

        if 'name' in data:
            document.name = data['name']

        if 'type' in data:
            document.type = data['type']

        if 'url_route' in data:
            if data['url_route'] != document.url_route:
                existing = Document.query.filter_by(
                    url_route=data['url_route']).first()
                if existing:
                    return jsonify({'error': 'URL route already exists'}), 409
            document.url_route = data['url_route']

        if 'description' in data:
            document.description = data['description']

        if 'category' in data:
            document.category = data['category']

        db.session.commit()

        return jsonify(document.serialize()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


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
def get_client_courtfiles():
    try:
        client_courtfiles = ClientCourtfile.query.all()
        return jsonify([{
            'id': cc.id,
            'client_id': cc.client_id,
            'courtfile_id': cc.courtfile_id,
            'client_name': f"{cc.client.firstname} {cc.client.lastname}",
            'courtfile_number': cc.courtfile.case_number
        } for cc in client_courtfiles]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/clients-courtfiles', methods=['POST'])
def create_client_courtfile():
    try:
        data = request.get_json()

        client = Client.query.get(data['client_id'])
        courtfile = Courtfile.query.get(data['courtfile_id'])

        if not client or not courtfile:
            return jsonify({'error': 'Client or Courtfile not found'}), 404

        existing = ClientCourtfile.query.filter_by(
            client_id=data['client_id'],
            courtfile_id=data['courtfile_id']
        ).first()

        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

        new_relation = ClientCourtfile(
            client_id=data['client_id'],
            courtfile_id=data['courtfile_id']
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


@api.route('/clients-courtfiles/<int:id>', methods=['DELETE'])
def delete_client_courtfile(id):
    try:
        relation = ClientCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA LAWYERS-COURTFILES--------------------------------------------
def _get_role_and_identity():  # [NUEVO]
    try:
        claims = get_jwt()
        return claims.get("role"), get_jwt_identity()
    except Exception:
        return None, None


@api.route('/lawyers-courtfiles', methods=['GET'])
# !!!!!!!!!!!!!!! CUANDO TENGAMOS ADMIN CON TOKEN CAMBIAR
@jwt_required(optional=True)
def get_lawyers_courtfiles():
    try:
        # query param opcional para filtrar (útil para admins o herramientas)
        requested_lawyer_id = request.args.get('lawyer_id', type=int)

        role, current_id = _get_role_and_identity()

        if role == "lawyer":
            requested_lawyer_id = int(current_id)

        query = LawyerCourtfile.query
        if requested_lawyer_id is not None:
            query = query.filter_by(lawyer_id=requested_lawyer_id)

        lawyer_courtfiles = query.all()

        return jsonify([{
            'id': lc.id,
            'lawyer_id': lc.lawyer_id,
            'courtfile_id': lc.courtfile_id,
            'lawyer_name': f"{lc.lawyer.firstname} {lc.lawyer.lastname}",
            'courtfile': lc.courtfile.serialize(),
        } for lc in lawyer_courtfiles]), 200

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

        # Si es lawyer autenticado, solo puede crear relaciones para SÍ MISMO
        if role == "lawyer":
            lawyer_id = int(current_id)

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
            return jsonify({'error': 'Relationship already exists'}), 400

        new_relation = LawyerCourtfile(
            lawyer_id=lawyer_id,
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

# -----------------ROUTES PARA LAWYER-CLIENT--------------------------------------------


@api.route('/lawyer-client', methods=['GET'])
def get_lawyer_client():
    try:
        lawyer_client = LawyerClient.query.all()
        return jsonify([{
            'id': lc.id,
            'lawyer_id': lc.lawyer_id,
            'client_id': lc.client_id,
            'lawyer_name': f"{lc.lawyer.firstname} {lc.lawyer.lastname}",
            'lawyer_email': lc.lawyer.email,
            'lawyer_phone': lc.lawyer.phone,
            'client_name': f"{lc.client.firstname} {lc.client.lastname}",
            'client_email': lc.client.email,
            'client_phone': lc.client.phone
        } for lc in lawyer_client]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/lawyer-client', methods=['POST'])
def create_lawyer_client():
    try:
        data = request.get_json()

        lawyer = Lawyer.query.get(data['lawyer_id'])
        client = Client.query.get(data['client_id'])

        if not lawyer or not client:
            return jsonify({'error': 'Lawyer or Client not found'}), 404

        existing = LawyerClient.query.filter_by(
            lawyer_id=data['lawyer_id'],
            client_id=data['client_id']
        ).first()

        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

        new_relation = LawyerClient(
            lawyer_id=data['lawyer_id'],
            client_id=data['client_id']
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


@api.route('/lawyer-client/<int:id>', methods=['DELETE'])
def delete_lawyer_client(id):
    try:
        relation = LawyerClient.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# -----------------ROUTES PARA COURTFILE-DOCUMENT--------------------------------------------

@api.route('/courtfile-document', methods=['GET'])
def get_courtfile_document():
    try:
        courtfile_document = CourtfileDocument.query.all()
        return jsonify([{
            'id': cd.id,
            'courtfile_id': cd.courtfile_id,
            'document_id': cd.document_id,
            'courtfile_number': cd.courtfile.case_number if cd.courtfile else None,
            'courtfile_title': cd.courtfile.title if cd.courtfile else None,
            'document_name': cd.document.name if cd.document else None,
            'document_type': cd.document.type if cd.document else None,
            'document_url': cd.document.url_route if cd.document else None
        } for cd in courtfile_document]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api.route('/courtfile-document', methods=['POST'])
def create_courtfile_document():
    try:
        data = request.get_json()

        courtfile = Courtfile.query.get(data['courtfile_id'])
        document = Document.query.get(data['document_id'])

        if not courtfile or not document:
            return jsonify({'error': 'Courtfile or Document not found'}), 404

        existing = CourtfileDocument.query.filter_by(
            courtfile_id=data['courtfile_id'],
            document_id=data['document_id']
        ).first()

        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

        new_relation = CourtfileDocument(
            courtfile_id=data['courtfile_id'],
            document_id=data['document_id']
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
def delete_courtfile_document(id):
    try:
        relation = CourtfileDocument.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

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
