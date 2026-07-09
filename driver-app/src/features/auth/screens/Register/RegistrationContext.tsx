import React, { createContext, useContext, useState } from "react";

const RegistrationContext = createContext<any>(null);

export const RegistrationProvider = ({ children }: any) => {
  const [data, setData] = useState({
    personal: {},
    address: {},
    license: {},
    vehicle: {},
    insurance: {},
    photo: null,
  });

  const update = (key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <RegistrationContext.Provider value={{ data, update }}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used inside RegistrationProvider");
  }
  return context;
};
