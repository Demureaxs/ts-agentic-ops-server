import { chromium } from 'playwright';
import logger from '../services/logger';
import * as fsPromises from 'fs/promises';
import path from 'path';

export async function searchAnswerThePublic(keyword: string): Promise<string[]> {
  logger.info(`Searching AnswerThePublic for keyword: ${keyword}`);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(`https://answerthepublic.com`);
  // await page.goto(`https://answerthepublic.com/search?query=${encodeURIComponent(keyword)}`);

  try {
    // // Wait for the results to load
    // await page.waitForSelector('.results');
    await page.getByRole('textbox', { name: 'Enter your keyword' }).fill(keyword);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForTimeout(10000); // Wait for 10 seconds to allow results to load
    // Extract the relevant data
    const results = await page.evaluate(() => {
      const data: string[] = [];
      const elements = document.querySelectorAll('.results .result-item');
      elements.forEach((el) => {
        const text = el.textContent?.trim();
        if (text) {
          data.push(text);
        }
      });
      return data;
    });
    logger.info(`Found ${results.length} results from AnswerThePublic for keyword: ${keyword}`);
    return results;
  } catch (error) {
    logger.error(`Error while scraping AnswerThePublic: ${error}`);
    return [];
  } finally {
    await browser.close();
    logger.info('Browser closed after scraping AnswerThePublic');
  }
}


// This function fetches Google Autocomplete suggestions for a given query.
export async function getAutocompleteSuggestions(query: string): Promise<string[]> {
  logger.info({ query }, `--- TOOL: Fetching Google Autocomplete suggestions for '${query}' ---`);

  const url = `http://google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Autocomplete API returned an error: ${response.statusText}`);
    }

    // The response from this endpoint IS a JSON string, so we can parse it directly.
    const data = await response.json();

    // Based on your research, the data is an array, and the suggestions
    // are the second element (index 1) of that array.
    if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
      const suggestions: string[] = data[1];
      logger.info(`Found ${suggestions.length} suggestions.`);
      return suggestions;
    }

    logger.warn({ responseData: data }, 'Autocomplete response was not in the expected format.');
    return []; // Return empty if the format is unexpected
  } catch (error: any) {
    logger.error({ err: error.message }, 'Error fetching or parsing Google Autocomplete suggestions');
    return []; // Return empty on error
  }
}

export async function mineKeywordIdeas(baseKeyword: string, client: string): Promise<string> {
  logger.info({ keyword: baseKeyword, client }, `--- TOOL: Mining keyword ideas for '${baseKeyword}' ---`);

  const questionPrefixes = ['how', 'what', 'why', 'when', 'where', 'are', 'can', 'will', 'which'];
  const prepositionPrefixes = ['for', 'with', 'without', 'to', 'like', 'is'];
  const comparisonPrefixes = ['vs', 'or', 'and', 'versus', 'like'];

  const allSuggestions = new Set<string>();

  const allPrefixes = [...questionPrefixes, ...prepositionPrefixes, ...comparisonPrefixes];

  for (const prefix of allPrefixes) {
    const query = `${prefix} ${baseKeyword}`;
    logger.debug({ query }, `Fetching suggestions for prefix '${prefix}'`);

    const suggestions = await getAutocompleteSuggestions(query);

    suggestions.forEach((s) => allSuggestions.add(s));

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const uniqueSuggestions = Array.from(allSuggestions);

  logger.info(`Total unique keyword ideas mined: ${uniqueSuggestions.length}`);

  // Dynamic Path Logic
  const outputDir = path.join('data', client);

  const fileName = `${baseKeyword.replace(/ /g, '_')}_keywords.json`;

  const fullPath = path.join(outputDir, fileName);

  try {
    await fsPromises.mkdir(outputDir, { recursive: true });

    await fsPromises.writeFile(fullPath, JSON.stringify(uniqueSuggestions, null, 2));
    const successMessage = `Successfully mined and saved ${uniqueSuggestions.length} keyword ideas to ${fileName}`;

    logger.info(successMessage);
    return successMessage;
  } catch (error) {
    const errorMessage = `Error saving keyword ideas to file: ${error}`;
    logger.error(errorMessage);
    return errorMessage;
  }
}
