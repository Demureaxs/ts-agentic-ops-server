import { chromium } from 'playwright';
import logger from '../services/logger';
import * as fsPromises from 'fs/promises';
import path from 'path';
import { log } from 'console';

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

// This function mines keyword ideas based on a base keyword and saves them to a file.
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
  const outputDir = path.join('data', client, 'output');

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

export async function googleSearchAndScrapeLinks(query: string, client: string): Promise<{ title: string; link: string }[]> {
  logger.info({ query }, `--- TOOL: Performing Google search and scraping links for '${query}' ---`);

  const browser = await chromium.launch({ headless: false }); // Back to headless for speed
  const page = await browser.newPage();
  const results: { title: string; link: string }[] = [];

  try {
    // 1. Go to Google
    await page.goto('https://www.google.com/');

    // 2. Handle Cookie Consent if it appears
    const consentButton = page.locator('button:has-text("Accept all"), button:has-text("Reject all")').first();
    try {
      await consentButton.click({ timeout: 3000 });
      logger.info('Cookie consent handled.');
    } catch (error) {
      logger.info('No cookie consent button found, or it was not clickable.');
    }

    // 3. Perform the search
    await page.locator('textarea[name="q"]').fill(query);
    await page.keyboard.press('Enter');

    // 4. Wait for the search results to load
    logger.info('Waiting for search results...');
    await page.waitForSelector('#search');

    // 5. Scrape the results
    // This selector is more robust: find links that contain an H3 heading.
    const resultLocators = page.locator('#search a:has(h3)');
    const count = await resultLocators.count();

    logger.info(`Found ${count} potential results. Scraping top 3...`);

    // Sets the number of results to store from serps
    for (let i = 0; i < Math.min(count, 3); i++) {
      const locator = resultLocators.nth(i);
      const title = await locator.locator('h3').innerText();
      const link = await locator.getAttribute('href');

      if (title && link) {
        results.push({ title, link });
      }
    }
  } catch (error: any) {
    logger.error({ err: error.message }, 'Error during Google search scraping');
  } finally {
    await browser.close();
    logger.info('--- TOOL: Browser closed ---');
  }

  logger.info({ resultsCount: results.length }, 'Scraping complete.');

  const outputDir = path.join('data', client, 'output');
  const fileName = `${query.replace(/ /g, '_')}_serp_results.json`;
  const fullPath = path.join(outputDir, fileName);

  try {
    await fsPromises.mkdir(outputDir, { recursive: true });
    await fsPromises.writeFile(fullPath, JSON.stringify(results, null, 2));

    const successMessage = `Successfully saved ${results.length} search results to ${fileName}`;
    logger.info(successMessage);
  } catch (error: any) {
    const errorMessage = `Error saving search results to file: ${error.message}`;
    logger.error(errorMessage);
  }
  return results;
}

// in src/toolkits/seo_tools.ts

export async function scrapeWebpageContent(url: string): Promise<string> {
  logger.info({ url }, `--- TOOL: Scraping main content from '${url}' ---`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const selectors = [
      'article',
      'div.prose',
      'main',
      'div[role="main"]',
      'div.post-content',
      'div.article-body',
      '#main-content',
      '#content',
      'div[id^="guide_content-component-"]',
    ];

    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1000 })) {
        logger.info(`Found content with selector:  '${selector}'`);
        const content = await locator.innerText();

        const cleanContent = content.replace(/\s\s+/g, ' ').trim();
        logger.info(`Successfully scraped ${cleanContent.length} characters of content.`);
        await browser.close();
        logger.info('--- TOOL: Browser closed ---');
        return cleanContent;
      }
    }
    throw new Error('No suitable content selector found on the page.');

    // 1. Define the locator that we know finds ALL the content blocks.
    const contentLocators = page.locator('div[id^="guide_content-component-"]');

    // 2. We don't wait for a single one. Instead, we get the text from all of them directly.
    // The .allInnerTexts() command is smart enough to wait for the elements to appear.
    logger.info('Finding and scraping all content blocks...');
    const allTexts = await contentLocators.allInnerTexts();

    if (allTexts.length === 0) {
      throw new Error('No content blocks were found with the specified selector.');
    }

    // 3. Join the text from all the separate divs into one complete article.
    // Using a double newline helps to separate the scraped sections.
    const fullContent = allTexts.join('\n\n');

    const cleanContent = fullContent.replace(/\s\s+/g, ' ').trim();

    logger.info(`Successfully scraped ${cleanContent.length} characters of content.`);
    return cleanContent;
  } catch (error: any) {
    logger.error({ err: error.message }, `Failed to scrape content from ${url}`);
    return `Error: Could not scrape content from the URL. ${error.message}`;
  } finally {
    await browser.close();
    logger.info('--- TOOL: Browser closed ---');
  }
}

// As we have changed the output structure to include a page links and output we need to ensure this function properly picks up the the relevant files
export async function getInternalLinks(client: string, fileName: string): Promise<{ name: string; url: string }[]> {
  logger.info({ client }, `--- TOOL: Fetching internal links for client '${client}' ---`);
  const filePath = path.join('data', client, 'inputs', 'internal_links.json');

  try {
    const fileContent = await fsPromises.readFile(filePath, 'utf-8');
    const links = JSON.parse(fileContent);

    logger.info(`Successfully loaded ${links.length} internal links.`);
    return links;
  } catch (error: any) {
    logger.error({ err: error.message }, `Error reading ${filePath}`);
    return [];
  }
}

export async function researchTopic(query: string, client: string): Promise<string[]> {
  logger.info({ query, client }, `--- COMBO TOOL: Researching topic '${query}' for ${client} ---`);

  // Step 1: Call our existing tool to get the links
  const searchResultString = await googleSearchAndScrapeLinks(query, client);

  // Parse JSON file that the above function creates
  const resultFileName = `${query.replace(/ /g, '_')}_serp_results.json`;
  const resultFilePath = path.join('data', client, 'output', resultFileName);

  let searchResults: { title: string; link: string }[] = [];
  try {
    const fileContent = await fsPromises.readFile(resultFilePath, 'utf-8');
    searchResults = JSON.parse(fileContent);
    logger.info(`Loaded ${searchResults.length} search results from ${resultFileName}`);
  } catch (error: any) {
    logger.error({ err: error.message }, `Error reading or parsing search results file: ${resultFileName}`);
    return [];
  }

  const allScrapedContent: string[] = [];

  for (const result of searchResults) {
    const content = await scrapeWebpageContent(result.link);
    if (!content.startsWith('Error')) {
      allScrapedContent.push(content);
    }
  }

  logger.info(`Successfully scraped content from ${allScrapedContent.length} URLs.`);
  return allScrapedContent;
}
