import { useBreakingNews } from "@/hooks/useArticles";
import { motion } from "framer-motion";
import { decodeHtmlEntities } from "@/lib/htmlUtils";

interface Props {
  language?: string;
}

// Remove emojis and special symbols from text
function cleanTickerText(text: string): string {
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

const BreakingNewsTicker = ({ language = "ar" }: Props) => {
  const articles = useBreakingNews(language);
  const isAr = language === "ar";

  if (articles.length === 0) return null;

  const text = articles
    .map((a) => cleanTickerText(decodeHtmlEntities(a.title)))
    .filter(t => t.length > 0)
    .join("  ◆  ");

  return (
    <div className="bg-urgent text-white overflow-hidden py-2">
      <div className="container mx-auto flex items-center gap-3">
        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded whitespace-nowrap shrink-0">
          {isAr ? "عاجل" : "BREAKING"}
        </span>
        <div className="overflow-hidden flex-1 relative">
          <motion.div
            className="whitespace-nowrap text-sm font-medium"
            animate={{ x: ["100%", "-100%"] }}
            transition={{ duration: articles.length * 8, repeat: Infinity, ease: "linear" }}
          >
            {text}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BreakingNewsTicker;
