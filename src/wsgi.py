from app import app, socketio

# 👉 Esta línea expone la variable que gunicorn busca
application = app   # (opcional si algún servicio espera 'application')
app = app           # (necesaria si usás "wsgi:app" en render.yaml)

if __name__ == "__main__":
    # Cuando corres localmente: python wsgi.py
    socketio.run(app, host="0.0.0.0", port=3001)