'use server';

/**
 * @fileOverview Validates whether an uploaded image shows a genuine civic issue.
 *
 * - validateCivicIssue - Confirms the image is a real, reportable municipal/civic issue.
 * - ValidateCivicIssueInput - The input type for the validateCivicIssue function.
 * - ValidateCivicIssueOutput - The return type for the validateCivicIssue function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ValidateCivicIssueInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the issue, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ValidateCivicIssueInput = z.infer<typeof ValidateCivicIssueInputSchema>;

const ValidateCivicIssueOutputSchema = z.object({
  isCivicIssue: z
    .boolean()
    .describe('Whether the image shows a genuine, reportable civic/municipal issue.'),
  isClear: z
    .boolean()
    .describe(
      'Whether the image is clear enough to reliably identify the issue (not blurry, too dark, too far, or otherwise unclear).'
    ),
  subject: z
    .string()
    .describe('A short label describing what the image actually shows.'),
  reason: z
    .string()
    .describe(
      'A concise, user-facing explanation of why the image is or is not a valid, clear civic issue.'
    ),
});
export type ValidateCivicIssueOutput = z.infer<typeof ValidateCivicIssueOutputSchema>;

export async function validateCivicIssue(
  input: ValidateCivicIssueInput
): Promise<ValidateCivicIssueOutput> {
  return validateCivicIssueFlow(input);
}

const validateCivicIssuePrompt = ai.definePrompt({
  name: 'validateCivicIssuePrompt',
  input: { schema: ValidateCivicIssueInputSchema },
  output: { schema: ValidateCivicIssueOutputSchema },
  prompt: `You are a strict gatekeeper for a municipal civic-complaint app called IssueSnap. Your job is to decide (1) whether the provided photo is clear enough to use, and (2) whether it shows a genuine, reportable CIVIC / public-infrastructure issue.

CLARITY (set isClear):
- Set isClear to false when the image is blurry, out of focus, badly lit/too dark, taken from too far away, heavily obscured, or otherwise too unclear to reliably identify what is shown.
- Set isClear to true only when the relevant content is clearly visible and identifiable.

Valid civic issues include (non-exhaustive):
- Potholes, broken roads, damaged sidewalks or curbs
- Graffiti or vandalism on public property
- Overflowing bins, illegal dumping, litter in public spaces
- Broken or damaged streetlights, traffic signals, public signs
- Broken public fixtures such as benches, hydrants, playground equipment, bus stops
- Water leakage, blocked drains, open manholes, sewage on public land
- Damaged public buildings, fences or boundary walls

NOT valid (unrelated to civic issues - set isCivicIssue to false):
- Selfies, portraits, people or pets
- Food, indoor scenes, private property interiors
- Screenshots, documents, memes, text or logos
- Nature or landscape photos with no civic problem
- Anything with no reportable public-infrastructure or public-safety problem

Be strict but fair. If the image is ambiguous or clearly unrelated to a civic problem, set isCivicIssue to false. If it is unclear, set isClear to false. A submit-worthy image must have BOTH isCivicIssue and isClear set to true.

Always provide:
- 'subject': a short label of what the image actually shows.
- 'reason': a concise 1-2 sentence explanation shown directly to the user. When the image is rejected, state specifically whether it is unclear (blurry/dark) or unrelated to a civic issue.

Photo: {{media url=photoDataUri}}`,
});

const validateCivicIssueFlow = ai.defineFlow(
  {
    name: 'validateCivicIssueFlow',
    inputSchema: ValidateCivicIssueInputSchema,
    outputSchema: ValidateCivicIssueOutputSchema,
  },
  async (input) => {
    const { output } = await validateCivicIssuePrompt(input);
    return output!;
  }
);
