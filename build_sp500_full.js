import axios from 'axios';
import fs from 'fs';
import yahooFinance from 'yahoo-finance2';

const WIKI_CSV_URL = 'https://datahub.io/core/s-and-p-500-companies/r/constituents.csv';

async function fetchSP500Symbols() {
  const response = await axios.get(WIKI_CSV_URL);
  const lines = response.data.split('\n');
  const headers = lines[0].split(',');
  const symbolIdx = headers.indexOf('Symbol');
  const nameIdx = headers.indexOf('Name');
  const sectorIdx = headers.indexOf('Sector');
  const industryIdx = headers.indexOf('Industry');

  return lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split(',');
    return {
      symbol: cols[symbolIdx],
      name: cols[nameIdx],
      sector: cols[sectorIdx],
      industry: cols[industryIdx] || cols[sectorIdx]
    };
  });
}

async function fetchMarketCapAndIndustry(symbol) {
  try {
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryProfile'] });
    return {
      marketCap: quote.price?.marketCap || 0,
      industry: quote.summaryProfile?.industry || ''
    };
  } catch (e) {
    console.error(`Failed to fetch for ${symbol}:`, e.message);
    return { marketCap: 0, industry: '' };
  }
}

async function buildFullSP500() {
  const stocks = await fetchSP500Symbols();
  for (let stock of stocks) {
    const { marketCap, industry } = await fetchMarketCapAndIndustry(stock.symbol);
    stock.marketCap = marketCap;
    if (industry) stock.industry = industry;
    // Optional: add a delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
    console.log(`Fetched: ${stock.symbol} - ${stock.name} - ${stock.industry} - ${stock.marketCap}`);
  }
  fs.writeFileSync('sp500.json', JSON.stringify(stocks, null, 2));
  console.log(`Wrote ${stocks.length} stocks to sp500.json`);
}

buildFullSP500(); 