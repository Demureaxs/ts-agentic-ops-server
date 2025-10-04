# Hybrid TypeScript/Rust Project Setup Guide

This guide details the complete, successful steps to create a high-performance Node.js application with a Rust core, using TypeScript for the main logic. It is the blueprint for the `agentic-ts-server` project.

## 1. System Prerequisites

Before starting, ensure your system (Ubuntu/Debian-based) has the core development tools installed.

- **Node.js & npm:** For managing the TypeScript side.
- **Rust & Cargo:** For managing the Rust side (install via `rustup`).
- **Core Build Tools:** The C compiler and linker are required by Rust for the final compilation step.

```bash
# Update package lists and install the essential build tools
sudo apt update && sudo apt install build-essential
```

## 2. Project Initialization

This section covers the initial scaffolding of the project structure and TypeScript setup. All commands are run from your main development directory (e.g., `~/Desktop`).

1. **Create the Project Folder:**

   ```bash
   mkdir agentic-ts-server
   cd agentic-ts-server
   ```
2. **Initialize Node.js:** This creates the `package.json` file.

   ```bash
   npm init -y
   ```
3. **Install TypeScript & Dev Dependencies:**

   ```bash
   npm install typescript @types/node ts-node --save-dev
   ```
4. **Initialize TypeScript Config:** This creates the `tsconfig.json` file.

   ```bash
   npx tsc --init
   ```

## 3. Configuring TypeScript (`tsconfig.json`)

For compatibility with native Node.js addons (`.node` files), the default TypeScript configuration needs to be adjusted.

1. Open `tsconfig.json`.
2. Find the `compilerOptions` section and ensure the following key-value pairs are set. This configuration uses the robust `CommonJS` module system.

   ```json
   "compilerOptions": {
     "target": "es2016",
     "module": "CommonJS",
     "moduleResolution": "Node",
     "rootDir": "./src",
     "outDir": "./dist",
     "esModuleInterop": true,
     "forceConsistentCasingInFileNames": true,
     "strict": true,
     "skipLibCheck": true,
     "verbatimModuleSyntax": false
   },
   ```

## 4. Initializing the Rust Core

Now, we'll create the Rust library that will be called by TypeScript.

1. **Create the Rust Library Project:** From the project root (`agentic-ts-server`), run:

   ```bash
   cargo new --lib rust_core
   ```
2. **Configure `Cargo.toml`:** Open `rust_core/Cargo.toml` and replace its contents with the following to configure it as a Node.js-compatible library and add the `napi-rs` dependencies.

   ```toml
   [package]
   name = "rust_core"
   version = "0.1.0"
   edition = "2021"

   [lib]
   crate-type = ["cdylib"]

   [dependencies]
   napi = "2"
   napi-derive = "2"

   [build-dependencies]
   napi-build = "2"
   ```
3. **Create the `build.rs` script:** Inside the `rust_core` folder, create a file named `build.rs`. This script helps `napi-rs` with the build process.

   ```rust
   // rust_core/build.rs
   fn main() {
       napi_build::setup();
   }
   ```

## 5. Writing the Bridge Code

These are the actual source files for our test.

1. **The Rust Function (`lib.rs`):** Open `rust_core/src/lib.rs` and replace its contents. The `#[napi]` macro exposes the function to Node.js.

   ```rust
   // rust_core/src/lib.rs
   use napi_derive::napi;

   #[napi]
   pub fn say_hello(name: String) -> String {
       format!("Hello, {}! Greetings from the Rust engine room (via Node.js).", name)
   }
   ```
2. **The TypeScript Declaration File (`native.d.ts`):** In the `src` folder, create a file `src/native.d.ts`. This file tells TypeScript the "shape" of our compiled Rust module, satisfying the type checker.

   ```typescript
   // src/native.d.ts
   declare module '*.node' {
     export function sayHello(name: string): string;
   }
   ```
3. **The TypeScript Test Script (`test.ts`):** In the `src` folder, create `src/test.ts`. This script uses the direct `require()` method to reliably load our native module.

   ```typescript
   // src/test.ts
   import * as path from 'path';

   const rustCore = require(path.join(__dirname, '..', 'rust_core.linux-x64-gnu.node'));

   const greeting = rustCore.sayHello("Martyn");

   console.log("--- Message from Rust ---");
   console.log(greeting);
   console.log("-------------------------");
   ```

## 6. The Build & Run Scripts (`package.json`)

Open `package.json` and replace the `"scripts"` section with the following robust build pipeline.

```json
  "scripts": {
    "build:rs": "cd rust_core && cargo build --release && cp target/release/lib*.so ../rust_core.linux-x64-gnu.node",
    "build:ts": "tsc",
    "build": "npm run build:rs && npm run build:ts",
    "start": "node dist/test.js"
  },
```

## 7. The Final Workflow

With all files in place, the workflow is simple. All commands are run from the project root (`agentic-ts-server`).

1. **Build the entire project:** This compiles both Rust and TypeScript.
   ```bash
   npm run build
   ```
2. **Run the application:** This executes the compiled JavaScript, which in turn calls the compiled Rust code.
   ```bash
   npm run start
   ```

You should see the successful output:

```
--- Message from Rust ---
Hello, Martyn! Greetings from the Rust engine room (via Node.js).
-------------------------
```

This officially concludes the 'Bridge Building' chapter. It was a tough one, but the foundation is now rock solid. Get some rest, and when you're ready to continue tomorrow, our very next lesson will be to start building the Supervisor agent's Planner/Executor logic in TypeScript on top of this powerful new foundation.
