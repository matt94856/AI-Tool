import React from 'react';
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
} from '@mui/material';

const isDetailedStock = stock =>
  stock && (stock.roe !== undefined || stock.dividendYield !== undefined || stock.marketCap !== undefined);

const InvestmentRecommendations = ({ recommendations, loading, error }) => {
  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Analyzing stocks and generating recommendations...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No recommendations available. Please submit your investment preferences.
        </Typography>
      </Box>
    );
  }

  // If the first recommendation is just {ticker, rationale}, render a simple list
  if (!isDetailedStock(recommendations[0])) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Investment Recommendations
        </Typography>
        <ol>
          {recommendations.map((rec, idx) => (
            <li key={idx} style={{ marginBottom: 16 }}>
              <strong>{rec.ticker}</strong>: {rec.rationale}
            </li>
          ))}
        </ol>
      </Box>
    );
  }

  // Otherwise, render the detailed card view
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Investment Recommendations
      </Typography>
      <Grid container spacing={3}>
        {recommendations.map((stock, index) => (
          <Grid item xs={12} key={index}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" component="div">
                      {stock.companyName || stock.ticker || stock.symbol}
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                      Industry: {stock.industry || 'N/A'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip 
                        label={`Market Cap: $${stock.marketCap !== undefined ? ((stock.marketCap / 1000000000).toFixed(2) + 'B') : 'N/A'}`} 
                        size="small" 
                      />
                      <Chip 
                        label={`P/E: ${stock.peRatio !== undefined ? stock.peRatio.toFixed(2) : 'N/A'}`} 
                        size="small" 
                      />
                      <Chip 
                        label={`ROE: ${stock.roe !== undefined ? stock.roe.toFixed(2) : 'N/A'}%`} 
                        size="small" 
                      />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Growth Potential
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={stock.growthPotential || 0} 
                        color="success"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="body2" color="text.secondary" align="right">
                        {stock.growthPotential !== undefined ? stock.growthPotential + '%' : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Risk Level
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={stock.riskLevel || 0} 
                        color="warning"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="body2" color="text.secondary" align="right">
                        {stock.riskLevel !== undefined ? stock.riskLevel + '%' : 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Analysis
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {stock.analysis || 'N/A'}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      Investment Thesis
                    </Typography>
                    <Typography variant="body2">
                      {stock.investmentThesis || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InvestmentRecommendations; 