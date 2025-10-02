# src/api/commands.py
import click
from api.models import db
from api.seed import run as seed_run  # usa tu seed.py

def setup_commands(app):
    @app.cli.command("insert-seed")
    def insert_seed():
        seed_run(db.session)
        click.echo("✅ insert-seed completado")

    @app.cli.command("seed")   # alias simple
    def seed():
        seed_run(db.session)
        click.echo("✅ seed completado")