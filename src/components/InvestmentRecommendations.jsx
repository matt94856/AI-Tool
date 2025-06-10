import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Typography,
  Alert,
  Chip,
  Stack,
  Container,
  Button
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SpeedIcon from '@mui/icons-material/Speed';

const isDetailedStock = stock =>
  stock && (stock.roe !== undefined || stock.dividendYield !== undefined || stock.marketCap !== undefined);

const InvestmentRecommendations = ({ recommendations, loading, preferences }) => {
  const [analyzingTicker, setAnalyzingTicker] = useState(null);
  const [aiReport, setAiReport] = useState({});
  const [financials, setFinancials] = useState({}); // { [ticker]: { ...financials } }
  const [aiWarmedUp, setAiWarmedUp] = useState(false);
  const [aiWarmupError, setAiWarmupError] = useState(null);

  // Fetch Yahoo financials in the background for each recommended stock
  useEffect(() => {
    if (!recommendations || !recommendations.recommendations) return;
    const stocks = recommendations.recommendations;
    stocks.forEach(stock => {
      if (!financials[stock.ticker]) {
        fetch(`/.netlify/functions/stockFinancials?symbol=${stock.ticker}`)
          .then(res => res.json())
          .then(data => {
            setFinancials(prev => ({ ...prev, [stock.ticker]: data }));
          })
          .catch(() => {
            setFinancials(prev => ({ ...prev, [stock.ticker]: { error: 'Failed to load financials' } }));
          });
      }
    });
    // eslint-disable-next-line
  }, [recommendations]);

  // Warm up the analyzeStock function in the background for the first stock
  useEffect(() => {
    if (!recommendations || !recommendations.recommendations || !preferences) return;
    const firstStock = recommendations.recommendations[0];
    const fin = financials[firstStock?.ticker];
    if (firstStock && fin && fin.currentPrice !== undefined && !aiWarmedUp) {
      setAiWarmupError(null);
      fetch('/.netlify/functions/analyzeStock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: { ...firstStock, ...fin }, preferences })
      })
        .then(res => res.json())
        .then(() => setAiWarmedUp(true))
        .catch((err) => {
          setAiWarmupError('AI warmup failed. Try reloading the page.');
        });
    }
    // eslint-disable-next-line
  }, [recommendations, financials, preferences, aiWarmedUp]);

  const handleAnalyze = async (stock) => {
    setAnalyzingTicker(stock.ticker);
    setAiReport((prev) => ({ ...prev, [stock.ticker]: null }));
    try {
      const stockWithFinancials = { ...stock, ...financials[stock.ticker] };
      const response = await fetch('/.netlify/functions/analyzeStock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: stockWithFinancials, preferences })
      });
      const data = await response.json();
      setAiReport((prev) => ({
        ...prev,
        [stock.ticker]: {
          analysis: data.analysis,
          stockData: data.stockData
        }
      }));
    } catch (error) {
      setAiReport((prev) => ({ ...prev, [stock.ticker]: { analysis: 'Error analyzing stock.' } }));
    } finally {
      setAnalyzingTicker(null);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Handle the new response format
  if (!recommendations || !recommendations.recommendations) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info">
          {recommendations?.message || 'No recommendations available. Please try adjusting your preferences.'}
        </Alert>
      </Container>
    );
  }

  const { recommendations: stockRecommendations, message } = recommendations;

  if (stockRecommendations.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info">
          {message || 'No stocks found matching your criteria. Try adjusting your preferences.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Recommended Stocks
      </Typography>
      {!aiWarmedUp && (
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Warming up AI model for analysis...
          </Typography>
          {aiWarmupError && (
            <Alert severity="error" sx={{ ml: 2 }}>{aiWarmupError}</Alert>
          )}
        </Box>
      )}
      <Grid container spacing={3}>
        {stockRecommendations.map((stock) => {
          const fin = financials[stock.ticker];
          const financialsLoaded = fin && !fin.error && fin.currentPrice !== undefined;
          const analyzeDisabled = !financialsLoaded || analyzingTicker === stock.ticker || !aiWarmedUp;
          return (
            <Grid item xs={12} md={6} key={stock.ticker}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5" component="div">
                      {stock.ticker}
                    </Typography>
                    <Chip 
                      label={financialsLoaded && fin.priceChangePercent > 0 ? 'Up' : 'Down'}
                      color={financialsLoaded && fin.priceChangePercent > 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    {stock.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {stock.rationale}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <AttachMoneyIcon color="primary" />
                        <Typography variant="body2">
                          {financialsLoaded ? `$${(fin.currentPrice ?? 0).toFixed(2)}` : 'Loading...'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <ShowChartIcon color="primary" />
                        <Typography variant="body2">
                          {financialsLoaded ? `${((fin.marketCap ?? 0) / 1e9).toFixed(2)}B` : 'Loading...'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LocalAtmIcon color="primary" />
                        <Typography variant="body2">
                          {financialsLoaded ? `${(fin.dividendYield ?? 0).toFixed(2)}% Yield` : 'Loading...'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SpeedIcon color="primary" />
                        <Typography variant="body2">
                          {financialsLoaded ? `Beta: ${(fin.beta ?? 0).toFixed(2)}` : 'Loading...'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Button variant="outlined" size="small" onClick={() => handleAnalyze(stock)} disabled={analyzeDisabled} title={!aiWarmedUp ? 'AI is warming up, please wait...' : (!financialsLoaded ? 'Loading financials...' : '')}>
                    {!financialsLoaded ? 'Loading...' : (!aiWarmedUp ? 'Warming up AI...' : (analyzingTicker === stock.ticker ? 'Analyzing...' : 'Analyze'))}
                  </Button>
                  {aiReport[stock.ticker] && (
                    <Box mt={2}>
                      <Typography variant="body2" color="primary" sx={{ whiteSpace: 'pre-line' }}>
                        {aiReport[stock.ticker].analysis}
                      </Typography>
                      {aiReport[stock.ticker].stockData && (
                        <Box mt={2}>
                          <Typography variant="subtitle2" gutterBottom>Yahoo Finance Data:</Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6} sm={4}><b>Current Price:</b> ${aiReport[stock.ticker].stockData.currentPrice?.toFixed(2) ?? 'N/A'}</Grid>
                            <Grid item xs={6} sm={4}><b>Market Cap:</b> ${(aiReport[stock.ticker].stockData.marketCap / 1e9).toFixed(2)}B</Grid>
                            <Grid item xs={6} sm={4}><b>Beta:</b> {aiReport[stock.ticker].stockData.beta ?? 'N/A'}</Grid>
                            <Grid item xs={6} sm={4}><b>Dividend Yield:</b> {aiReport[stock.ticker].stockData.dividendYield?.toFixed(2) ?? 'N/A'}%</Grid>
                            <Grid item xs={6} sm={4}><b>Debt/Equity:</b> {aiReport[stock.ticker].stockData.debtToEquity ?? 'N/A'}</Grid>
                            <Grid item xs={6} sm={4}><b>Cash:</b> ${aiReport[stock.ticker].stockData.cash?.toLocaleString() ?? 'N/A'}</Grid>
                            <Grid item xs={6} sm={4}><b>Equity:</b> ${aiReport[stock.ticker].stockData.equity?.toLocaleString() ?? 'N/A'}</Grid>
                          </Grid>
                        </Box>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default InvestmentRecommendations; 