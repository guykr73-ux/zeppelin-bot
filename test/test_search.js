import axios from 'axios';

async function testSearch(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  console.log('Searching DDG HTML for:', query);
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const html = response.data;
    console.log('HTML Length:', html.length);
    console.log('HTML Start:', html.slice(0, 1000));
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

testSearch('Formula 1 today news');
