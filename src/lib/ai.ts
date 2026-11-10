type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type ChatMessage = { role: "system" | "user"; content: string | Array<TextPart | ImagePart> };

function repairControlCharacters(json: string) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (const character of json) {
    const code = character.charCodeAt(0);
    if (inString) {
      if (escaped) {
        output += character;
        escaped = false;
        continue;
      }
      if (character === "\\") {
        output += character;
        escaped = true;
        continue;
      }
      if (character === '"') {
        output += character;
        inString = false;
        continue;
      }
      if (code < 0x20) {
        if (character === "\n") output += "\\n";
        else if (character === "\r") output += "\\r";
        else if (character === "\t") output += "\\t";
        else output += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
      output += character;
      continue;
    }

    if (character === '"') inString = true;
    output += character;
  }

  return output;
}

function extractJson(text: string): unknown {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("AI 返回内容格式异常，请重试");
  const candidate = clean.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(repairControlCharacters(candidate));
    } catch (error) {
      console.error("Unable to parse AI JSON", error);
      throw new Error("AI 返回内容格式异常，请稍后重试");
    }
  }
}

function isRetryable(error: unknown) {
  const value = error as Error & { retryable?: boolean; status?: number };
  return Boolean(
    value.retryable ||
    value.status === 429 ||
    (value.status && value.status >= 500) ||
    value.name === "TimeoutError" ||
    value.name === "AbortError" ||
    /fetch failed|network|timeout/i.test(value.message || ""),
  );
}

function effectiveMaxTokens(model: string, maxTokens: number) {
  return model === "glm-4v-flash" ? Math.min(maxTokens, 1024) : maxTokens;
}

async function requestModel<T>(model: string, messages: ChatMessage[], maxTokens = 4096): Promise<T> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, "");
  if (!apiKey) throw new Error("AI 尚未配置：请先在 .env.local 中填写 AI_API_KEY");

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.4,
    max_tokens: effectiveMaxTokens(model, maxTokens),
    response_format: { type: "json_object" },
  };
  if (model.toLowerCase().startsWith("glm-")) body.thinking = { type: "disabled" };

  let response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  if (response.status === 400) {
    const fallbackBody = { ...body };
    delete fallbackBody.response_format;
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(fallbackBody),
      signal: AbortSignal.timeout(180_000),
    });
  }

  const responseText = await response.text();
  if (!response.ok) {
    const error = new Error(`AI 服务请求失败（${response.status}）`) as Error & { status?: number; retryable?: boolean };
    error.status = response.status;
    error.retryable = response.status === 429 || response.status >= 500;
    console.error("AI request failed", model, response.status, responseText.slice(0, 800));
    throw error;
  }

  const result = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 没有返回内容");
  return extractJson(content) as T;
}

async function generateWithFallback<T>(models: string[], messages: ChatMessage[], maxTokens = 4096): Promise<T> {
  let lastError: unknown;
  const hasImage = messages.some((message) =>
    Array.isArray(message.content) && message.content.some((part) => part.type === "image_url"),
  );
  const candidates = hasImage ? [...new Set([...models, "glm-4v-flash"])] : models;
  for (const model of candidates) {
    try {
      return await requestModel<T>(model, messages, maxTokens);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI 服务暂时不可用");
}

export async function generateJson<T>(messages: ChatMessage[], maxTokens = 4096): Promise<T> {
  const primary = process.env.AI_MODEL || "glm-4-flash-250414";
  const configuredFallbacks = (process.env.AI_FALLBACK_MODELS || "glm-4-flash-250414,glm-4.5-flash,glm-4.7-flash")
    .split(",").map((value) => value.trim()).filter(Boolean);
  return generateWithFallback<T>([...new Set([primary, ...configuredFallbacks])], messages, maxTokens);
}

export async function generateVisionJson<T>(prompt: string, imageDataUrl: string): Promise<T> {
  const primary = process.env.AI_VISION_MODEL || "glm-4.6v-flash";
  const configuredFallbacks = (process.env.AI_VISION_FALLBACK_MODELS || "glm-4.6v-flash,glm-4.1v-thinking-flash,glm-4v-flash")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const models = [...new Set(["glm-4v-flash", primary, ...configuredFallbacks])];

  return generateWithFallback<T>(models, [{
    role: "user",
    content: [
      { type: "image_url", image_url: { url: imageDataUrl } },
      { type: "text", text: prompt },
    ],
  }], 5000);
}

export async function generateText(messages: ChatMessage[], maxTokens = 5500): Promise<string> {
  const primary = process.env.AI_MODEL || "glm-4-flash-250414";
  const configuredFallbacks = (process.env.AI_FALLBACK_MODELS || "glm-4-flash-250414,glm-4.5-flash,glm-4.7-flash")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const models = [...new Set([primary, ...configuredFallbacks])];
  let lastError: unknown;

  for (const model of models) {
    try {
      const apiKey = process.env.AI_API_KEY;
      const baseUrl = (process.env.AI_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, "");
      if (!apiKey) throw new Error("AI 尚未配置：请先在 .env.local 中填写 AI_API_KEY");

      const body: Record<string, unknown> = { model, messages, temperature: 0.35, max_tokens: effectiveMaxTokens(model, maxTokens) };
      if (model.toLowerCase().startsWith("glm-")) body.thinking = { type: "disabled" };

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });
      const responseText = await response.text();
      if (!response.ok) {
        const error = new Error(`AI 服务请求失败（${response.status}）`) as Error & { status?: number; retryable?: boolean };
        error.status = response.status;
        error.retryable = response.status === 429 || response.status >= 500;
        console.error("AI text request failed", model, response.status, responseText.slice(0, 800));
        throw error;
      }
      const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("AI 没有返回内容");
      return content.trim();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI 服务暂时不可用");
}
export async function generateVisionText(prompt: string, imageDataUrl: string, maxTokens = 3500): Promise<string> {
  const primary = process.env.AI_VISION_MODEL || "glm-4.6v-flash";
  const configuredFallbacks = (process.env.AI_VISION_FALLBACK_MODELS || "glm-4.6v-flash,glm-4.1v-thinking-flash,glm-4v-flash")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const models = [...new Set([primary, ...configuredFallbacks])];
  let lastError: unknown;

  for (const model of models) {
    try {
      const apiKey = process.env.AI_API_KEY;
      const baseUrl = (process.env.AI_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, "");
      if (!apiKey) throw new Error("AI 尚未配置：请先在 .env.local 中填写 AI_API_KEY");

      const body: Record<string, unknown> = {
        model,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: prompt },
          ],
        }],
        temperature: 0.3,
        max_tokens: effectiveMaxTokens(model, maxTokens),
      };
      if (model.toLowerCase().startsWith("glm-")) body.thinking = { type: "disabled" };

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });
      const responseText = await response.text();
      if (!response.ok) {
        const error = new Error(`AI 服务请求失败（${response.status}）`) as Error & { status?: number; retryable?: boolean };
        error.status = response.status;
        error.retryable = response.status === 429 || response.status >= 500;
        console.error("AI vision text request failed", model, response.status, responseText.slice(0, 800));
        throw error;
      }
      const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("AI 没有返回内容");
      return content.trim();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI 服务暂时不可用");
}





