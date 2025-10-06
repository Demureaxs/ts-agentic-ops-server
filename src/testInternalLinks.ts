import { getInternalLinks } from './toolkits/seoTools';
import logger from './services/logger';

async function runTest() {
  logger.info('Starting test to fetch internal links from the relevant data folder...');

  const links = await getInternalLinks('nnac', 'internal_links.json');

  logger.info(`\n --- ✅ Internal Links Found:`);

  if (links.length > 0) {
    logger.info(links);
  } else {
    logger.info('No internal links found or an error occurred.');
  }
  logger.info('-----------------------------------\n');
}

runTest();
