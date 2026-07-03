import Parser from 'rss-parser';

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
});

async function testFeeds() {
  const feeds = [
    { name: 'Globes Finance', url: 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx?feedval=1022' },
    { name: 'Yahoo Sports NBA', url: 'https://sports.yahoo.com/nba/rss/' },
    { name: 'Sport5 RSS', url: 'https://www.sport5.co.il/rss.xml' }
  ];

  for (const f of feeds) {
    console.log(`\nTesting: ${f.name}...`);
    try {
      const feed = await parser.parseURL(f.url);
      console.log(`SUCCESS! Title: "${feed.title}". Items: ${feed.items?.length}`);
      if (feed.items?.length > 0) {
        console.log(`Sample Title: ${feed.items[0].title}`);
      }
    } catch (err) {
      console.log(`FAILED! Error: ${err.message}`);
    }
  }
}

testFeeds();
