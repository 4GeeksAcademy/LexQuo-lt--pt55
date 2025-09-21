"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from api.utils import APIException, generate_sitemap
from api.models import db, Message
from api.routes import api
from api.admin import setup_admin
from api.commands import setup_commands
from flask_jwt_extended import JWTManager
from api.ai import bp_ai
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room


# from models import Person

socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# === Habilitar CORS ===
# modo abierto (dev):
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}, r"/socket.io/*": {"origins": "*"}},
    supports_credentials=True,
)

# JWT Configuration - ADD THIS SECTION
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "fallback-secret-key-change-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 86400 
jwt = JWTManager(app)  

# database condiguration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# add the admin
setup_admin(app)

# add the admin
setup_commands(app)

# Add all endpoints form the API with a "api" prefix
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(bp_ai)
# Handle/serialize errors like a JSON object

socketio.init_app(app, cors_allowed_origins="*")

# -------------------- Socket.IO handlers (básicos) --------------------

@socketio.on("join")
def handle_join(data):
    cfid = data.get("courtfile_id")
    if not cfid:
        return
    join_room(f"courtfile_{cfid}")

    # === HISTORIAL: últimos 100 mensajes de ese expediente, en orden ASC (viejo->nuevo) ===
    rows = (
        db.session.query(Message)
        .filter(Message.id_courtfile == cfid)
        .order_by(Message.created_at.asc())
        .limit(100)
        .all()
    )

    payload = [m.to_front_dict() for m in rows]

    # Enviar SOLO al socket que se acaba de unir (no a toda la sala)
    emit("history", payload, to=request.sid)

@socketio.on("message")
def handle_message(data):
    """
    Recibe { courtfile_id, text, sender_role, sender_id? } desde el cliente,
    guarda en la DB y emite 'new_message' a la sala del expediente.
    """
    cfid = data.get("courtfile_id")
    text = (data.get("text") or "").strip()
    role = (data.get("sender_role") or "").strip().lower()
    sender_id = data.get("sender_id")

    if not cfid or not text or role not in {"lawyer", "client", "admin"}:
        return

    lawyer_id = sender_id if role == "lawyer" else None
    client_id = sender_id if role == "client" else None

    msg = Message(
        id_courtfile=cfid,
        texto=text,
        sender=role,
        lawyer_id=lawyer_id,
        client_id=client_id,
    )
    db.session.add(msg)
    db.session.commit()

    # Empujamos al resto de clientes del expediente
    socketio.emit("new_message", msg.to_front_dict(), to=f"courtfile_{cfid}")

@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# generate sitemap with all your endpoints


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# any other endpoint will try to serve it like a static file
@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0  # avoid cache memory
    return response


# this only runs if `$ python src/main.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True)