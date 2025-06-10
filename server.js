import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import stringSimilarity from 'string-similarity';
import { HfInference } from '@huggingface/inference';
import yahooFinance from 'yahoo-finance2';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Mapping from user-facing categories to specific industries
const INDUSTRY_CATEGORY_MAP = {
  "Healthcare": [
    "Medical Devices", "Drug Manufacturers - General", "Diagnostics & Research", "Medical Instruments & Supplies", "Healthcare Plans", "Medical Care Facilities", "Biotechnology", "Medical Distribution"
  ],
  "Technology": [
    "Information Technology Services", "Software - Application", "Software - Infrastructure", "Semiconductors", "Electronic Components", "Computer Hardware", "Consumer Electronics"
  ],
  "Utilities": [
    "Utilities - Diversified", "Utilities - Regulated Electric", "Utilities - Regulated Water", "Utilities - Regulated Gas", "Utilities - Renewable"
  ],
  "Financials": [
    "Asset Management", "Banks - Diversified", "Banks - Regional", "Insurance - Life", "Insurance - Diversified", "Insurance - Property & Casualty", "Insurance Brokers", "Financial Data & Stock Exchanges", "Credit Services", "Capital Markets"
  ],
  "Consumer Discretionary": [
    "Internet Retail", "Specialty Retail", "Auto Parts", "Restaurants", "Footwear & Accessories", "Auto & Truck Dealerships", "Travel Services", "Resorts & Casinos", "Hotels & Motels"
  ],
  "Industrials": [
    "Specialty Industrial Machinery", "Aerospace & Defense", "Building Products & Equipment", "Farm & Heavy Construction Machinery", "Security & Protection Services", "Integrated Freight & Logistics", "Railroads"
  ],
  "Materials": [
    "Specialty Chemicals", "Packaging & Containers", "Agricultural Inputs", "Metals & Mining", "Steel", "Building Materials"
  ],
  "Energy": [
    "Oil & Gas E&P", "Oil & Gas Equipment & Services", "Oil & Gas Integrated"
  ],
  "Real Estate": [
    "REIT - Office", "REIT - Residential", "REIT - Specialty", "Real Estate Services"
  ],
  "Consumer Staples": [
    "Packaged Foods", "Beverages - Non-Alcoholic", "Beverages - Brewers", "Household & Personal Products", "Tobacco", "Discount Stores"
  ],
  "Communication Services": [
    "Telecom Services", "Internet Content & Information", "Communication Equipment"
  ],
  "Conglomerates": [
    "Conglomerates"
  ]
  // Add more as needed
};

// List of all user-facing categories
const ALL_CATEGORIES = Object.keys(INDUSTRY_CATEGORY_MAP);

function getIndustriesForCategory(category) {
  return INDUSTRY_CATEGORY_MAP[category] || [category];
}

// Helper to load S&P 500 stocks from static file
function loadSP500Stocks() {
  const data = fs.readFileSync(path.join(__dirname, 'sp500.json'), 'utf-8');
  return JSON.parse(data);
}

