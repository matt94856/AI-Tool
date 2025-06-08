const axios = require('axios');
const { HfInference } = require('@huggingface/inference');
const { parse: csvParse } = require('csv-parse');

// Initialize Hugging Face client
const hf = new HfInference(process.env.MY_HF_TOKEN);

// Alpha Vantage API key for stock data
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

exports.handler = async (event) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validate environment variables
    if (!process.env.MY_HF_TOKEN) {
      throw new Error('Hugging Face token is not configured');
    }
    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      throw new Error('Alpha Vantage API key is not configured');
    }

    const preferences = JSON.parse(event.body);
    console.log('Received preferences:', preferences);
    
    // Get stock data from Alpha Vantage
    const stocks = await getStockData(preferences);
    console.log('Retrieved stocks:', stocks);
    
    // Score and rank stocks for fit
    const scored = stocks.map(stock => ({ ...stock, score: scoreStock(stock, preferences) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    // Build AI prompt
    const aiPrompt = buildAIPrompt(preferences, scored);
    console.log('AI prompt:', aiPrompt);
    
    // Get AI recommendations
    let aiResult = { recommendations: [] };
    try {
      aiResult = await getAIRecommendations(aiPrompt);
    } catch (aiError) {
      console.error('AI recommendation error:', aiError);
      aiResult.recommendations = scored.map(s => ({ ticker: s.symbol, rationale: 'AI unavailable, but this stock fits your profile.' }));
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(aiResult.recommendations)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze stocks',
        details: error.message 
      })
    };
  }
};

async function getStockData(preferences) {
  try {
    const industryStocks = await getIndustryStocks(preferences.industry, preferences);
    console.log('Industry stocks:', industryStocks);
    const filteredStocks = industryStocks.filter(stock => stock.marketCap >= preferences.minMarketCap);
    console.log('Filtered stocks:', filteredStocks);
    const stocksWithData = await Promise.all(
      filteredStocks.slice(0, 15).map(async (stock) => {
        try {
          const data = await getStockDetails(stock.symbol);
          return { ...stock, ...data };
        } catch (error) {
          console.error(`Error fetching details for ${stock.symbol}:`, error);
          return stock;
        }
      })
    );
    return stocksWithData;
  } catch (error) {
    console.error('Error in getStockData:', error);
    return getMockStocks(preferences.industry);
  }
}

async function getIndustryStocks(industry, preferences) {
  try {
    // Fetch the CSV from Alpha Vantage
    const response = await axios.get(`https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${ALPHA_VANTAGE_API_KEY}`);
    if (!response.data || typeof response.data !== 'string') throw new Error('Invalid response from Alpha Vantage');
    // Parse CSV
    const records = csvParse(response.data, { columns: true, skip_empty_lines: true });
    // Filter by industry if possible (Alpha Vantage does not provide industry in LISTING_STATUS, so fallback to symbol screening)
    let stocks = records.filter(stock => stock.status === 'Active');
    // Optionally, filter by exchange, etc.
    // For demonstration, just take the first 30 stocks
    stocks = stocks.slice(0, 30).map(stock => ({
      symbol: stock.symbol,
      companyName: stock.name,
      industry: industry || 'unknown',
      marketCap: 0 // Will be filled in by getStockDetails
    }));
    return stocks;
  } catch (error) {
    console.error('Error fetching or parsing stocks:', error);
    return getMockStocks(industry);
  }
}

