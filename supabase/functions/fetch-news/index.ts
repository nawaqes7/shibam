import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// PRODUCTION-READY CONTENT PROCESSING ENGINE
// ============================================================

// 1. Decode HTML entities first
function decodeEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8230;/g, '…')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// 2. Remove emojis and special symbols
function removeEmojis(text: string): string {
  if (!text) return '';
  return text
    // Remove emoji ranges
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols Extended-A
    .replace(/[\u{2300}-\u{23FF}]/gu, '')   // Misc Technical
    .replace(/[\u{200D}]/g, '')             // Zero Width Joiner
    .replace(/[\u{FE0F}]/g, '')             // Variation Selector
    .replace(/[\u{20E3}]/g, '')             // Combining Enclosing Keycap
    // Remove common social media markers
    .replace(/^[RT|QT]\s*@\w+:\s*/i, '')   // RT @user: or QT @user:
    .replace(/^@\w+\s*/i, '')               // @user at start
    .trim();
}

// 3. Remove noise and junk content
function removeNoise(text: string): string {
  if (!text) return '';
  let cleaned = text;
  // Remove social media markers
  cleaned = cleaned.replace(/^(RT|QT|FAV|LIKE|SHARE|Tweet|Retweet)\s*/gi, '');
  // Remove "منذ X دقائق/ساعة" timestamps
  cleaned = cleaned.replace(/منذ\s+\d+\s+(دقيقة|دقائق|ساعة|ساعات|يوم|أيام|أسبوع|أسابيع|شهر|أشهر|سنة|سنين)/g, '');
  // Remove English timestamps like "5 min ago", "2 hours ago"
  cleaned = cleaned.replace(/\d+\s+(min|mins|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago/gi, '');
  // Remove navigation text
  cleaned = cleaned.replace(/(الرئيسية|سياسة|اقتصاد|تكنولوجيا|رياضة|صحة|علوم|تواصل معنا|من نحن|سياسة الخصوصية|الشروط والأحكام|Copyright|Privacy|Contact|Home|About|Terms)\s*[|>»]\s*/gi, '');
  // Remove standalone URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

// 4. Convert structural HTML to text preserving readability
function htmlToStructuredText(html: string): string {
  if (!html) return '';
  let text = html;
  // Remove script/style/nav tags and content
  text = text.replace(/<(script|style|nav|footer|header|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Convert structural elements to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/?(div|section|article|li|tr|h[1-6])[^>]*>/gi, '\n');
  text = text.replace(/<\/?(ul|ol|table|blockquote)[^>]*>/gi, '\n\n');
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode entities
  text = decodeEntities(text);
  // Remove emojis
  text = removeEmojis(text);
  // Remove noise
  text = removeNoise(text);
  // Normalize: collapse multiple newlines to max 2
  text = text.replace(/\n{3,}/g, '\n\n');
  // Remove invisible characters (zero-width, BOM, etc.)
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
  // Final trim
  text = text.trim();
  return text;
}

// 5. Clean text for title/description (single line, no HTML)
function cleanText(html: string): string {
  if (!html) return '';
  let text = html;
  // Strip all HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode entities
  text = decodeEntities(text);
  // Remove emojis
  text = removeEmojis(text);
  // Remove noise
  text = removeNoise(text);
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// ============================================================
// MEDIA EXTRACTION
// ============================================================

interface MediaResult {
  imageUrl: string;
  images: string[];
  videoUrl: string;
  videos: string[];
}

function extractMedia(itemXml: string, description: string, contentEncoded: string): MediaResult {
  const images: string[] = [];
  const videos: string[] = [];
  let primaryImage = '';
  let primaryVideo = '';

  const allContent = `${itemXml} ${description} ${contentEncoded}`;

  // --- VIDEO EXTRACTION ---

  // 1. media:content with video type
  const videoMediaRegex = /<media:content[^>]*type="video\/[^"]*"[^>]*(?:url="([^"]+)"[^>]*>|[^>]*url="([^"]+)")/gi;
  let vm;
  while ((vm = videoMediaRegex.exec(itemXml)) !== null) {
    const url = (vm[1] || vm[2] || '').trim();
    if (url && !videos.includes(url)) videos.push(url);
  }

  // 2. media:content with video extensions
  const mediaUrlRegex = /<media:content[^>]*url="([^"]+\.(mp4|webm|mov|avi|m3u8)[^"]*)"[^>]*/gi;
  while ((vm = mediaUrlRegex.exec(itemXml)) !== null) {
    const url = vm[1].trim();
    if (url && !videos.includes(url)) videos.push(url);
  }

  // 3. enclosure with video type
  const encVideoRegex = /<enclosure[^>]*(?:type="video\/[^"]*"[^>]*url="([^"]+)"|url="([^"]+)"[^>]*type="video\/)/gi;
  while ((vm = encVideoRegex.exec(itemXml)) !== null) {
    const url = (vm[1] || vm[2] || '').trim();
    if (url && !videos.includes(url)) videos.push(url);
  }

  // 4. Embedded video tags
  const videoTagRegex = /<video[^>]*src="([^"]+)"[^>]*>/gi;
  while ((vm = videoTagRegex.exec(allContent)) !== null) {
    const url = vm[1].trim();
    if (url && url.startsWith('http') && !videos.includes(url)) videos.push(url);
  }

  // 5. source tags inside video
  const sourceRegex = /<source[^>]*src="([^"]+\.(mp4|webm|mov|m3u8)[^"]*)"[^>]*>/gi;
  while ((vm = sourceRegex.exec(allContent)) !== null) {
    const url = vm[1].trim();
    if (url && url.startsWith('http') && !videos.includes(url)) videos.push(url);
  }

  // 6. Twitter/X video patterns
  const twitterVideoRegex = /https?:\/\/(?:video\.twimg\.com|pbs\.twimg\.com\/amplify_video)\/[^"'\s]+\.mp4/gi;
  let tvMatch;
  while ((tvMatch = twitterVideoRegex.exec(allContent)) !== null) {
    const url = tvMatch[0];
    if (!videos.includes(url)) videos.push(url);
  }

  // 7. YouTube embeds
  const ytRegex = /(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;
  while ((vm = ytRegex.exec(allContent)) !== null) {
    const ytUrl = `https://www.youtube.com/watch?v=${vm[1]}`;
    if (!videos.includes(ytUrl)) videos.push(ytUrl);
  }

  // 8. iframe video embeds
  const iframeRegex = /<iframe[^>]*src="([^"]*(?:youtube|vimeo|dailymotion|video)[^"]*)"[^>]*>/gi;
  while ((vm = iframeRegex.exec(allContent)) !== null) {
    let url = vm[1].trim();
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('http') && !videos.includes(url)) videos.push(url);
  }

  // --- IMAGE EXTRACTION ---

  // 1. media:content with image type
  const imgMediaRegex = /<media:content[^>]*(?:type="image\/[^"]*"[^>]*url="([^"]+)"|url="([^"]+)"[^>]*type="image\/)/gi;
  let im;
  while ((im = imgMediaRegex.exec(itemXml)) !== null) {
    const url = (im[1] || im[2] || '').trim();
    if (url && !images.includes(url)) images.push(url);
  }

  // 2. media:thumbnail
  const thumbRegex = /<media:thumbnail[^>]*url="([^"]+)"/gi;
  while ((im = thumbRegex.exec(itemXml)) !== null) {
    const url = im[1].trim();
    if (url && !images.includes(url)) images.push(url);
  }

  // 3. enclosure with image type
  const encImgRegex = /<enclosure[^>]*(?:type="image\/[^"]*"[^>]*url="([^"]+)"|url="([^"]+\.(jpg|jpeg|png|webp|gif)[^"]*)"[^>]*type)/gi;
  while ((im = encImgRegex.exec(itemXml)) !== null) {
    const url = (im[1] || im[2] || '').trim();
    if (url && !images.includes(url)) images.push(url);
  }

  // 4. image tag in RSS item
  const imageTagRegex = /<image>\s*<url>([^<]+)<\/url>/gi;
  while ((im = imageTagRegex.exec(itemXml)) !== null) {
    const url = im[1].trim();
    if (url && !images.includes(url)) images.push(url);
  }

  // 5. img src from HTML content
  const imgSrcRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((im = imgSrcRegex.exec(allContent)) !== null) {
    let src = im[1].trim();
    if (src.startsWith('//')) src = 'https:' + src;
    if (src.startsWith('http') && !images.includes(src) && !src.includes('emoji') && !src.includes('icon')) {
      images.push(src);
    }
  }

  // 6. data-src lazy loading
  const dataSrcRegex = /data-src=["']([^"']+\.(jpg|jpeg|png|webp|gif)[^"']*)["']/gi;
  while ((im = dataSrcRegex.exec(allContent)) !== null) {
    let src = im[1].trim();
    if (src.startsWith('//')) src = 'https:' + src;
    if (src.startsWith('http') && !images.includes(src)) images.push(src);
  }

  // 7. OG image patterns in content
  const ogRegex = /og:image[^>]*content=["']([^"']+)["']/gi;
  while ((im = ogRegex.exec(allContent)) !== null) {
    let src = im[1].trim();
    if (src.startsWith('//')) src = 'https:' + src;
    if (src.startsWith('http') && !images.includes(src)) images.push(src);
  }

  // 8. Twitter/X image patterns
  const twImgRegex = /https?:\/\/pbs\.twimg\.com\/media\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi;
  let twMatch;
  while ((twMatch = twImgRegex.exec(allContent)) !== null) {
    if (!images.includes(twMatch[0])) images.push(twMatch[0]);
  }

  primaryImage = images[0] || '';
  primaryVideo = videos[0] || '';

  return { imageUrl: primaryImage, images, videoUrl: primaryVideo, videos };
}

