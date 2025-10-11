import os  # 👈 primero
USE_EVENTLET = os.getenv("USE_EVENTLET", "0") == "1"

if USE_EVENTLET:
    import eventlet
    eventlet.monkey_patch()
    
from flask import Flask, request, jsonify, send_from_directory
from flask_migrate import Migrate
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room

from api.utils import APIException, generate_sitemap
from api.models import db, Message
from api.routes import api
from api.admin import setup_admin
from api.commands import setup_commands
from flask_jwt_extended import JWTManager
from api.ai import bp_ai


# === 1) Definí el origen del FRONT (EXACTO, el de tu 3000) ===
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN")

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')

# === 2) app, CORS y SocketIO ===
app = Flask(__name__)
app.url_map.strict_slashes = False

FRONTEND_ORIGINS = [
    o.rstrip("/") for o in (os.getenv("FRONTEND_ORIGIN") or "").split(",") if o.strip()
] or ["http://localhost:3000", "http://127.0.0.1:3000"]

CORS(
    app,
    resources={
        r"/api/*": {"origins": FRONTEND_ORIGINS},
        r"/socket.io/*": {"origins": FRONTEND_ORIGINS},
    },
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

async_mode = "eventlet" if USE_EVENTLET else None

socketio = SocketIO(
    app,
    cors_allowed_origins=FRONTEND_ORIGINS,
    async_mode=async_mode,
    ping_timeout=25,
    ping_interval=20,
)

# === 3) Resto de configuración ===
app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY", "fallback-secret-key-change-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 86400
jwt = JWTManager(app)

db_url = os.getenv("DATABASE_URL")
if db_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

setup_admin(app)
setup_commands(app)
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(bp_ai)

# -------------------- Socket.IO handlers --------------------


@socketio.on("join")
def handle_join(data):
    cfid = data.get("courtfile_id")
    if not cfid:
        return
    join_room(f"courtfile_{cfid}")

    rows = (
        db.session.query(Message)
        .filter(Message.id_courtfile == cfid)
        .order_by(Message.created_at.asc())
        .limit(100)
        .all()
    )
    payload = [m.to_front_dict() for m in rows]
    emit("history", payload, to=request.sid)


@socketio.on("message")
def handle_message(data):
    cfid = data.get("courtfile_id")
    text = (data.get("text") or "").strip()
    role = (data.get("sender_role") or "").strip().lower()
    sender_id = data.get("sender_id")

    if not cfid or not text or role not in {"lawyer", "client", "admin_user"}:
        return {"error": "payload inválido"}

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

    socketio.emit("new_message", msg.to_front_dict(), to=f"courtfile_{cfid}")
    return {"ok": True, "id": msg.id}


@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')


@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response


if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True)
