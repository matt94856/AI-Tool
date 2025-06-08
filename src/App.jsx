import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import InvestmentPreferences from './components/InvestmentPreferences';
import InvestmentRecommendations from './components/InvestmentRecommendations';
// import Header from './components/Header';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastPreferences, setLastPreferences] = useState(null);

  const handleSubmitPreferences = async (preferences) => {
    setLastPreferences(preferences);
    console.log('Submitting preferences:', preferences);
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received recommendations:', data);
      setRecommendations(data);
    } catch (error) {
      console.error('Error submitting preferences:', error);
      setRecommendations({
        recommendations: [],
        message: `Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* <Header /> */}
        <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <InvestmentPreferences onSubmit={handleSubmitPreferences} />
          <InvestmentRecommendations 
            recommendations={recommendations} 
            loading={loading} 
            preferences={lastPreferences} 
          />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App; 