// Function to get stocks from Alpha Vantage
async function getAllActiveStocks() {
  try {
    console.log('=== FETCHING STOCKS FROM ALPHA VANTAGE ===');
    console.log('Using API Key:', ALPHA_VANTAGE_API_KEY ? 'Present (hidden for security)' : 'Missing');
    
    // First, try to get some utility stocks specifically
    const searchUrl = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=utility&apikey=${ALPHA_VANTAGE_API_KEY}`;
    console.log('Request URL:', searchUrl.replace(ALPHA_VANTAGE_API_KEY, 'HIDDEN_KEY'));
    
    const response = await axios.get(searchUrl);
    console.log('Response Status:', response.status);
    
    if (!response.data) {
      console.error('No data received from Alpha Vantage');
      throw new Error('No data received from Alpha Vantage');
    }

    // Check for API messages
    if (response.data.Note) {
      console.error('Alpha Vantage API Note:', response.data.Note);
      throw new Error(`Alpha Vantage API: ${response.data.Note}`);
    }

    if (response.data.Information) {
      console.error('Alpha Vantage API Information:', response.data.Information);
      throw new Error(`Alpha Vantage API: ${response.data.Information}`);
    }

    // Check if we got the expected response format
    if (!response.data.bestMatches) {
      console.error('Unexpected response format:', response.data);
      throw new Error('Invalid response format from Alpha Vantage');
    }

    console.log('Number of matches found:', response.data.bestMatches.length);
    
    // Transform the matches into our stock format
    const stocks = response.data.bestMatches.map(match => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      currency: match['8. currency'],
      status: 'Active' // We'll assume these are active since they're search results
    }));

    console.log('Sample of stocks found:', stocks.slice(0, 5));
    return stocks;

  } catch (error) {
    console.error('Error fetching stocks:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    }
    throw error;
  }
}

// Function to get detailed stock information
async function getStockDetails(symbol) {
  try {
    console.log(`Fetching details for ${symbol}...`);
    
    // Use the GLOBAL_QUOTE endpoint which is more reliable in the free tier
    const quoteUrl = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await axios.get(quoteUrl);

    // Check for API messages
    if (response.data.Note) {
      console.error(`Rate limit or error for ${symbol}:`, response.data.Note);
      return null;
    }

    const quoteData = response.data['Global Quote'];
    if (!quoteData) {
      console.error(`No quote data for ${symbol}:`, response.data);
      return null;
    }

    // Get company overview
    const overviewUrl = `${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const overviewResponse = await axios.get(overviewUrl);
    const overviewData = overviewResponse.data;

    if (overviewResponse.data.Note) {
      console.error(`Rate limit or error for ${symbol} overview:`, overviewResponse.data.Note);
      // Continue with just the quote data
    }

    const stockDetails = {
      symbol: symbol,
      name: overviewData.Name || symbol,
      industry: overviewData.Industry || 'Unknown',
      sector: overviewData.Sector || 'Unknown',
      marketCap: parseFloat(overviewData.MarketCapitalization) || 0,
      peRatio: parseFloat(overviewData.PERatio) || 0,
      eps: parseFloat(overviewData.EPS) || 0,
      dividendYield: parseFloat(overviewData.DividendYield) || 0,
      beta: parseFloat(overviewData.Beta) || 1,
      currentPrice: parseFloat(quoteData['05. price']) || 0,
      priceChange: parseFloat(quoteData['09. change']) || 0,
      priceChangePercent: parseFloat(quoteData['10. change percent'].replace('%', '')) || 0
    };

    console.log(`Successfully retrieved details for ${symbol}:`, {
      industry: stockDetails.industry,
      marketCap: stockDetails.marketCap,
      currentPrice: stockDetails.currentPrice
    });

    return stockDetails;
  } catch (error) {
    console.error(`Error fetching details for ${symbol}:`, error);
    if (error.response) {
      console.error(`Error response for ${symbol}:`, error.response.data);
    }
    return null;
  }
}

// Helper to fetch detailed financials from Yahoo Finance
async function fetchYahooFinancials(symbol) {
  try {
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'balanceSheetHistory'] });
    return {
      currentPrice: quote.price?.regularMarketPrice ?? 0,
      marketCap: quote.price?.marketCap ?? 0,
      beta: quote.summaryDetail?.beta ?? 0,
      dividendYield: (quote.summaryDetail?.dividendYield ?? 0) * 100,
      debtToEquity: quote.financialData?.debtToEquity ?? 0,
      cash: quote.financialData?.totalCash ?? 0,
      equity: quote.balanceSheetHistory?.balanceSheetStatements?.[0]?.totalStockholderEquity ?? 0
    };
  } catch (e) {
    console.error(`Yahoo Finance fetch failed for ${symbol}:`, e.message);
    return {};
  }
}

// Function to score stocks based on preferences
function scoreStock(stock, preferences) {
  let score = 0;
  const weights = {
    riskTolerance: 0.3,
    desiredGrowth: 0.3,
    industry: 0.2,
    marketCap: 0.2
  };

  // Risk tolerance scoring (using beta)
  const betaScore = 100 - Math.abs((stock.beta * 10) - preferences.riskTolerance * 10);
  score += betaScore * weights.riskTolerance;

  // Growth potential scoring (using historical performance and analyst estimates)
  const growthScore = stock.priceChangePercent > preferences.desiredGrowth ? 100 : 
    (stock.priceChangePercent / preferences.desiredGrowth) * 100;
  score += growthScore * weights.desiredGrowth;

  // Industry match scoring
  if (preferences.industry && stock.industry) {
    const industryMatch = stock.industry.toLowerCase().includes(preferences.industry.toLowerCase()) ? 100 : 0;
    score += industryMatch * weights.industry;
  }

  // Market cap scoring
  if (preferences.minMarketCap) {
    const marketCapScore = stock.marketCap >= preferences.minMarketCap ? 100 : 
      (stock.marketCap / preferences.minMarketCap) * 100;
    score += marketCapScore * weights.marketCap;
  }

  return score;
}

