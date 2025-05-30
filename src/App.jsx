import { useState, useCallback } from 'react';
import axios from 'axios';
import ImageUploader from './components/ImageUploader';
import PredictionResult from './components/PredictionResult';

const CALORIE_LOOKUP = {
  apple: 95,
  banana: 105,
  cheeseburger: 303,
  hotdog: 151,
  pizza: 285,
  sandwich: 250,
  salad: 120,
};

function App() {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageUpload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post('/api/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPredictions(response.data.predictions);
    } catch (err) {
      setError('Error processing image. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            AI Calorie Tracker
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Upload a food photo to get calorie estimates
          </p>
        </div>

        <div className="mt-10">
          <ImageUploader onUpload={handleImageUpload} />
          
          {loading && (
            <div className="mt-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Analyzing image...</p>
            </div>
          )}

          {error && (
            <div className="mt-8 p-4 bg-red-50 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {predictions && !loading && (
            <PredictionResult 
              predictions={predictions} 
              calorieLookup={CALORIE_LOOKUP} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 
