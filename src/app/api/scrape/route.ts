import { NextResponse } from 'next/server';
import { scrapeAllPages } from '@/lib/scraper';
import { setCache } from '@/lib/kv';

export async function GET(request: Request) {
  // Basic protection: check for a secret token if in production
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    console.log('Starting scrape job...');
    const result = await scrapeAllPages();
    
    const lastFullRunSuccess = result.successCount > 0;
    
    const cacheData = {
      pages: result.pages,
      lastFullRun: new Date().toISOString(),
      lastFullRunSuccess
    };

    // Only overwrite cache if we had some success
    if (lastFullRunSuccess) {
      await setCache('aits_scraped_data', cacheData);
      console.log('Cache updated successfully:', result.successCount, 'pages scraped.');
      return NextResponse.json({ success: true, ...result });
    } else {
      console.warn('Scrape job yielded no valid pages, cache not overwritten.');
      return NextResponse.json({ success: false, error: 'No pages passed sanity check' }, { status: 500 });
    }
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
