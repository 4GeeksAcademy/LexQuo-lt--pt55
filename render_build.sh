#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npm run build

pip install --upgrade pip
pip install psycopg2-binary==2.9.9
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

flask db upgrade
