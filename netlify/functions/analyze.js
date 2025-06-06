const axios = require('axios');
const { HfInference } = require('@huggingface/inference');
const csvParse = require('csv-parse/lib/sync');

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
    
    // Analyze each stock with AI
    const recommendations = await analyzeStocks(stocks, preferences);
    console.log('Generated recommendations:', recommendations);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(recommendations)
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
      filteredStocks.slice(0, 5).map(async (stock) => {
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
    // For demonstration, just take the first 20 stocks
    stocks = stocks.slice(0, 20).map(stock => ({
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
    { symbol: 'AAPL', companyName: 'Apple Inc.', industry: 'technology', marketCap: 3000000000000, sector: 'Technology' },
    { symbol: 'MSFT', companyName: 'Microsoft Corporation', industry: 'technology', marketCap: 2500000000000, sector: 'Technology' },
    { symbol: 'GOOGL', companyName: 'Alphabet Inc.', industry: 'technology', marketCap: 2000000000000, sector: 'Technology' },
    { symbol: 'AMZN', companyName: 'Amazon.com Inc.', industry: 'technology', marketCap: 1800000000000, sector: 'Technology' },
    { symbol: 'META', companyName: 'Meta Platforms Inc.', industry: 'technology', marketCap: 1000000000000, sector: 'Technology' },
    { symbol: 'JNJ', companyName: 'Johnson & Johnson', industry: 'healthcare', marketCap: 400000000000, sector: 'Healthcare' },
    { symbol: 'PFE', companyName: 'Pfizer Inc.', industry: 'healthcare', marketCap: 200000000000, sector: 'Healthcare' },
    { symbol: 'JPM', companyName: 'JPMorgan Chase & Co.', industry: 'finance', marketCap: 450000000000, sector: 'Financial Services' },
    { symbol: 'BAC', companyName: 'Bank of America Corp.', industry: 'finance', marketCap: 300000000000, sector: 'Financial Services' },
    { symbol: 'XOM', companyName: 'Exxon Mobil Corporation', industry: 'energy', marketCap: 350000000000, sector: 'Energy' },
    { symbol: 'CVX', companyName: 'Chevron Corporation', industry: 'energy', marketCap: 300000000000, sector: 'Energy' },
    { symbol: 'PG', companyName: 'Procter & Gamble Co.', industry: 'consumer', marketCap: 300000000000, sector: 'Consumer Defensive' },
    { symbol: 'KO', companyName: 'Coca-Cola Co.', industry: 'consumer', marketCap: 250000000000, sector: 'Consumer Defensive' },
    { symbol: 'BA', companyName: 'Boeing Co.', industry: 'industrial', marketCap: 120000000000, sector: 'Industrials' },
    { symbol: 'CAT', companyName: 'Caterpillar Inc.', industry: 'industrial', marketCap: 110000000000, sector: 'Industrials' },
    { symbol: 'MMM', companyName: '3M Company', industry: 'industrial', marketCap: 60000000000, sector: 'Industrials' },
    { symbol: 'NEM', companyName: 'Newmont Corporation', industry: 'materials', marketCap: 40000000000, sector: 'Materials' },
    { symbol: 'LIN', companyName: 'Linde plc', industry: 'materials', marketCap: 150000000000, sector: 'Materials' },
    { symbol: 'DUK', companyName: 'Duke Energy Corporation', industry: 'utilities', marketCap: 80000000000, sector: 'Utilities' },
    { symbol: 'NEE', companyName: 'NextEra Energy, Inc.', industry: 'utilities', marketCap: 150000000000, sector: 'Utilities' }
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
      sector: response.data.Sector || 'unknown'
    };
  } catch (error) {
    console.error(`Error fetching details for ${symbol}:`, error);
    return {};
  }
}

async function analyzeStocks(stocks, preferences) {
  try {
    const recommendations = [];
    
    for (const stock of stocks) {
      // Create prompt for AI analysis
      const prompt = createAnalysisPrompt(stock, preferences);
      console.log('Analysis prompt:', prompt);
      
      // Get AI analysis
      let analysis = { analysis: 'Unable to generate analysis at this time.', thesis: 'Unable to generate thesis at this time.' };
      try {
        analysis = await getAIAnalysis(prompt);
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        analysis.analysis += ` (AI error: ${aiError.message})`;
        analysis.thesis += ` (AI error: ${aiError.message})`;
      }
      
      // Calculate risk and growth scores
      const scores = calculateScores(stock, preferences);
      console.log('Calculated scores:', scores);
      
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
  } catch (error) {
    console.error('Error in analyzeStocks:', error);
    throw error;
  }
}

function createAnalysisPrompt(stock, preferences) {
  return `As a financial analyst, analyze this stock investment opportunity:

Company: ${stock.companyName} (${stock.symbol})
Industry: ${stock.industry}
Market Cap: $${(stock.marketCap / 1000000000).toFixed(2)}B
P/E Ratio: ${stock.peRatio?.toFixed(2) || 'N/A'}
ROE: ${stock.roe?.toFixed(2) || 'N/A'}%
Debt/Equity: ${stock.debtToEquity?.toFixed(2) || 'N/A'}
Dividend Yield: ${stock.dividendYield?.toFixed(2) || 'N/A'}%

Investor Profile:
- Risk Tolerance: ${preferences.riskTolerance}/10
- Desired Growth: ${preferences.desiredGrowth}%
- Investment Horizon: ${preferences.investmentHorizon}
- Maximum Investment: $${preferences.maxInvestment.toLocaleString()}

Please provide:
1. A concise analysis (max 100 words) focusing on:
   - Growth potential
   - Risk factors
   - Competitive advantages
   - Market position
   - Future outlook

2. A brief investment thesis (max 50 words) that aligns with the investor's profile.

Format the response as:
ANALYSIS:
[Your analysis here]

THESIS:
[Your thesis here]`;
}

async function getAIAnalysis(prompt) {
  try {
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 250,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.2,
        return_full_text: false
      }
    });
    
    // Parse the AI response to extract analysis and thesis
    const text = response.generated_text;
    const analysisMatch = text.match(/ANALYSIS:\s*([\s\S]*?)(?=THESIS:|$)/i);
    const thesisMatch = text.match(/THESIS:\s*([\s\S]*?)$/i);
    
    return {
      analysis: analysisMatch ? analysisMatch[1].trim() : 'Unable to generate analysis.',
      thesis: thesisMatch ? thesisMatch[1].trim() : 'Unable to generate thesis.'
    };
  } catch (error) {
    console.error('Error getting AI analysis:', error);
    throw error;
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