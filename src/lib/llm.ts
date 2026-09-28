import type { ChatMessage, ProviderKey, VisionContentPart } from "./types";
import type { CredentialSet } from "./settings";

/** Error surfaced by a provider call; `retryable` drives failover/backoff. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly provider: ProviderKey,
    public readonly modelId: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500 || this.status === 0;
  }
}

export interface CompleteParams {
  modelId: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
  onDelta?: (chunk: string) => void;
}

export interface LLMProvider {
  readonly key: ProviderKey;
  readonly available: boolean;
  complete(params: CompleteParams): Promise<string>;
}

/** Strip image parts for routes that cannot consume vision input. */
export function stripImages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return m;
    const text = (m.content as VisionContentPart[])
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("\n\n");
    return { role: m.role, content: text };
  });
}

/**
 * Unified OpenAI-compatible adapter. Both OpenRouter and the Kilocode
 * gateway speak the /v1/chat/completions protocol with SSE streaming, so a
 * single implementation serves both — only base URL, key and headers differ.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    public readonly key: ProviderKey,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly extraHeaders: Record<string, string> = {},
  ) {}

  get available(): boolean {
    return Boolean(this.apiKey);
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.extraHeaders,
    };
  }

  async complete(params: CompleteParams): Promise<string> {
    const url = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const controller = new AbortController();
    // Free-tier routes can stream large codegen payloads slowly — stay patient.
    const timeout = setTimeout(() => controller.abort(new Error("timeout")), 280_000);
    const onOuterAbort = () => controller.abort(new Error("aborted"));
    params.signal?.addEventListener("abort", onOuterAbort);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.headers(),
        signal: controller.signal,
        body: JSON.stringify({
          model: params.modelId,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          stream: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ProviderError(
          `${this.key} HTTP ${res.status}: ${body.slice(0, 300)}`,
          res.status,
          this.key,
          params.modelId,
        );
      }

      const contentType = res.headers.get("content-type") ?? "";
      // Some gateways ignore stream:true and return a full JSON completion.
      if (contentType.includes("application/json")) {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = json.choices?.[0]?.message?.content ?? "";
        if (text) params.onDelta?.(text);
        return text;
      }

      if (!res.body) throw new ProviderError("empty response body", 0, this.key, params.modelId);
      return await this.consumeSse(res.body, params.onDelta, params.modelId);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("abort")) {
        throw new ProviderError(`${this.key} request aborted (${message})`, 0, this.key, params.modelId);
      }
      // Network-level failures (DNS, refused, TLS) → retryable 0-status.
      throw new ProviderError(`${this.key} network error: ${message}`, 0, this.key, params.modelId);
    } finally {
      clearTimeout(timeout);
      params.signal?.removeEventListener("abort", onOuterAbort);
    }
  }

  private async consumeSse(
    body: ReadableStream<Uint8Array>,
    onDelta: ((chunk: string) => void) | undefined,
    modelId: string,
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let sawData = false;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === "[DONE]") return full;
        sawData = true;
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string }; message?: { content?: string } }[];
            error?: { message?: string };
          };
          if (json.error?.message) {
            throw new ProviderError(json.error.message, 500, this.key, modelId);
          }
          const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? "";
          if (delta) {
            full += delta;
            onDelta?.(delta);
          }
        } catch (err) {
          if (err instanceof ProviderError) throw err;
          /* tolerate keep-alive/keepalive comment frames */
        }
      }
    }
    if (!sawData && !full) {
      throw new ProviderError("stream closed without data", 502, this.key, modelId);
    }
    return full;
  }
}

/** Construct both adapters from the effective credential set. */
export function buildProviders(creds: CredentialSet): Record<ProviderKey, LLMProvider> {
  return {
    openrouter: new OpenAICompatibleProvider("openrouter", "https://openrouter.ai/api/v1", creds.openrouter, {
      "HTTP-Referer": "https://alephvisio.studio",
      "X-Title": "AlephVisio Studio",
    }),
    kilocode: new OpenAICompatibleProvider("kilocode", creds.kilocodeBaseUrl, creds.kilocode),
  };
}
