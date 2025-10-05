// src/main.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { createDirectory, deleteFile, readFile, writeToFile } from './toolkits/fileSystem';
import { sayHello } from './toolkits/rustBridge';
import logger from './services/logger';
import { log } from 'console';

// --- Setup ---
// Configure dotenv to find the .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) throw new Error('GOOGLE_API_KEY not found in .env file.');

const genAI = new GoogleGenerativeAI(apiKey);

// --- Tool Registry (The "Phonebook") ---
// A Map that connects the string names from the plan to our actual functions.
const availableTools: { [key: string]: Function } = {
  create_directory: createDirectory,
  write_to_file: writeToFile,
  say_hello: sayHello,
  delete_file: deleteFile,
  read_file: readFile,
};

// --- The Planner Function ---
async function createPlan(goal: string, availableToolsStr: string): Promise<any[]> {
  const plannerModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const planningPrompt = `
    You are an expert project planner for an AI agent. Your job is to take a high-level GOAL
    and break it down into a sequence of concrete steps using the AVAILABLE TOOLS.

    AVAILABLE TOOLS:
    ${availableToolsStr}

    RULES:
    - Each step in the plan must be a JSON object with three keys: "step_number", "tool_name", and "arguments".
    - The 'arguments' must be a dictionary of key-value pairs.
    - If a step needs to use the output from a previous step, use the placeholder string "<RESULT_OF_STEP_X>" in the arguments, where X is the previous step number.
    - Return your final plan as a single, clean JSON list of these step objects. Do not add any other text, explanation, or markdown formatting.

    --- EXAMPLE ---
    GOAL: "Create a demo folder and a file inside it called test.txt with the content 'hello'"
    
    YOUR RESPONSE:
    [
      {
        "step_number": 1,
        "tool_name": "create_directory",
        "arguments": {
          "directory_path": "demo"
        }
      },
      {
        "step_number": 2,
        "tool_name": "write_to_file",
        "arguments": {
          "file_path": "demo/test.txt",
          "content": "hello"
        }
      }
    ]
    --- END OF EXAMPLE ---

    Now, generate a plan for the following goal. Remember to only output the clean JSON list.

    GOAL: "${goal}"
    `;

  logger.info('🤖 Supervisor: Asking the planner for a step-by-step plan...');

  const result = await plannerModel.generateContent(planningPrompt);
  const response = result.response;
  const responseText = response.text();

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
async function executePlan(plan: any[]): Promise<string> {
  const stepResults: { [key: number]: any } = {};
  let finalResponse: string = 'Plan finished, but no final output was generated.';

  logger.info('Supervisor: Starting plan execution...');

  for (const step of plan) {
    const stepNum = step.step_number;
    const toolName = step.tool_name;
    const toolArgs = step.arguments; // <-- THE FIX: Changed 'let_arguments' to 'const toolArgs'

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
        // We use 'await' as our tool functions are now async
        const output = await toolFunction(...Object.values(toolArgs));
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
// --- Main Execution Block ---
export async function runSupervisor(goal: string): Promise<string> {
  const toolDescriptions = `
    - create_directory(directory_path: string): Creates a new folder at the specified path.
    - write_to_file(file_path: string, content: string): Writes text content to a file.
    - read_file(filePath: string): Reads and returns the full content of a file.
    - delete_file(filePath: string): ⚠️ Deletes a file permanently from the file system.
    - say_hello(name: string): A high-performance function from the Rust core.
  `;

  const userGoal =
    "Create a new project folder called 'ts_project', and then create a greeting file inside it named 'hello.ts' using the Rust module to greet 'TypeScript'";

  // 1. Create the plan
  const thePlan = await createPlan(goal, toolDescriptions);

  // 2. Display and Execute the plan
  if (thePlan && thePlan.length > 0) {
    logger.info("\n--- The Supervisor's Plan ---");
    thePlan.forEach((step) => {
      logger.info(
        `Step ${step.step_number}: Use tool '${step.tool_name}' with arguments ${JSON.stringify(step.arguments)}`
      );
    });
    console.log('-----------------------------');

    // 2a. Execute the plan!
    const finalResult = await executePlan(thePlan);

    logger.info(`\n--- SUPERVISOR FINAL OUTPUT ---\n${finalResult}`);
    return finalResult;
  } else {
    logger.info('Supervisor failed to create a plan.');
    return 'Supervisor failed to create a plan';
  }
}
