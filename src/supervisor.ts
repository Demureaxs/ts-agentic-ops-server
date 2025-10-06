// src/main.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import logger from './services/logger';

import { createDirectory, deleteFile, readFile, writeToFile } from './toolkits/fileSystem';
import { sayHello } from './toolkits/rustBridge';
import { researchTopic, getInternalLinks } from './toolkits/seoTools'; // This line is causing the error
import { writeSeoArticle } from './toolkits/writingTools';

// --- Setup ---
// Configure dotenv to find the .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) throw new Error('GOOGLE_API_KEY not found in .env file.');
const genAI = new GoogleGenerativeAI(apiKey);

// --- Full Tool Registry ---
const availableTools: { [key: string]: Function } = {
  create_directory: createDirectory,
  write_to_file: writeToFile,
  say_hello: sayHello,
  research_topic: researchTopic, // ADD the new tool
  get_internal_links: getInternalLinks,
  write_seo_article: writeSeoArticle,
};

// --- The Planner Function ---
async function createPlan(goal: string, availableToolsStr: string): Promise<any[]> {
  const plannerModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const planningPrompt = `
    You are an expert project planner...
    AVAILABLE TOOLS:
    ${availableToolsStr}
    
    RULES:
    - Each step must be a JSON object with "step_number", "tool_name", and "arguments".
    - Placeholders like "<RESULT_OF_STEP_X>" are valid in 'arguments'.
    - For the 'write_to_file' tool, you MUST provide the 'content' argument. You MUST ALSO provide the 'topic' argument based on the article's subject. Do NOT provide a 'filePath'.
    - For the 'write_seo_article' tool, the 'scrapedContent' argument MUST be the placeholder for the 'research_topic' step.
    - Return ONLY the clean JSON list.

    --- EXAMPLE ---
    GOAL: "Write an article about heat pumps for nnac and save it."
    YOUR RESPONSE:
    [
      {"step_number": 1, "tool_name": "research_topic", "arguments": {"query": "what are heat pumps", "client": "nnac"}},
      {"step_number": 2, "tool_name": "get_internal_links", "arguments": {"client": "nnac"}},
      {"step_number": 3, "tool_name": "write_seo_article", "arguments": {"topic": "what are heat pumps", "scrapedContent": "<RESULT_OF_STEP_1>", "internalLinks": "<RESULT_OF_STEP_2>"}},
      {"step_number": 4, "tool_name": "write_to_file", "arguments": {"topic": "what are heat pumps", "content": "<RESULT_OF_STEP_3>"}}
    ]
    --- END OF EXAMPLE ---

    GOAL: "${goal}"
    `;

  logger.info('🤖 Supervisor: Asking the planner for a step-by-step plan...');

  const result = await plannerModel.generateContent(planningPrompt);
  const responseText = result.response.text();

  try {
    // Use the same robust parsing logic as before
    const startIndex = responseText.indexOf('[');
    const endIndex = responseText.lastIndexOf(']') + 1;

    if (startIndex === -1 || endIndex === 0) {
      throw new Error("No valid JSON list found in the model's response.");
    }

    const planText = responseText.substring(startIndex, endIndex);
    const plan = JSON.parse(planText);

    return plan;
  } catch (e) {
    logger.error('Failed to parse plan from model response.');
    logger.info('Full model response for debugging:');
    logger.info(responseText);
    return [];
  }
}