// ============================================================
// RSS PARSER
// ============================================================

function extractArticlesFromRSS(xml: string, sourceId: string, language: string, assignedCategory?: string, hideOriginalSource?: boolean, altSourceName?: string, altSourceUrl?: string) {
  const articles: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const getTag = (tag: string) => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? (m[1] || m[2] || "").trim() : "";
    };

    const rawTitle = getTag("title");
    const title = cleanText(rawTitle);
    const link = getTag("link").trim();
    const rawDescription = getTag("description");
    const description = cleanText(rawDescription).substring(0, 500);
    const pubDate = getTag("pubDate");
    const contentEncoded = getTag("content:encoded") || getTag("content") || getTag("content_html");

    // Extract media
    const media = extractMedia(item, rawDescription, contentEncoded);

    // Clean and structure content
    const cleanContent = htmlToStructuredText(contentEncoded || rawDescription);

    if (title && link) {
      const category = assignedCategory || autoClassify(title, description, language);

      const article: any = {
        source_id: sourceId,
        title,
        description: description || cleanContent.substring(0, 500),
        content: cleanContent || null,
        url: link,
        image_url: media.imageUrl || null,
        video_url: media.videoUrl || null,
        images: media.images,
        videos: media.videos,
        language,
        category,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        is_published: true,
      };

      articles.push(article);
    }
  }
  return articles;
}

