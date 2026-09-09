type BusinessUseCopy = { description: string; shortDescription?: string; longContent?: string };

export function getBusinessUsePageCopy(content: BusinessUseCopy) {
  const intro = content.shortDescription?.trim() || content.description.trim();
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const paragraphs = content.longContent?.trim().split(/\r?\n\s*\r?\n/) ?? [];
  // Avoid repeating the teaser when the CMS long description starts with it.
  if (paragraphs.length && normalize(paragraphs[0]) === normalize(intro)) paragraphs.shift();
  return { intro, body: paragraphs.join("\n\n") };
}
