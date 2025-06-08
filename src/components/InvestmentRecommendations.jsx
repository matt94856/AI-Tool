import React, { useState } from 'react';
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

  const handleAnalyze = async (stock) => {
    setAnalyzingTicker(stock.ticker);
    setAiReport((prev) => ({ ...prev, [stock.ticker]: null }));
    try {
      const response = await fetch('/api/analyze-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock, preferences })
      });
      const data = await response.json();
      setAiReport((prev) => ({ ...prev, [stock.ticker]: data.report }));
    } catch (error) {
      setAiReport((prev) => ({ ...prev, [stock.ticker]: 'Error analyzing stock.' }));
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
        {stockRecommendations.map((stock) => (
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
                    label={stock.metrics.priceChangePercent > 0 ? 'Up' : 'Down'}
                    color={stock.metrics.priceChangePercent > 0 ? 'success' : 'error'}
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
                        ${((stock.metrics.currentPrice ?? 0).toFixed(2))}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ShowChartIcon color="primary" />
                      <Typography variant="body2">
                        {((stock.metrics.marketCap ?? 0) / 1000000000).toFixed(2)}B
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocalAtmIcon color="primary" />
                      <Typography variant="body2">
                        {(stock.metrics.dividendYield ?? 0).toFixed(2)}% Yield
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <SpeedIcon color="primary" />
                      <Typography variant="body2">
                        Beta: {(stock.metrics.beta ?? 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Button variant="outlined" size="small" onClick={() => handleAnalyze(stock)} disabled={analyzingTicker === stock.ticker}>
                  {analyzingTicker === stock.ticker ? 'Analyzing...' : 'Analyze'}
                </Button>
                {aiReport[stock.ticker] && (
                  <Box mt={2}>
                    <Typography variant="body2" color="primary">
                      {aiReport[stock.ticker]}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default InvestmentRecommendations; 