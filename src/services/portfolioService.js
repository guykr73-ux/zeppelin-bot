import fs from 'fs';
import { infoService } from './infoService.js';

const PORTFOLIO_FILE = './portfolio.json';

class PortfolioService {
  /**
   * Load portfolio data from JSON.
   */
  loadPortfolio() {
    try {
      if (fs.existsSync(PORTFOLIO_FILE)) {
        const raw = fs.readFileSync(PORTFOLIO_FILE, 'utf8');
        return JSON.parse(raw) || {};
      }
    } catch (err) {
      console.error('[Portfolio] Error loading:', err.message);
    }
    return {};
  }

  /**
   * Save portfolio data to JSON.
   */
  savePortfolio(data) {
    try {
      fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('[Portfolio] Error saving:', err.message);
      return false;
    }
  }

  /**
   * Add a holding or update shares/average buy price.
   */
  addHolding(chatId, symbol, shares, buyPrice) {
    const data = this.loadPortfolio();
    if (!data[chatId]) data[chatId] = [];

    const cleanSymbol = symbol.toUpperCase().trim();
    const existingIdx = data[chatId].findIndex(h => h.symbol === cleanSymbol);

    const numShares = parseFloat(shares);
    const price = parseFloat(buyPrice);

    if (isNaN(numShares) || isNaN(price) || numShares <= 0 || price <= 0) {
      return { success: false, error: 'כמות מניות או מחיר קנייה אינם תקינים.' };
    }

    if (existingIdx !== -1) {
      const current = data[chatId][existingIdx];
      const totalCost = (current.shares * current.buyPrice) + (numShares * price);
      const totalShares = current.shares + numShares;
      current.shares = totalShares;
      current.buyPrice = parseFloat((totalCost / totalShares).toFixed(2));
    } else {
      data[chatId].push({
        symbol: cleanSymbol,
        shares: numShares,
        buyPrice: price
      });
    }

    this.savePortfolio(data);
    return { success: true, message: `הוספתי בהצלחה ${numShares} מניות של ${cleanSymbol} במחיר קנייה ממוצע של ${price}` };
  }

  /**
   * Remove a holding completely.
   */
  removeHolding(chatId, symbol) {
    const data = this.loadPortfolio();
    if (!data[chatId]) return { success: false, error: 'תיק ההשקעות שלך ריק.' };

    const cleanSymbol = symbol.toUpperCase().trim();
    const initialLen = data[chatId].length;
    data[chatId] = data[chatId].filter(h => h.symbol !== cleanSymbol);

    if (data[chatId].length === initialLen) {
      return { success: false, error: `לא נמצאה מניית ${cleanSymbol} בתיק ההשקעות.` };
    }

    this.savePortfolio(data);
    return { success: true, message: `הסרתי בהצלחה את מניית ${cleanSymbol} מתיק ההשקעות.` };
  }

  /**
   * Compute portfolio performance metrics by fetching current price for each ticker.
   */
  async getPortfolioPerformance(chatId) {
    const data = this.loadPortfolio();
    const holdings = data[chatId] || [];

    if (holdings.length === 0) {
      return { success: true, holdings: [], totalValue: 0, totalGain: 0, totalGainPercent: 0 };
    }

    const performance = [];
    let totalCost = 0;
    let totalValue = 0;

    for (const h of holdings) {
      let currentPrice = h.buyPrice;
      let status = 'error';
      
      try {
        const stockRes = await infoService.getStock(h.symbol);
        if (stockRes.success) {
          currentPrice = stockRes.price;
          status = 'success';
        }
      } catch (err) {
        console.warn(`[Portfolio] Could not fetch price for ${h.symbol}:`, err.message);
      }

      const costBasis = h.shares * h.buyPrice;
      const currentValue = h.shares * currentPrice;
      const gain = currentValue - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

      totalCost += costBasis;
      totalValue += currentValue;

      performance.push({
        symbol: h.symbol,
        shares: h.shares,
        buyPrice: h.buyPrice,
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        costBasis: parseFloat(costBasis.toFixed(2)),
        currentValue: parseFloat(currentValue.toFixed(2)),
        gain: parseFloat(gain.toFixed(2)),
        gainPercent: parseFloat(gainPercent.toFixed(2)),
        status
      });
    }

    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    return {
      success: true,
      holdings: performance,
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalGain: parseFloat(totalGain.toFixed(2)),
      totalGainPercent: parseFloat(totalGainPercent.toFixed(2))
    };
  }
}

export const portfolioService = new PortfolioService();
