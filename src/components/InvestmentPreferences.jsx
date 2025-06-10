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
  'Any',
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
    industry: 'Any',
    minMarketCap: '',
    maxMarketCap: '',
    investmentHorizon: '5-10 years',
    additionalNotes: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (formData.desiredGrowth < 0 || formData.desiredGrowth > 100) {
      newErrors.desiredGrowth = 'Growth must be between 0 and 100';
    }
    if (formData.minMarketCap && formData.minMarketCap < 0) {
      newErrors.minMarketCap = 'Market cap must be positive';
    }
    if (formData.maxMarketCap && formData.maxMarketCap < 0) {
      newErrors.maxMarketCap = 'Market cap must be positive';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = {
        ...formData,
        minMarketCap: formData.minMarketCap ? Number(formData.minMarketCap) : undefined,
        maxMarketCap: formData.maxMarketCap ? Number(formData.maxMarketCap) : undefined,
        industry: formData.industry === 'Any' ? '' : formData.industry
      };
      onSubmit(submitData);
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
    <Card sx={{ p: 3, mb: 4, boxShadow: 3, background: '#f8fafc' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>Investment Preferences</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Risk Tolerance</Typography>
              <Typography gutterBottom>Risk Tolerance: {formData.riskTolerance}/10</Typography>
              <Slider
                value={formData.riskTolerance}
                onChange={handleSliderChange('riskTolerance')}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                sx={{
                  height: 10,
                  color: 'primary.main',
                  '& .MuiSlider-thumb': {
                    boxShadow: 3,
                    border: '2px solid #1976d2',
                    width: 28,
                    height: 28,
                  },
                  '& .MuiSlider-track': {
                    border: 'none',
                  },
                  '& .MuiSlider-rail': {
                    opacity: 0.5,
                    backgroundColor: '#bdbdbd',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Desired Growth</Typography>
              <Typography gutterBottom>Desired Growth: {formData.desiredGrowth}%</Typography>
              <Slider
                value={formData.desiredGrowth}
                onChange={handleSliderChange('desiredGrowth')}
                min={0}
                max={100}
                step={1}
                marks
                valueLabelDisplay="auto"
                sx={{
                  height: 10,
                  color: 'secondary.main',
                  '& .MuiSlider-thumb': {
                    boxShadow: 3,
                    border: '2px solid #dc004e',
                    width: 28,
                    height: 28,
                  },
                  '& .MuiSlider-track': {
                    border: 'none',
                  },
                  '& .MuiSlider-rail': {
                    opacity: 0.5,
                    backgroundColor: '#bdbdbd',
                  },
                }}
              />
              {errors.desiredGrowth && <FormHelperText error>{errors.desiredGrowth}</FormHelperText>}
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={formData.industry}
                  label="Industry"
                  onChange={handleChange('industry')}
                >
                  {industries.map((ind) => (
                    <MenuItem key={ind} value={ind}>{ind.charAt(0).toUpperCase() + ind.slice(1)}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select an industry or choose 'Any' for no preference</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Investment Horizon</InputLabel>
                <Select
                  value={formData.investmentHorizon}
                  label="Investment Horizon"
                  onChange={handleChange('investmentHorizon')}
                >
                  <MenuItem value="1-3 years">1-3 years</MenuItem>
                  <MenuItem value="3-5 years">3-5 years</MenuItem>
                  <MenuItem value="5-10 years">5-10 years</MenuItem>
                  <MenuItem value=">10 years">&gt;10 years</MenuItem>
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
                helperText={errors.minMarketCap || 'Optional'}
                placeholder="Optional"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Maximum Market Cap ($)"
                type="number"
                value={formData.maxMarketCap}
                onChange={handleChange('maxMarketCap')}
                error={!!errors.maxMarketCap}
                helperText={errors.maxMarketCap || 'Optional'}
                placeholder="Optional"
                InputProps={{ inputProps: { min: 0 } }}
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
              <Box mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                >
                  Get Investment Recommendations
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InvestmentPreferences; 