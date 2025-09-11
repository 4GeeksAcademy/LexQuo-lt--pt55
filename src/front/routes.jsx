// Import necessary components and functions from react-router-dom.
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";

import { Courtfiles } from "./pages/Courtfile/Courtfiles";
import { ViewCourtfile } from "./pages/Courtfile/ViewCourtfile";
import { EditCourtfile } from "./pages/Courtfile/EditCourtfile";
import { AddCourtfile } from "./pages/Courtfile/AddCourtfile";

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

import { Clients } from "./pages/Client/Clients";
import { ViewClient } from "./pages/Client/ViewClient";
import { EditClient } from "./pages/Client/EditClient";
import { AddClient } from "./pages/Client/AddClient";

import { Deadlines } from "./pages/Deadline/Deadlines";
import { ViewDeadline } from "./pages/Deadline/ViewDeadline";
import { EditDeadline } from "./pages/Deadline/EditDeadline";
import { AddDeadline } from "./pages/Deadline/AddDeadline";

import { Appointments } from "./pages/Appointment/Appointments";
import { ViewAppointment } from "./pages/Appointment/ViewAppointment";
import { EditAppointment } from "./pages/Appointment/EditAppointment";
import { AddAppointment } from "./pages/Appointment/AddAppointment";

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



export const router = createBrowserRouter(
  createRoutesFromElements(
    // CreateRoutesFromElements function allows you to build route elements declaratively.
    // Create your routes here, if you want to keep the Navbar and Footer in all views, add your new routes inside the containing Route.
    // Root, on the contrary, create a sister Route, if you have doubts, try it!
    // Note: keep in mind that errorElement will be the default page when you don't get a route, customize that page to make your project more attractive.
    // Note: The child paths of the Layout element replace the Outlet component with the elements contained in the "element" attribute of these child paths.

    // Root Route: All navigation will start from here.
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>} >

      {/* Nested Routes: Defines sub-routes within the BaseHome component. */}
      <Route path="/" element={<Home />} />
      <Route path="/single/:theId" element={<Single />} />  {/* Dynamic route for single items */}
      <Route path="/demo" element={<Demo />} />

      <Route path="/courtfiles" element={<Courtfiles />} />
      <Route path="/courtfiles/addcourtfile" element={<AddCourtfile />} />
      <Route path="/courtfiles/view/:courtfileId" element={<ViewCourtfile />} />
      <Route path="/courtfiles/:courtfileId" element={<EditCourtfile />} />

      <Route path="/lawyers" element={<Lawyers />} />
      <Route path="/lawyers/addLawyer" element={<AddLawyer />} />
      <Route path="/lawyers/view/:lawyerId" element={<ViewLawyer />} />
      <Route path="/lawyers/:lawyerId" element={<EditLawyer />} />

      <Route path="/clients" element={<Clients />} />
      <Route path="/clients/addClient" element={<AddClient />} />
      <Route path="/clients/view/:clientId" element={<ViewClient />} />
      <Route path="/clients/:clientId" element={<EditClient />} />

      <Route path="/admins" element={<Admins />} />
      <Route path="/admins/addAdmin" element={<AddAdmin />} />
      <Route path="/admins/view/:adminId" element={<ViewAdmin />} />
      <Route path="/admins/:adminId" element={<EditAdmin />} />

      <Route path="/deadlines" element={<Deadlines />} />
      <Route path="/deadlines/addDeadline" element={<AddDeadline />} />
      <Route path="/deadlines/view/:deadlineId" element={<ViewDeadline />} />
      <Route path="/deadlines/:deadlineId" element={<EditDeadline />} />

      <Route path="/appointments" element={<Appointments />} />
      <Route path="/appointments/addAppointment" element={<AddAppointment />} />
      <Route path="/appointments/view/:appointmentId" element={<ViewAppointment />} />
      <Route path="/appointments/:appointmentId" element={<EditAppointment />} />

      <Route path="/documents" element={<Documents />} />
      <Route path="/documents/addDocument" element={<AddDocument />} />
      <Route path="/documents/view/:documentId" element={<ViewDocument />} />
      <Route path="/documents/:documentId" element={<EditDocument />} />

      <Route path="/ClientsCourtfiles" element={<ClientsCourtfiles />} />
      <Route path="/AddClientsCourtfiles" element={<AddClientsCourtfiles />} />

      <Route path="/DeadlinesCourtfiles" element={<DeadlinesCourtfiles />} />
      <Route path="/AddDeadlinesCourtfiles" element={<AddDeadlinesCourtfiles />} />

      <Route path="/LawyersCourtfiles" element={<LawyersCourtfiles />} />
      <Route path="/AddLawyersCourtfiles" element={<AddLawyersCourtfiles />} />

      <Route path="/AppointmentsCourtfiles" element={<AppointmentsCourtfiles />} />
      <Route path="/AddAppointmentsCourtfiles" element={<AddAppointmentsCourtfiles />} />

      <Route path="/SignUpLawyer" element={<SignUpLawyer />} />
      <Route path="/LoginLawyer" element={<LoginLawyer />} />
      <Route path="/DashboardLawyer" element={<DashboardLawyer />} />

    </Route>
  )
);