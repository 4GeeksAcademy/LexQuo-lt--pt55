// Import necessary components and functions from react-router-dom.
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";


import { Courtfiles } from "./pages/Courtfile/Courtfiles";
import { ViewCourtfile } from "./pages/Courtfile/ViewCourtfile";
import { EditCourtfile } from "./pages/Courtfile/EditCourtfile";
import { AddCourtfile } from "./pages/Courtfile/AddCourtfile";
import { ViewCourtfileLawyer } from "./pages/Courtfile/ViewCourtfileLawyer";
import { ViewCourtfileClient } from "./pages/Courtfile/ViewCourtfileClient";

import { Lawyers } from "./pages/Lawyer/Lawyers";
import { ViewLawyer } from "./pages/Lawyer/ViewLawyer";
import { EditLawyer } from "./pages/Lawyer/EditLawyer";
import { AddLawyer } from "./pages/Lawyer/AddLawyer";
import { SignUpLawyer } from "./pages/Lawyer/SignUpLawyer";
import { LoginLawyer } from "./pages/Lawyer/LoginLawyer";
import { DashboardLawyer } from "./pages/Lawyer/DashboardLawyer";

import { Admins } from "./pages/AdminUser/Admins";
import { ViewAdmin } from "./pages/AdminUser/ViewAdmin";
import { EditAdmin } from "./pages/AdminUser/EditAdmin";
import { AddAdmin } from "./pages/AdminUser/AddAdmin";
import { LoginAdminUser } from "./pages/AdminUser/LoginAdminUser";
import { SignUpAdminUser } from "./pages/AdminUser/SignUpAdminUser";
import { DashboardAdminUser } from "./pages/AdminUser/DashboardAdminUser";


import { Clients } from "./pages/Client/Clients";
import { ViewClient } from "./pages/Client/ViewClient";
import { EditClient } from "./pages/Client/EditClient";
import { AddClient } from "./pages/Client/AddClient";
import { SignUpClient } from "./pages/Client/SignUpClient";
import { LoginClient } from "./pages/Client/LoginClient";
import { DashboardClient } from "./pages/Client/DashboardClient";

import { Deadlines } from "./pages/Deadline/Deadlines";
import { ViewDeadline } from "./pages/Deadline/ViewDeadline";
import { EditDeadline } from "./pages/Deadline/EditDeadline";
import { AddDeadline } from "./pages/Deadline/AddDeadline";

import { Appointments } from "./pages/Appointment/Appointments";
import { ViewAppointment } from "./pages/Appointment/ViewAppointment";
import { EditAppointment } from "./pages/Appointment/EditAppointment";
import { AddAppointment } from "./pages/Appointment/AddAppointment";

import { Payments } from "./pages/Payments/Payments";
import { ViewPayment } from "./pages/Payments/ViewPayment";
import { EditPayment } from "./pages/Payments/EditPayment";
import { AddPayment } from "./pages/Payments/AddPayment";

import { Documents } from "./pages/Document/Documents";
import { ViewDocument } from "./pages/Document/ViewDocument";
import { EditDocument } from "./pages/Document/EditDocument";
import { AddDocument } from "./pages/Document/AddDocument";

import { ClientsCourtfiles } from "./pages/Relations/ClientsCourtfiles";
import { AddClientsCourtfiles } from "./pages/Relations/AddClientsCourtfiles";

import { DeadlinesCourtfiles } from "./pages/Relations/DeadlinesCourtfiles";
import { AddDeadlinesCourtfiles } from "./pages/Relations/AddDeadlinesCourtfiles";

import { LawyersCourtfiles } from "./pages/Relations/LawyersCourtfiles";
import { AddLawyersCourtfiles } from "./pages/Relations/AddLawyersCourtfiles";

import { AppointmentsCourtfiles } from "./pages/Relations/AppointmentsCourtfiles";
import { AddAppointmentsCourtfiles } from "./pages/Relations/AddAppointmentsCourtfiles";

import { CourtfilesDocuments } from "./pages/Relations/CourtfilesDocuments";
import { AddCourtfilesDocuments } from "./pages/Relations/AddCourtfilesDocuments";

import { Forbidden } from "./pages/Forbidden";

import { LawyerLinkOrCreateClient } from "./pages/Client/LawyerLinkOrCreateClient";
import { LawyerLinkOrInviteLawyer } from "./pages/Lawyer/LawyerLinkOrInviteLawyer";


import { PaymentCourtfiles } from "./pages/Relations/PaymentCourtfiles";
import { AddPaymentCourtfile } from "./pages/Relations/AddPaymentCourtfile";

import ChatOnDemand from "./pages/ChatOnDemand.jsx";
import ChatsOverview from "./pages/ChatsOverview.jsx";

import ChangePassword from "./pages/ChangePassword";

import PrivateRoute from "./components/PrivateRoute.jsx";
import PrivateAdminRoute from "./components/PrivateAdminRoute";

import LoginForAll from "./pages/LoginForAll.jsx";
import SignUpForAll from "./pages/SignUpForAll.jsx";

import Calendar from "./pages/Calendar.jsx";




