// src/native.d.ts

/* This file tells TypeScript how to understand our compiled Rust modules.
  The '*.node' is a wildcard.
*/
declare module '*.node' {
  // We declare the functions that we know exist inside the .node file.
  export function sayHello(name: string): string;

  // When we add more Rust functions later, we will add their "signatures" here too.
  // export function anotherRustFunction(arg1: number): boolean;
}
