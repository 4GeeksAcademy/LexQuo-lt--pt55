export const initialStore = () => {
  const persistedAuth = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  })();

  return {
    message: null,
    todos: [],
    courtfiles: [],
    lawyers: [],
    clients: [],
    admins: [],
    payments: [],
    deadlines: [],
    appointments: [],
    documents: [],
    clientsCourtfiles: [],
    deadlinesCourtfiles: [],
    lawyersCourtfiles: [],
    appointmentsCourtfiles: [],
    lawyerClient: [],
    courtfileDocument: [],
    paymentCourtfiles: [],
    auth: persistedAuth || null,
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "set_hello":
      return {
        ...store,
        message: action.payload,
      };

    case "add_task":
      const { id, color } = action.payload;

      return {
        ...store,
        todos: store.todos.map((todo) =>
          todo.id === id ? { ...todo, background: color } : todo
        ),
      };

    /* AUTH (nuevo) */
    case "SET_AUTH": {
      return { ...store, auth: action.payload };
    }
    case "CLEAR_AUTH": {
      return { ...store, auth: null };
    }
    case "UPDATE_AUTH_USER": {
      if (!store.auth) return store;
      return {
        ...store,
        auth: {
          ...store.auth,
          user: { ...store.auth.user, ...action.payload },
        },
      };
    }

    /* COURTFILES */

    case "SET_COURTFILES":
      return { ...store, courtfiles: action.payload };
    case "ADD_COURTFILE":
      return { ...store, courtfiles: [...store.courtfiles, action.payload] };
    case "DELETE_COURTFILE":
      return {
        ...store,
        courtfiles: store.courtfiles.filter((cf) => cf.id !== action.payload),
      };
    case "UPDATE_COURTFILE":
      return {
        ...store,
        courtfiles: store.courtfiles.map((cf) =>
          cf.id === action.payload.id ? action.payload : cf
        ),
      };

    /* LAWYERS */

    case "SET_LAWYERS":
      return { ...store, lawyers: action.payload };
    case "ADD_LAWYER":
      return { ...store, lawyers: [...store.lawyers, action.payload] };
    case "DELETE_LAWYER":
      return {
        ...store,
        lawyers: store.lawyers.filter((cf) => cf.id !== action.payload),
      };
    case "UPDATE_LAWYER":
      return {
        ...store,
        lawyers: store.lawyers.map((cf) =>
          cf.id === action.payload.id ? action.payload : cf
        ),
      };

    /* CLIENTS */

    case "SET_CLIENTS":
      return { ...store, clients: action.payload };
    case "ADD_CLIENT":
      return { ...store, clients: [...store.clients, action.payload] };
    case "DELETE_CLIENT":
      return {
        ...store,
        clients: store.clients.filter((cl) => cl.id !== action.payload),
      };
    case "UPDATE_CLIENT":
      return {
        ...store,
        clients: store.clients.map((cl) =>
          cl.id === action.payload.id ? action.payload : cl
        ),
      };

    /* ADMINS */

    case "SET_ADMINS":
      return { ...store, admins: action.payload };
    case "ADD_ADMIN":
      return { ...store, admins: [...store.admins, action.payload] };
    case "DELETE_ADMIN":
      return {
        ...store,
        admins: store.admins.filter((ad) => ad.id !== action.payload),
      };
    case "UPDATE_ADMIN":
      return {
        ...store,
        admins: store.admins.map((ad) =>
          ad.id === action.payload.id ? action.payload : ad
        ),
      };

    /* PAYMENTS */

    case "SET_PAYMENTS":
      return { ...store, payments: action.payload };
    case "ADD_PAYMENT":
      return { ...store, payments: [...store.payments, action.payload] };
    case "DELETE_PAYMENT":
      return {
        ...store,
        payments: store.payments.filter((pa) => pa.id !== action.payload),
      };
    case "UPDATE_PAYMENT":
      return {
        ...store,
        payments: store.payments.map((pa) =>
          pa.id === action.payload.id ? action.payload : pa
        ),
      };

    /* APPOINTMENTS */

    case "SET_APPOINTMENTS":
      return { ...store, appointments: action.payload };
    case "ADD_APPOINTMENT":
      return {
        ...store,
        appointments: [...store.appointments, action.payload],
      };
    case "DELETE_APPOINTMENT":
      return {
        ...store,
        appointments: store.appointments.filter(
          (ap) => ap.id !== action.payload
        ),
      };
    case "UPDATE_APPOINTMENT":
      return {
        ...store,
        appointments: store.appointments.map((ap) =>
          ap.id === action.payload.id ? action.payload : ap
        ),
      };

    /* DOCUMENTS */

    case "SET_DOCUMENTS":
      return { ...store, documents: action.payload };
    case "ADD_DOCUMENT":
      return { ...store, documents: [...store.documents, action.payload] };
    case "DELETE_DOCUMENT":
      return {
        ...store,
        documents: store.documents.filter((doc) => doc.id !== action.payload),
      };
    case "UPDATE_DOCUMENT":
      return {
        ...store,
        documents: store.documents.map((doc) =>
          doc.id === action.payload.id ? action.payload : doc
        ),
      };

    /* DEADLINES */

    case "SET_DEADLINES":
      return { ...store, deadlines: action.payload };

    case "ADD_DEADLINE":
      return { ...store, deadlines: [...store.deadlines, action.payload] };

    case "DELETE_DEADLINE":
      return {
        ...store,
        deadlines: store.deadlines.filter((dl) => dl.id !== action.payload),
      };

    case "UPDATE_DEADLINE":
      return {
        ...store,
        deadlines: store.deadlines.map((dl) =>
          dl.id === action.payload.id ? action.payload : dl
        ),
      };

    /* CLIENT–COURTFILES */

    case "SET_CLIENT_COURTFILES":
      return { ...store, clientsCourtfiles: action.payload };

    case "ADD_CLIENT_COURTFILE":
      return {
        ...store,
        clientsCourtfiles: [...store.clientsCourtfiles, action.payload],
      };

    case "DELETE_CLIENT_COURTFILE":
      return {
        ...store,
        clientsCourtfiles: store.clientsCourtfiles.filter(
          (cc) => cc.id !== action.payload
        ),
      };

    /* DEADLINE–COURTFILES */

    case "SET_DEADLINE_COURTFILES":
      return { ...store, deadlinesCourtfiles: action.payload };

    case "ADD_DEADLINE_COURTFILE":
      return {
        ...store,
        deadlinesCourtfiles: [...store.deadlinesCourtfiles, action.payload],
      };

    case "DELETE_DEADLINE_COURTFILE":
      return {
        ...store,
        deadlinesCourtfiles: store.deadlinesCourtfiles.filter(
          (cc) => cc.id !== action.payload
        ),
      };

    /* LAWYER–COURTFILES */

    case "SET_LAWYER_COURTFILES":
      return { ...store, lawyersCourtfiles: action.payload };

    case "ADD_LAWYER_COURTFILE":
      return {
        ...store,
        lawyersCourtfiles: [...store.lawyersCourtfiles, action.payload],
      };

    case "DELETE_LAWYER_COURTFILE":
      return {
        ...store,
        lawyersCourtfiles: store.lawyersCourtfiles.filter(
          (cc) => cc.id !== action.payload
        ),
      };

    /* APPOINTMENTS–COURTFILES */

    case "SET_APPOINTMENT_COURTFILES":
      return { ...store, appointmentsCourtfiles: action.payload };

    case "ADD_APPOINTMENT_COURTFILE":
      return {
        ...store,
        appointmentsCourtfiles: [
          ...store.appointmentsCourtfiles,
          action.payload,
        ],
      };

    case "DELETE_APPOINTMENT_COURTFILE":
      return {
        ...store,
        appointmentsCourtfiles: store.appointmentsCourtfiles.filter(
          (cc) => cc.id !== action.payload
        ),
      };

    /* LAWYER–CLIENT */

    case "SET_LAWYER_CLIENT":
      return { ...store, lawyerClient: action.payload };

    case "ADD_LAWYER_CLIENT":
      return {
        ...store,
        lawyerClient: [...store.lawyerClient, action.payload],
      };

    case "DELETE_LAWYER_CLIENT":
      return {
        ...store,
        lawyerClient: store.lawyerClient.filter(
          (lc) => lc.id !== action.payload
        ),
      };

    /* COURTFILE-DOCUMENT */

    case "SET_COURTFILE_DOCUMENT":
      return { ...store, courtfileDocument: action.payload };

    case "ADD_COURTFILE_DOCUMENT":
      return {
        ...store,
        courtfileDocument: [...store.courtfileDocument, action.payload],
      };

    case "DELETE_COURTFILE_DOCUMENT":
      return {
        ...store,
        courtfileDocument: store.courtfileDocument.filter(
          (cd) => cd.id !== action.payload
        ),
      };

    /* PAYMENT-COURTFILE */

    case "SET_PAYMENT_COURTFILE":
      return { ...store, paymentCourtfiles: action.payload };

    case "ADD_PAYMENT_COURTFILE":
      return {
        ...store,
        paymentCourtfiles: [...store.paymentCourtfiles, action.payload],
      };

    case "DELETE_PAYMENT_COURTFILE":
      return {
        ...store,
        paymentCourtfiles: store.paymentCourtfiles.filter(
          (pc) => pc.id !== action.payload
        ),
      };      
      
    default:
      throw Error("Unknown action.");
  }
}
