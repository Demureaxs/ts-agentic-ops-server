// src/test.ts

// We import the function from the .node file we just compiled.
// NOTE: You must change the filename here to EXACTLY match the .node file
// that was created in your project's root directory.
import { sayHello } from '../rust_core.node';

// Call the function that was written in Rust!
// Notice that napi-rs automatically converts our Rust snake_case (say_hello)
// into JavaScript/TypeScript camelCase (sayHello).
const greeting = sayHello('Martyn');

// Print the result.
console.log('--- Message from Rust ---');
console.log(greeting);
console.log('-------------------------');
