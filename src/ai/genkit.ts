import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

export const ai = genkit({
  plugins: [googleAI()],
  // model: 'googleai/gemini-1.5-flash',
  model: 'googleai/gemini-2.5-flash-lite',
//   gemini-2.5-flash
// gemini-2.5-flash-lite

});