// ============================================================
// HTML SCRAPER
// ============================================================

function extractArticlesFromHTML(html: string, sourceId: string, baseUrl: string, language: string, assignedCategory?: string) {
  const articles: any[] = [];
  const patterns = [
    /<h[23][^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi,
    /<a[^>]*href="([^"]*)"[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/gi,
    /<article[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/gi,
  ];

  const seen = new Set<string>();
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(html)) !== null && articles.length < 20) {
      let url = m[1];
      const title = cleanText(m[2]);
      if (!title || title.length < 10) continue;
      if (url.startsWith("/")) url = new URL(url, baseUrl).href;
      if (seen.has(url)) continue;
      seen.add(url);

      // Try to find nearby image
      const articleStart = Math.max(0, m.index - 2000);
      const articleEnd = Math.min(html.length, m.index + m[0].length + 2000);
      const context = html.slice(articleStart, articleEnd);
      const media = extractMedia(context, context, "");

      const category = assignedCategory || autoClassify(title, "", language);
      articles.push({
        source_id: sourceId,
        title,
        description: "",
        content: null,
        url,
        image_url: media.imageUrl || null,
        video_url: media.videoUrl || null,
        images: media.images,
        videos: media.videos,
        language,
        category,
        published_at: new Date().toISOString(),
        is_published: true,
      });
    }
  }
  return articles;
}

// ============================================================
// AUTO CLASSIFICATION
// ============================================================

const arCategoryMap: Record<string, string[]> = {
  "سياسة": ["رئيس", "وزير", "حكومة", "برلمان", "انتخابات", "دبلوماس", "سفير", "مجلس", "قرار", "سياس", "حزب", "معارض"],
  "اقتصاد": ["اقتصاد", "بورصة", "أسهم", "نفط", "تجار", "استثمار", "بنك", "عمل", "دولار", "ريال", "مالي", "ميزاني"],
  "تكنولوجيا": ["تكنولوجيا", "تقن", "ذكاء اصطناعي", "هاتف", "تطبيق", "إنترنت", "رقم", "برمج", "حاسوب", "آبل", "جوجل", "سامسونج"],
  "رياضة": ["رياض", "كرة", "مباراة", "دوري", "منتخب", "لاعب", "مدرب", "بطولة", "هدف", "فوز", "تأهل", "كأس"],
  "ثقافة": ["ثقاف", "أدب", "كتاب", "معرض", "رواية", "شعر", "موسيق"],
  "صحة": ["صح", "طب", "مرض", "علاج", "مستشفى", "لقاح", "وباء", "دواء", "طبيب", "جراح"],
  "علوم": ["علم", "فضاء", "ناسا", "اكتشاف", "بحث", "دراسة", "تجربة", "مختبر", "فيزياء", "كيمياء"],
  "منوعات": ["منوع", "غريب", "طريف", "سفر", "سياحة", "طعام", "موضة"],
  "المقالات": ["مقال", "رأي", "تحليل", "عمود", "كاتب", "افتتاحية"],
  "فنون": ["فن", "مسرح", "سينما", "فيلم", "رسم", "تشكيل", "فنان", "معرض فني"],
  "لقاءات": ["لقاء", "حوار", "مقابلة", "تصريح خاص", "حصري"],
  "تصريحات": ["تصريح", "صرح", "أعلن", "أكد", "نفى", "بيان", "مؤتمر صحفي"],
  "تمون": ["تموين", "غذاء", "أسعار", "سلع", "محروقات", "وقود", "قمح", "سكر"],
};

