import Parser from 'rss-parser';

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0' }
});

async function test() {
  const url = 'https://www.skysports.com/rss/12433';
  console.log('Fetching Sky Sports F1 RSS Feed:', url);
  try {
    const feed = await parser.parseURL(url);
    console.log('Feed Title:', feed.title);
    console.log('Items Count:', feed.items.length);
    
    feed.items.slice(0, 5).forEach((item, idx) => {
      console.log(`\n--- Item ${idx + 1} ---`);
      console.log('Title:', item.title);
      console.log('Link:', item.link);
      console.log('Snippet:', item.contentSnippet || item.content);
    });
  } catch (err) {
    console.error('Error fetching F1 RSS:', err.message);
  }
}

test();
