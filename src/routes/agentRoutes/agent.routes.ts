import { Router } from 'express';
import multer from 'multer';
import { handleTextCommand, handleVoiceCommand } from '../../controllers/agentControllers/agent.controller';

const agentRouter = Router();

const upload = multer({ dest: 'uploads/' });

agentRouter.post('/text', handleTextCommand);
agentRouter.post('/voice', upload.single('audio_data'), handleVoiceCommand);

export default agentRouter;
