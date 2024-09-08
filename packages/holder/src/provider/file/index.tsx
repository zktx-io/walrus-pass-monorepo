import type { ReactElement } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import * as BrowserFS from 'browserfs';

import { FileSystem } from './fileSystem';

export const FileContext = createContext<FileSystem | undefined>(undefined);

export const FileProvider = ({ children }: { children: ReactElement }) => {
  const initialized = useRef<boolean>(false);
  const [fileSystem, setFileSystem] = useState<FileSystem | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      BrowserFS.install(window);
      BrowserFS.configure(
        {
          fs: 'LocalStorage',
          options: {},
        },
        () => {
          setFileSystem(new FileSystem(BrowserFS.BFSRequire('fs')));
        },
      );
    }
  }, []);

  return (
    <FileContext.Provider value={fileSystem}>
      {fileSystem && children}
    </FileContext.Provider>
  );
};

export const useProviderFS = () => {
  return useContext(FileContext);
};
