import React, { createContext, useContext, useState, useCallback } from 'react';

interface CasesContextValue {
  casesVersion: number;
  notifyCasesChanged: () => void;
}

const CasesContext = createContext<CasesContextValue>({
  casesVersion: 0,
  notifyCasesChanged: () => {},
});

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const [casesVersion, setCasesVersion] = useState(0);
  const notifyCasesChanged = useCallback(() => setCasesVersion(v => v + 1), []);
  return (
    <CasesContext.Provider value={{ casesVersion, notifyCasesChanged }}>
      {children}
    </CasesContext.Provider>
  );
}

export function useCases() {
  return useContext(CasesContext);
}