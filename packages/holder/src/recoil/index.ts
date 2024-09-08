import { atom } from 'recoil';

export interface INonce {
  maxEpoch: number;
  privateKey: string;
  publicKey: string;
  randomness: string;
}

export interface IAccount {
  email?: string;
  picture?: string;
  nonce: INonce;
  zkAddress?: {
    address: string;
    proof: string;
    salt: string;
    jwt: string;
  };
}

export interface IState {
  account: IAccount;
  didDocs: string[];
}

export const walrusDidState = atom<IState | undefined>({
  key: 'account',
  default: undefined,
});