// Helper to generate an AI prompt for stock recommendations
function generateAIPrompt(preferences, stocks) {
  return `You are an expert investment advisor. The user has the following preferences:\n- Risk tolerance: ${preferences.riskTolerance}\n- Desired growth: ${preferences.desiredGrowth}%\n- Additional notes: ${preferences.additionalNotes}\n\nHere is a stock to analyze (with its key financials):\n${stocks.map(s => `- ${s.symbol} (${s.name}): Price $${s.currentPrice ?? 0}, Market Cap $${s.marketCap ?? 0}, Beta ${s.beta ?? 'N/A'}, Dividend Yield ${s.dividendYield ?? 'N/A'}, Debt/Equity ${s.debtToEquity ?? 'N/A'}, Cash $${s.cash ?? 'N/A'}, Equity $${s.equity ?? 'N/A'}`).join('\n')}\n\nYour task:\n1. Analyze this stock for the user's risk and growth preferences.\n2. Further prioritize financial health (low debt, high cash, high equity, low debt-to-equity ratio, etc.), like Warren Buffett.\n3. Provide a rationale that explains if it fits the user's preferences and why.\n\nReturn your analysis as a short, clear report.`;
}

// Fuzzy match user input to the closest known category
function getClosestCategory(userInput) {
  if (!userInput) return '';
  const matches = stringSimilarity.findBestMatch(
    userInput.toLowerCase(),
    ALL_CATEGORIES.map(c => c.toLowerCase())
  );
  const best = matches.bestMatch;
  if (best.rating > 0.4) {
    // Return the original category name (case-sensitive)
    const idx = matches.ratings.findIndex(r => r.target === best.target);
    return ALL_CATEGORIES[idx];
  }
  // Fallback: try substring match
  const found = ALL_CATEGORIES.find(cat => cat.toLowerCase().includes(userInput.toLowerCase()));
  return found || userInput;
}

// Updated analyze endpoint
app.post('/.netlify/functions/analyze', async (req, res) => {
  console.log('=== NEW REQUEST RECEIVED ===');
  console.log('Request received at:', new Date().toISOString());
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  try {
    const preferences = req.body;
    console.log('Processing preferences:', preferences);

    // Load S&P 500 stocks from static file
    const allStocks = loadSP500Stocks();
    console.log(`Loaded ${allStocks.length} S&P 500 stocks`);

    // Filter by industry and market cap
    let filtered = allStocks.filter(stock => {
      let matchesIndustry = true;
      if (preferences.industry) {
        // Use fuzzy matching for user input
        const userIndustry = getClosestCategory(preferences.industry);
        const allowedIndustries = getIndustriesForCategory(userIndustry);
        matchesIndustry = stock.industry && allowedIndustries.some(ind =>
          stock.industry.toLowerCase().includes(ind.toLowerCase()) ||
          ind.toLowerCase().includes(stock.industry.toLowerCase())
        );
      }
      const meetsMarketCap = preferences.minMarketCap
        ? stock.marketCap >= preferences.minMarketCap
        : true;
      return matchesIndustry && meetsMarketCap;
    });
    console.log(`Filtered to ${filtered.length} stocks by industry and market cap`);

    // Fetch Yahoo Finance data for all filtered stocks
    const detailedStocks = await Promise.all(filtered.map(async (stock) => {
      const yfData = await fetchYahooFinancials(stock.symbol);
      return {
        ...stock,
        ...yfData
      };
    }));

    // Build recommendations for all filtered stocks
    const recommendations = detailedStocks.map(stock => ({
      ticker: stock.symbol,
      name: stock.name,
      rationale: `This ${stock.industry} stock meets your criteria and is among the largest by market cap in the S&P 500.`,
      metrics: {
        currentPrice: stock.currentPrice ?? 0,
        marketCap: stock.marketCap ?? 0,
        priceChangePercent: stock.priceChangePercent ?? 0,
        dividendYield: stock.dividendYield ?? 0,
        beta: stock.beta ?? 0,
        debtToEquity: stock.debtToEquity ?? 0,
        cash: stock.cash ?? 0,
        equity: stock.equity ?? 0
      }
    }));

    res.json({ recommendations, message: recommendations.length ? undefined : 'No stocks found matching your criteria. Try adjusting your preferences or check the logs for more details.' });
  } catch (error) {
    console.error('Error in analyze endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to analyze stocks',
      details: error.message 
    });
  }
});

