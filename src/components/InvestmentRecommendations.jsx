import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';

const InvestmentRecommendations = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Typography variant="h6" align="center">
          No recommendations available. Please submit your investment preferences.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        Investment Recommendations
      </Typography>

      <Grid container spacing={4}>
        {recommendations.map((stock, index) => (
          <Grid item xs={12} key={index}>
            <Card elevation={3}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h5" gutterBottom>
                      {stock.symbol} - {stock.companyName}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      {stock.industry} • Market Cap: ${stock.marketCap.toLocaleString()}
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Growth Potential
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={stock.growthPotential}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Risk Level
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={stock.riskLevel}
                        color={stock.riskLevel > 70 ? "error" : stock.riskLevel > 40 ? "warning" : "success"}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h4" color="primary">
                        ${stock.currentPrice}
                      </Typography>
                      <Typography
                        variant="h6"
                        color={stock.priceChange >= 0 ? "success.main" : "error.main"}
                      >
                        {stock.priceChange >= 0 ? "+" : ""}{stock.priceChange}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1" paragraph>
                    {stock.analysis}
                  </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Key Metrics:
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={3}>
                      <Chip
                        label={`P/E: ${stock.peRatio}`}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Chip
                        label={`ROE: ${stock.roe}%`}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Chip
                        label={`Debt/Equity: ${stock.debtToEquity}`}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Chip
                        label={`Dividend: ${stock.dividendYield}%`}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Investment Thesis:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stock.investmentThesis}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InvestmentRecommendations; 