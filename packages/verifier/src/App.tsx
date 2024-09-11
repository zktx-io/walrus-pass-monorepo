import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import './App.css';
import { Box, Container, Stack, Typography } from '@mui/material';

function App() {
  return (
    <div className="App">
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          pt: { xs: 8, sm: 12 },
          pb: { xs: 8, sm: 12 },
        }}
      >
        <Stack
          spacing={1}
          direction="column"
          justifyContent="center"
          alignItems="center"
        >
          <Typography variant="h3" color="white">
            Walrus Pass Verifier
          </Typography>
          <Box sx={{ width: '400px' }}>
            <Scanner onScan={(result) => console.log(result)} />;
          </Box>
          <Typography variant="h5" color="white">
            {`Security code :`}
          </Typography>
        </Stack>
      </Container>
    </div>
  );
}

export default App;