// Function to generate detailed rationales
function generateRationale(stock, preferences) {
  const rationales = [];

  // Risk assessment
  if (stock.beta) {
    if (stock.beta < 1 && preferences.riskTolerance < 5) {
      rationales.push('Low volatility stock suitable for conservative investors');
    } else if (stock.beta > 1.5 && preferences.riskTolerance > 7) {
      rationales.push('Higher volatility stock matching your risk appetite');
    }
  }

  // Growth potential
  if (stock.priceChangePercent > preferences.desiredGrowth) {
    rationales.push(`Strong growth performance exceeding your ${preferences.desiredGrowth}% target`);
  }

  // Industry alignment
  if (preferences.industry && stock.industry) {
    if (stock.industry.toLowerCase().includes(preferences.industry.toLowerCase())) {
      rationales.push(`Direct match with your preferred ${preferences.industry} industry`);
    }
  }

  // Market cap consideration
  if (preferences.minMarketCap && stock.marketCap >= preferences.minMarketCap) {
    rationales.push('Meets your minimum market capitalization requirement');
  }

  // Dividend consideration
  if (stock.dividendYield > 2) {
    rationales.push(`Attractive dividend yield of ${stock.dividendYield.toFixed(2)}%`);
  }

  return rationales.join('. ') + '.';
}

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// API endpoint for image prediction
app.post('/api/predict', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // Use mock predictions in development
      const mockPredictions = getMockPredictions();
      res.json({ predictions: mockPredictions });
    } else {
      // Use real Hugging Face API in production
      const imageBuffer = req.file.buffer;
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
        imageBuffer,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
            'Content-Type': req.file.mimetype,
          },
        }
      );

      // Process the predictions
      const predictions = response.data.map(pred => ({
        label: pred.label,
        score: pred.score
      }));

      res.json({ predictions });
    }
  } catch (error) {
    console.error('Error:', error?.response?.data || error);
    res.status(500).json({ error: 'Error processing image' });
  }
});

// New endpoint for AI analysis of a single stock
const HF_TOKEN = process.env.MY_HF_TOKEN;
const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;

app.post('/api/analyze-stock', async (req, res) => {
  try {
    const { stock, preferences } = req.body;
    if (!stock || !preferences) {
      return res.status(400).json({ error: 'Missing stock or preferences' });
    }
    const aiPrompt = generateAIPrompt(preferences, [stock]);
    // Only call Hugging Face if not in development mode
    if (process.env.NODE_ENV !== 'development' && hf) {
      try {
        const response = await hf.textGeneration({
          model: 'mistralai/Mistral-7B-Instruct-v0.3',
          inputs: aiPrompt,
          parameters: {
            max_new_tokens: 350,
            temperature: 0.7,
            top_p: 0.9,
            repetition_penalty: 1.2,
            return_full_text: false
          }
        });
        res.json({ report: response.generated_text });
        return;
      } catch (err) {
        console.error('Hugging Face API error:', err);
        res.json({ report: 'AI analysis unavailable (Hugging Face API error).' });
        return;
      }
    }
    // In development, return a mock response
    res.json({
      report: `AI Report for ${stock.ticker}:\n${aiPrompt}\n\n(This is a mock response. In production, this will use Hugging Face AI.)`
    });
  } catch (error) {
    console.error('Error in /api/analyze-stock:', error);
    res.status(500).json({ error: 'Failed to analyze stock', details: error.message });
  }
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 