import * as path from 'path';
const rustCore = require(path.join(__dirname, '..', '..', 'rust_core.node'));

export const sayHello: (name: string) => string = rustCore.sayHello;
