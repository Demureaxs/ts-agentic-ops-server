// src/test_playwright.ts
import { googleSearchAndScrapeLinks } from './toolkits/seoTools';
import logger from './services/logger';

async function runTest() {
  logger.info('--- Starting Google Search test ---');

  // Let's use one of the keywords our last tool might have found
  const resultMessage = await googleSearchAndScrapeLinks('ac installation vs heat pump', 'nnac');

  // console.log('\n--- Top 3 Google Results ---');
  // if (results.length > 0) {
  //   results.forEach((r, i) => console.log(`${i + 1}. ${r.title}\n   ${r.link}\n`));
  // } else {
  //   console.log('No results found or an error occurred.');
  // }
  // console.log('----------------------------');
  logger.info({ result: resultMessage }, '--- Google Search test completed ---');
}

runTest();
