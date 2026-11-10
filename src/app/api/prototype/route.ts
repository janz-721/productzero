import { NextResponse } from "next/server";
import { generateVisionJson } from "@/lib/ai";
import { buildPrototypeResult, normalizePrototypeBlueprint } from "@/lib/prototype-template";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    const idea = String(form.get("idea") || "").slice(0, 1600);

    if (!(image instanceof File)) return NextResponse.json({ error: "请上传一张参考截图" }, { status: 400 });
    if (!ALLOWED_TYPES.has(image.type)) return NextResponse.json({ error: "仅支持 JPG、PNG 或 WebP 图片" }, { status: 400 });
    if (image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "图片不能超过 6MB" }, { status: 400 });

    const bytes = Buffer.from(await image.arrayBuffer());
    const imageDataUrl = `data:${image.type};base64,${bytes.toString("base64")}`;

    const prompt = `你是 ProductZero 的资深产品设计师。请分析移动端参考截图，把它的信息结构和视觉气质转换成一个紧凑的界面蓝图。

产品背景：<idea>${idea || "尚未提供产品背景"}</idea>

要求：
1. 保留参考图的顶部品牌栏、活动横幅、双列分类入口、四项服务网格、活动条、流程、FAQ 和底部导航等信息密度。
2. 所有文案必须适配当前产品，不要照抄参考图中的旧衣回收、衣物回收、书籍回收、图书回收、手机数码、家用电器、家具清运、专业搬运、750元或最高1元/kg等内容。
3. services、activity、steps 和 faqs 必须围绕产品背景重新生成，不得复用参考图的业务名称、奖励数字或服务卖点。
4. 只输出紧凑 JSON，不要输出 Markdown、解释或 HTML。
5. categories 固定 2 个，services 固定 4 个，steps 固定 4 个，faqs 固定 2 个，bottomNav 固定 4 个。
6. 每个字段简短：brand 不超过 12 字，headline 不超过 28 字，caption 不超过 32 字。
7. colors 必须使用 6 位十六进制颜色。

严格使用以下 JSON 结构：
{
  "brand": "产品名",
  "badge": "品牌副标题",
  "headline": "首屏主张",
  "subheadline": "服务说明",
  "coverage": "覆盖范围",
  "primaryAction": "主按钮文案",
  "categories": [
    { "title": "分类1", "caption": "说明1", "tag": "标签1" },
    { "title": "分类2", "caption": "说明2", "tag": "标签2" }
  ],
  "services": [
    { "title": "服务1", "caption": "说明1" },
    { "title": "服务2", "caption": "说明2" },
    { "title": "服务3", "caption": "说明3" },
    { "title": "服务4", "caption": "说明4" }
  ],
  "activity": { "title": "活动标题", "caption": "活动说明", "action": "按钮" },
  "steps": ["步骤1", "步骤2", "步骤3", "步骤4"],
  "faqs": [
    { "question": "问题1", "answer": "回答1" },
    { "question": "问题2", "answer": "回答2" }
  ],
  "bottomNav": ["首页", "估价", "订单", "我的"],
  "colors": { "primary": "#147bf5", "accent": "#ff8a24", "background": "#f4f8fd" }
}`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (value: string) => {
          try {
            controller.enqueue(encoder.encode(value));
          } catch {
            // The client may have disconnected; finish quietly.
          }
        };
        const heartbeat = setInterval(() => send(" "), 5000);
        send(" ");

        try {
          const raw = await generateVisionJson<unknown>(prompt, imageDataUrl);
          const blueprint = normalizePrototypeBlueprint(raw, idea);
          const result = buildPrototypeResult(blueprint);
          send(JSON.stringify({ result }));
        } catch (error) {
          console.error("Prototype generation failed", error);
          const message = error instanceof Error ? error.message : "生成原型时出错";
          send(JSON.stringify({ error: message }));
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Prototype request failed", error);
    const message = error instanceof Error ? error.message : "生成原型时出错";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}