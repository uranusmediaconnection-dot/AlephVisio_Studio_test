"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, RefreshCcw, Save, Workflow } from "lucide-react";
import { Badge, Button, Card, Input, Label, Spinner, Textarea, toast } from "@/components/ui";

interface SettingsPayload {
  keys: { openrouter: string; kilocode: string };
  kilocodeBaseUrl: string;
  registry: string;
  envFallback: { openrouter: boolean; kilocode: boolean; kilocodeBaseUrl: string };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<SettingsPayload>({
    queryKey: ["settings"],
    queryFn: async () => (await fetch("/api/settings")).json(),
  });

  const [openrouter, setOpenrouter] = useState("");
  const [kilocode, setKilocode] = useState("");
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [registryJson, setRegistryJson] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState(false);
  const [savingRegistry, setSavingRegistry] = useState(false);

  const effectiveBaseUrl = baseUrl ?? data?.kilocodeBaseUrl ?? "";
  const effectiveRegistry = registryJson ?? data?.registry ?? "";

  const saveKeys = async () => {
    setSavingKeys(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(openrouter.trim() ? { openrouter: openrouter.trim() } : {}),
          ...(kilocode.trim() ? { kilocode: kilocode.trim() } : {}),
          kilocodeBaseUrl: effectiveBaseUrl,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      toast("ok", "Credentials saved (AES-256-GCM encrypted at rest).");
      setOpenrouter("");
      setKilocode("");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (err) {
      toast("error", (err as Error).message);
    } finally {
      setSavingKeys(false);
    }
  };

  const saveRegistry = async (reset = false) => {
    if (!reset) {
      try {
        JSON.parse(effectiveRegistry);
      } catch {
        toast("error", "Registry is not valid JSON — fix before saving.");
        return;
      }
    }
    setSavingRegistry(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { resetRegistry: true } : { registry: effectiveRegistry }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      toast("ok", reset ? "Registry reset to defaults." : "Model registry updated — effective immediately.");
      setRegistryJson(null);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (err) {
      toast("error", (err as Error).message);
    } finally {
      setSavingRegistry(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-3 py-20 text-mist-300">
        <Spinner /> Loading settings…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-mist-300">
        Keys are stored server-side only, encrypted with <span className="font-mono text-teal-400">APP_ENCRYPTION_KEY</span>.
        Blank fields keep the current value.
      </p>

      <Card className="mt-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
          <KeyRound size={16} className="text-teal-400" /> Provider credentials
        </h2>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="s-or">OpenRouter API key</Label>
            <div className="flex items-center gap-2">
              <Input
                id="s-or"
                type="password"
                placeholder={data.keys.openrouter ? `current: ${data.keys.openrouter}` : "sk-or-v1-…"}
                value={openrouter}
                onChange={(e) => setOpenrouter(e.target.value)}
                autoComplete="off"
              />
              {data.envFallback.openrouter && <Badge tone="teal">.env fallback</Badge>}
            </div>
          </div>
          <div>
            <Label htmlFor="s-kc">Kilocode gateway token</Label>
            <div className="flex items-center gap-2">
              <Input
                id="s-kc"
                type="password"
                placeholder={data.keys.kilocode ? `current: ${data.keys.kilocode}` : "JWT token from app.kilo.ai"}
                value={kilocode}
                onChange={(e) => setKilocode(e.target.value)}
                autoComplete="off"
              />
              {data.envFallback.kilocode && <Badge tone="teal">.env fallback</Badge>}
            </div>
          </div>
          <div>
            <Label htmlFor="s-url">Kilocode base URL (OpenAI-compatible)</Label>
            <Input id="s-url" value={effectiveBaseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.kilo.ai/api/gateway" />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void saveKeys()} disabled={savingKeys}>
              {savingKeys ? <Spinner /> : <Save size={15} />} Save credentials
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-bold">
          <Workflow size={16} className="text-teal-400" /> Model JSON Registry
        </h2>
        <p className="mb-4 text-xs text-mist-500">
          5 branded models × 2 providers = 10 routes. Slugs are provider-specific (OpenRouter IDs also work on the
          Kilocode gateway). Invalid JSON is rejected on save.
        </p>
        <Textarea
          value={effectiveRegistry}
          onChange={(e) => setRegistryJson(e.target.value)}
          className="min-h-[420px] font-mono text-[12px] leading-relaxed"
          spellCheck={false}
          aria-label="Model registry JSON"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => void saveRegistry(true)} disabled={savingRegistry}>
            <RefreshCcw size={14} /> Reset to defaults
          </Button>
          <Button onClick={() => void saveRegistry(false)} disabled={savingRegistry}>
            {savingRegistry ? <Spinner /> : <Save size={15} />} Save registry
          </Button>
        </div>
      </Card>
    </div>
  );
}