export const router = createBrowserRouter(
  createRoutesFromElements(
    // !!!!!!!!!!!!===================CONGIGURACIONES DE LAS RUTAS=========================!!!!!!!!!!!!!!!
    // Rutas abiertas no requieren rol ni token
    // Rutas Privadas Admin: El token y el rol se controlan en el componente de protección
    // Rutas Privadas Generals: OJO! El componente de protección sólo controla el token y hace fetch de la data, 
    //                          luego cada componente, establece los permisos de rol. También se establecen en el back. 

    // Root Route: All navigation will start from here.
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>} >

      {/* Nested Routes: Defines sub-routes within the BaseHome component. */}
      <Route path="/" element={<Home />} />

      {/* ==========RUTAS PROTEGIDAS PARA EL ADMIN========== */}

      <Route element={<PrivateAdminRoute />}>

        <Route path="/admins" element={<Admins />} />
        <Route path="/admins/view/:adminId" element={<ViewAdmin />} />
        <Route path="/admins/:adminId" element={<EditAdmin />} />
        <Route path="/admins/dashboard" element={<DashboardAdminUser />} />
        
        <Route path="/lawyers/addLawyer" element={<AddLawyer />} />

        <Route path="/courtfiles/view/:courtfileId" element={<ViewCourtfile />} /> 
        
        <Route path="/clients/addClient" element={<AddClient />} />
        
        <Route path="/documents" element={<Documents />} />

        <Route path="/ClientsCourtfiles" element={<ClientsCourtfiles />} />
        <Route path="/AddClientsCourtfiles" element={<AddClientsCourtfiles />} />

        <Route path="/DeadlinesCourtfiles" element={<DeadlinesCourtfiles />} />
        <Route path="/AddDeadlinesCourtfiles" element={<AddDeadlinesCourtfiles />} />

        <Route path="/LawyersCourtfiles" element={<LawyersCourtfiles />} />
        <Route path="/AddLawyersCourtfiles" element={<AddLawyersCourtfiles />} />

        <Route path="/AppointmentsCourtfiles" element={<AppointmentsCourtfiles />} />
        <Route path="/AddAppointmentsCourtfiles" element={<AddAppointmentsCourtfiles />} />

        <Route path="/CourtfilesDocuments" element={<CourtfilesDocuments />} />
        <Route path="/AddCourtfilesDocuments" element={<AddCourtfilesDocuments />} />

        <Route path="/PaymentCourtfiles" element={<PaymentCourtfiles />} />
        <Route path="/AddPaymentCourtfile" element={<AddPaymentCourtfile />} />

      </Route>

      {/* ==========RUTAS QUE YA SERIAN INNECESARIAS========== */}

      <Route path="/SignUpLawyer" element={<SignUpLawyer />} />
      <Route path="/LoginLawyer" element={<LoginLawyer />} />

      <Route path="/SignUpClient" element={<SignUpClient />} />
      <Route path="/LoginClient" element={<LoginClient />} />

      <Route path="/loginAdmin" element={<LoginAdminUser />} />
      <Route path="/SignUpAdminUser" element={<SignUpAdminUser />} />
      <Route path="/admins/addAdmin" element={<AddAdmin />} />

      {/* ==========RUTAS ABIERTAS========== */}

      <Route path="/403" element={<Forbidden />} />

      <Route path="/login" element={<LoginForAll />} />
      <Route path="/signUp" element={<SignUpForAll />} />

      
      {/* ==========RUTAS PROTEGIDAS========== */}

      <Route element={<PrivateRoute />}>
        <Route path="/DashboardClient" element={<DashboardClient />} />
        <Route path="/DashboardLawyer" element={<DashboardLawyer />} />

        <Route path="/courtfiles/addcourtfile" element={<AddCourtfile />} />
        <Route path="/courtfiles/ViewCourtfileLawyer/:courtfileId" element={<ViewCourtfileLawyer />} />
        <Route path="/courtfiles/viewclient/:courtfileId" element={<ViewCourtfileClient />} />
        <Route path="/courtfiles/:courtfileId" element={<EditCourtfile />} />

        <Route path="/lawyers/view/:lawyerId" element={<ViewLawyer />} />
        <Route path="/lawyers/:lawyerId" element={<EditLawyer />} />

        <Route path="/clients/view/:clientId" element={<ViewClient />} />
        <Route path="/clients/:clientId" element={<EditClient />} />

        <Route path="/clients/link-or-create" element={<LawyerLinkOrCreateClient />} />
        <Route path="/lawyers/link-or-invite" element={<LawyerLinkOrInviteLawyer />} />

        <Route path="/payments/view/:paymentId" element={<ViewPayment />} />        
        <Route path="/payments/addPayment" element={<AddPayment />} />
        <Route path="/payments/:paymentId" element={<EditPayment />} />

        <Route path="/deadlines/addDeadline" element={<AddDeadline />} />
        <Route path="/deadlines/view/:deadlineId" element={<ViewDeadline />} />
        <Route path="/deadlines/:deadlineId" element={<EditDeadline />} />

        <Route path="/appointments/addAppointment" element={<AddAppointment />} />
        <Route path="/appointments/view/:appointmentId" element={<ViewAppointment />} />
        <Route path="/appointments/:appointmentId" element={<EditAppointment />} />
        
        <Route path="/documents/addDocument" element={<AddDocument />} />
        <Route path="/documents/view/:documentId" element={<ViewDocument />} />
        <Route path="/documents/:documentId" element={<EditDocument />} />

        <Route path="/chats/:courtfileId" element={<ChatOnDemand />} />
        <Route path="/chats" element={<ChatsOverview />} />

        <Route path="/lawyers/:id/password" element={<ChangePassword kind="lawyer" />} />
        <Route path="/clients/:id/password" element={<ChangePassword kind="client" />} />

        <Route path="/lawyers" element={<Lawyers />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/deadlines" element={<Deadlines />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/courtfiles" element={<Courtfiles />} />

        <Route path="/calendar" element={<Calendar />} />

      </Route>

    </Route>
  )
);