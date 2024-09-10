import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import {
  Box,
  Button,
  Container,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRecoilState } from 'recoil';

import { useProviderFS } from '../provider/file';
import { IAccount, walrusDidState } from '../recoil';
import { getGoogleloginInfo } from '../utils/getGoogleloginInfo';
import { FILE_NAME_ACCOUNT, FILE_NAME_DID_DOCS, SALT_TEMP } from '../utils/config';
import { Account } from '../component/Account';
import { DidDocs } from '../component/DidDocs';
import { jwtToAddress } from '@mysten/zklogin';
import { getZkProof } from '../utils/getZkProof';

export const Home = () => {
  const initialized = useRef<boolean>(false);

  const fs = useProviderFS();

  const navigate = useNavigate();
  const location = useLocation();

  const [walrusState, setWalrusState] = useRecoilState(walrusDidState);
  const [showLoginBtn, setShowLoginBtn] = useState<boolean>(true);

  const handleGooglelogin = async () => {
    if (fs) {
      const { account, url } = await getGoogleloginInfo();

      await fs.writeFile(
        FILE_NAME_ACCOUNT,
        Buffer.from(JSON.stringify(account), 'utf8'),
      );
      window.location.replace(url);
    }
  };

  const handleReset = async () => {
    if (fs) {
      await fs.rmFile(FILE_NAME_ACCOUNT);
      setWalrusState(undefined);
    }
  };

  const handleLogout = async () => {
    if (fs) {
      await fs.rmFile(FILE_NAME_ACCOUNT);
      const isExist = await fs.isExist(FILE_NAME_DID_DOCS);
      if (isExist) {
        // await fs.rmFile(FILE_NAME_DID_DOCS);
      }
      setWalrusState(undefined);
      navigate('/');
    }
  };

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
            let didDocs: string[] = [];
            const hasDocs = await fs.isExist(FILE_NAME_DID_DOCS);
            if (hasDocs) {
              const docs = await fs.readFile(FILE_NAME_DID_DOCS);
              didDocs = JSON.parse(
                Buffer.from(docs).toString('utf8'),
              ) as string[];
            }
            setWalrusState({ account, didDocs });            
          } else {
            // temp
            setShowLoginBtn(false)
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
            // temp
          }
        } else {
          setWalrusState(undefined);
        }
      }
    };
    !initialized.current && init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs]);

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent:
          initialized && walrusState && walrusState.account.zkAddress
            ? 'start'
            : 'center',
        height: '100vh',
        pt: { xs: 14, sm: 20 },
        pb: { xs: 8, sm: 12 },
      }}
    >
      <Stack spacing={2} alignItems="center">
        {!initialized && (
          <>
            <Typography>Loading</Typography>
            <Box sx={{ width: '200px' }}>
              <LinearProgress />
            </Box>
          </>
        )}
        {initialized && !walrusState && showLoginBtn && (
          <Button
            size="large"
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGooglelogin}
          >
            Login
          </Button>
        )}
        {initialized && walrusState && !walrusState.account.zkAddress && (
          <Button size="large" variant="outlined" onClick={handleReset}>
            Reset
          </Button>
        )}
        {initialized && walrusState && walrusState.account.zkAddress && (
          <Stack spacing={2}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h3">Walrus Pass</Typography>
              <IconButton size="small" onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
            </Box>
            <Account />
            <DidDocs />
          </Stack>
        )}
      </Stack>
    </Container>
  );
};
