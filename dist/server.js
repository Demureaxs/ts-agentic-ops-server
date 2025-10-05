"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fsPromise = __importStar(require("fs/promises"));
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const logger_1 = __importDefault(require("./services/logger"));
// Import the supervisor
const supervisor_1 = require("./supervisor");
const path_1 = __importDefault(require("path"));
dotenv.config();
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
const app = (0, express_1.default)();
const PORT = 8000;
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// FIX #1: Read the HTML file synchronously on startup.
const templatePath = path_1.default.join(__dirname, 'templates', 'frontend', 'audioInterface.html');
const HTML_TEMPLATE = fs.readFileSync(templatePath, 'utf-8');
// 1. The endpoint to serve our simple UI
app.get('/', (req, res) => {
    logger_1.default.info('Get / - Served front-end UI');
    res.send(HTML_TEMPLATE);
});
app.post('/listen', upload.single('audio_data'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file)
        return res.status(400).json({ error: 'No audio file uploaded' });
    console.log(`--- Received audio file: ${req.file.originalname}`);
    const filePath = req.file.path;
    try {
        // --- Step 1: Transcribe Audio with Hugging Face API ---
        console.log('🗣️ Transcribing audio with Hugging Face...');
        const audioBuffer = yield fsPromise.readFile(filePath);
        const hfResponse = yield fetch(HUGGING_FACE_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
            },
            body: audioBuffer,
        });
        // Unlike axios, fetch doesn't error on bad HTTP status, so we check manually
        if (!hfResponse.ok) {
            throw new Error(`Hugging Face API returned an error: ${hfResponse.statusText}`);
        }
        // We also need to explicitly parse the JSON from the response body
        const responseJson = yield hfResponse.json();
        const userInput = (responseJson.text || '').trim();
        console.log(`🗣️ Transcribed Text: "${userInput}"`);
        if (!userInput)
            return res.json({
                finalResponse: 'I didnt hear anything in the audio',
            });
        const finalTextResponse = yield (0, supervisor_1.runSupervisor)(userInput);
        console.log(`Final Agent Response: ${finalTextResponse}`);
        return res.json({ finalResponse: finalTextResponse });
    }
    catch (error) {
        console.error('An error occurred in the /listen endpoint:', error.message);
        return res
            .status(500)
            .json({ error: 'An internal server error occurred.' });
    }
    finally {
        // --- Step 4: Clean up the temporary audio file ---
        yield fsPromise.unlink(filePath);
    }
}));
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map