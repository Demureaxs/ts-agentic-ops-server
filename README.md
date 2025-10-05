# Agentic TS Ops Server

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green?style=for-the-badge&logo=nodedotjs)
![Rust](https://img.shields.io/badge/Rust-Stable-orange?style=for-the-badge&logo=rust)
![Status](https://img.shields.io/badge/Status-Active_Development-yellow?style=for-the-badge)

A modular, high-performance AI agent platform built with a TypeScript orchestration layer and a Rust core for performance-critical tasks. This project serves as the foundation for a powerful personal "ops server," capable of understanding complex goals in natural language, creating multi-step plans, and executing them using a variety of tools.

## Core Features

- **Supervisor Architecture:** Implements a "Plan-and-Execute" model where an AI Planner (Google Gemini) generates a structured JSON plan, which is then carried out by a reliable TypeScript Executor.
- **Hybrid TypeScript/Rust Core:** Leverages TypeScript for rapid development and asynchronous orchestration, while using a compiled Rust library for high-performance tasks, connected via NAPI-RS.
- **Multi-Tool Capability:** The agent can use multiple tools in a single task, managing state between steps (e.g., using the output of a Rust function as the input for a file system tool).
- **Voice-Controlled API:** Features a robust Express.js server with a voice-activated endpoint, using a client-side `SpeechRecognition` UI for input.
- **Modular & Scalable Architecture:** The codebase is professionally structured with clear separation of concerns (server, agents, toolkits, services, config), making it easy to add new agents and tools.
- **Integrated AI Services:**
  - **Reasoning/Planning:** Google Gemini (`gemini-pro` / `gemini-2.0-flash`).
  - **Speech-to-Text (STT):** Can be configured for either client-side Web Speech API or server-side via an external API (e.g., Hugging Face).
  - **Text-to-Speech (TTS):** Server-side generation of voice responses using `gTTS` and `pydub`.
- **Professional Tooling:** Includes structured logging with `pino`, a complete build pipeline with `npm` scripts, and live-reloading for development with `ts-node-dev`.

## Architectural Overview

The system is designed with a clean separation of concerns, following a Routes-Controllers-Services pattern, with the Supervisor agent at its core.

```
[User Voice Command] -> [Web UI Front-end (`index.html`)]
          |
          v (transcribed text as JSON)
[Express Server (`src/server.ts`)] -> [Routes (`agent.routes.ts`)]
          |
          v
[Controller (`agent.controller.ts`)]
          |
          v (goal string)
[Supervisor Agent (`src/agents/supervisor.ts`)]
          |
          |--- 1. Planner ---> [Gemini API] --> (Returns JSON Plan)
          |
          |--- 2. Executor --> [Toolkits] ----> [file_system.ts]
                                   |
                                   `-----------> [rust_bridge.ts] -> (rust_core.node)
```

1. The **Server** handles all web traffic, serves the UI, and delegates tasks to the correct controller.
2. The **Controller** parses the request and calls the core `run_supervisor` function.
3. The **Supervisor Agent** contains the main logic:
   - The **Planner** takes a goal and asks the LLM to generate a JSON plan.
   - The **Executor** reads the JSON plan step-by-step, calling the appropriate tools.
4. The **Toolkits** are a collection of the agent's skills, including pure TypeScript functions and the bridge to our compiled Rust library.

## Technology Stack

- **Backend:** TypeScript, Node.js, Express.js
- **Performance Core:** Rust
- **Rust/TS Bridge:** NAPI-RS
- **AI Models:** Google Gemini
- **Audio:** Web Speech API (client-side), `gTTS`, `pydub` (server-side)
- **Tooling:** `npm`, `tsc`, `ts-node-dev`, `pino`, `cargo`

## Setup and Installation

### Prerequisites

- Node.js (v18+ recommended) and npm
- Rust and Cargo (install via `rustup`)
- An Ubuntu/Debian-based OS is assumed for the following command:
  ```bash
  # Install core build tools, ffmpeg for pydub, and portaudio for sounddevice
  sudo apt update && sudo apt install build-essential ffmpeg portaudio19-dev
  ```

### Installation Steps

1. **Clone the repository:**

   ```bash
   git clone [https://github.com/Demureaxs/ts-agentic-ops-server.git](https://github.com/Demureaxs/ts-agentic-ops-server.git)
   cd ts-agentic-ops-server
   ```
2. **Set up environment variables:**

   * Create a file named `.env` in the project root.
   * Add your Google AI API key:
     ```
     GOOGLE_API_KEY="AIzaSy...your...key...here"
     ```
3. **Install all dependencies:** This command installs both the Node.js packages from `package.json`.

   ```bash
   npm install
   ```
4. **Build the project:** This command compiles both the Rust core and the TypeScript code.

   ```bash
   npm run build
   ```

## Running the Server

- **For Development (with auto-reloading and pretty logs):**

  ```bash
  npm run dev
  ```
- **For Production (runs the compiled JavaScript):**

  ```bash
  npm run start
  ```

The server will start on `http://localhost:8000`.

## Usage

### Voice-Controlled Web UI

1. **Expose your server to the internet** using a tool like `ngrok`:
   ```bash
   ngrok http 8000
   ```
2. Copy the public `https://...` URL provided by `ngrok`.
3. Open that URL in a compatible web browser (e.g., Chrome) on a device with a microphone.
4. Tap the "Listen" button to issue voice commands.

### Text-Based API

You can also interact with the agent via a standard API client or the interactive docs.

- While the server is running, go to **`http://localhost:8000/docs`**.
- Use the `POST /agent/run/text` endpoint to send a JSON request body with your goal:
  ```json
  {
    "goal": "Create a test folder and write a hello from rust inside it."
  }
  ```

## Project Roadmap

- [ ] **Database Integration:** Integrate PostgreSQL and Prisma to give the agent persistent long-term memory for logging its actions and storing structured knowledge.
- [ ] **Self-Improving Tools:** Build "meta-tools" to allow the agent to read its own code, write new tool functions, test them, and dynamically register them to expand its own capabilities.
- [ ] **Expanded Toolkits:** Develop new toolkits for interacting with external services, such as a DAW via MIDI, web scraping libraries, or other third-party APIs.
