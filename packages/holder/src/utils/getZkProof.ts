import { getExtendedEphemeralPublicKey } from '@mysten/zklogin';
import { Secp256r1PublicKey } from '@mysten/sui/keypairs/secp256r1';
import { fromB64 } from '@mysten/sui/utils';
// import { enqueueSnackbar } from 'notistack';

// import { ENOKI } from './config';

export const getZkProof = async ({
  randomness,
  maxEpoch,
  jwt,
  ephemeralPublicKey,
  salt,
}: {
  randomness: string;
  maxEpoch: number;
  jwt: string;
  ephemeralPublicKey: string;
  salt: string;
}): Promise<string> => {
  try {
    const res = await fetch('https://prover-dev.mystenlabs.com/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jwt,
        extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(
          new Secp256r1PublicKey(fromB64(ephemeralPublicKey)),
        ),
        maxEpoch,
        jwtRandomness: randomness,
        salt,
        keyClaimName: 'sub',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`${data.message}`);
    }
    return JSON.stringify(data);
  } catch (error) {
    /*
    enqueueSnackbar(`${error}`, {
      variant: 'error',
    });
    */
    throw new Error(`${error}`);
  }
};
