"use strict";
// src/test.ts
Object.defineProperty(exports, "__esModule", { value: true });
// We import the function from the .node file we just compiled.
// NOTE: You must change the filename here to EXACTLY match the .node file
// that was created in your project's root directory.
const rust_core_node_1 = require("../rust_core.node");
// Call the function that was written in Rust!
// Notice that napi-rs automatically converts our Rust snake_case (say_hello)
// into JavaScript/TypeScript camelCase (sayHello).
const greeting = (0, rust_core_node_1.sayHello)('Martyn');
// Print the result.
console.log('--- Message from Rust ---');
console.log(greeting);
console.log('-------------------------');
//# sourceMappingURL=test.js.map