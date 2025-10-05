"use strict";
// src/main.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fileSystem_1 = require("./toolkits/fileSystem");
const rustBridge_1 = require("./toolkits/rustBridge");
// --- Setup ---
// Configure dotenv to find the .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey)
    throw new Error('GOOGLE_API_KEY not found in .env file.');
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
// --- Tool Registry (The "Phonebook") ---
// A Map that connects the string names from the plan to our actual functions.
const availableTools = {
    create_directory: fileSystem_1.createDirectory,
    write_to_file: fileSystem_1.writeToFile,
    say_hello: rustBridge_1.sayHello,
};
// --- The Planner Function ---
function createPlan(goal, availableToolsStr) {
    return __awaiter(this, void 0, void 0, function* () {
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
        console.log('🤖 Supervisor: Asking the planner for a step-by-step plan...');
        const result = yield plannerModel.generateContent(planningPrompt);
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
        }
        catch (e) {
            console.error('--- ERROR: Could not parse the plan. ---', e);
            console.log('Raw Planner Response:\n', responseText);
            return [];
        }
    });
}
// --- NEW: The Executor Function ---
function executePlan(plan) {
    return __awaiter(this, void 0, void 0, function* () {
        const stepResults = {};
        let finalResponse = 'Plan finished, but no final output was generated.';
        console.log('\n--- ✅ Supervisor: Executing Plan ---');
        for (const step of plan) {
            const stepNum = step.step_number;
            const toolName = step.tool_name;
            const toolArgs = step.arguments; // <-- THE FIX: Changed 'let_arguments' to 'const toolArgs'
            console.log(`Executing Step ${stepNum}: ${toolName} with ${JSON.stringify(toolArgs)}`);
            // State Management: Replace placeholders with previous results
            for (const key in toolArgs) {
                const value = toolArgs[key];
                if (typeof value === 'string' && value.startsWith('<RESULT_OF_STEP_')) {
                    const sourceStepNum = parseInt(value.split('_').pop().replace('>', ''));
                    console.log(`  -> Replacing placeholder '${value}' with result from Step ${sourceStepNum}`);
                    toolArgs[key] = stepResults[sourceStepNum];
                }
            }
            // Tool Execution
            if (availableTools[toolName]) {
                const toolFunction = availableTools[toolName];
                try {
                    // We use 'await' as our tool functions are now async
                    const output = yield toolFunction(...Object.values(toolArgs));
                    stepResults[stepNum] = output;
                    finalResponse = output;
                    console.log(`  -> SUCCESS: Result stored.`);
                }
                catch (e) {
                    finalResponse = `  -> 🔴 FAILED: ${e.message}`;
                    console.log(finalResponse);
                    break; // Stop execution if a step fails
                }
            }
            else {
                finalResponse = `  -> 🔴 FAILED: Tool '${toolName}' not found.`;
                console.log(finalResponse);
                break;
            }
        }
        console.log('--- ✅ Supervisor: Plan Execution Finished ---');
        return String(finalResponse);
    });
}
// --- Main Execution Block ---
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const toolDescriptions = `
    - create_directory(directory_path: string)
    - write_to_file(file_path: string, content: string)
    - say_hello(name: string): A high-performance Rust function.
    `;
        const userGoal = "Create a new project folder called 'ts_project', and then create a greeting file inside it named 'hello.ts' using the Rust module to greet 'TypeScript'";
        // 1. Create the plan
        const thePlan = yield createPlan(userGoal, toolDescriptions);
        // 2. Display and Execute the plan
        if (thePlan && thePlan.length > 0) {
            console.log("\n--- The Supervisor's Plan ---");
            thePlan.forEach((step) => {
                console.log(`Step ${step.step_number}: Use tool '${step.tool_name}' with arguments ${JSON.stringify(step.arguments)}`);
            });
            console.log('-----------------------------');
            // 2a. Execute the plan!
            const finalResult = yield executePlan(thePlan);
            console.log(`\n--- SUPERVISOR FINAL OUTPUT ---\n${finalResult}`);
        }
        else {
            console.log('Supervisor failed to create a plan.');
        }
    });
}
// Run the main function
main();
//# sourceMappingURL=main.js.map