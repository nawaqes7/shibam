import { useState, useEffect, useRef } from "react";
import { Radio, Plus, Trash2, Loader2, Save, X, Play, Pause, Check, AlertCircle, GripVertical, Upload, FileUp, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Station {
  id: string;
  name: string;
  stream_urls: string[];
  logo_url: string | null;
  frequency: string | null;
  country: string | null;
  city: string | null;
  sort_order: number;
  is_active: boolean;
  is_working: boolean;
  play_count: number;
  quality_score: number;
}

const AdminRadio = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Station | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", stream_urls: [""], logo_url: "", frequency: "", country: "YE" });
  const fileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // CSV import state
  const [csvStations, setCsvStations] = useState<{ name: string; city: string; country: string; stream_url: string; selected: boolean }[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("radio_stations").select("*").order("sort_order", { ascending: true });
    setStations((data as Station[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", stream_urls: [""], logo_url: "", frequency: "", country: "YE" });
    setEditing(null);
    setAdding(false);
  };

  const startEdit = (s: Station) => {
    setEditing(s);
    setAdding(true);
    setForm({
      name: s.name,
      stream_urls: s.stream_urls.length ? s.stream_urls : [""],
      logo_url: s.logo_url || "",
      frequency: s.frequency || "",
      country: s.country || "YE",
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.stream_urls.filter(Boolean).length) {
      toast({ title: "أدخل الاسم ورابط بث واحد على الأقل", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      stream_urls: form.stream_urls.filter(Boolean),
      logo_url: form.logo_url || null,
      frequency: form.frequency || null,
      country: form.country || "YE",
    };
    try {
      if (editing) {
        await supabase.from("radio_stations").update(payload).eq("id", editing.id);
      } else {
        await supabase.from("radio_stations").insert(payload);
      }
      toast({ title: editing ? "تم التحديث ✓" : "تمت الإضافة ✓" });
      resetForm();
      load();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("radio_stations").delete().eq("id", id);
    toast({ title: "تم الحذف ✓" });
    load();
  };

  const testStream = async (url: string) => {
    setTesting(url);
    try {
      const audio = new Audio();
      audio.src = url;
      await new Promise<void>((resolve, reject) => {
        audio.oncanplay = () => { audio.pause(); resolve(); };
        audio.onerror = () => reject(new Error("فشل"));
        setTimeout(() => reject(new Error("انتهت المهلة")), 8000);
      });
      toast({ title: "✅ البث يعمل" });
    } catch {
      toast({ title: "❌ البث لا يعمل", variant: "destructive" });
    } finally { setTesting(null); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `radio/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("article-images").upload(path, file);
    if (error) { toast({ title: "خطأ رفع الصورة", variant: "destructive" }); return; }
    const { data } = supabase.storage.from("article-images").getPublicUrl(path);
    setForm((f) => ({ ...f, logo_url: data.publicUrl }));
  };

  // CSV Import
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split("\n");
        if (lines.length < 2) throw new Error("الملف فارغ أو لا يحتوي على بيانات");
        const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
        const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("اسم"));
        const urlIdx = headers.findIndex((h) => h.includes("url") || h.includes("stream") || h.includes("رابط"));
        const cityIdx = headers.findIndex((h) => h.includes("city") || h.includes("مدينة"));
        const countryIdx = headers.findIndex((h) => h.includes("country") || h.includes("دولة"));
        const freqIdx = headers.findIndex((h) => h.includes("freq") || h.includes("تردد"));
        if (nameIdx === -1 || urlIdx === -1) throw new Error("الملف يجب أن يحتوي على أعمدة name و stream_url على الأقل");

        // Smart CSV parser: handles quoted fields with commas
        const parseCsvLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
              else inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += ch;
            }
          }
          result.push(current.trim());
          return result;
        };

        const feeds: { name: string; city: string; country: string; stream_url: string; selected: boolean }[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = parseCsvLine(line);
          const name = (cols[nameIdx] || "").replace(/^["']|["']$/g, "");
          const streamUrl = (cols[urlIdx] || "").replace(/^["']|["']$/g, "");
          if (name && streamUrl && !feeds.some((f) => f.stream_url === streamUrl)) {
            feeds.push({
              name,
              city: cityIdx >= 0 ? (cols[cityIdx] || "").replace(/^["']|["']$/g, "") : "",
              country: countryIdx >= 0 ? (cols[countryIdx] || "").replace(/^["']|["']$/g, "") : "",
              stream_url: streamUrl,
              selected: true,
            });
          }
        }
        if (feeds.length === 0) throw new Error("لم يتم العثور على محطات صالحة في الملف");
        setCsvStations(feeds);
        setShowCsvPreview(true);
        toast({ title: `تم العثور على ${feeds.length} محطة في الملف ✓` });
      } catch (err: any) {
        toast({ title: "خطأ في قراءة الملف", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (csvFileRef.current) csvFileRef.current.value = "";
  };

  const handleCsvImport = async () => {
    const selected = csvStations.filter((s) => s.selected);
    if (selected.length === 0) { toast({ title: "اختر محطة واحدة على الأقل", variant: "destructive" }); return; }
    setCsvImporting(true);
    try {
      const BATCH_SIZE = 50;
      let imported = 0;
      let failed = 0;
      for (let i = 0; i < selected.length; i += BATCH_SIZE) {
        const batch = selected.slice(i, i + BATCH_SIZE);
        const rows = batch.map((s, j) => ({
          name: s.name,
          city: s.city || null,
          country: s.country || null,
          stream_urls: [s.stream_url],
          is_active: true,
          sort_order: stations.length + imported + j,
        }));
        const { error } = await supabase.from("radio_stations").insert(rows);
        if (error) {
          console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error);
          failed += batch.length;
        } else {
          imported += batch.length;
        }
      }
      toast({ title: `تم استيراد ${imported} محطة ✓` + (failed ? ` (${failed} فشل)` : "") });
      setShowCsvPreview(false);
      setCsvStations([]);
      load();
    } catch (e: any) {
      toast({ title: "خطأ في الاستيراد", description: e.message, variant: "destructive" });
    } finally { setCsvImporting(false); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "hsl(var(--admin-text))" }}>إدارة الراديو</h1>
        <div className="flex items-center gap-2">
          <input ref={csvFileRef} type="file" accept=".csv,.opml,.xml" onChange={handleCsvFile} className="hidden" id="csv-upload" />
          <label htmlFor="csv-upload" className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors hover:opacity-80 text-sm" style={{ background: "hsl(var(--admin-surface-hover))", color: "hsl(var(--admin-text))" }}>
            <Upload className="w-4 h-4" /> استيراد CSV
          </label>
          <button onClick={() => { resetForm(); setAdding(true); }} className="btn-admin-primary flex items-center gap-2 text-xs">
            <Plus className="w-4 h-4" /> إضافة محطة
          </button>
        </div>
      </div>

      {/* Add/Edit form */}
      {adding && (
        <div className="admin-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: "hsl(var(--admin-text))" }}>
              {editing ? "تعديل المحطة" : "إضافة محطة جديدة"}
            </h2>
            <button onClick={resetForm} className="p-1.5 rounded hover:bg-[hsl(var(--admin-surface-hover))]">
              <X className="w-5 h-5" style={{ color: "hsl(var(--admin-text-muted))" }} />
            </button>
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: "hsl(var(--admin-text-muted))" }}>اسم المحطة *</label>
            <input className="admin-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: إذاعة صنعاء" />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: "hsl(var(--admin-text-muted))" }}>روابط البث *</label>
            {form.stream_urls.map((url, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className="admin-input flex-1"
                  value={url}
                  onChange={(e) => {
                    const urls = [...form.stream_urls];
                    urls[i] = e.target.value;
                    setForm((f) => ({ ...f, stream_urls: urls }));
                  }}
                  placeholder="https://stream.example.com/live.mp3"
                />
                <button onClick={() => url && testStream(url)} disabled={testing === url || !url} className="btn-admin-primary text-xs px-3 disabled:opacity-50">
                  {testing === url ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                </button>
                {form.stream_urls.length > 1 && (
                  <button onClick={() => setForm((f) => ({ ...f, stream_urls: f.stream_urls.filter((_, j) => j !== i) }))} className="p-2 text-urgent">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setForm((f) => ({ ...f, stream_urls: [...f.stream_urls, ""] }))} className="text-xs px-3 py-1.5 rounded" style={{ color: "hsl(var(--admin-text-muted))", background: "hsl(var(--admin-surface-hover))" }}>
              + إضافة رابط بديل
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "hsl(var(--admin-text-muted))" }}>التردد</label>
              <input className="admin-input" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} placeholder="FM 91.5" />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "hsl(var(--admin-text-muted))" }}>الدولة</label>
              <input className="admin-input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="YE" />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: "hsl(var(--admin-text-muted))" }}>شعار المحطة</label>
            <div className="flex items-center gap-3">
              {form.logo_url && <img src={form.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <button onClick={() => fileRef.current?.click()} className="text-xs px-3 py-1.5 rounded" style={{ color: "hsl(var(--admin-text-muted))", background: "hsl(var(--admin-surface-hover))" }}>
                رفع صورة
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-admin-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? "تحديث" : "إضافة"}
          </button>
        </div>
      )}

      {/* Station list */}
      <div className="admin-surface overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(var(--admin-text-muted))" }} /></div>
        ) : stations.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "hsl(var(--admin-text-muted))" }}>لا توجد محطات راديو</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                  {["المحطة", "التردد", "الحالة", "مرات التشغيل", "إجراءات"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "hsl(var(--admin-text-muted))" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stations.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid hsl(var(--admin-border))" }} className="hover:bg-[hsl(var(--admin-surface-hover))]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-[hsl(var(--admin-surface-hover))] flex items-center justify-center">
                            <Radio className="w-4 h-4" style={{ color: "hsl(var(--admin-text-muted))" }} />
                          </div>
                        )}
                        <span className="font-medium" style={{ color: "hsl(var(--admin-text))" }}>{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "hsl(var(--admin-text-muted))" }}>{s.frequency || "—"}</td>
                    <td className="px-4 py-3">
                      {s.is_working ? (
                        <span className="text-xs px-2 py-1 rounded text-green-400 bg-green-400/10 flex items-center gap-1 w-fit">
                          <Check className="w-3 h-3" /> يعمل
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded text-red-400 bg-red-400/10 flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" /> متوقف
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-latin" style={{ color: "hsl(var(--admin-text-muted))" }}>{s.play_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:bg-[hsl(var(--admin-surface-hover))]" style={{ color: "hsl(var(--admin-text-muted))" }}>
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-urgent/10 text-urgent">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* CSV Import Preview */}
      {showCsvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="admin-surface w-full max-w-2xl max-h-[80vh] flex flex-col" style={{ margin: "1rem" }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
              <div className="flex items-center gap-3">
                <FileUp className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold" style={{ color: "hsl(var(--admin-text))" }}>
                  استيراد محطات ({csvStations.filter(s => s.selected).length}/{csvStations.length})
                </h2>
              </div>
              <button onClick={() => { setShowCsvPreview(false); setCsvStations([]); }} className="p-1 rounded hover:bg-[hsl(var(--admin-surface-hover))]">
                <X className="w-5 h-5" style={{ color: "hsl(var(--admin-text-muted))" }} />
              </button>
            </div>

            <div className="p-3 flex items-center gap-2" style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
              <button onClick={() => setCsvStations(list => list.map(s => ({ ...s, selected: true })))} className="text-xs px-3 py-1.5 rounded transition-colors" style={{ background: "hsl(var(--admin-surface-hover))", color: "hsl(var(--admin-text))" }}>
                تحديد الكل
              </button>
              <button onClick={() => setCsvStations(list => list.map(s => ({ ...s, selected: false })))} className="text-xs px-3 py-1.5 rounded transition-colors" style={{ background: "hsl(var(--admin-surface-hover))", color: "hsl(var(--admin-text))" }}>
                إلغاء الكل
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {csvStations.map((station, idx) => (
                <div key={idx} onClick={() => setCsvStations(list => list.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s))}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                  style={{ background: station.selected ? "hsl(142 76% 36% / 0.1)" : "hsl(var(--admin-surface-hover))" }}>
                  {station.selected ? <CheckSquare className="w-4 h-4 text-green-400 shrink-0" /> : <Square className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--admin-text-muted))" }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--admin-text))" }}>{station.name}</p>
                    <p className="text-xs truncate font-latin" dir="ltr" style={{ color: "hsl(var(--admin-text-muted))" }}>{station.stream_url}</p>
                    {(station.city || station.country) && (
                      <p className="text-xs mt-0.5" style={{ color: "hsl(var(--admin-text-muted))" }}>
                        {station.city}{station.city && station.country ? " · " : ""}{station.country}
                      </p>
                    )}
                  </div>
                  <Radio className="w-3.5 h-3.5 shrink-0" style={{ color: station.selected ? "#22c55e" : "hsl(var(--admin-text-muted))" }} />
                </div>
              ))}
            </div>

            <div className="p-5 flex items-center justify-end gap-2" style={{ borderTop: "1px solid hsl(var(--admin-border))" }}>
              <button onClick={() => { setShowCsvPreview(false); setCsvStations([]); }} className="px-4 py-2 rounded-lg text-sm" style={{ color: "hsl(var(--admin-text-muted))" }}>
                إلغاء
              </button>
              <button onClick={handleCsvImport} disabled={csvImporting || csvStations.filter(s => s.selected).length === 0}
                className="btn-admin-primary flex items-center gap-2 disabled:opacity-50">
                {csvImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                استيراد ({csvStations.filter(s => s.selected).length}) محطة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRadio;
