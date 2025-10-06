// src/test_playwright.ts
import { googleSearchAndScrapeLinks, scrapeWebpageContent } from './toolkits/seoTools';
import logger from './services/logger';

async function runTest() {
  logger.info('--- Starting Google Search test ---');

  // Let's use one of the keywords our last tool might have found
  const results = await googleSearchAndScrapeLinks('ac installation vs heat pump', 'nnac');

  if (results.length === 0 || typeof results === 'string') {
    logger.error('Could not get search results. Halting test.');
    return;
  }

  const firstUrl = results[0]?.link;

  logger.info({ url: firstUrl }, 'Found top URL. Now scraping its content...');

  // Step 2: Scrape the content of the first URL
  if (!firstUrl) {
    logger.error('No valid URL found to scrape. Halting test.');
    return;
  }
  const content = await scrapeWebpageContent(firstUrl);

  console.log('\n--- Scraped Content (first 500 chars) ---');
  console.log(content.substring(0, 500) + '...');
  console.log('-----------------------------------------');
}

runTest();
