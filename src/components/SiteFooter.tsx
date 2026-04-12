import { useState, useEffect } from "react";
import saberLogo from "@/assets/saber-news-logo-transparent.png";

const SiteFooter = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(time);

  const gregorianDate = new Intl.DateTimeFormat("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(time);

  const digitalTime = time.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <footer className="bg-primary text-primary-foreground mt-12">
      <div className="container mx-auto py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <img src={saberLogo} alt="سابر نيوز" className="h-12 w-auto brightness-0 invert" />
            </div>
            <p className="text-sm text-primary-foreground/70 max-w-md leading-relaxed">
              سابر نيوز، الوجه الإعلامي الجديد والموثوق لكل ما يهمك نغطي الأخبار السياسية، الاقتصادية، الصحية، والرياضية بتقارير حصرية، تحقيقات عميقة، وتحليلات خبيرة مباشرة من صناع الأحداث.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">أقسام</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              {["سياسة", "اقتصاد", "تكنولوجيا", "رياضة", "ثقافة"].map((s) => (
                <li key={s}>
                  <a href="#" className="hover:text-primary-foreground transition-colors">{s}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">تواصل معنا</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li>info@sabernews.com</li>
              <li>تويتر / إكس</li>
              <li>فيسبوك</li>
              <li>يوتيوب</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-8 pt-6 space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-accent">سابر نيوز</h3>
            <p className="text-sm text-primary-foreground/60 mt-1">
              رئيس التحرير / عبدالملك حامد الكوكباني
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-sm text-primary-foreground/60">
            <div className="font-latin text-2xl font-bold text-accent tabular-nums tracking-wider" dir="ltr">
              {digitalTime}
            </div>

            <div className="flex flex-col items-center gap-1 text-center">
              <span>{gregorianDate}</span>
              <span className="text-primary-foreground/40">{hijriDate}</span>
            </div>
          </div>

          <div className="text-center text-xs text-primary-foreground/40 pt-2">
            © جميع الحقوق محفوظه لدى <span className="text-accent">سابر نيوز</span> 2023
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
