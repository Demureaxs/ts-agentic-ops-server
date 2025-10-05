import { getAutocompleteSuggestions } from './toolkits/seoTools';
import logger from './services/logger';
import { get } from 'http';

async function runTest() {
  logger.info('Starting test to fetch Google Autocomplete suggestions...');

  const query = 'ac-installation';
  const suggestions = await getAutocompleteSuggestions(query);

  console.log(`\n --- ✅ Autocomplete Suggestions for "${query}":`);

  if (suggestions.length > 0) {
    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });
  } else {
    console.log('No suggestions found.');
  }
  console.log('-----------------------------------\n');
}

runTest();
