import React, { useEffect, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import './App.css';
import { Box, Container, Stack, Typography } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { decodeJwt } from 'jose';
import { Resolver } from 'did-resolver';
import { WalrusDIDResolver } from '@zktx.io/walrus-did-resolver';
import { WalrusDID } from '@zktx.io/walrus-did';

function App() {
  const [disabled, setDisabled] = useState<boolean>(false);
  const [randomNumber, setRandomNumber] = useState<string>('');

  const handleReset = () => {
    const generateRandomNumber = () => {
      const number = Math.floor(1000 + Math.random() * 9000);
      setRandomNumber(number.toString());
    };
    generateRandomNumber();
  };

  const handleVerification = async (jwt: string) => {
    try {
      setDisabled(true);
      const decodedJwt = decodeJwt(jwt);
      if (decodedJwt.iss) {
        const walrusDIDResolver = new WalrusDIDResolver();
        const resolver = new Resolver(walrusDIDResolver.build());
        const verify = await WalrusDID.verifyJWT(jwt, resolver, decodedJwt.iss);
        if (verify.verified) {
          if (
            decodedJwt.walrus &&
            (decodedJwt.walrus as any).code === randomNumber
          ) {
            enqueueSnackbar(`verified : ${decodedJwt.iss}`, {
              variant: 'success',
            });
          } else {
            enqueueSnackbar(`Code Error`, {
              variant: 'warning',
            });
          }
        } else {
          enqueueSnackbar(`error : ${decodedJwt.iss}`, {
            variant: 'error',
          });
        }
      } else {
        enqueueSnackbar(`Holder DID error : ${decodedJwt.iss}`, {
          variant: 'error',
        });
      }
    } catch (error) {
      enqueueSnackbar(`${error}`, {
        variant: 'error',
      });
    } finally {
      setDisabled(false);
    }
  };

  useEffect(() => {
    setDisabled(false);
    handleReset();
  }, []);

  return (
    <div className="App">
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          pt: { xs: 2, sm: 6 },
          pb: { xs: 2, sm: 6 },
        }}
      >
        <Stack
          spacing={1}
          direction="column"
          justifyContent="center"
          alignItems="center"
        >
          <Typography variant="h3">Walrus Pass Verifier</Typography>
          <Box sx={{ width: '400px' }}>
            <Scanner
              paused={disabled}
              scanDelay={30000}
              onScan={([result]) => {
                handleVerification(result.rawValue);
              }}
            />
            ;
          </Box>
          <Typography variant="h5">{`Security code : ${randomNumber}`}</Typography>
        </Stack>
      </Container>
    </div>
  );
}

export default App;
