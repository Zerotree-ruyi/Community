import { createContext, useContext, useState, ReactNode } from 'react';

interface LeverageContextType {
  leverage: string;
  setLeverage: (leverage: string) => void;
}

const LeverageContext = createContext<LeverageContextType | undefined>(undefined);

export function LeverageProvider({ children }: { children: ReactNode }) {
  const [leverage, setLeverage] = useState('10'); // 默认10倍杠杆

  return (
    <LeverageContext.Provider value={{ leverage, setLeverage }}>
      {children}
    </LeverageContext.Provider>
  );
}

export function useLeverage() {
  const context = useContext(LeverageContext);
  if (!context) {
    throw new Error('useLeverage must be used within LeverageProvider');
  }
  return context;
}
