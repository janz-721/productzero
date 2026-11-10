/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon, BrandMark, SparkIcon } from "@/components/brand";
import type { PrototypeResult } from "@/lib/types";

type Tab = "preview" | "analysis" | "code";

const MAX_BYTES = 6 * 1024 * 1024;

export default function PrototypePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [idea, setIdea] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<PrototypeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("preview");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setIdea(localStorage.getItem("productzero:idea") ?? "");
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function acceptFile(nextFile: File | undefined) {
    if (!nextFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
      setError("请上传 JPG、PNG 或 WebP 图片");
      return;
    }
    if (nextFile.size > MAX_BYTES) {
      setError("图片不能超过 6MB");
      return;
    }
    setError("");
    setResult(null);
    setFile(nextFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function generate() {
    if (!file || loading) return;
    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("idea", idea);
      const response = await fetch("/api/prototype", { method: "POST", body: form });
      const responseText = await response.text();
      let data: { result?: PrototypeResult; error?: string };
      try {
        data = JSON.parse(responseText) as { result?: PrototypeResult; error?: string };
      } catch {
        if (response.status === 504 || /Inactivity Timeout/i.test(responseText)) {
          throw new Error("生成超时。请稍等 30 秒后重新点击生成，不要重复提交。");
        }
        throw new Error("服务器返回了异常页面，请稍后重试。");
      }
      if (!response.ok || !data.result) throw new Error(data.error || "生成原型失败");
      setResult(data.result);
      setTab("preview");
    } catch (requestError) {
      if (requestError instanceof TypeError) {
        setError("无法连接本地服务。请确认 start-dev.bat 黑色窗口仍在运行，然后刷新页面重试。");
      } else {
        setError(requestError instanceof Error ? requestError.message : "生成原型失败，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  }

  function downloadHtml() {
    if (!result) return;
    const blob = new Blob([result.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "productzero-prototype.html";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setResult(null);
    setError("");
    setTab("preview");
    inputRef.current?.click();
  }

  return (
    <main className="min-h-screen" data-prototype-revision="editorial-v2">
      <header className="border-b border-black/[0.06] bg-[#f7f5ef]">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-[2px] border border-[#ef5b37]/15 bg-[#fff3ee] px-3 py-1.5 text-[10px] font-bold text-[#a7523e] sm:flex">
              <SparkIcon className="size-3" /> 免费视觉模型
            </span>
            <Link href="/result" className="text-[12px] font-semibold text-[#77746c] transition-colors hover:text-[#171714]">返回 Brief</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-5 py-10 lg:px-8 lg:py-14">
        <div className="flex flex-col justify-between gap-6 border-b border-black/[0.08] pb-8 md:flex-row md:items-end">
          <div className="animate-rise">
            <p className="text-[10px] font-bold tracking-[0.08em] text-[#ef5b37]">原型生成</p>
            <h1 className="mt-4 max-w-[760px] text-balance text-4xl font-black leading-[1.1] tracking-[-0.05em] text-[#171714] sm:text-5xl">
              把参考界面，变成你的<span className="text-[#ef5b37]">下一屏。</span>
            </h1>
            <p className="mt-4 max-w-[720px] text-[13px] leading-6 text-[#7e796f]">上传竞品截图、设计稿或手绘草图。AI 会分析信息结构，生成单屏 HTML 原型，并说明保留与主动修改的内容。</p>
          </div>
          <div className="rounded-[2px] border border-black/[0.08] bg-white/55 px-4 py-3">
            <p className="text-[9px] font-bold tracking-[0.08em] text-[#9b968c]">当前产品想法</p>
            <p className="mt-1 max-w-[260px] truncate text-[11px] font-semibold text-[#534f47]">{idea || "尚未关联产品想法"}</p>
          </div>
        </div>

        {!result ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <section className="paper-card rounded-[4px] p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.08em] text-[#9b968c]">步骤 01</p>
                  <h2 className="mt-2 text-balance text-xl font-bold tracking-[-0.03em] text-[#2b2925]">上传视觉参考</h2>
                </div>
                <span className="rounded-[2px] bg-[#f1eee6] px-2.5 py-1 text-[9px] font-bold text-[#827d73]">JPG / PNG / WebP</span>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0])}
              />

              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}
                className={`mt-6 grid min-h-[360px] cursor-pointer place-items-center rounded-[2px] border border-dashed p-5 text-center transition-all ${
                  dragging ? "border-[#ef5b37] bg-[#fff3ee]" : "border-black/[0.15] bg-[#faf8f3] hover:border-[#ef5b37]/40 hover:bg-[#fffaf6]"
                }`}
              >
                {previewUrl ? (
                  <div className="w-full">
                    <div className="relative mx-auto max-h-[300px] overflow-hidden rounded-[2px] border border-black/[0.08] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="上传的参考截图" className="max-h-[300px] w-full object-contain" />
                    </div>
                    <p className="mt-4 text-[11px] font-semibold text-[#5c5850]">{file?.name}</p>
                    <p className="mt-1 text-[10px] text-[#9b968c]">点击可更换图片</p>
                  </div>
                ) : (
                  <div>
                    <span className="mx-auto grid size-14 place-items-center rounded-[2px] border border-black/[0.08] bg-white/80">
                      <svg viewBox="0 0 24 24" fill="none" className="size-6 text-[#ef5b37]" aria-hidden="true">
                        <path d="M4 17.5V6.8A1.8 1.8 0 0 1 5.8 5h12.4A1.8 1.8 0 0 1 20 6.8v10.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.2Z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="8.5" cy="9" r="1.5" fill="currentColor" />
                        <path d="m5 17 4.6-4.3 3.1 2.8 2.2-1.8L19 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <p className="mt-5 text-[14px] font-bold text-[#4c4942]">拖入截图，或点击选择文件</p>
                    <p className="mt-2 text-[10px] leading-5 text-[#969188]">建议上传一屏完整界面，最大 6MB</p>
                  </div>
                )}
              </div>

              {error && <div className="mt-4 rounded-[2px] border border-[#c86a54]/20 bg-[#fff1ed] px-4 py-3 text-[10px] leading-5 text-[#a64f39]">{error}</div>}

              <button
                type="button"
                onClick={generate}
                disabled={!file || loading}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[2px] bg-[#171714] text-[12px] font-bold text-white transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-[#ef5b37] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {loading ? "AI 正在分析并生成原型，约需 20–40 秒…" : "生成可预览原型"}
                {!loading && <ArrowIcon />}
              </button>
            </section>

            <section className="paper-card relative overflow-hidden rounded-[4px] p-5 sm:p-7">
              <div className="relative flex h-full min-h-[470px] flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.08em] text-[#9b968c]">生成结果</p>
                  <h2 className="mt-2 text-balance text-xl font-bold tracking-[-0.03em] text-[#2b2925]">不只是一段代码</h2>
                </div>

                <div className="my-8 space-y-3">
                  {[
                    ["01", "视觉结构分析", "识别导航、内容区、表单、卡片和页面层级"],
                    ["02", "单屏 HTML 原型", "生成无外部依赖、可直接预览的页面"],
                    ["03", "主动修改理由", "解释哪些地方参考截图，哪些地方贴合你的产品"],
                  ].map(([number, title, detail], index) => (
                    <div key={number} className={`rounded-[2px] border p-4 ${index === 1 ? "border-[#ef5b37]/20 bg-[#fff8f3]" : "border-black/[0.07] bg-white/70"}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-[#a39e94]">{number}</span>
                        <p className="text-[12px] font-bold text-[#45423c]">{title}</p>
                      </div>
                      <p className="mt-2 text-[10px] leading-5 text-[#837e74]">{detail}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[2px] border border-black/[0.07] bg-[#171714] p-4 text-white">
                  <div className="flex items-center gap-2 text-[10px] font-bold"><SparkIcon className="size-3.5 text-[#ef7a5d]" /> 设计说明会随结果一起保存</div>
                  <p className="mt-2 text-[10px] leading-5 text-white/50">方便你在面试中解释：为什么这样设计，而不是只展示一张截图。</p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-8 animate-rise">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-bold tracking-[0.08em] text-[#7b8d76]">原型已生成</p>
                <h2 className="mt-2 text-balance text-2xl font-black tracking-[-0.04em] text-[#24231f]">{result.summary}</h2>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={downloadHtml} className="h-10 whitespace-nowrap rounded-[2px] bg-[#171714] px-5 text-[11px] font-bold text-white transition-colors hover:bg-[#ef5b37]">下载 HTML</button>
                <button type="button" onClick={reset} className="h-10 whitespace-nowrap rounded-[2px] border border-black/[0.09] bg-white/60 px-5 text-[11px] font-bold text-[#5e5a52] transition-colors hover:bg-white">换一张图</button>
              </div>
            </div>

            {result.warnings.some((warning) => warning.includes("简化版") || warning.includes("格式异常")) && (
              <div className="mb-4 rounded-[2px] border border-[#d8b56b]/30 bg-[#fff7e4] px-5 py-4 text-[11px] leading-5 text-[#806426]">
                这次没有完成完整界面生成，当前显示的是简化版。请点击“换一张图”后重试；你可以在“设计分析”里查看具体原因。
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="paper-card overflow-hidden rounded-[4px] p-3">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-[10px] font-bold tracking-[0.08em] text-[#9b968c]">参考图</p>
                  <span className="text-[9px] font-semibold text-[#aaa59b]">上传的截图</span>
                </div>
                <div className="grid h-[590px] place-items-center rounded-[2px] bg-[#ece8de] p-4">
                  <div className="relative h-[548px] w-full max-w-[300px] overflow-hidden rounded-[38px] border-[7px] border-[#1c1c19] bg-[#171714] shadow-[0_28px_70px_rgba(44,39,30,0.2)]">
                    <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1c1c19]" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="参考截图" className="h-full w-full rounded-[31px] bg-white object-contain object-top" />
                  </div>
                </div>
              </section>

              <section className="paper-card overflow-hidden rounded-[4px] p-3">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex rounded-[2px] bg-[#f1eee6] p-0.5">
                    {(["preview", "analysis", "code"] as Tab[]).map((item) => (
                      <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-[2px] px-3 py-1.5 text-[9px] font-bold transition-colors ${tab === item ? "bg-white text-[#36332e] shadow-sm" : "text-[#8d887e]"}`}>
                        {item === "preview" ? "预览" : item === "analysis" ? "设计分析" : "HTML"}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] font-semibold text-[#7e917a]">已生成</span>
                </div>

                {tab === "preview" && (
                  <div className="grid h-[590px] place-items-center rounded-[2px] bg-[#ece8de] p-4">
                    <div className="relative h-[548px] w-full max-w-[300px] overflow-hidden rounded-[38px] border-[7px] border-[#1c1c19] bg-white shadow-[0_28px_70px_rgba(44,39,30,0.2)]">
                      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1c1c19]" />
                      <iframe title="生成的原型预览" srcDoc={result.html} sandbox="" className="h-full w-full rounded-[31px] bg-white" />
                      <div className="pointer-events-none absolute bottom-2 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-black/25" />
                    </div>
                  </div>
                )}

                {tab === "analysis" && (
                  <div className="h-[590px] space-y-3 overflow-y-auto rounded-[2px] border border-black/[0.07] bg-[#fffefa] p-5">
                    <AnalysisRow title="布局结构" items={result.layout} />
                    <AnalysisRow title="关键组件" items={result.components} />
                    <div className="rounded-[2px] border border-black/[0.07] bg-[#faf8f3] p-4">
                      <p className="text-[9px] font-bold tracking-[0.08em] text-[#9b968c]">颜色与字体</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.colors.map((color, index) => <span key={`${color}-${index}`} className="rounded-[2px] border border-black/[0.07] bg-white px-2.5 py-1 font-mono text-[9px] text-[#625e56]">{color}</span>)}
                      </div>
                      <p className="mt-3 text-[10px] leading-5 text-[#777268]">{result.typography}</p>
                    </div>
                    <AnalysisRow title="设计理由" items={result.rationale} />
                    <AnalysisRow title="主动修改" items={result.changes} />
                    {result.warnings.length > 0 && <AnalysisRow title="需要人工确认" items={result.warnings} warning />}
                  </div>
                )}

                {tab === "code" && (
                  <pre className="h-[590px] overflow-auto rounded-[2px] border border-black/[0.07] bg-[#171714] p-5 text-[10px] leading-5 text-[#d8d4ca]">
                    <code>{result.html}</code>
                  </pre>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function AnalysisRow({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) {
  if (!items.length) return null;
  return (
    <div className={`rounded-[2px] border p-4 ${warning ? "border-[#d8b56b]/25 bg-[#fff7e4]" : "border-black/[0.07] bg-[#faf8f3]"}`}>
      <p className={`text-[9px] font-bold tracking-[0.08em] ${warning ? "text-[#8a6b26]" : "text-[#9b968c]"}`}>{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 text-[10px] leading-5 text-[#6b675f]">
            <span className={`mt-[7px] size-1 shrink-0 rounded-full ${warning ? "bg-[#c79831]" : "bg-[#9daf98]"}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}







