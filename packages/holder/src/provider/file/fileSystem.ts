import type { FSModule } from 'browserfs/dist/node/core/FS';

export class FileSystem {
  private static _isDirectory = async (
    fs: FSModule,
    path: string,
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      fs.stat(path, (e, stats) => {
        if (e || !stats) {
          reject();
        } else {
          resolve(stats.isDirectory());
        }
      });
    });
  };

  private static _isExist = async (
    fs: FSModule,
    path: string,
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      try {
        fs.exists(path, resolve);
      } catch (_) {
        reject();
      }
    });
  };

  private static _isDir = async (
    fs: FSModule,
    path: string,
  ): Promise<{ path: string; isDirectory: boolean }> => {
    return new Promise((resolve, reject) => {
      try {
        fs.lstat(path, (e, stats) => {
          if (e || !stats) {
            reject();
          } else {
            resolve({ path, isDirectory: stats.isDirectory() });
          }
        });
      } catch (_) {
        reject();
      }
    });
  };

  private static _rename = async (
    fs: FSModule,
    oldPath: string,
    newPath: string,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      fs.exists(newPath, (isExist) => {
        if (isExist) {
          reject();
        } else {
          fs.rename(oldPath, newPath, (e) => {
            if (e) {
              reject();
            } else {
              resolve();
            }
          });
        }
      });
    });
  };

  private static _mkDir = async (fs: FSModule, path: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      fs.mkdir(path, 777, (e) => {
        if (e) {
          reject();
        } else {
          resolve();
        }
      });
    });
  };

  private static _rmDir = async (fs: FSModule, path: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      fs.rmdir(path, (e) => {
        if (e) {
          reject();
        } else {
          resolve();
        }
      });
    });
  };

  private static _rmDirRecursive = async (
    fs: FSModule,
    path: string,
  ): Promise<void> => {
    const rmdirRecursiveAsync = async (folder: string): Promise<void> => {
      const list = await FileSystem._readDir(fs, folder);
      await Promise.all(
        list.map(async (item) => {
          const itemPath = `${folder}/${item}`;
          const isFolder = await FileSystem._isDirectory(fs, itemPath);
          if (isFolder) {
            return rmdirRecursiveAsync(itemPath);
          } else {
            return FileSystem._rmFile(fs, itemPath);
          }
        }),
      );
      await FileSystem._rmDir(fs, folder);
    };
    return rmdirRecursiveAsync(path);
  };

  private static _readDir = async (
    fs: FSModule,
    path: string,
  ): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      fs.readdir(path, (e, data) => {
        if (e || !data) {
          reject();
        } else {
          resolve(data);
        }
      });
    });
  };

  private static _writeFile = async (
    fs: FSModule,
    path: string,
    data: any,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, data, (e) => {
        if (e) {
          reject();
        } else {
          resolve();
        }
      });
    });
  };

  private static _readFile = async (
    fs: FSModule,
    path: string,
  ): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (e, data) => {
        if (e || !data) {
          reject();
        } else {
          resolve(data);
        }
      });
    });
  };

  private static _rmFile = async (
    fs: FSModule,
    path: string,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      fs.unlink(path, (e) => {
        if (e) {
          reject();
        } else {
          resolve();
        }
      });
    });
  };

  private static _copyFile = async (
    fs: FSModule,
    source: string,
    target: string,
    name: string,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      FileSystem._isDirectory(fs, target)
        .then((isDirectory) => {
          if (isDirectory) {
            fs.readFile(source, (e, data) => {
              if (e || !data) {
                reject();
              } else {
                const fileName = `${target}/${name}`;
                fs.exists(fileName, (isExist) => {
                  if (isExist) {
                    reject();
                  } else {
                    fs.writeFile(`${target}/${name}`, data, (e) => {
                      if (e) {
                        reject();
                      } else {
                        resolve();
                      }
                    });
                  }
                });
              }
            });
          } else {
            reject();
          }
        })
        .catch(() => {
          reject();
        });
    });
  };

  // <---------------------  public functions  ---------------------> //
  isExist(path: string): Promise<boolean> {
    throw new Error();
  }
  isDir(path: string): Promise<{ path: string; isDirectory: boolean }> {
    throw new Error();
  }
  rename(oldPath: string, newPath: string): Promise<void> {
    throw new Error();
  }
  mkDir(path: string): Promise<void> {
    throw new Error();
  }
  rmDir(path: string): Promise<void> {
    throw new Error();
  }
  readDir(path: string): Promise<string[]> {
    throw new Error();
  }
  writeFile(path: string, data: any): Promise<void> {
    throw new Error();
  }
  rmFile(path: string): Promise<void> {
    throw new Error();
  }
  copyFile(source: string, target: string, name: string): Promise<void> {
    throw new Error();
  }
  readFile(path: string): Promise<Buffer> {
    throw new Error();
  }

  constructor(fs: FSModule) {
    this.isExist = FileSystem._isExist.bind(this, fs);
    this.isDir = FileSystem._isDir.bind(this, fs);
    this.rename = FileSystem._rename.bind(this, fs);
    this.mkDir = FileSystem._mkDir.bind(this, fs);
    this.rmDir = FileSystem._rmDirRecursive.bind(this, fs);
    this.readDir = FileSystem._readDir.bind(this, fs);
    this.writeFile = FileSystem._writeFile.bind(this, fs);
    this.readFile = FileSystem._readFile.bind(this, fs);
    this.rmFile = FileSystem._rmFile.bind(this, fs);
    this.copyFile = FileSystem._copyFile.bind(this, fs);
  }
}
