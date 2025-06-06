import React, { useState } from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme, Alert, Snackbar } from '@mui/material';
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
  const [showError, setShowError] = useState(false);

  const handleSubmitPreferences = async (preferences) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Submitting preferences:', preferences);
      
      const response = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to analyze stocks');
      }
      
      const data = await response.json();
      console.log('Received recommendations:', data);
      setRecommendations(data);
    } catch (err) {
      console.error('Error submitting preferences:', err);
      setError(err.message);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <InvestmentPreferences onSubmit={handleSubmitPreferences} />
        <InvestmentRecommendations 
          recommendations={recommendations}
          loading={loading}
          error={error}
        />
        <Snackbar 
          open={showError} 
          autoHideDuration={6000} 
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {error || 'An error occurred while analyzing stocks'}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}

export default App; 