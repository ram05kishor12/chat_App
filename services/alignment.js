import React, { createContext, useState, useContext } from 'react';

const AlignmentContext = createContext();

export function AlignmentProvider({ children }) {
  const [isAlignedLeft, setIsAlignedLeft] = useState(true);

  return (
    <AlignmentContext.Provider value={{ isAlignedLeft, setIsAlignedLeft }}>
      {children}
    </AlignmentContext.Provider>
  );
}

export function useAlignment() {
  return useContext(AlignmentContext);
}

