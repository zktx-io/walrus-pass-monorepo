import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
} from '@mui/material';
import { bcs } from '@mysten/sui/bcs';
import { fromB64, toB64 } from '@mysten/sui/utils';
import { genAddressSeed } from '@mysten/zklogin';
import { WalrusDID } from '@zktx.io/walrus-did';
import {
  WalrusDIDController,
  WalrusDIDResolver,
} from '@zktx.io/walrus-did-resolver';
import { decodeJwt } from 'jose';
import { enqueueSnackbar } from 'notistack';
import { Resolver } from 'did-resolver';
import { useRecoilState } from 'recoil';

import { walrusDidState } from '../recoil';
import { FILE_NAME_DID_DOCS } from '../utils/config';
import { useProviderFS } from '../provider/file';

export const Account = () => {
  const fs = useProviderFS();

  const ISSUER = process.env.REACT_APP_ISSUER;
  const [walrusState, setWalrusState] = useRecoilState(walrusDidState);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCreateWalrusDid = async () => {
    if (fs && walrusState?.account.nonce && walrusState.account.zkAddress) {
      try {
        setIsLoading(true);
        const decodedJwt = decodeJwt(walrusState.account.zkAddress.jwt);
        const addressSeed =
          decodedJwt &&
          decodedJwt.sub &&
          decodedJwt.aud &&
          genAddressSeed(
            BigInt(walrusState.account.zkAddress.salt),
            'sub',
            decodedJwt.sub,
            decodedJwt.aud as string,
          ).toString();

        if (addressSeed && decodedJwt.iss && ISSUER) {
          const walrusDID = new WalrusDID({
            privateKey: walrusState.account.nonce.privateKey,
            zkLogin: {
              addressSeed,
              iss: decodedJwt.iss,
              proof: walrusState.account.zkAddress.proof,
              maxEpoch: walrusState.account.nonce.maxEpoch,
            },
          });

          const subject = bcs.string().serialize('test subject 1').toBytes();
          const signature = await walrusDID.sign(subject);
          const controller = new WalrusDIDController(
            'devnet',
            toB64(fromB64(ISSUER).slice(1)),
          );
          const didDoc = await controller.create({
            subject: toB64(subject),
            publicKey: walrusDID.getPublicKey(),
            signature,
          });

          if (didDoc.didDocument) {
            const jwt = await walrusDID.signJWT(didDoc.didDocument.id, didDoc);
            const walrusDIDResolver = new WalrusDIDResolver();
            const resolver = new Resolver(walrusDIDResolver.build());
            const verify = await walrusDID.verifyJWT(
              jwt,
              resolver,
              didDoc.didDocument.id,
            );
            if (verify.verified) {
              const hasDocs = await fs.isExist(FILE_NAME_DID_DOCS);
              let didDocs: string[] = [];
              if (hasDocs) {
                const docs = await fs.readFile(FILE_NAME_DID_DOCS);
                didDocs = JSON.parse(
                  Buffer.from(docs).toString('utf8'),
                ) as string[];
              }
              didDocs.push(JSON.stringify(didDoc));
              await fs.writeFile(
                FILE_NAME_DID_DOCS,
                Buffer.from(JSON.stringify(didDocs), 'utf8'),
              );
              setWalrusState({
                ...walrusState,
                didDocs,
              });
              enqueueSnackbar(`${didDoc.didDocument.id}`, {
                variant: 'success',
              });
            } else {
              enqueueSnackbar(`verification fail: ${didDoc.didDocument.id}`, {
                variant: 'error',
              });
            }
          }
        }
      } catch (error) {
        enqueueSnackbar(`${error}`, {
          variant: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      {walrusState?.account.zkAddress && (
        <Box sx={{ minWidth: 275 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ color: 'text.secondary' }}>account</Typography>
              <Typography
                gutterBottom
                sx={{
                  color: 'text.primary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {walrusState.account.zkAddress.address}
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <Button
                size="small"
                disabled={isLoading}
                onClick={handleCreateWalrusDid}
              >
                Create Walrus DID
              </Button>
            </CardActions>
          </Card>
        </Box>
      )}
    </>
  );
};
