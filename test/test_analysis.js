import { infoService } from '../src/services/infoService.js';

async function runTests() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  console.log('=== TEST 1: Expanded Sports Feeds ===');
  try {
    const res = await infoService.getSports();
    console.log('Success:', res.success);
    console.log('Source:', res.source);
    console.log('Total sports items fetched:', res.items?.length);
    console.log('Distinct sources in sports feed:', [...new Set(res.items?.map(i => i.source))]);
    if (res.items && res.items.length > 0) {
      console.log('Sample sports title:', res.items[0].title);
    }
  } catch (err) {
    console.error('Sports Test Failed:', err.message);
  }

  console.log('\n=== TEST 2: Market News (Local & Global) ===');
  try {
    const res = await infoService.getMarketNews();
    console.log('Success:', res.success);
    console.log('Total finance news items:', res.items?.length);
    console.log('Sources present:', [...new Set(res.items?.map(i => i.source))]);
    if (res.items && res.items.length > 0) {
      console.log('Sample news title:', res.items[0].title);
    }
  } catch (err) {
    console.error('Market News Test Failed:', err.message);
  }

  console.log('\n=== TEST 3: Technical Stock Trend Analysis ===');
  try {
    // Analyze Apple (AAPL) over the last 3 months
    const analysis = await infoService.analyzeStockTrend('AAPL', '3mo');
    console.log('Analysis result:', JSON.stringify(analysis, null, 2));
  } catch (err) {
    console.error('Stock Analysis Test Failed:', err.message);
  }
}

runTests();