// --- NEW: The Executor Function ---
async function executePlan(plan: any[], goal: string, client: string): Promise<string> {
  const stepResults: { [key: number]: any } = {};
  let finalResponse: string = 'Plan finished, but no final output was generated.';

  logger.info('Supervisor: Starting plan execution...');

  for (const step of plan) {
    const stepNum = step.step_number;
    const toolName = step.tool_name;
    const toolArgs = step.arguments;

    logger.info(`Executing Step ${stepNum}: ${toolName} wuth ${JSON.stringify(toolArgs)}`);

    // State Management: Replace placeholders with previous results
    for (const key in toolArgs) {
      const value = toolArgs[key];
      if (typeof value === 'string' && value.startsWith('<RESULT_OF_STEP_')) {
        const sourceStepNum = parseInt(value.split('_').pop()!.replace('>', ''));

        logger.info(`  -> Replacing placeholder '${value}' with result from Step ${sourceStepNum}`);
        toolArgs[key] = stepResults[sourceStepNum];
      }
    }

    // Tool Execution
    if (availableTools[toolName]) {
      const toolFunction = availableTools[toolName];
      try {
        let output;

        if (toolName === 'research_topic') {
          output = await toolFunction(toolArgs.query, toolArgs.client);
        } else if (toolName === 'get_internal_links') {
          output = await toolFunction(toolArgs.client);
        } else if (toolName === 'write_seo_article') {
          output = await toolFunction(genAI, toolArgs.topic, toolArgs.scrapedContent, toolArgs.internalLinks);
        } else if (toolName === 'write_to_file') {
          output = await toolFunction({ ...toolArgs, client }); // Pass client here
        }

        // We use 'await' as our tool functions are now async
        // const output = await toolFunction(...Object.values(toolArgs));
        stepResults[stepNum] = output;
        finalResponse = output;

        logger.info(`  -> SUCCESS: Result stored.`);
      } catch (e: any) {
        finalResponse = `  -> 🔴 FAILED: ${e.message}`;
        console.log(finalResponse);
        break; // Stop execution if a step fails
      }
    } else {
      finalResponse = `  -> 🔴 FAILED: Tool '${toolName}' not found.`;
      logger.info(finalResponse);
      break;
    }
  }

  console.log('--- ✅ Supervisor: Plan Execution Finished ---');
  return String(finalResponse);
}

export async function filterKeywords(keywords: string[], client: string): Promise<string[]> {
  logger.info(`Filtering ${keywords.length} to remove duplicates and short entries...`);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
    You are an expert SEO Content Strategist for a company called '${client}'.
    Your task is to review a list of raw, auto-generated keywords and select ONLY the ones that are grammatically correct, make logical sense, and would be a good title or topic for a blog post.

    Discard any keywords that are nonsensical, spammy, irrelevant, or just a jumble of words.

    Return your response as a clean JSON array of strings, containing ONLY the good keywords you have selected. Do not include any other text or explanation.

    Here is the list of keywords to filter:
    ${JSON.stringify(keywords)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const startIndex = responseText.indexOf('[');
    const endIndex = responseText.lastIndexOf(']') + 1;
    const jsonText = responseText.substring(startIndex, endIndex);

    const googleKeywords: string[] = JSON.parse(jsonText);

    logger.info(`Filtered down to ${googleKeywords.length} high-quality keywords.`);
    return googleKeywords;
  } catch (error: any) {
    logger.error({ err: error.message }, 'Error filtering keywords with the language model');
    return [];
  }
}

// --- Main Execution Block ---
export async function runSupervisor(goal: string): Promise<string> {
  // Extract the client from the goal for now
  // More robust is to pass it as a second argument
  const clientMatch = goal.match(/for the '(\w+)' client/);
  const client = clientMatch ? clientMatch[1] : 'default_client';

  // UPDATED Brochure for the Planner
  const toolDescriptions = `
    - research_topic(query: string, client: string): Researches a topic and scrapes content.
    - get_internal_links(client: string): Gets internal links for a specific client.
    - write_seo_article(topic: string, scrapedContent: string[], internalLinks: object[]): Writes a full blog post.
    - write_to_file(topic: string, content: string): Saves the final article to a file, automatically named after the topic.
    `;

  // 1. Create the plan
  const thePlan = await createPlan(goal, toolDescriptions);

  // 2. Display and Execute the plan
  if (thePlan && thePlan.length > 0) {
    logger.info("\n--- The Supervisor's Plan ---");
    thePlan.forEach((step) => {
      logger.info(`Step ${step.step_number}: Use tool '${step.tool_name}' with arguments ${JSON.stringify(step.arguments)}`);
    });
    console.log('-----------------------------');

    let finalResult = '';
    if (client) {
      // 2a. Execute the plan!
      finalResult = await executePlan(thePlan, goal, client);

      logger.info(`\n--- SUPERVISOR FINAL OUTPUT ---\n${finalResult}`);
    }
    return finalResult;
  } else {
    logger.info('Supervisor failed to create a plan.');
    return 'Supervisor failed to create a plan';
  }
}
