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
  const [aiWarmedUp, setAiWarmedUp] = useState({}); // { [ticker]: true/false }
  const [aiWarmupLoading, setAiWarmupLoading] = useState({}); // { [ticker]: true/false }
  const [aiWarmupError, setAiWarmupError] = useState({}); // { [ticker]: error message }

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

  const handleAnalyze = async (stock) => {
    const ticker = stock.ticker;
    const financialsLoaded = financials[ticker] && !financials[ticker].error && financials[ticker].currentPrice !== undefined;
    if (!aiWarmedUp[ticker]) {
      // Warm up AI for this stock
      setAiWarmupLoading(prev => ({ ...prev, [ticker]: true }));
      setAiWarmupError(prev => ({ ...prev, [ticker]: null }));
      try {
        await fetch('/.netlify/functions/analyzeStock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: { ...stock, ...financials[ticker] }, preferences })
        });
        setAiWarmedUp(prev => ({ ...prev, [ticker]: true }));
      } catch (err) {
        setAiWarmupError(prev => ({ ...prev, [ticker]: 'AI warmup failed. Try again.' }));
      } finally {
        setAiWarmupLoading(prev => ({ ...prev, [ticker]: false }));
      }
      return; // Instruct user to click again
    }
    // If already warmed up, run the real analysis
    setAnalyzingTicker(ticker);
    setAiReport((prev) => ({ ...prev, [ticker]: null }));
    try {
      const stockWithFinancials = { ...stock, ...financials[ticker] };
      const response = await fetch('/.netlify/functions/analyzeStock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: stockWithFinancials, preferences })
      });
      const data = await response.json();
      let analysisText = data.analysis;
      if (analysisText && analysisText.includes('AI analysis unavailable at this time (timeout).')) {
        analysisText = 'Click again to view your results.';
      }
      setAiReport((prev) => ({
        ...prev,
        [ticker]: {
          analysis: analysisText,
          stockData: data.stockData
        }
      }));
    } catch (error) {
      setAiReport((prev) => ({ ...prev, [ticker]: { analysis: 'Error analyzing stock.' } }));
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
      <Grid container spacing={3}>
        {stockRecommendations.map((stock) => {
          const ticker = stock.ticker;
          const fin = financials[ticker];
          const financialsLoaded = fin && !fin.error && fin.currentPrice !== undefined;
          const isWarmedUp = aiWarmedUp[ticker];
          const isWarmingUp = aiWarmupLoading[ticker];
          const warmupError = aiWarmupError[ticker];
          const analyzeDisabled = !financialsLoaded || analyzingTicker === ticker || isWarmingUp;
          let analyzeLabel = 'Analyze';
          if (!financialsLoaded) analyzeLabel = 'Loading...';
          else if (isWarmingUp) analyzeLabel = 'Warming up AI...';
          else if (!isWarmedUp) analyzeLabel = 'Analyze';
          else if (analyzingTicker === ticker) analyzeLabel = 'Analyzing...';
          else analyzeLabel = 'Analyze';
          return (
            <Grid item xs={12} md={6} key={ticker}>
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
                      {ticker}
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
                  <Button variant="outlined" size="small" onClick={() => handleAnalyze(stock)} disabled={analyzeDisabled} title={isWarmingUp ? 'Warming up AI, please wait...' : (!financialsLoaded ? 'Loading financials...' : '')}>
                    {analyzeLabel}
                  </Button>
                  {!isWarmedUp && !isWarmingUp && financialsLoaded && !warmupError && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      First time? Click Analyze to warm up the AI model. After it finishes, click Analyze again for your result.
                    </Typography>
                  )}
                  {isWarmingUp && (
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" color="text.secondary">
                        Warming up AI model. Please click Analyze again in a moment.
                      </Typography>
                    </Box>
                  )}
                  {warmupError && (
                    <Alert severity="error" sx={{ mt: 1 }}>{warmupError}</Alert>
                  )}
                  {aiReport[ticker] && (
                    <Box mt={2}>
                      <Typography variant="body2" color="primary" sx={{ whiteSpace: 'pre-line' }}>
                        {aiReport[ticker].analysis}
                      </Typography>
                      {aiReport[ticker].stockData && (
                        <Box mt={2}>
                          <Typography variant="subtitle2" gutterBottom>Yahoo Finance Data:</Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6} sm={4}><b>Current Price:</b> ${aiReport[ticker].stockData.currentPrice?.toFixed(2) ?? 'N/A'}</Grid>
                            <Grid item xs={6} sm={4}><b>Market Cap:</b> ${(aiReport[ticker].stockData.marketCap / 1e9).toFixed(2)}B</Grid>
                            <Grid item xs={6} sm={4}><b>Beta:</b> {aiReport[ticker].stockData.beta ?? 'N/A'}</Grid>
                            <Grid item xs={6} sm={4}><b>Dividend Yield:</b> {aiReport[ticker].stockData.dividendYield?.toFixed(2) ?? 'N/A'}%</Grid>
                            <Grid item xs={6} sm={4}><b>Debt/Equity:</b> {aiReport[ticker].stockData.debtToEquity ?? 'N/A'}</Grid>
                            <Grid item xs={6} sm={4}><b>Cash:</b> ${aiReport[ticker].stockData.cash?.toLocaleString() ?? 'N/A'}</Grid>
                            <Grid item xs={6} sm={4}><b>Equity:</b> ${aiReport[ticker].stockData.equity?.toLocaleString() ?? 'N/A'}</Grid>
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