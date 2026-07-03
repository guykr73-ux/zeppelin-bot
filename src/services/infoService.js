import Parser from 'rss-parser';
import axios from 'axios';

const parser = new Parser();

/**
 * Helper to fetch RSS XML feed using axios with full browser headers and parse it.
 */
async function fetchFeed(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: 10000
  });
  return await parser.parseString(response.data);
}

class InfoService {
  /**
   * Fetch RSS news from Ynet (General News).
   */
  async getNews() {
    const feedUrl = 'https://www.ynet.co.il/Integration/StoryRss2.xml';
    try {
      const feed = await fetchFeed(feedUrl);
      const items = feed.items.slice(0, 4).map(item => ({
        title: item.title,
        summary: (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, '').substring(0, 100) + '...'
      }));
      return { success: true, source: 'Ynet חדשות', items };
    } catch (error) {
      console.error('Error fetching news RSS:', error.message);
      return { success: false, error: 'לא ניתן לטעון חדשות כעת. אנא נסה שנית מאוחר יותר.' };
    }
  }

  /**
   * Fetch stock price for a given ticker symbol using Yahoo Finance.
   * @param {string} symbol - Ticker symbol (e.g. "AAPL", "GOOG", "MSFT", "TA35.TA")
   */
  async getStock(symbol) {
    const cleanSymbol = symbol.toUpperCase().trim();
    // Yahoo Finance public chart API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}`;
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      const result = response.data?.chart?.result?.[0];
      if (!result) {
        return { success: false, error: `לא נמצאו נתונים עבור הסימול ${cleanSymbol}` };
      }

      const meta = result.meta;
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose;
      const currency = meta.currency;
      const change = price - prevClose;
      const changePercent = (change / prevClose) * 100;

      return {
        success: true,
        symbol: cleanSymbol,
        name: meta.symbol,
        price: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        currency,
        explanation: `${cleanSymbol}: ${price} ${currency} (${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
      };
    } catch (error) {
      console.error(`Error fetching stock for ${cleanSymbol}:`, error.message);
      return { success: false, error: `שגיאה בקבלת נתוני מניה עבור ${cleanSymbol}` };
    }
  }

  /**
   * Fetch sports news from Ynet Sports, Sky Sports F1, ESPN NBA and EuroLeague.
   */
  async getSports() {
    const feeds = [
      { name: 'Ynet ספורט', url: 'https://www.ynet.co.il/Integration/StoryRss3.xml', limit: 2 },
      { name: 'Sky Sports F1', url: 'https://www.skysports.com/rss/12433', limit: 2 },
      { name: 'Yahoo Sports NBA', url: 'https://sports.yahoo.com/nba/rss/', limit: 2 }
    ];
    
    const combinedItems = [];
    
    for (const feedConfig of feeds) {
      try {
        const feed = await fetchFeed(feedConfig.url);
        const items = feed.items.slice(0, feedConfig.limit).map(item => ({
          title: item.title,
          summary: (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, '').substring(0, 100) + '...',
          source: feedConfig.name
        }));
        combinedItems.push(...items);
      } catch (error) {
        console.warn(`[Sports] Error fetching feed ${feedConfig.name}:`, error.message);
      }
    }

    if (combinedItems.length === 0) {
      return { success: false, error: 'לא ניתן לטעון מבזקי ספורט כעת.' };
    }
    
    return { success: true, source: 'מבזקי ספורט גלובליים וישראליים', items: combinedItems };
  }

  /**
   * Fetch global and local market news from Ynet Economics (Israel) and Yahoo Finance (US/Global).
   */
  async getMarketNews() {
    const feeds = [
      { name: 'Ynet כלכלה', url: 'https://www.ynet.co.il/Integration/StoryRss6.xml', limit: 3 },
      { name: 'Yahoo Finance עולמי', url: 'https://finance.yahoo.com/news/rssindex', limit: 3 }
    ];

    const combinedItems = [];

    for (const feedConfig of feeds) {
      try {
        const feed = await fetchFeed(feedConfig.url);
        const items = feed.items.slice(0, feedConfig.limit).map(item => ({
          title: item.title,
          summary: (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, '').substring(0, 100) + '...',
          source: feedConfig.name
        }));
        combinedItems.push(...items);
      } catch (error) {
        console.warn(`[Finance] Error fetching feed ${feedConfig.name}:`, error.message);
      }
    }

    if (combinedItems.length === 0) {
      return { success: false, error: 'לא ניתן לטעון חדשות בורסה כעת.' };
    }

    return { success: true, items: combinedItems };
  }

  /**
   * Perform technical analysis on a stock ticker using Yahoo Finance chart data.
   * Calculates SMA-20, SMA-50, Support (Period Low), Resistance (Period High), and Trend.
   * @param {string} symbol - Ticker symbol (e.g. "AAPL", "GOOG", "TA35.TA")
   * @param {string} range - Historical range (e.g. "1mo", "3mo", "6mo", "1y")
   */
  async analyzeStockTrend(symbol, range = '3mo') {
    const cleanSymbol = symbol.toUpperCase().trim();
    // Fetch historical chart data with daily interval
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?range=${range}&interval=1d`;
    try {
      const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const result = response.data?.chart?.result?.[0];
      if (!result) {
        return { success: false, error: `לא נמצאו נתונים היסטוריים עבור ${cleanSymbol}` };
      }

      const meta = result.meta;
      const closes = (result.indicators?.quote?.[0]?.close || []).filter(val => val !== null && val !== undefined);
      
      if (closes.length === 0) {
        return { success: false, error: `אין נתוני מחיר סגירה עבור ${cleanSymbol} בטווח המבוקש` };
      }

      const currentPrice = closes[closes.length - 1];
      const startPrice = closes[0];
      const overallChange = currentPrice - startPrice;
      const overallChangePercent = (overallChange / startPrice) * 100;

      // Calculate support and resistance (Period Low and Period High)
      const support = Math.min(...closes);
      const resistance = Math.max(...closes);

      // Helper function for Simple Moving Average (SMA)
      const calculateSMA = (data, period) => {
        if (data.length < period) return null;
        const slice = data.slice(-period);
        const sum = slice.reduce((acc, val) => acc + val, 0);
        return sum / period;
      };

      const sma20 = calculateSMA(closes, 20);
      const sma50 = calculateSMA(closes, 50);

      // Determine Trend direction
      let trendDirection = 'Sideways (מדשדשת)';
      if (sma20 && sma50) {
        if (currentPrice > sma20 && sma20 > sma50) {
          trendDirection = 'Bullish (מגמת עלייה שורית)';
        } else if (currentPrice < sma20 && sma20 < sma50) {
          trendDirection = 'Bearish (מגמת ירידה דובית)';
        }
      } else if (sma20) {
        if (currentPrice > sma20) {
          trendDirection = 'Bullish (עלייה בטווח קצר)';
        } else {
          trendDirection = 'Bearish (ירידה בטווח קצר)';
        }
      }

      return {
        success: true,
        symbol: cleanSymbol,
        currency: meta.currency,
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        range,
        periodDays: closes.length,
        change: parseFloat(overallChange.toFixed(2)),
        changePercent: parseFloat(overallChangePercent.toFixed(2)),
        support: parseFloat(support.toFixed(2)),
        resistance: parseFloat(resistance.toFixed(2)),
        sma20: sma20 ? parseFloat(sma20.toFixed(2)) : null,
        sma50: sma50 ? parseFloat(sma50.toFixed(2)) : null,
        trendDirection,
        recommendationGuidelines: {
          overbought: currentPrice >= resistance * 0.95 ? 'מחיר קרוב להתנגדות (אזור מכירת יתר פוטנציאלי)' : 'מרווח סביר מהתנגדות',
          oversold: currentPrice <= support * 1.05 ? 'מחיר קרוב לתמיכה (אזור קנייה פוטנציאלי)' : 'מרווח סביר מתמיכה'
        }
      };
    } catch (error) {
      console.error(`Error analyzing stock trend for ${cleanSymbol}:`, error.message);
      return { success: false, error: `שגיאה בניתוח מגמות הבורסה עבור ${cleanSymbol}: ${error.message}` };
    }
  }
}

export const infoService = new InfoService();
