"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowIcon, BrandMark, SparkIcon } from "@/components/brand";

const examples = [
  "帮大学生更快卖掉闲置物品，同时减少低质量沟通。",
  "给独立开发者做一个能自动整理用户反馈并生成版本计划的小工具。",
  "让第一次做产品的人，在写代码前发现需求里最危险的假设。",
];

export default function NewIdeaPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");

  function startInterview() {
    const cleanIdea = idea.trim();
    if (cleanIdea.length < 8) return;
    localStorage.setItem("productzero:idea", cleanIdea);
    localStorage.removeItem("productzero:answers");
    localStorage.removeItem("productzero:partial-answers");
    router.push("/interview");
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/[0.06] bg-[#f7f5ef]">
        <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between px-5 lg:px-8">
          <BrandMark />
          <Link href="/" className="text-[12px] font-semibold text-[#77746c] transition-colors hover:text-[#171714]">退出本次推演</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1120px] gap-10 px-5 py-12 lg:grid-cols-[1fr_300px] lg:gap-16 lg:px-8 lg:py-20">
        <section className="animate-rise">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-[#928d83]">
            <span className="grid size-5 place-items-center rounded-[2px] border border-black/[0.1]">1</span>
            第 01 步 · 说清楚要解决的问题
          </div>

          <h1 className="mt-7 max-w-[760px] text-balance text-4xl font-black leading-[1.12] tracking-[-0.05em] text-[#171714] sm:text-5xl lg:text-[56px]">
            先把你脑子里的想法，
            <span className="text-[#ef5b37]">倒出来。</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-[15px] leading-7 text-[#77736a]">
            还不需要完整，也不需要正确。写下一个具体的人、一个问题，或者一个你觉得“如果有人做好就好了”的场景。接下来会逐轮问清真实经历，不会直接替你写答案。
          </p>

          <div className="paper-card mt-10 rounded-[4px] p-2">
            <div className="rounded-[2px] border border-black/[0.07] bg-[#fffefa] p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <label htmlFor="idea" className="text-[12px] font-bold text-[#3f3d37]">你的产品想法</label>
                <span className={`text-[11px] font-medium ${idea.length > 720 ? "text-[#b4553e]" : "text-[#a39e94]"}`}>{idea.length} / 800</span>
              </div>
              <textarea
                id="idea"
                value={idea}
                onChange={(event) => setIdea(event.target.value.slice(0, 800))}
                rows={7}
                autoFocus
                placeholder="例如：我想帮刚毕业的租房者快速判断一套房子值不值得看，减少被虚假房源和中介话术浪费的时间……"
                className="mt-4 w-full resize-none border-0 bg-transparent text-[18px] leading-8 text-[#24231f] outline-none placeholder:text-[#b8b3a8]"
              />

              <div className="mt-2 flex flex-col gap-4 border-t border-black/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[11px] text-[#8c877d]">
                  <SparkIcon className="size-4 text-[#ef5b37]" />
                  每次只问一个问题，回答可以口语化
                </div>
                <button
                  type="button"
                  onClick={startInterview}
                  disabled={idea.trim().length < 8}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[2px] bg-[#171714] px-6 text-[13px] font-semibold text-white transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-[#ef5b37] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  开始 8 轮访谈 <ArrowIcon />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-[10px] font-bold tracking-[0.1em] text-[#9c978d]">也可以从一个例子开始</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setIdea(example)}
                  className="max-w-full rounded-[2px] border border-black/[0.08] bg-white/55 px-3.5 py-2 text-left text-[11px] leading-5 text-[#5f5b53] transition-colors hover:border-[#ef5b37]/30 hover:bg-[#fff7f3]"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="animate-rise [animation-delay:120ms]">
          <div className="sticky top-24 rounded-[3px] border border-black/[0.08] bg-[#ede9df]/80 p-5">
            <p className="text-[10px] font-bold tracking-[0.1em] text-[#908b81]">接下来会发生什么</p>
            <div className="mt-5 space-y-5">
              {[
                ["01", "问清真实经历", "确认谁遇到了问题、当时在做什么，以及现在怎么凑合解决。"],
                ["02", "核对理解", "逐条保留你的原话，再确认整理后的意思没有变。"],
                ["03", "形成 Product Brief", "整理证据（用户原话、实际行为、结果或数字）、关键假设（目前还不能确认、需要验证的判断）和下一步。"],
              ].map(([number, title, body], index) => (
                <div key={number} className="flex gap-3">
                  <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${index === 0 ? "bg-[#ef5b37] text-white" : "border border-black/[0.1] bg-white/50 text-[#88837a]"}`}>{number}</span>
                  <div>
                    <p className="text-[13px] font-bold text-[#3a3833]">{title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#817c73]">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[2px] border border-black/[0.07] bg-white/45 p-3">
              <p className="text-[10px] font-semibold text-[#777269]">预计用时</p>
              <p className="mt-1 text-xl font-black tracking-[-0.04em] text-[#2d2b27]">8–16 分钟</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
