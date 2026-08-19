import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, source, sources: sourcesList } = await req.json();

    switch (action) {
      case "list": {
        const { data, error } = await supabase
          .from("news_sources")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ sources: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "add": {
        const { data, error } = await supabase
          .from("news_sources")
          .insert({
            name: source.name,
            url: source.url,
            fetch_method: source.fetch_method,
            fetch_url: source.fetch_url,
            language: source.language || "ar",
            category: source.category || "عام",
            fetch_interval_minutes: Number.isFinite(Number(source.fetch_interval_minutes)) ? Math.max(0, Number(source.fetch_interval_minutes)) : 15,
            is_active: source.is_active !== false,
            hide_original_source: source.hide_original_source || false,
            alt_source_name: source.alt_source_name || null,
            alt_source_url: source.alt_source_url || null,
            assigned_category: source.assigned_category || null,
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ source: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        const updateFields: Record<string, any> = {};
        if (source.name !== undefined) updateFields.name = source.name;
        if (source.fetch_url !== undefined) updateFields.fetch_url = source.fetch_url;
        if (source.fetch_interval_minutes !== undefined) updateFields.fetch_interval_minutes = source.fetch_interval_minutes;
        if (source.is_active !== undefined) updateFields.is_active = source.is_active;
        if (source.fetch_method !== undefined) updateFields.fetch_method = source.fetch_method;
        if (source.language !== undefined) updateFields.language = source.language;
        if (source.hide_original_source !== undefined) updateFields.hide_original_source = source.hide_original_source;
        if (source.alt_source_name !== undefined) updateFields.alt_source_name = source.alt_source_name || null;
        if (source.alt_source_url !== undefined) updateFields.alt_source_url = source.alt_source_url || null;
        if (source.assigned_category !== undefined) updateFields.assigned_category = source.assigned_category || null;

        const { data, error } = await supabase
          .from("news_sources")
          .update(updateFields)
          .eq("id", source.id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ source: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { error } = await supabase
          .from("news_sources")
          .delete()
          .eq("id", source.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "bulk-add": {
        if (!Array.isArray(sourcesList) || sourcesList.length === 0) {
          return new Response(JSON.stringify({ error: "No sources provided" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const inserted: any[] = [];
        const errors: any[] = [];
        for (const s of sourcesList) {
          try {
            const { data, error } = await supabase
              .from("news_sources")
              .insert({
                name: s.name,
                url: s.url || s.fetch_url,
                fetch_method: s.fetch_method || "rss",
                fetch_url: s.fetch_url,
                language: s.language || "ar",
                category: s.category || "عام",
                fetch_interval_minutes: Number.isFinite(Number(s.fetch_interval_minutes)) ? Math.max(0, Number(s.fetch_interval_minutes)) : 15,
                is_active: s.is_active !== false,
                hide_original_source: s.hide_original_source || false,
                alt_source_name: s.alt_source_name || null,
                alt_source_url: s.alt_source_url || null,
                assigned_category: s.assigned_category || null,
              })
              .select()
              .single();
            if (error) throw error;
            inserted.push(data);
          } catch (e: any) {
            errors.push({ name: s.name, error: e.message });
          }
        }
        return new Response(JSON.stringify({ inserted: inserted.length, errors, sources: inserted }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("manage-sources error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

