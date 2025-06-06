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
                      {stock.companyName} ({stock.symbol})
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                      Industry: {stock.industry}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip 
                        label={`Market Cap: $${(stock.marketCap / 1000000000).toFixed(2)}B`} 
                        size="small" 
                      />
                      <Chip 
                        label={`P/E: ${stock.peRatio.toFixed(2)}`} 
                        size="small" 
                      />
                      <Chip 
                        label={`ROE: ${stock.roe.toFixed(2)}%`} 
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
                        value={stock.growthPotential} 
                        color="success"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="body2" color="text.secondary" align="right">
                        {stock.growthPotential}%
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Risk Level
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={stock.riskLevel} 
                        color="warning"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="body2" color="text.secondary" align="right">
                        {stock.riskLevel}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Analysis
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {stock.analysis}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      Investment Thesis
                    </Typography>
                    <Typography variant="body2">
                      {stock.investmentThesis}
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