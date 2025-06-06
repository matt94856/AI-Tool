const axios = require('axios');
const { HfInference } = require('@huggingface/inference');

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
    // Get list of stocks based on industry preference
    const industryStocks = await getIndustryStocks(preferences.industry);
    console.log('Industry stocks:', industryStocks);
    
    // Filter stocks based on market cap
    const filteredStocks = industryStocks.filter(stock => 
      stock.marketCap >= preferences.minMarketCap
    );
    console.log('Filtered stocks:', filteredStocks);
    
    // Get detailed data for each stock
    const stocksWithData = await Promise.all(
      filteredStocks.map(async (stock) => {
        try {
          const data = await getStockDetails(stock.symbol);
          return {
            ...stock,
            ...data
          };
        } catch (error) {
          console.error(`Error fetching details for ${stock.symbol}:`, error);
          return stock;
        }
      })
    );
    
    return stocksWithData;
  } catch (error) {
    console.error('Error in getStockData:', error);
    throw error;
  }
}

async function getIndustryStocks(industry) {
  try {
    // First, get the list of stocks from Alpha Vantage
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    if (!response.data || response.data.Note) {
      throw new Error(response.data.Note || 'Invalid response from Alpha Vantage');
    }

    // Filter stocks by industry if specified
    let stocks = response.data;
    if (industry) {
      stocks = stocks.filter(stock => 
        stock.industry && stock.industry.toLowerCase().includes(industry.toLowerCase())
      );
    }

    // Get additional data for each stock
    const stocksWithDetails = await Promise.all(
      stocks.slice(0, 20).map(async (stock) => {
        try {
          // Get company overview
          const overviewResponse = await axios.get(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${stock.symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
          );

          if (!overviewResponse.data || overviewResponse.data.Note) {
            return null;
          }

          return {
            symbol: stock.symbol,
            companyName: overviewResponse.data.Name || stock.name,
            industry: overviewResponse.data.Industry || stock.industry,
            marketCap: parseFloat(overviewResponse.data.MarketCapitalization) || 0,
            sector: overviewResponse.data.Sector || stock.sector
          };
        } catch (error) {
          console.error(`Error fetching details for ${stock.symbol}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and stocks with no market cap
    return stocksWithDetails
      .filter(stock => stock && stock.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap); // Sort by market cap

  } catch (error) {
    console.error('Error fetching stocks:', error);
    // Fallback to mock data if API fails
    return getMockStocks(industry);
  }
}

function getMockStocks(industry) {
  const mockStocks = [
    {
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      industry: 'technology',
      marketCap: 3000000000000,
      sector: 'Technology'
    },
    {
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      industry: 'technology',
      marketCap: 2500000000000,
      sector: 'Technology'
    },
    {
      symbol: 'GOOGL',
      companyName: 'Alphabet Inc.',
      industry: 'technology',
      marketCap: 2000000000000,
      sector: 'Technology'
    },
    {
      symbol: 'AMZN',
      companyName: 'Amazon.com Inc.',
      industry: 'technology',
      marketCap: 1800000000000,
      sector: 'Technology'
    },
    {
      symbol: 'META',
      companyName: 'Meta Platforms Inc.',
      industry: 'technology',
      marketCap: 1000000000000,
      sector: 'Technology'
    },
    {
      symbol: 'JNJ',
      companyName: 'Johnson & Johnson',
      industry: 'healthcare',
      marketCap: 400000000000,
      sector: 'Healthcare'
    },
    {
      symbol: 'JPM',
      companyName: 'JPMorgan Chase & Co.',
      industry: 'finance',
      marketCap: 450000000000,
      sector: 'Financial Services'
    },
    {
      symbol: 'XOM',
      companyName: 'Exxon Mobil Corporation',
      industry: 'energy',
      marketCap: 350000000000,
      sector: 'Energy'
    },
    {
      symbol: 'PG',
      companyName: 'Procter & Gamble Co.',
      industry: 'consumer',
      marketCap: 300000000000,
      sector: 'Consumer Defensive'
    },
    {
      symbol: 'BA',
      companyName: 'Boeing Co.',
      industry: 'industrial',
      marketCap: 120000000000,
      sector: 'Industrials'
    }
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
    
    if (!response.data || response.data.Note) {
      throw new Error(response.data.Note || 'Invalid response from Alpha Vantage');
    }
    
    return {
      peRatio: parseFloat(response.data.PERatio) || 0,
      roe: parseFloat(response.data.ReturnOnEquityTTM) || 0,
      debtToEquity: parseFloat(response.data.DebtToEquityRatio) || 0,
      dividendYield: parseFloat(response.data.DividendYield) || 0,
      currentPrice: parseFloat(response.data.LatestPrice) || 0,
      priceChange: parseFloat(response.data.ChangePercent) || 0
    };
  } catch (error) {
    console.error(`Error fetching details for ${symbol}:`, error);
    throw error;
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
      const analysis = await getAIAnalysis(prompt);
      console.log('AI analysis:', analysis);
      
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
P/E Ratio: ${stock.peRatio.toFixed(2)}
ROE: ${stock.roe.toFixed(2)}%
Debt/Equity: ${stock.debtToEquity.toFixed(2)}
Dividend Yield: ${stock.dividendYield.toFixed(2)}%

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