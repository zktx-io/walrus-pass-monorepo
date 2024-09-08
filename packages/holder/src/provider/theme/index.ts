import { createTheme, responsiveFontSizes } from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#fffdfa',
    },
    secondary: {
      main: '#c3cad8',
    },
    success: {
      main: '#35a954',
    },
    info: {
      main: '#e8a894',
    },
    warning: {
      main: '#fbc91e',
    },
    error: {
      main: '#fa0f4b',
    },
  },
  typography: {
    fontFamily: 'Roboto',
    h1: {
      color: '#ffffff',
    },
    h2: {
      color: '#ffffff',
    },
    h3: {
      color: '#ffffff',
    },
    h4: {
      color: '#ffffff',
    },
    h5: {
      color: '#ffffff',
    },
    h6: {
      color: '#ffffff',
    },
    body1: {
      color: '#ffffff',
    },
    body2: {
      color: '#ffffff',
    },
  },
});

export const theme = responsiveFontSizes(darkTheme);