function getMockStocks(industry) {
  // Expanded mock data for fallback
  const mockStocks = [
    { symbol: 'AAPL', companyName: 'Apple Inc.', industry: 'technology', marketCap: 3000000000000, sector: 'Technology', beta: 1.2, roe: 18, dividendYield: 0.6 },
    { symbol: 'MSFT', companyName: 'Microsoft Corporation', industry: 'technology', marketCap: 2500000000000, sector: 'Technology', beta: 0.9, roe: 15, dividendYield: 0.8 },
    { symbol: 'GOOGL', companyName: 'Alphabet Inc.', industry: 'technology', marketCap: 2000000000000, sector: 'Technology', beta: 1.1, roe: 16, dividendYield: 0 },
    { symbol: 'AMZN', companyName: 'Amazon.com Inc.', industry: 'technology', marketCap: 1800000000000, sector: 'Technology', beta: 1.3, roe: 12, dividendYield: 0 },
    { symbol: 'META', companyName: 'Meta Platforms Inc.', industry: 'technology', marketCap: 1000000000000, sector: 'Technology', beta: 1.2, roe: 20, dividendYield: 0 },
    { symbol: 'JNJ', companyName: 'Johnson & Johnson', industry: 'healthcare', marketCap: 400000000000, sector: 'Healthcare', beta: 0.7, roe: 9, dividendYield: 2.5 },
    { symbol: 'PFE', companyName: 'Pfizer Inc.', industry: 'healthcare', marketCap: 200000000000, sector: 'Healthcare', beta: 0.6, roe: 8, dividendYield: 3.2 },
    { symbol: 'JPM', companyName: 'JPMorgan Chase & Co.', industry: 'finance', marketCap: 450000000000, sector: 'Financial Services', beta: 1.1, roe: 13, dividendYield: 2.8 },
    { symbol: 'BAC', companyName: 'Bank of America Corp.', industry: 'finance', marketCap: 300000000000, sector: 'Financial Services', beta: 1.2, roe: 11, dividendYield: 2.5 },
    { symbol: 'XOM', companyName: 'Exxon Mobil Corporation', industry: 'energy', marketCap: 350000000000, sector: 'Energy', beta: 1.0, roe: 10, dividendYield: 3.5 },
    { symbol: 'CVX', companyName: 'Chevron Corporation', industry: 'energy', marketCap: 300000000000, sector: 'Energy', beta: 1.1, roe: 9, dividendYield: 4.0 },
    { symbol: 'PG', companyName: 'Procter & Gamble Co.', industry: 'consumer', marketCap: 300000000000, sector: 'Consumer Defensive', beta: 0.6, roe: 8, dividendYield: 2.4 },
    { symbol: 'KO', companyName: 'Coca-Cola Co.', industry: 'consumer', marketCap: 250000000000, sector: 'Consumer Defensive', beta: 0.7, roe: 7, dividendYield: 3.0 },
    { symbol: 'BA', companyName: 'Boeing Co.', industry: 'industrial', marketCap: 120000000000, sector: 'Industrials', beta: 1.4, roe: 5, dividendYield: 0 },
    { symbol: 'CAT', companyName: 'Caterpillar Inc.', industry: 'industrial', marketCap: 110000000000, sector: 'Industrials', beta: 1.1, roe: 10, dividendYield: 2.1 },
    { symbol: 'MMM', companyName: '3M Company', industry: 'industrial', marketCap: 60000000000, sector: 'Industrials', beta: 1.0, roe: 6, dividendYield: 3.8 },
    { symbol: 'NEM', companyName: 'Newmont Corporation', industry: 'materials', marketCap: 40000000000, sector: 'Materials', beta: 0.8, roe: 4, dividendYield: 4.2 },
    { symbol: 'LIN', companyName: 'Linde plc', industry: 'materials', marketCap: 150000000000, sector: 'Materials', beta: 0.9, roe: 12, dividendYield: 1.5 },
    { symbol: 'DUK', companyName: 'Duke Energy Corporation', industry: 'utilities', marketCap: 80000000000, sector: 'Utilities', beta: 0.5, roe: 5, dividendYield: 4.1 },
    { symbol: 'NEE', companyName: 'NextEra Energy, Inc.', industry: 'utilities', marketCap: 150000000000, sector: 'Utilities', beta: 0.6, roe: 7, dividendYield: 2.3 }
  ];
  return industry ? mockStocks.filter(stock => stock.industry === industry) : mockStocks;
}

