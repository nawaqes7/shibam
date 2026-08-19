import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Radio, Play, Pause, Volume2, VolumeX, X, Search, Heart, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Hls from "hls.js";

interface RadioStation {
  id: string;
  name: string;
  stream_urls: string[];
  logo_url: string | null;
  frequency: string | null;
  country: string | null;
  city: string | null;
  quality_score: number;
  is_working: boolean;
}

const countryFlags: Record<string, string> = {
  "اليمن": "🇾🇪", "السعودية": "🇸🇦", "مصر": "🇪🇬", "العراق": "🇮🇶", "سوريا": "🇸🇾",
  "الأردن": "🇯🇴", "لبنان": "🇱🇧", "فلسطين": "🇵🇸", "الكويت": "🇰🇼", "الإمارات العربية المتحدة": "🇦🇪",
  "البحرين": "🇧🇭", "قطر": "🇶🇦", "عُمان": "🇴🇲", "الجزائر": "🇩🇿", "المغرب": "🇲🇦",
  "تونس": "🇹🇳", "ليبيا": "🇱🇾", "السودان": "🇸🇩", "الصومال": "🇸🇴", "موريتانيا": "🇲🇷",
  "جيبوتي": "🇩🇯", "جزر القمر": "🇰🇲",
};

const RadioPlayer = () => {
  const [open, setOpen] = useState(false);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [current, setCurrent] = useState<RadioStation | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const streamIndexRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("alqiada24_radio_favorites");
    if (saved) try { setFavorites(JSON.parse(saved)); } catch {}
  }, []);

  const saveFavorites = (fav: string[]) => {
    setFavorites(fav);
    localStorage.setItem("alqiada24_radio_favorites", JSON.stringify(fav));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveFavorites(favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id]);
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("radio_stations")
        .select("id, name, stream_urls, logo_url, frequency, country, city, quality_score, is_working")
        .eq("is_active", true)
        .order("quality_score", { ascending: false });
      if (data) {
        const mapped = data.map((s: any) => ({ ...s, stream_urls: Array.isArray(s.stream_urls) ? s.stream_urls : [] }));
        setStations(mapped);
        const lastId = localStorage.getItem("alqiada24_radio_last");
        if (lastId) { const found = mapped.find((s: RadioStation) => s.id === lastId); if (found) setCurrent(found); }
      }
    };
    load();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setCountryDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const countries = useMemo(() => {
    const map = new Map<string, number>();
    stations.forEach(s => { const c = s.country || "أخرى"; map.set(c, (map.get(c) || 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [stations]);

  const displayedStations = useMemo(() => {
    let list = stations;
    if (showFavorites) list = list.filter(s => favorites.includes(s.id));
    else if (selectedCountry !== "all") list = list.filter(s => (s.country || "أخرى") === selectedCountry);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.frequency && s.frequency.includes(q)) || (s.city && s.city.toLowerCase().includes(q)) || (s.country && s.country.toLowerCase().includes(q)));
    }
    return list;
  }, [stations, selectedCountry, search, showFavorites, favorites]);

  const destroyHls = useCallback(() => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } }, []);

  const playStream = useCallback((station: RadioStation, urlIndex = 0) => {
    if (!station.stream_urls.length) return;
    const url = station.stream_urls[urlIndex];
    if (!url) return;
    destroyHls();
    const audio = audioRef.current;
    if (!audio) return;
    streamIndexRef.current = urlIndex;
    audio.volume = muted ? 0 : volume;
    if (url.includes("m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hls.loadSource(url); hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { audio.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) tryNextStream(station, urlIndex); });
        hlsRef.current = hls;
      } else if (audio.canPlayType("application/vnd.apple.mpegurl")) { audio.src = url; audio.play().catch(() => {}); }
    } else { audio.src = url; audio.play().catch(() => tryNextStream(station, urlIndex)); }
  }, [destroyHls, volume, muted]);

  const tryNextStream = useCallback((station: RadioStation, currentIdx: number) => {
    const next = currentIdx + 1;
    if (next < station.stream_urls.length) playStream(station, next); else setPlaying(false);
  }, [playStream]);

  const handlePlay = (station: RadioStation) => {
    if (current?.id === station.id && playing) { audioRef.current?.pause(); setPlaying(false); return; }
    setCurrent(station); localStorage.setItem("alqiada24_radio_last", station.id); setPlaying(true); playStream(station, 0);
    supabase.from("radio_stations").update({ play_count: station.quality_score + 1 }).eq("id", station.id).then(() => {});
  };

  const handleVolumeChange = (val: number) => { setVolume(val); setMuted(val === 0); if (audioRef.current) audioRef.current.volume = val; };

  const selectedCountryLabel = selectedCountry === "all" ? "كل الدول" : selectedCountry;

  return (
    <>
      <audio ref={audioRef} onError={() => { if (current) tryNextStream(current, streamIndexRef.current); }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />

      {/* Trigger Button - Red pill like screenshot */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
      >
        <Radio className="w-4 h-4" />
        <span className="hidden sm:inline">راديو مباشر</span>
        {playing && <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />}
      </button>

      {createPortal(
        <>
          {/* Overlay */}
          {open && <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />}

          {/* Bottom Drawer */}
          <div
            className={`fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full pointer-events-none"}`}
            style={{ height: "55vh" }}
            dir="rtl"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
                  <Radio className="w-4 h-4" style={{ color: "hsl(var(--primary-foreground))" }} />
                </div>
                <span className="text-base font-bold text-foreground">راديو مباشر</span>
                <span className="text-[11px] bg-secondary text-muted-foreground px-2.5 py-0.5 rounded-full font-medium">
                  {stations.length} محطة
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs: All Stations / Favorites */}
            <div className="px-4 pb-3 flex items-center gap-2">
              <button
                onClick={() => { setShowFavorites(false); }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all"
                style={!showFavorites ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" } : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}
              >
                جميع المحطات
              </button>
              <button
                onClick={() => { setShowFavorites(true); setSelectedCountry("all"); }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all"
                style={showFavorites ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" } : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}
              >
                <Heart className="w-4 h-4" />
                المفضلات
              </button>
            </div>

            {/* Search + Country Dropdown */}
            <div className="px-4 pb-3 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الدولة أو التردد"
                  className="w-full pr-9 pl-3 py-2.5 text-sm bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {!showFavorites && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-secondary rounded-xl text-sm text-foreground whitespace-nowrap min-w-[100px]"
                  >
                    <span className="flex-1 text-right">{selectedCountryLabel}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${countryDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {countryDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 right-0 w-48 bg-background border border-border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      <button
                        onClick={() => { setSelectedCountry("all"); setCountryDropdownOpen(false); }}
                        className={`w-full text-right px-3 py-2 text-sm hover:bg-secondary transition-colors ${selectedCountry === "all" ? "text-primary font-bold" : "text-foreground"}`}
                      >
                        كل الدول
                      </button>
                      {countries.map(([country, count]) => (
                        <button
                          key={country}
                          onClick={() => { setSelectedCountry(country); setCountryDropdownOpen(false); }}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center justify-between ${selectedCountry === country ? "text-primary font-bold" : "text-foreground"}`}
                        >
                          <span>{countryFlags[country] || "🌍"} {country}</span>
                          <span className="text-[10px] text-muted-foreground">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Now Playing Mini Bar */}
            {current && playing && (
              <div className="mx-4 mb-2 p-2.5 rounded-xl flex items-center gap-2.5 border" style={{ background: "hsl(var(--primary) / 0.05)", borderColor: "hsl(var(--primary) / 0.2)" }}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Radio className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{current.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{countryFlags[current.country || ""] || ""} {current.country} {current.city ? `• ${current.city}` : ""}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => { audioRef.current?.pause(); setPlaying(false); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
                    <Pause className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary-foreground))" }} />
                  </button>
                  <button onClick={() => setMuted(!muted)} className="text-muted-foreground p-1">
                    {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={e => handleVolumeChange(parseFloat(e.target.value))} className="w-14 h-1 accent-primary" />
                </div>
              </div>
            )}

            {/* Stations List */}
            <div className="overflow-y-auto px-2" style={{ height: current && playing ? "calc(100% - 260px)" : "calc(100% - 195px)" }}>
              {displayedStations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Radio className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">{showFavorites ? "لا توجد محطات مفضلة" : "لا توجد محطات"}</p>
                </div>
              ) : (
                displayedStations.map(station => {
                  const isPlaying = current?.id === station.id && playing;
                  const isFav = favorites.includes(station.id);
                  return (
                    <div
                      key={station.id}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-colors cursor-pointer ${isPlaying ? "bg-primary/5" : "hover:bg-secondary/60"}`}
                      onClick={() => handlePlay(station)}
                    >
                      <button className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all" style={isPlaying ? { background: "hsl(var(--primary))", borderColor: "hsl(var(--primary))" } : { borderColor: "hsl(var(--border))", background: "transparent" }}>
                        {isPlaying ? (
                          <Pause className="w-4 h-4" style={{ color: "hsl(var(--primary-foreground))" }} />
                        ) : (
                          <Play className="w-4 h-4 text-muted-foreground mr-[-2px]" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isPlaying ? "text-primary" : "text-foreground"}`}>{station.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {station.country || ""} {station.city ? `• ${station.city}` : ""} {station.frequency ? `• ${station.frequency}` : ""}
                        </p>
                      </div>
                      <button onClick={e => toggleFavorite(station.id, e)} className="p-1.5 shrink-0 transition-colors">
                        <Heart className={`w-5 h-5 transition-colors ${isFav ? "fill-primary text-primary" : "text-muted-foreground/30 hover:text-primary/50"}`} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default RadioPlayer;
