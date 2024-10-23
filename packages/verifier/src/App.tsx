import React, { useEffect, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import './App.css';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { decodeJwt } from 'jose';
import { Resolver } from 'did-resolver';
import { WalrusDIDResolver } from '@zktx.io/walrus-did-resolver';
import { WalrusDID } from '@zktx.io/walrus-did';

function App() {
  const [disabled, setDisabled] = useState<boolean>(false);
  const [randomNumber, setRandomNumber] = useState<string>('');
  const [isNFC, setIsNFC] = useState<boolean>(false);
  const [init, setInit] = useState<boolean>(false);

  const handleNFCScan = async () => {
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      ndef.addEventListener('readingerror', () => {
        enqueueSnackbar('Cannot read data from the NFC tag. Try another one?', {
          variant: 'error',
        });
      });

      ndef.addEventListener('reading', (data: any) => {
        enqueueSnackbar(`> Serial Number: ${JSON.stringify(data)}`, {
          variant: 'info',
        });
      });
      enqueueSnackbar('Scan started', {
        variant: 'info',
      });
    } catch (error) {
      enqueueSnackbar(`${error}`, {
        variant: 'error',
      });
    }
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
    const generateRandomNumber = () => {
      const number = Math.floor(1000 + Math.random() * 9000);
      setRandomNumber(number.toString());
    };
    setDisabled(false);
    generateRandomNumber();
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
            {!init && (
              <Box>
                <Button
                  disabled={!('NDEFReader' in window)}
                  onClick={() => {
                    setIsNFC(true);
                    setInit(true);
                    handleNFCScan();
                  }}
                >
                  NFC
                </Button>
                <Button
                  onClick={() => {
                    setInit(true);
                  }}
                >
                  QR
                </Button>
              </Box>
            )}
            {init && isNFC && <Typography variant="h4">NFC Scan</Typography>}
            {init && !isNFC && (
              <Scanner
                paused={disabled}
                scanDelay={30000}
                onScan={([result]) => {
                  handleVerification(result.rawValue);
                }}
              />
            )}
          </Box>
          {init && (
            <Typography variant="h5">{`Security code : ${randomNumber}`}</Typography>
          )}
        </Stack>
      </Container>
    </div>
  );
}

export default App;