async function getStockDetails(symbol) {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    if (!response.data || response.data.Note) {
      throw new Error(response.data.Note || 'Invalid response from Alpha Vantage');
    }
    
    return {
      peRatio: parseFloat(response.data.PERatio) || 0,
      roe: parseFloat(response.data.ReturnOnEquityTTM) || 0,
      debtToEquity: parseFloat(response.data.DebtToEquityRatio) || 0,
      dividendYield: parseFloat(response.data.DividendYield) || 0,
      currentPrice: parseFloat(response.data.LatestPrice) || 0,
      priceChange: parseFloat(response.data.ChangePercent) || 0,
      marketCap: parseFloat(response.data.MarketCapitalization) || 0,
      industry: response.data.Industry || 'unknown',
      sector: response.data.Sector || 'unknown',
      beta: parseFloat(response.data.Beta) || 1
    };
  } catch (error) {
    console.error(`Error fetching details for ${symbol}:`, error);
    return {};
  }
}

// Score a stock for fit to user preferences
function scoreStock(stock, prefs) {
  let score = 0;
  // Risk: closer beta to user risk = higher score
  if (stock.beta) score += 100 - Math.abs((stock.beta * 10) - prefs.riskTolerance * 10);
  // Return: closer to desired return = higher score
  if (stock.roe) score += 100 - Math.abs(stock.roe - prefs.desiredGrowth);
  // Sector/Notes: bonus for matches, penalty for exclusions
  if (prefs.additionalNotes && typeof prefs.additionalNotes === 'string') {
    const notes = prefs.additionalNotes.toLowerCase();
    if (notes.includes('tech') && stock.industry.toLowerCase().includes('tech')) score += 50;
    if (notes.includes('avoid fossil') && stock.industry.toLowerCase().includes('energy')) score -= 100;
    if (notes.includes('dividend') && stock.dividendYield > 2) score += 30;
    // Add more logic as needed
  }
  return score;
}

// Build the AI prompt
function buildAIPrompt(prefs, stocks) {
  let prompt = `You are a world-class investment analyst. Given the following user profile and stock data, recommend the top 3–5 stocks that best fit the user's preferences.\n\nUser Profile:\n- Desired Return: ${prefs.desiredGrowth}%\n- Risk Tolerance: ${prefs.riskTolerance}/10\n- Investment Horizon: ${prefs.investmentHorizon}\n- Notes: ${prefs.additionalNotes || 'None'}\n\nCandidate Stocks:`;
  stocks.forEach((s, i) => {
    prompt += `\n${i + 1}. ${s.symbol} | ${s.industry} | Beta: ${s.beta || 'N/A'} | ROE: ${s.roe || 'N/A'}% | Dividend: ${s.dividendYield || 'N/A'}% | Market Cap: $${s.marketCap ? (s.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}`;
  });
  prompt += `\n\nInstructions:\n- Score each stock for fit to the user's risk, return, and notes.\n- Recommend the top 3–5 tickers, with a brief rationale for each.\n- Be diverse in your selections if possible.\n- Output as a numbered list: Ticker, Rationale.`;
  return prompt;
}

// Call the AI to get recommendations
async function getAIRecommendations(prompt) {
  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.2',
    inputs: prompt,
    parameters: {
      max_new_tokens: 350,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.2,
      return_full_text: false
    }
  });
  // Parse the AI's response into a list
  const lines = response.generated_text.split(/\n|\r/).filter(l => l.match(/^\d+\./));
  const recommendations = lines.map(line => {
    const match = line.match(/^\d+\.\s*([A-Z]+)\s*[,|-]\s*(.*)$/i);
    return match ? { ticker: match[1], rationale: match[2].trim() } : { ticker: line, rationale: '' };
  });
  return { recommendations };
} 