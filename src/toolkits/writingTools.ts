import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../services/logger';

export async function writeSeoArticle(
  genAI: GoogleGenerativeAI,
  topic: string,
  scrapedContent: string[],
  internalLinks: { name: string; url: string }[]
): Promise<string> {
  logger.info(`Generating SEO article on topic: ${topic}`);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const research = scrapedContent.join('\n\n---\n\n');

  const links = internalLinks.map((link) => `- [${link.name}](${link.url})`).join('\n');

  const prompt = `
    You are a world-class SEO content writer for an air conditioning company.
    Your task is to write a comprehensive, helpful, and engaging blog post on the given TOPIC.

    Use the provided RESEARCH MATERIAL from top-ranking articles as your primary source of information, facts, and structure. Synthesize this information into a new, unique article. Do not plagiarise.

    You must naturally include some of the provided INTERNAL LINKS where it makes sense to do so.

    The article should be in Markdown format.

    TOPIC:
    ${topic}

    INTERNAL LINKS TO INCLUDE:
    ${links}

    RESEARCH MATERIAL:
    ${research}
    `;

  try {
    const result = await model.generateContent(prompt);
    const article = result.response.text();
    logger.info(`Successfully generated SEO article on topic: ${topic}`);
    return article;
  } catch (error: any) {
    logger.error({ err: error.message }, 'Error generating SEO article with the language model');
    return `Error generating article ${error.message}.`;
  }
}
