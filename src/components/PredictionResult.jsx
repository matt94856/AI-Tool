function PredictionResult({ predictions, calorieLookup }) {
  const topPrediction = predictions[0];
  const calories = calorieLookup[topPrediction.label.toLowerCase()];

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Prediction Results
        </h2>
        
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Top Prediction
            </h3>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {topPrediction.label}
            </p>
            {calories ? (
              <p className="mt-2 text-gray-600">
                Estimated calories: {calories} kcal
              </p>
            ) : (
              <p className="mt-2 text-gray-600">
                Food identified: {topPrediction.label}, but calories unknown
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Confidence: {(topPrediction.score * 100).toFixed(1)}%
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Other Possibilities
            </h3>
            <ul className="space-y-2">
              {predictions.slice(1, 3).map((prediction, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-600">{prediction.label}</span>
                  <span className="text-gray-500">
                    {(prediction.score * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PredictionResult; 