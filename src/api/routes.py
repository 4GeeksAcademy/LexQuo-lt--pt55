"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from datetime import datetime
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import Courtfile, db, Lawyer, Client, AdminUser, Deadlines, ClientCourtfile, DeadlineCourtfile
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from werkzeug.security import generate_password_hash

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

        required_fields = ['firstname', 'lastname', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        existing = Lawyer.query.filter_by(
            email=data['email']).first()
        if existing:
            return jsonify({'error': 'Email already exists'}), 409

        lawyer = Lawyer(
            firstname=data['firstname'],
            lastname=data['lastname'],
            email=data['email'],
            phone=data['phone'],
            password=generate_password_hash(data['password']),
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
            if data['email'] != lawyer.email:
                existing = Lawyer.query.filter_by(email=data['email']).first()
                if existing:
                    return jsonify({'error': 'Email already exists'}), 409
            lawyer.email = data['email']

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
                existing = AdminUser.query.filter_by(email=data['email']).first()
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

        required_fields = ['deadline_type', 'deadline_date', 'deadline_hour', 'priority']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Required field: {field}'}), 400

        deadline_date = data['deadline_date']
        if isinstance(deadline_date, str):
            deadline_date = datetime.strptime(deadline_date, '%Y-%m-%d').date()
        
        deadline_hour = data['deadline_hour']
        if isinstance(deadline_hour, str):
            # Cambiar a formato %H:%M para solo horas y minutos
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
                deadline_date = datetime.strptime(deadline_date, '%Y-%m-%d').date()
            deadline.deadline_date = deadline_date

        if 'deadline_hour' in data:
            deadline_hour = data['deadline_hour']
            if isinstance(deadline_hour, str):
                deadline_hour = datetime.strptime(deadline_hour, '%H:%M').time()
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


# -----------------ROUTES PARA Deadlines-COURTFILES--------------------------------------------
@api.route('/deadlines-courtfiles', methods=['GET'])
def get_deadlines_courtfiles():
    try:
        deadlines_courtfiles = DeadlineCourtfile.query.all()
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
def create_deadline_courtfile():
    try:
        data = request.get_json()

        deadline = Deadlines.query.get(data['deadline_id'])
        courtfile = Courtfile.query.get(data['courtfile_id'])

        if not deadline or not courtfile:
            return jsonify({'error': 'Deadline or Courtfile not found'}), 404

        existing = DeadlineCourtfile.query.filter_by(
            deadline_id=data['deadline_id'],
            courtfile_id=data['courtfile_id']
        ).first()

        if existing:
            return jsonify({'error': 'Relationship already exists'}), 400

        new_relation = DeadlineCourtfile(
            deadline_id=data['deadline_id'],
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


@api.route('/deadlines-courtfiles/<int:id>', methods=['DELETE'])
def delete_deadline_courtfile(id):
    try:
        relation = DeadlineCourtfile.query.get(id)
        if not relation:
            return jsonify({'error': 'Relationship not found'}), 404

        db.session.delete(relation)
        db.session.commit()

        return jsonify({'message': 'Relationship deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500