import React from 'react';

import { Cancel as CancelIcon } from '@mui/icons-material';
import { CssBaseline, IconButton, ThemeProvider } from '@mui/material';
import { closeSnackbar, SnackbarProvider } from 'notistack';
import { createRoot } from 'react-dom/client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './index.css';
import App from './App';
import { FileProvider } from './provider/file';
import { theme } from './provider/theme';
import { UpdaterProvider } from './provider/updater';
import reportWebVitals from './reportWebVitals';

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <CssBaseline />
    <SnackbarProvider
      anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
      hideIconVariant
      action={(snackbarId) => (
        <IconButton size="small" onClick={() => closeSnackbar(snackbarId)}>
          <CancelIcon fontSize="small" sx={{ color: 'white' }} />
        </IconButton>
      )}
    />
    <UpdaterProvider>
      <ThemeProvider theme={theme}>
        <FileProvider>
          <App />
        </FileProvider>
      </ThemeProvider>
    </UpdaterProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
