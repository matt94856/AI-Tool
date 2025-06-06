import React, { useState } from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import InvestmentPreferences from './components/InvestmentPreferences';
import InvestmentRecommendations from './components/InvestmentRecommendations';

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
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmitPreferences = async (preferences) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze stocks');
      }
      
      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container>
        <InvestmentPreferences onSubmit={handleSubmitPreferences} />
        <InvestmentRecommendations 
          recommendations={recommendations}
          loading={loading}
          error={error}
        />
      </Container>
    </ThemeProvider>
  );
}

export default App; 