import React, { useEffect } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer.jsx";
import HomeButtons from "../../components/HomeButtons.jsx";


export const DashboardAdminUser = () => {

  const { store, dispatch } = useGlobalReducer()

  return (
    <div className="text-center mt-5">
      <h1 className="display-4 mb-5">Dashboard Admin</h1>
  <HomeButtons/>
  

    </div>
  );
}; 