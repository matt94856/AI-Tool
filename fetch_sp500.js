import axios from 'axios';
import fs from 'fs';

// Wikipedia CSV export of S&P 500 companies
const WIKI_CSV_URL = 'https://datahub.io/core/s-and-p-500-companies/r/constituents.csv';

async function fetchSP500() {
  const response = await axios.get(WIKI_CSV_URL);
  const lines = response.data.split('\n');
  const headers = lines[0].split(',');
  const symbolIdx = headers.indexOf('Symbol');
  const nameIdx = headers.indexOf('Name');
  const sectorIdx = headers.indexOf('Sector');
  const industryIdx = headers.indexOf('Industry');

  const stocks = lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split(',');
    return {
      symbol: cols[symbolIdx],
      name: cols[nameIdx],
      industry: cols[industryIdx] || cols[sectorIdx],
      marketCap: 0 // You can fill this in later if you want
    };
  });

  fs.writeFileSync('sp500.json', JSON.stringify(stocks, null, 2));
  console.log(`Wrote ${stocks.length} stocks to sp500.json`);
}

fetchSP500(); 