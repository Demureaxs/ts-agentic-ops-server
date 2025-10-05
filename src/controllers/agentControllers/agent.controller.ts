import { Request, Response } from 'express';
import { runSupervisor } from '../../supervisor';
import * as fsPromises from 'fs/promises';
import logger from '../../services/logger';

export async function handleTextCommand(req: Request, res: Response) {
  const { goal } = req.body;

  if (!goal) return res.status(400).json({ error: 'No goal was provided' });

  logger.info(`--- Controller: Received text goal: ${goal} ---`);

  try {
    const finalTextResponse = await runSupervisor(goal);
    logger.info({ agentResponse: finalTextResponse }, '\n Supervisor finished successfully');
    return res.status(200).json({ finalResponse: finalTextResponse });
  } catch (error: any) {
    logger.error({ error: error.message });
    return res.status(500).json({ error: 'An internal server error occured' });
  }
}

export async function handleVoiceCommand(req: Request, res: Response) {
  logger.info({ file: req.file }, 'POST /listen - Received new audio file.');

  if (!req.file) {
    logger.warn('Request failed: No audio file was uploaded.');
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const filePath = req.file.path;

  try {
    logger.info('Transcribing audio with Hugging Face...');
    const audioBuffer = await fsPromises.readFile(filePath);
    const hfResponse = await fetch('https://huggingface.co/openai/whisper-large-v3-turbo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}` },
      body: audioBuffer as any,
    });

    if (!hfResponse.ok) {
      logger.error(
        { status: hfResponse.status, statusText: hfResponse.statusText },
        'Hugging Face API returned an error.'
      );
      throw new Error(`Hugging Face API error: ${hfResponse.statusText}`);
    }

    const responseJson: any = await hfResponse.json();
    const userInput = (responseJson.text || '').trim();
    logger.info({ transcribedText: userInput }, 'Transcription successful.');

    if (!userInput) {
      logger.warn('Transcription result was empty.');
      return res.json({ finalResponse: "I didn't hear anything in the audio." });
    }

    logger.info({ goal: userInput }, 'Passing goal to Supervisor agent.');
    const finalTextResponse = await runSupervisor(userInput);
    logger.info({ agentResponse: finalTextResponse }, 'Supervisor finished.');

    // For now, we'll just return the text and add TTS back later
    return res.json({ finalResponse: finalTextResponse });
  } catch (error: any) {
    logger.error({ err: error.message, stack: error.stack }, 'An error occurred in the /listen endpoint.');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    await fsPromises.unlink(filePath);
    logger.info(`Cleaned up temporary file: ${filePath}`);
  }
}
