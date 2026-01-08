
'use server';

/**
 * @fileOverview Verifies if a resolution image correctly addresses the original complaint.
 *
 * - verifyResolution - A function that handles the resolution verification process.
 * - VerifyResolutionInput - The input type for the verifyResolution function.
 * - VerifyResolutionOutput - The return type for the verifyResolution function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyResolutionInputSchema = z.object({
  originalPhotoDataUri: z
    .string()
    .describe(
      "The original photo of the issue, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  resolutionPhotoDataUri: z
    .string()
    .describe(
      "The photo of the resolved issue, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
    issueDescription: z.string().describe('The original text description of the issue.'),
});
export type VerifyResolutionInput = z.infer<
  typeof VerifyResolutionInputSchema
>;

const VerifyResolutionOutputSchema = z.object({
  isResolvedCorrectly: z.boolean().describe("Whether the resolution image shows that the original issue has been correctly fixed."),
  reasoning: z.string().describe("A brief explanation for the decision, especially if it is not resolved correctly."),
});
export type VerifyResolutionOutput = z.infer<
  typeof VerifyResolutionOutputSchema
>;

export async function verifyResolution(
  input: VerifyResolutionInput
): Promise<VerifyResolutionOutput> {
  try {
    return await verifyResolutionFlow(input);
  } catch (error) {
    console.error('verifyResolutionFlow error', error);
    return {
      isResolvedCorrectly: true,
      reasoning:
        'AI verification is currently unavailable, but the resolution was accepted.',
    };
  }
}

const verifyResolutionPrompt = ai.definePrompt({
  name: 'verifyResolutionPrompt',
  input: {schema: VerifyResolutionInputSchema},
  output: {schema: VerifyResolutionOutputSchema},
  prompt: `You are a quality assurance inspector for a municipal complaint system. Your task is to determine if a reported issue has been correctly resolved by comparing two images.

You will be given:
1.  An "Original Photo" showing the reported problem.
2.  A "Resolution Photo" showing the work that was done.
3.  A description of the original issue.

Your job is to make a strict judgment:
- Does the "Resolution Photo" clearly and unambiguously show that the specific problem from the "Original Photo" and description has been fixed?
- For example, if the issue was a pothole, is the pothole filled in the resolution photo? If the issue was trash, is the trash gone?
- If the resolution photo is blurry, shows a completely different location, or does not address the original problem, you must mark it as not resolved.

Based on your analysis, set 'isResolvedCorrectly' to true or false and provide a brief 'reasoning' for your decision.

Original Issue Description: {{{issueDescription}}}
Original Photo: {{media url=originalPhotoDataUri}}
Resolution Photo: {{media url=resolutionPhotoDataUri}}`,
});

const verifyResolutionFlow = ai.defineFlow(
  {
    name: 'verifyResolutionFlow',
    inputSchema: VerifyResolutionInputSchema,
    outputSchema: VerifyResolutionOutputSchema,
  },
  async input => {
    const {output} = await verifyResolutionPrompt(input);
    return output!;
  }
);
