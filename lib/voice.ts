/** The owner's own past posts, shown to the model as a style guide only. */
export function voiceBlock(samples: string): string {
  const s = samples.trim();
  if (!s) return "";
  return `\nTHE OWNER'S OWN PAST POSTS (copy the voice: sentence length, word choice, how they open and close. Never take facts, numbers or claims from them):\n"""\n${s}\n"""`;
}
