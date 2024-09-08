import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import ArticleIcon from '@mui/icons-material/Article';
import { Box, IconButton, Stack, TextField, Typography } from '@mui/material';
import { DIDResolutionResult } from 'did-resolver';

export const ViewDoc = ({ didDoc }: { didDoc: DIDResolutionResult }) => {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <IconButton size="small" onClick={handleClickOpen}>
        <ArticleIcon fontSize="small" />
      </IconButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Walrus DID Doc</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Stack spacing={2}>
              <Stack>
                <Typography>DID</Typography>
                <Box>{didDoc.didDocument?.id}</Box>
              </Stack>
              <TextField
                size="small"
                multiline
                rows={10}
                defaultValue={JSON.stringify(didDoc, null, 4)}
                slotProps={{
                  input: {
                    readOnly: true,
                  },
                }}
              />
            </Stack>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
