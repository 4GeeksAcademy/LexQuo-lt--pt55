export const initialStore = () => {
  return {
    message: null,
    courtfiles: [],
    lawyers: [],
    clients: [],
    admins: [],
    deadlines: [],
    clientsCourtfiles: [],
    todos: [],
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
      return { ...store, clientsCourtfiles: [...store.clientsCourtfiles, action.payload] };

    case "DELETE_CLIENT_COURTFILE":
      return {
        ...store,
        clientsCourtfiles: store.clientsCourtfiles.filter((cc) => cc.id !== action.payload),
      };
    
    /* DEADLINE–COURTFILES */

    case "SET_DEADLINE_COURTFILES":
      return { ...store, deadlinesCourtfiles: action.payload };

    case "ADD_DEADLINE_COURTFILE":
      return { ...store, deadlinesCourtfiles: [...store.deadlinesCourtfiles, action.payload] };

    case "DELETE_DEADLINE_COURTFILE":
      return {
        ...store,
        deadlinesCourtfiles: store.deadlinesCourtfiles.filter((cc) => cc.id !== action.payload),
      };

    /* LAWYER–COURTFILES */

    case "SET_LAWYER_COURTFILES":
      return { ...store, lawyersCourtfiles: action.payload };

    case "ADD_LAWYER_COURTFILE":
      return { ...store, lawyersCourtfiles: [...store.lawyersCourtfiles, action.payload] };

    case "DELETE_LAWYER_COURTFILE":
      return {
        ...store,
        lawyersCourtfiles: store.lawyersCourtfiles.filter((cc) => cc.id !== action.payload),
      };


    default:
      throw Error("Unknown action.");
  }
}