const enCategoryMap: Record<string, string[]> = {
  "Politics": ["president", "minister", "government", "election", "diplomat", "congress", "senate", "politic", "vote", "law"],
  "Economy": ["economy", "stock", "market", "oil", "trade", "invest", "bank", "finance", "dollar", "gdp", "inflation"],
  "Technology": ["tech", "ai", "artificial", "phone", "app", "software", "google", "apple", "microsoft", "cyber", "digital"],
  "Sports": ["sport", "football", "soccer", "basketball", "match", "league", "player", "coach", "championship", "goal", "win"],
  "Culture": ["culture", "book", "literary", "festival", "heritage"],
  "Health": ["health", "medical", "disease", "treatment", "hospital", "vaccine", "pandemic", "drug", "doctor", "surgery"],
  "Science": ["science", "space", "nasa", "discover", "research", "study", "experiment", "physics", "climate"],
  "Entertainment": ["entertain", "celebrity", "show", "concert", "game", "funny", "travel", "food", "fashion"],
  "Articles": ["opinion", "column", "editorial", "analysis", "commentary", "essay"],
  "Arts": ["art", "film", "movie", "music", "theater", "exhibition", "painting", "artist", "cinema"],
  "Interviews": ["interview", "exclusive", "dialogue", "conversation", "q&a"],
  "Statements": ["statement", "declared", "announced", "confirmed", "denied", "press conference", "briefing"],
  "Supplies": ["supply", "food prices", "commodity", "fuel", "wheat", "grain", "sugar", "shortage"],
};

function autoClassify(title: string, description: string, language: string): string {
  const text = `${title} ${description}`.toLowerCase();
  const map = language === "ar" ? arCategoryMap : enCategoryMap;
  let bestCat = language === "ar" ? "عام" : "General";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(map)) {
    let score = 0;
    for (const kw of keywords) { if (text.includes(kw.toLowerCase())) score++; }
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }
  return bestCat;
}

// ============================================================
// EDGE FUNCTION HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let sourceId: string | undefined;
    try {
      const body = await req.json();
      sourceId = body?.sourceId;
    } catch {}

    let query = supabase.from("news_sources").select("*").eq("is_active", true);
    if (sourceId) {
      query = supabase.from("news_sources").select("*").eq("id", sourceId);
    }
    const { data: sources, error: srcErr } = await query;
    if (srcErr) throw srcErr;
    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ fetched: 0, message: "لا توجد مصادر نشطة" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalFetched = 0;
    let totalMedia = 0;

    for (const source of sources) {
      try {
        const response = await fetch(source.fetch_url, {
          headers: { "User-Agent": "Alqiada24/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        const text = await response.text();

        let articles: any[] = [];
        const assignedCat = source.assigned_category || undefined;

        if (source.fetch_method === "rss") {
          articles = extractArticlesFromRSS(
            text,
            source.id,
            source.language,
            assignedCat,
            source.hide_original_source,
            source.alt_source_name,
            source.alt_source_url
          );
        } else {
          articles = extractArticlesFromHTML(text, source.id, source.url, source.language, assignedCat);
        }

        if (articles.length > 0) {
          // Track media extraction stats
          const withMedia = articles.filter(a => a.video_url || (a.images && a.images.length > 0));
          totalMedia += withMedia.length;

          const { data: inserted } = await supabase
            .from("articles")
            .upsert(articles, { onConflict: "url", ignoreDuplicates: true })
            .select("id");

          const count = inserted?.length || 0;
          totalFetched += count;

          await supabase
            .from("news_sources")
            .update({
              last_fetched_at: new Date().toISOString(),
              articles_count: source.articles_count + count,
            })
            .eq("id", source.id);
        }
      } catch (fetchErr) {
        console.error(`Error fetching from ${source.name}:`, fetchErr);
      }
    }

    return new Response(JSON.stringify({
      fetched: totalFetched,
      sources: sources.length,
      withMedia: totalMedia,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-news error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
