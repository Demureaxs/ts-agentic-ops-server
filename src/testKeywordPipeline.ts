import { mineKeywordIdeas } from './toolkits/seoTools';
import logger from './services/logger';
import { filterKeywords } from './supervisor';

async function runTest() {
  const client = 'nnac';
  const baseKeyword = 'ac installation';

  logger.info(`Starting keyword pipeline test for client: ${client}...`);

  // Step 1: Mine a large, raw list of keywords
  // Note: For a real test, you'd call mineKeywordIdeas and then filter.
  // For this quick test, we'll just use a sample array.
  const rawKeywords = [
    'how air conditioner maintenance',
    'air conditioner maintenance checklist',
    'ac maintenance near me',
    'air conditioner maintenance cost',
    'ac maintence', // A typo to see if it gets filtered
    'air conditioner for with without', // Nonsense
    'hvac services',
  ];

  // Step 2: Filter the raw keywords using the supervisor's LLM-based filter
  const filteredKeywords = await filterKeywords(rawKeywords, client);

  console.log('\n--- Raw Keywords ---');
  console.log(rawKeywords);

  console.log('\n--- Filtered Keywords ---');
  console.log(filteredKeywords);

  logger.info('Keyword pipeline test completed.');
  logger.info("Review the filterKeywords function. In the next step, we'll integrate it into the main Supervisor loop.");
}

runTest();
