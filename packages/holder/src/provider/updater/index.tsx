import type { ReactNode } from 'react';
import { createContext, useState } from 'react';

export const UpdaterContext = createContext({
  count: 0,
  setCount: (count: number): void => {
    throw new Error('setAccessToken is not supported');
  },
});
const useUpdater = {
  count: 0,
  setCount: (count: number): void => {
    throw new Error('setAccessToken is not supported');
  },
};

const UpdaterProvider = ({ children }: { children: ReactNode }) => {
  const [count, setCount] = useState<number>(0);

  useUpdater.count = count;
  useUpdater.setCount = setCount;

  return (
    <UpdaterContext.Provider value={{ count, setCount }}>
      {children}
    </UpdaterContext.Provider>
  );
};

export { UpdaterProvider, useUpdater };
