import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { Box, IconButton, Stack, TextField } from '@mui/material';
import { DIDResolutionResult } from 'did-resolver';
import bwipjs from '@bwip-js/browser';
import { WalrusDID } from '@zktx.io/walrus-did';
import { genAddressSeed } from '@mysten/zklogin';
import { decodeJwt } from 'jose';
import { useRecoilState } from 'recoil';
import { enqueueSnackbar } from 'notistack';
import { walrusDidState } from '../recoil';

export const ViewBarCode = ({ didDoc }: { didDoc: DIDResolutionResult }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');

  const [walrusState] = useRecoilState(walrusDidState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [svgContent, setSvgContent] = useState<string>('');

  const handleClickOpen = () => {
    setSvgContent('');
    setInputValue('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleGenerateBarCode = async () => {
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
            const jwt = await walrusDID.signJWT(didDoc.didDocument.id, {
              walrus: { code: inputValue },
            });
            setSvgContent(
              bwipjs.toSVG({
                bcid: 'pdf417',
                text: jwt,
              }),
            );
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
      <IconButton size="small" onClick={handleClickOpen}>
        <QrCode2Icon fontSize="small" />
      </IconButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Walrus Bar Code</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            width="100%"
            justifyContent="center"
            alignItems="center"
            paddingTop={4}
          >
            {!svgContent && (
              <Stack direction="row" spacing={1} width="100%">
                <TextField
                  fullWidth
                  label="Security code"
                  variant="outlined"
                  value={inputValue}
                  onChange={handleInputChange}
                  size="small"
                />
                <Button
                  variant="contained"
                  disabled={isLoading || !inputValue}
                  onClick={handleGenerateBarCode}
                >
                  Generate
                </Button>
              </Stack>
            )}
            {svgContent && (
              <Box
                sx={{
                  width: 460,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  padding: 1,
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
