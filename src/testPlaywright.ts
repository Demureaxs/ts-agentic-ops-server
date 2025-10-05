import { searchAnswerThePublic } from './toolkits/seoTools';
import logger from './services/logger';

async function runTest() {
  logger.info('Starting Playwright test to scrape AnswerThePublic...');

  const keyword = 'artificial intelligence';
  const results = await searchAnswerThePublic(keyword);

  if (results.length > 0) {
    logger.info(`Successfully retrieved ${results.length} results for keyword: "${keyword}"`);
    results.forEach((result, index) => {
      logger.info(`${index + 1}. ${result}`);
    });
  } else {
    logger.warn(`No results found for keyword: "${keyword}"`);
  }

  logger.info('Playwright test completed.');
}

runTest();
