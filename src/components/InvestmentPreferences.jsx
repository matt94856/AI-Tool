import React, { useState } from 'react';
import { Box, Typography, Slider, TextField, Button, FormControl, InputLabel, Select, MenuItem, Paper, Grid } from '@mui/material';

const InvestmentPreferences = ({ onSubmit }) => {
  const [preferences, setPreferences] = useState({
    riskTolerance: 5, // 1-10 scale
    desiredGrowth: 10, // percentage
    industry: '',
    investmentHorizon: 'medium', // short, medium, long
    minMarketCap: 1000000000, // 1B default
    maxInvestment: 10000,
    additionalNotes: ''
  });

  const handleChange = (field) => (event) => {
    setPreferences({
      ...preferences,
      [field]: event.target.value
    });
  };

  const handleSliderChange = (field) => (event, newValue) => {
    setPreferences({
      ...preferences,
      [field]: newValue
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(preferences);
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        Investment Preferences
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography gutterBottom>Risk Tolerance (1-10)</Typography>
            <Slider
              value={preferences.riskTolerance}
              onChange={handleSliderChange('riskTolerance')}
              min={1}
              max={10}
              marks
              valueLabelDisplay="auto"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Desired Annual Growth (%)"
              type="number"
              value={preferences.desiredGrowth}
              onChange={handleChange('desiredGrowth')}
              InputProps={{ inputProps: { min: 0, max: 100 } }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Industry Preference</InputLabel>
              <Select
                value={preferences.industry}
                onChange={handleChange('industry')}
                label="Industry Preference"
              >
                <MenuItem value="">Any Industry</MenuItem>
                <MenuItem value="technology">Technology</MenuItem>
                <MenuItem value="healthcare">Healthcare</MenuItem>
                <MenuItem value="finance">Finance</MenuItem>
                <MenuItem value="energy">Energy</MenuItem>
                <MenuItem value="consumer">Consumer Goods</MenuItem>
                <MenuItem value="industrial">Industrial</MenuItem>
                <MenuItem value="materials">Materials</MenuItem>
                <MenuItem value="utilities">Utilities</MenuItem>
                <MenuItem value="realestate">Real Estate</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Investment Horizon</InputLabel>
              <Select
                value={preferences.investmentHorizon}
                onChange={handleChange('investmentHorizon')}
                label="Investment Horizon"
              >
                <MenuItem value="short">Short Term (1-2 years)</MenuItem>
                <MenuItem value="medium">Medium Term (3-5 years)</MenuItem>
                <MenuItem value="long">Long Term (5+ years)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Minimum Market Cap ($)"
              type="number"
              value={preferences.minMarketCap}
              onChange={handleChange('minMarketCap')}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Maximum Investment Amount ($)"
              type="number"
              value={preferences.maxInvestment}
              onChange={handleChange('maxInvestment')}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Additional Notes or Preferences"
              multiline
              rows={4}
              value={preferences.additionalNotes}
              onChange={handleChange('additionalNotes')}
              placeholder="Any specific requirements or preferences..."
            />
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                sx={{ minWidth: 200 }}
              >
                Get Investment Recommendations
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default InvestmentPreferences; 
