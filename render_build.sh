#!/usr/bin/env bash
# exit on error
set -o errexit

# ---------- FRONTEND ----------
npm install
npm run build

# ---------- BACKEND ----------
pip install --upgrade pip

# DB driver
pip install psycopg2-binary==2.9.9

# Core Flask
pip install flask==2.3.3
pip install flask-sqlalchemy==3.0.5
pip install flask-migrate==4.0.5
pip install flask-cors==4.0.0
pip install flask-swagger==0.2.14
pip install flask-admin==1.6.1
pip install gunicorn==21.2.0
pip install python-dotenv==1.0.0
pip install alembic==1.12.1
pip install pyyaml==6.0.1

# WebSockets
pip install flask-socketio==5.3.6
pip install eventlet==0.36.1

# Auth & JWT
pip install flask-jwt-extended==4.6.0

# External APIs & AI
pip install stripe==5.0.0
pip install requests==2.31.0
pip install cloudinary==1.41.0
pip install openai==1.40.0
pip install httpx==0.27.2
pip install google-generativeai==0.8.3
pip install PyPDF2==3.0.1

# Forms
pip install wtforms==3.2.1

# ---------- DB MIGRATIONS ----------
export FLASK_APP=src/app.py
export FLASK_ENV=production
flask db upgrade

# ---------- OPTIONAL ONE-SHOT SEED ----------
if [ "${RUN_SEED}" = "1" ]; then
  echo "Running seed..."
  flask seed           # usa el alias que agregamos
  echo "Seed done."
else
  echo "Skipping seed (set RUN_SEED=1 to enable)"
fi