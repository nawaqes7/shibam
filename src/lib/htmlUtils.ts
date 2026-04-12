// Decode HTML entities and clean text
const entityMap: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&laquo;': '«', '&raquo;': '»', '&nbsp;': ' ',
  '&#8220;': '\u201C', '&#8221;': '\u201D', '&#8216;': '\u2018', '&#8217;': '\u2019',
  '&#8230;': '…', '&#8211;': '–', '&#8212;': '—',
};

export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return '';
  let result = text;
  // Named and numeric entities
  for (const [entity, char] of Object.entries(entityMap)) {
    result = result.split(entity).join(char);
  }
  // Numeric entities &#NNN;
  result = result.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  // Hex entities &#xHH;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  // Strip remaining HTML tags
  result = result.replace(/<[^>]*>/g, '');
  // Clean extra whitespace
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

// Remove emojis and special symbols
export function removeEmojis(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2300}-\u{23FF}]/gu, '')
    .replace(/[\u{200D}\u{FE0F}\u{20E3}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove noise: social markers, timestamps, navigation text
function removeNoise(text: string): string {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/^(RT|QT|FAV|LIKE|SHARE|Tweet|Retweet)\s*/gi, '');
  cleaned = cleaned.replace(/منذ\s+\d+\s+(دقيقة|دقائق|ساعة|ساعات|يوم|أيام|أسبوع|أسابيع|شهر|أشهر|سنة|سنين)/g, '');
  cleaned = cleaned.replace(/\d+\s+(min|mins|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago/gi, '');
  cleaned = cleaned.replace(/(الرئيسية|سياسة|اقتصاد|تكنولوجيا|رياضة|صحة|علوم|تواصل معنا|من نسياسة الخصوصية|الشروط والأحكام|Copyright|Privacy|Contact|Home|About|Terms)\s*[|>»]\s*/gi, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

export function cleanArticleContent(html: string | null | undefined): string {
  if (!html) return '';
  let text = html;
  // Remove script/style/nav tags and content
  text = text.replace(/<(script|style|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Convert <br> and <p> to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/?(div|section|article)[^>]*>/gi, '\n');
  // Strip all HTML
  text = text.replace(/<[^>]*>/g, '');
  // Decode entities
  text = decodeHtmlEntities(text);
  // Remove emojis
  text = removeEmojis(text);
  // Remove noise
  text = removeNoise(text);
  // Remove invisible characters
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
  // Fix excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

// Clean title: remove emojis, symbols, noise
export function cleanTitle(text: string | null | undefined): string {
  if (!text) return '';
  let cleaned = decodeHtmlEntities(text);
  cleaned = removeEmojis(cleaned);
  cleaned = removeNoise(cleaned);
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}
