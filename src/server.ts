// src/server.ts (with professional logging)

import express, { Express, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as dotenv from 'dotenv';
import * as path from 'path';

// --- Import our new logger and the supervisor ---
import logger from './services/logger';
import { runSupervisor } from './supervisor';
import agentRouter from './routes/agentRoutes/agent.routes';

// --- Setup ---
dotenv.config();
const app: Express = express();
const PORT = 8000;

const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;

const templatePath = path.join(__dirname, 'templates', 'frontend', 'audioInterface.html');
const HTML_TEMPLATE = fs.readFileSync(templatePath, 'utf-8');

app.use(express.json());

// --- Static Files & Templates ---
if (!fs.existsSync('outputs')) {
  fs.mkdirSync('outputs');
}
app.use('/outputs', express.static('outputs'));

// --- Endpoints ---

// Root serves the html recorder
app.get('/', (req: Request, res: Response) => {
  logger.info('GET / - Served front-end UI');
  res.send(HTML_TEMPLATE);
});

app.use('/agent', agentRouter);

// Start the Server
app.listen(PORT, () => {
  logger.info(`🚀 Server is running at http://localhost:${PORT}`);
});
