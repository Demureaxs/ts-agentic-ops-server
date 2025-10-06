import { runSupervisor } from './supervisor';
import logger from './services/logger';
import { run } from 'node:test';

async function runMission() {
  logger.info('--- Starting SEO Agent Mission ---');

  const goal = `
    Write a comprehensive SEO blog post about 'ac installation vs heat pump' for the 'nnac' client.
    1. First, research the top 3 competing articles on Google.
    2. Then, read the content of each of those articles.
    3. Get the list of internal links for the client.
    4. Using all that information, write a new, high-quality article.
    5. Finally, save the completed article as a markdown file in the client's output directory.
    `;

  const finalResult = await runSupervisor(goal);
  logger.info(`\n--- SEO AGENT MISSION COMPLETE ---\n${finalResult}`);
}

runMission();
