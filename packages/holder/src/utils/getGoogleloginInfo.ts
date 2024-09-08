import { SuiClient } from '@mysten/sui/client';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { generateNonce, generateRandomness } from '@mysten/zklogin';
import { toB64 } from '@mysten/sui/utils';
import { IAccount } from '../recoil';
import { CLIENT_ID, REDIRECT_URL } from './config';

export const getGoogleloginInfo = async (): Promise<{
  url: string;
  account: IAccount;
}> => {
  const client = new SuiClient({ url: 'https://fullnode.devnet.sui.io' });
  const { epoch } = await client.getLatestSuiSystemState();
  const randomness = generateRandomness();
  const maxEpoch = Number(epoch) + 10;
  const keypair = new Secp256r1Keypair();
  const ephemeralPublicKey = keypair.getPublicKey();
  const nonce = generateNonce(ephemeralPublicKey, maxEpoch, randomness);

  const account: IAccount = {
    nonce: {
      maxEpoch,
      privateKey: toB64(decodeSuiPrivateKey(keypair.getSecretKey()).secretKey),
      publicKey: ephemeralPublicKey.toBase64(),
      randomness,
    },
  };
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=id_token&redirect_uri=${REDIRECT_URL}&scope=openid email profile&nonce=${nonce}`;

  return {
    account,
    url,
  };
};
