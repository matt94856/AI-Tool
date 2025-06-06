import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Typography,
  Grid,
} from '@mui/material';

const industries = [
  'technology',
  'healthcare',
  'finance',
  'energy',
  'consumer',
  'industrial',
  'materials',
  'utilities',
  'realestate',
  'telecommunications'
];

const InvestmentPreferences = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    riskTolerance: 5,
    desiredGrowth: 10,
    industry: '',
    minMarketCap: 1000000000,
    maxInvestment: 10000,
    investmentHorizon: '5-10 years',
    additionalNotes: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.industry) {
      newErrors.industry = 'Please select an industry';
    }
    if (formData.desiredGrowth < 0 || formData.desiredGrowth > 100) {
      newErrors.desiredGrowth = 'Growth must be between 0 and 100';
    }
    if (formData.minMarketCap < 0) {
      newErrors.minMarketCap = 'Market cap must be positive';
    }
    if (formData.maxInvestment < 0) {
      newErrors.maxInvestment = 'Investment amount must be positive';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Submitting form data:', formData);
      onSubmit(formData);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSliderChange = (field) => (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Investment Preferences
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Risk Tolerance: {formData.riskTolerance}/10
              </Typography>
              <Slider
                value={formData.riskTolerance}
                onChange={handleSliderChange('riskTolerance')}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Desired Growth: {formData.desiredGrowth}%
              </Typography>
              <Slider
                value={formData.desiredGrowth}
                onChange={handleSliderChange('desiredGrowth')}
                min={0}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.industry}>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={formData.industry}
                  onChange={handleChange('industry')}
                  label="Industry"
                >
                  {industries.map((industry) => (
                    <MenuItem key={industry} value={industry}>
                      {industry.charAt(0).toUpperCase() + industry.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
                {errors.industry && (
                  <FormHelperText>{errors.industry}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Investment Horizon</InputLabel>
                <Select
                  value={formData.investmentHorizon}
                  onChange={handleChange('investmentHorizon')}
                  label="Investment Horizon"
                >
                  <MenuItem value="1-3 years">1-3 years</MenuItem>
                  <MenuItem value="3-5 years">3-5 years</MenuItem>
                  <MenuItem value="5-10 years">5-10 years</MenuItem>
                  <MenuItem value="10+ years">10+ years</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Minimum Market Cap ($)"
                type="number"
                value={formData.minMarketCap}
                onChange={handleChange('minMarketCap')}
                error={!!errors.minMarketCap}
                helperText={errors.minMarketCap}
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Maximum Investment ($)"
                type="number"
                value={formData.maxInvestment}
                onChange={handleChange('maxInvestment')}
                error={!!errors.maxInvestment}
                helperText={errors.maxInvestment}
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                multiline
                rows={4}
                value={formData.additionalNotes}
                onChange={handleChange('additionalNotes')}
                placeholder="Any specific requirements or preferences..."
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                Get Investment Recommendations
              </Button>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InvestmentPreferences; 