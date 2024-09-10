import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import {
  Box,
  Container,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { jwtToAddress } from '@mysten/zklogin';
import { useRecoilState } from 'recoil';

import { useProviderFS } from '../provider/file';
import { FILE_NAME_ACCOUNT, SALT_TEMP } from '../utils/config';
import { IAccount, walrusDidState } from '../recoil';
import { getZkProof } from '../utils/getZkProof';

export const Auth = () => {
  const initialized = useRef<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fs = useProviderFS();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setWalrusState] = useRecoilState(walrusDidState);

  useEffect(() => {
    const init = async () => {
      if (fs) {
        initialized.current = true;
        const hasAccount = await fs.isExist(FILE_NAME_ACCOUNT);
        if (hasAccount) {
          const accountJson = await fs.readFile(FILE_NAME_ACCOUNT);
          const account = JSON.parse(
            Buffer.from(accountJson).toString('utf8'),
          ) as IAccount;
          if (account.zkAddress) {
            navigate('/');
          } else {
            const { id_token: jwt } = queryString.parse(location.hash) as {
              id_token: string;
            };
            const address = jwtToAddress(jwt, BigInt(SALT_TEMP));
            const proof = await getZkProof({
              randomness: account.nonce.randomness,
              maxEpoch: account.nonce.maxEpoch,
              jwt,
              ephemeralPublicKey: account.nonce.publicKey,
              salt: SALT_TEMP,
            });
            account.zkAddress = {
              address,
              salt: SALT_TEMP,
              proof,
              jwt,
            };
            setWalrusState({ account, didDocs: [] });
            await fs.writeFile(
              FILE_NAME_ACCOUNT,
              Buffer.from(JSON.stringify(account), 'utf8'),
            );
            navigate('/');
          }
        } else {
          navigate('/');
        }
      }
    };

    !initialized.current && init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs, location.hash]);

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        pt: { xs: 14, sm: 20 },
        pb: { xs: 8, sm: 12 },
      }}
    >
      <Stack
        spacing={1}
        direction="column"
        justifyContent="center"
        alignItems="center"
      >
        <Typography>Generating Wallet</Typography>
        <Box sx={{ width: '200px' }}>
          <LinearProgress />
        </Box>
      </Stack>
    </Container>
  );
};
