const axios = require('axios');
const { HfInference } = require('@huggingface/inference');

// Initialize Hugging Face client
const hf = new HfInference(process.env.MY_HF_TOKEN);

// Alpha Vantage API key for stock data
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const preferences = JSON.parse(event.body);
    
    // Get stock data from Alpha Vantage
    const stocks = await getStockData(preferences);
    
    // Analyze each stock with AI
    const recommendations = await analyzeStocks(stocks, preferences);
    
    return {
      statusCode: 200,
      body: JSON.stringify(recommendations)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to analyze stocks' })
    };
  }
};

async function getStockData(preferences) {
  // Get list of stocks based on industry preference
  const industryStocks = await getIndustryStocks(preferences.industry);
  
  // Filter stocks based on market cap
  const filteredStocks = industryStocks.filter(stock => 
    stock.marketCap >= preferences.minMarketCap
  );
  
  // Get detailed data for each stock
  const stocksWithData = await Promise.all(
    filteredStocks.map(async (stock) => {
      const data = await getStockDetails(stock.symbol);
      return {
        ...stock,
        ...data
      };
    })
  );
  
  return stocksWithData;
}

async function getIndustryStocks(industry) {
  // This would typically come from a stock screener API
  // For now, we'll use a mock list of stocks
  const mockStocks = [
    {
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      industry: 'technology',
      marketCap: 3000000000000
    },
    {
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      industry: 'technology',
      marketCap: 2500000000000
    },
    // Add more mock stocks...
  ];
  
  return industry ? 
    mockStocks.filter(stock => stock.industry === industry) :
    mockStocks;
}

async function getStockDetails(symbol) {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    return {
      peRatio: response.data.PERatio,
      roe: response.data.ReturnOnEquityTTM,
      debtToEquity: response.data.DebtToEquityRatio,
      dividendYield: response.data.DividendYield,
      currentPrice: response.data.LatestPrice,
      priceChange: response.data.ChangePercent
    };
  } catch (error) {
    console.error(`Error fetching details for ${symbol}:`, error);
    return {};
  }
}

async function analyzeStocks(stocks, preferences) {
  const recommendations = [];
  
  for (const stock of stocks) {
    // Create prompt for AI analysis
    const prompt = createAnalysisPrompt(stock, preferences);
    
    // Get AI analysis
    const analysis = await getAIAnalysis(prompt);
    
    // Calculate risk and growth scores
    const scores = calculateScores(stock, preferences);
    
    recommendations.push({
      ...stock,
      analysis: analysis.analysis,
      investmentThesis: analysis.thesis,
      growthPotential: scores.growthPotential,
      riskLevel: scores.riskLevel
    });
  }
  
  // Sort recommendations by growth potential and risk alignment
  return recommendations
    .sort((a, b) => {
      const scoreA = a.growthPotential * (100 - Math.abs(a.riskLevel - preferences.riskTolerance * 10));
      const scoreB = b.growthPotential * (100 - Math.abs(b.riskLevel - preferences.riskTolerance * 10));
      return scoreB - scoreA;
    })
    .slice(0, 5); // Return top 5 recommendations
}

function createAnalysisPrompt(stock, preferences) {
  return `
    Analyze this stock as an investment opportunity:
    Company: ${stock.companyName} (${stock.symbol})
    Industry: ${stock.industry}
    Market Cap: $${stock.marketCap}
    P/E Ratio: ${stock.peRatio}
    ROE: ${stock.roe}%
    Debt/Equity: ${stock.debtToEquity}
    Dividend Yield: ${stock.dividendYield}%
    
    Investor Preferences:
    Risk Tolerance: ${preferences.riskTolerance}/10
    Desired Growth: ${preferences.desiredGrowth}%
    Investment Horizon: ${preferences.investmentHorizon}
    
    Provide a concise analysis and investment thesis focusing on:
    1. Growth potential
    2. Risk factors
    3. Competitive advantages
    4. Market position
    5. Future outlook
    
    Keep the analysis under 100 words and the thesis under 50 words.
  `;
}

async function getAIAnalysis(prompt) {
  try {
    const response = await hf.textGeneration({
      model: 'HuggingFaceH4/zephyr-7b-beta',
      inputs: prompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.2
      }
    });
    
    // Parse the AI response to extract analysis and thesis
    const text = response.generated_text;
    const parts = text.split('\n\n');
    
    return {
      analysis: parts[0] || '',
      thesis: parts[1] || ''
    };
  } catch (error) {
    console.error('Error getting AI analysis:', error);
    return {
      analysis: 'Unable to generate analysis at this time.',
      thesis: 'Unable to generate thesis at this time.'
    };
  }
}

function calculateScores(stock, preferences) {
  // Calculate growth potential score (0-100)
  const growthPotential = Math.min(
    (stock.roe * 2) + // Higher ROE indicates better growth potential
    (stock.peRatio < 20 ? 20 : 0) + // Reasonable P/E ratio
    (stock.dividendYield > 2 ? 10 : 0), // Good dividend yield
    100
  );
  
  // Calculate risk level score (0-100)
  const riskLevel = Math.min(
    (stock.debtToEquity > 1 ? 30 : 0) + // High debt increases risk
    (stock.peRatio > 30 ? 20 : 0) + // High P/E indicates higher risk
    (stock.marketCap < 10000000000 ? 20 : 0), // Smaller market cap = higher risk
    100
  );
  
  return {
    growthPotential,
    riskLevel
  };
} 