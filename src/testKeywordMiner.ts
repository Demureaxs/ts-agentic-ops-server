import { mineKeywordIdeas } from './toolkits/seoTools';
import logger from './services/logger';
import { run } from 'node:test';

async function runTest() {
  logger.info('Starting test to mine keyword ideas...');

  const result = await mineKeywordIdeas('ac-installation', 'nnac');

  console.log(`\n --- ✅ Keyword Mining Result:`);
  console.log(result);
  console.log('-----------------------------------\n');
}

runTest();
