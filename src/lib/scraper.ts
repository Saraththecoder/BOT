import * as cheerio from 'cheerio';

const URLS_TO_SCRAPE = [
  'https://aits-tpt.edu.in/',
  'https://aits-tpt.edu.in/courses-offered/',
  'https://aits-tpt.edu.in/academic-curriculum/',
  'https://aits-tpt.edu.in/admissions/',
  'https://aits-tpt.edu.in/placements/',
  'https://aits-tpt.edu.in/computer-science-and-engineering-cse/',
  'https://aits-tpt.edu.in/artificial-intelligence-and-machine-learning-ai-ml/',
  'https://aits-tpt.edu.in/artificial-intelligence-and-data-science-ai-ds/',
  'https://aits-tpt.edu.in/electronics-communication-engineering-ece/',
  'https://aits-tpt.edu.in/electrical-and-electronics-engineering-eee/',
  'https://aits-tpt.edu.in/mechanical-engineering/',
  'https://aits-tpt.edu.in/civil-engineering/'
];

export interface ScrapedPage {
  text: string;
  scrapedAt: string;
}

export async function scrapePage(url: string): Promise<ScrapedPage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AITS-FAQ-Bot-Scraper/1.0',
      },
      next: { revalidate: 0 } // Don't use next.js fetch cache for this background job
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Strip unnecessary tags
    $('nav, footer, script, style, noscript, iframe, svg, header').remove();

    // Extract text from body
    let text = $('body').text();

    // Clean whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Sanity check
    if (text.length < 200) {
      console.warn(`Sanity check failed for ${url}: Text too short (${text.length} chars)`);
      return null;
    }

    const lowerText = text.toLowerCase();
    if (!lowerText.includes('aits') && !lowerText.includes('annamacharya')) {
      console.warn(`Sanity check failed for ${url}: Does not contain AITS or Annamacharya`);
      return null;
    }

    return {
      text,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

export async function scrapeAllPages() {
  const results: Record<string, ScrapedPage> = {};
  let successCount = 0;

  for (const url of URLS_TO_SCRAPE) {
    const scrapedData = await scrapePage(url);
    if (scrapedData) {
      results[url] = scrapedData;
      successCount++;
    }
  }

  return {
    pages: results,
    successCount,
    totalCount: URLS_TO_SCRAPE.length
  };
}
