  
import os
from flask_admin import Admin
from .models import db, Lawyer, Courtfile, Client, AdminUser, Deadlines, ClientCourtfile, LawyerCourtfile
from flask_admin.contrib.sqla import ModelView

class ClientCourtfileView(ModelView):
    column_list = ['id', 'client', 'courtfile']

    column_auto_select_related = True

    def client_name(self, model):
        client = Client.query.get(model.client_id)
        if client:
            return f"{client.firstname} {client.lastname}"
        return "N/A"
    
    def courtfile_name(self, model):
        courtfile = Courtfile.query.get(model.courtfile_id)
        if courtfile:
            return courtfile.case_number
        return "N/A"
          
    def _format_client(self, context, model, name):
        return f"{model.client.firstname} {model.client.lastname}"
    
    def _format_courtfile(self, context, model, name):
        return model.courtfile.case_number

    column_formatters = {
        'client': _format_client,
        'courtfile': _format_courtfile
    }

class LawyerCourtfileView(ModelView):
    column_list = ['id', 'lawyer', 'courtfile']

    column_auto_select_related = True

    def lawyer_name(self, model):
        lawyer = Lawyer.query.get(model.lawyer_id)
        if lawyer:
            return f"{lawyer.firstname} {lawyer.lastname}"
        return "N/A"
    
    def courtfile_name(self, model):
        courtfile = Courtfile.query.get(model.courtfile_id)
        if courtfile:
            return courtfile.case_number
        return "N/A"
          
    def _format_lawyer(self, context, model, name):
        return f"{model.lawyer.firstname} {model.lawyer.lastname}"
    
    def _format_courtfile(self, context, model, name):
        return model.courtfile.case_number

    column_formatters = {
        'lawyer': _format_lawyer,
        'courtfile': _format_courtfile
    }



def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    admin = Admin(app, name='4Geeks Admin', template_mode='bootstrap3')

    
    # Add your models here, for example this is how we add a the User model to the admin
    admin.add_view(ModelView(Lawyer, db.session))
    admin.add_view(ModelView(Courtfile, db.session))
    admin.add_view(ModelView(Client, db.session))
    admin.add_view(ModelView(AdminUser, db.session))
    admin.add_view(ModelView(Deadlines, db.session))
    admin.add_view(ClientCourtfileView(ClientCourtfile, db.session))
    admin.add_view(LawyerCourtfileView(LawyerCourtfile, db.session))


    # You can duplicate that line to add mew models
    # admin.add_view(ModelView(YourModelName, db.session))