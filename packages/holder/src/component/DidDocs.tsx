import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRecoilState } from 'recoil';
import { DIDResolutionResult, Resolver } from 'did-resolver';
import { fromB64, toB64 } from '@mysten/sui/utils';
import { genAddressSeed } from '@mysten/zklogin';
import { decodeJwt } from 'jose';
import { WalrusDID } from '@zktx.io/walrus-did';
import {
  WalrusDIDController,
  WalrusDIDResolver,
} from '@zktx.io/walrus-did-resolver';
import { enqueueSnackbar } from 'notistack';

import { walrusDidState } from '../recoil';
import { FILE_NAME_DID_DOCS, ISSUER } from '../utils/config';
import { useState } from 'react';
import { useProviderFS } from '../provider/file';
import { ViewDoc } from './ViewDoc';

export const DidDocs = () => {
  const fs = useProviderFS();

  const [walrusState, setWalrusState] = useRecoilState(walrusDidState);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleDelete = async (didDoc: DIDResolutionResult) => {
    if (fs && walrusState && didDoc.didDocument && didDoc.didDocument.id) {
      const didDocs = walrusState.didDocs.filter(
        (doc) => JSON.parse(doc).didDocument.id !== didDoc.didDocument!.id,
      );
      setWalrusState({ ...walrusState, didDocs });
      await fs.writeFile(
        FILE_NAME_DID_DOCS,
        Buffer.from(JSON.stringify(didDocs), 'utf8'),
      );
    }
  };

  const handleTest = async (didDoc: DIDResolutionResult) => {
    if (walrusState?.account.nonce && walrusState.account.zkAddress) {
      setIsLoading(true);
      try {
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

        if (addressSeed && decodedJwt.iss) {
          const walrusDID = new WalrusDID({
            privateKey: walrusState.account.nonce.privateKey,
            zkLogin: {
              addressSeed,
              iss: decodedJwt.iss,
              proof: walrusState.account.zkAddress.proof,
              maxEpoch: walrusState.account.nonce.maxEpoch,
            },
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
              const controller = new WalrusDIDController(
                'devnet',
                toB64(fromB64(ISSUER).slice(1)),
              );
              const verification = await WalrusDID.VerifyMetaData(
                verify,
                controller.getPublicKey(),
              );
              if (verification) {
                enqueueSnackbar('DID Doc verification success', {
                  variant: 'success',
                });
              } else {
                enqueueSnackbar('DID Doc verification fail (2)', {
                  variant: 'error',
                });
              }
            } else {
              enqueueSnackbar('DID Doc verification fail (1)', {
                variant: 'error',
              });
            }
          }
        }
      } catch (error) {
        enqueueSnackbar(`${error}`, {
          variant: 'error',
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <>
      {walrusState && walrusState.didDocs.length > 0 && (
        <Stack spacing={1} sx={{ minWidth: 275 }}>
          {walrusState?.didDocs
            .map((json) => JSON.parse(json))
            .map((didDoc, key) => (
              <Card
                key={key}
                variant="outlined"
                sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography sx={{ color: 'text.secondary' }}>
                      Walrus DID
                    </Typography>
                    <span>
                      <ViewDoc didDoc={didDoc} />
                      <IconButton
                        size="small"
                        disabled={isLoading}
                        onClick={() => {
                          handleDelete(didDoc);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Box>
                  <Typography gutterBottom sx={{ color: 'text.primary' }}>
                    {didDoc.didDocument.id}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    disabled={isLoading}
                    onClick={() => {
                      handleTest(didDoc);
                    }}
                  >
                    test
                  </Button>
                </CardActions>
              </Card>
            ))}
        </Stack>
      )}
    </>
  );
};
