import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// Define multiple model options in order of preference
const AVAILABLE_MODELS = [
  'googleai/gemini-2.5-flash',
  'googleai/gemini-2.5-flash-lite',
  'googleai/gemini-1.5-flash',
];

// Select model from environment or use first available
const selectedModel = process.env.GENKIT_MODEL || AVAILABLE_MODELS[0];

export const ai = genkit({
  plugins: [googleAI()],
  model: selectedModel,
});

// Export model info for debugging
export const MODELS = {
  available: AVAILABLE_MODELS,
  selected: selectedModel,
};
