import Link from "next/link";
import { ArrowIcon, SiteHeader, SparkIcon } from "@/components/brand";

const assumptions = [
  { label: "谁最需要它", value: "第一次做产品的学生团队", evidence: "有部分线索", risk: "中", tone: "amber" },
  { label: "哪一步最麻烦", value: "想法说不清，就急着讨论功能", evidence: "有明确访谈证据", risk: "高", tone: "red" },
  { label: "下一步做什么", value: "先验证最危险的判断", evidence: "有部分线索", risk: "中", tone: "amber" },
];

const steps = [
  {
    number: "01",
    title: "先追问，不急着生成",
    body: "先问谁遇到了问题、当时在做什么、哪一步最麻烦，再整理关键假设（目前还不能确认、需要验证的判断）。",
    tag: "结构化访谈",
  },
  {
    number: "02",
    title: "把猜测和事实分开",
    body: "每条重要判断都保留用户原话、来源轮次和整理后的意思，再单独标出证据状态与风险等级。",
    tag: "判断依据",
  },
  {
    number: "03",
    title: "从文档走到原型",
    body: "先形成 Product Brief（用来判断下一步做什么的证据整理稿），再进入单屏原型，并解释每一次设计取舍。",
    tag: "设计理由",
  },
];

const principles = [
  ["证据优先", "用户原话、实际行为、结果或数字才是证据；推测会单独标出来。"],
  ["决策留痕", "为什么做、为什么不做、什么会改变决定，都会被记录下来。"],
  ["先做一屏", "不从完整系统开始，先做出最小、可预览、可测试的一屏原型。"],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden" data-design-revision="editorial-v2">
      <SiteHeader />

      <section className="relative border-b border-black/[0.09]">
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="animate-rise relative z-10">
            <h1 className="font-display max-w-[760px] text-[48px] font-black leading-[1.06] text-[#181712] sm:text-[60px] lg:text-[64px]">
              <span className="block">先判断</span>
              <span className="relative inline-block text-[#e75432]">
                值不值得做，
                <span className="absolute -bottom-1 left-0 h-[7px] w-full -rotate-1 bg-[#e75432]/14" />
              </span>
              <span className="block">再决定怎么动手。</span>
            </h1>

            <p className="mt-8 max-w-[590px] text-[17px] leading-8 text-[#625e54] sm:text-[18px]">
              用一场有结构的对话，把模糊想法整理成 Product Brief（用来判断下一步做什么的证据整理稿）。
              它会说清谁遇到了什么问题、现在怎么凑合解决，以及下一步该验证什么。
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/new"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-[2px] bg-[#181712] px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#e75432]"
              >
                开始一次产品推演
                <span className="transition-transform group-hover:translate-x-1"><ArrowIcon /></span>
              </Link>
              <a
                href="#method"
                className="inline-flex h-12 items-center justify-center rounded-[2px] border border-black/[0.14] bg-[#fffdf7]/65 px-6 text-sm font-semibold text-[#4d4941] transition-colors hover:bg-[#fffdf7]"
              >
                看看它怎么工作
              </a>
            </div>

            <div className="mt-12 grid max-w-[600px] grid-cols-3 gap-5 border-t border-black/[0.11] pt-5 text-[11px] leading-5 text-[#777267]">
              <span>为早期产品团队设计</span>
              <span>不训练模型</span>
              <span>先做出可验证的 MVP（第一版先做什么）</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[530px] animate-settle [animation-delay:120ms] lg:mx-0">
            <div className="absolute -left-8 top-16 z-20 hidden -rotate-3 border border-black/[0.12] bg-[#e8dfce] px-4 py-3 text-[11px] font-semibold text-[#5e574b]  lg:block">
              不是一份漂亮的空文档
            </div>
            <div className="absolute -right-8 bottom-24 z-20 hidden rotate-3 border border-[#718269]/25 bg-[#dfe7da] px-4 py-3 text-[11px] font-semibold text-[#43503e]  lg:block">
              每个判断都能追溯
            </div>

            <article className="paper-card relative z-10 overflow-hidden rounded-[4px]">
              <div className="flex items-center justify-between border-b border-black/[0.09] bg-[#e8dfce] px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-[2px] bg-[#181712] text-[10px] font-bold text-white">P0</span>
                  <span className="text-[10px] font-bold tracking-[0.08em] text-[#6c6558]">产品 Brief 预览</span>
                </div>
                <span className="font-mono text-[10px] font-semibold text-[#847b6c]">01 / 06</span>
              </div>

              <div className="bg-[#fffdf7] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-5 border-b border-black/[0.09] pb-5">
                  <div>
                    <p className="text-[11px] font-semibold text-[#8b8376]">校园二手交易助手</p>
                    <h2 className="font-display mt-3 max-w-[390px] text-[25px] font-bold leading-[1.38] text-[#26241f]">
                      帮学生更快卖掉闲置物品，同时减少低质量沟通。
                    </h2>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[9px] font-bold tracking-[0.08em] text-[#9b9285]">证据状态</p>
                    <p className="mt-1 text-[13px] font-bold text-[#3f3b34]">有部分线索</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-black/[0.09] border-b border-black/[0.09] py-5">
                  {assumptions.map((item) => (
                    <div key={item.label} className="px-3 first:pl-0 last:pr-0">
                      <p className="text-[9px] font-bold tracking-[0.06em] text-[#9b9285]">{item.label}</p>
                      <p className="mt-2 min-h-10 text-[11px] font-semibold leading-5 text-[#444039]">{item.value}</p>
                      <div className="mt-2 space-y-1">
                        <span className="inline-flex rounded-[2px] bg-[#f1eee6] px-1.5 py-0.5 text-[8px] font-bold text-[#706a60]">证据：{item.evidence}</span>
                        <span className={`block w-fit rounded-[2px] px-1.5 py-0.5 text-[8px] font-bold ${
                          item.tone === "green" ? "bg-[#e3eadf] text-[#52634b]" : item.tone === "red" ? "bg-[#f7e1da] text-[#a44b36]" : "bg-[#f1e8d1] text-[#846724]"
                        }`}>风险：{item.risk}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-b border-black/[0.09] py-5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#4e4941]">
                    <SparkIcon className="size-3.5 text-[#e75432]" />
                    下一个关键问题
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-[#746e64]">
                    学生现在为什么更愿意在群聊里卖，而不是使用现有二手平台？
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex -space-x-2">
                    {["林", "周", "陈"].map((name, index) => (
                      <span key={name} className={`grid size-6 place-items-center rounded-full border-2 border-[#fffdf7] text-[9px] font-bold text-white ${index === 0 ? "bg-[#e75432]" : index === 1 ? "bg-[#718064]" : "bg-[#465364]"}`}>{name}</span>
                    ))}
                  </div>
                  <p className="text-[10px] font-medium text-[#918a7e]">8 轮访谈 · 4 个关键假设</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="method" className="border-b border-black/[0.09] bg-[#e9e2d5]">
        <div className="mx-auto max-w-[1180px] px-5 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="font-display text-balance text-4xl font-black leading-[1.18] text-[#181712] sm:text-5xl">
                从一句想法，
                <br />
                到可以行动。
              </h2>
              <p className="mt-6 max-w-[380px] text-[14px] leading-7 text-[#6c665c]">
                不是让 AI 替你写更多内容，而是让每一个关键判断都更清楚、更容易被验证。
              </p>
              <div className="mt-10 border-l-2 border-[#e75432] pl-5">
                <p className="font-display text-lg font-bold leading-8 text-[#343029]">“先问清楚，再开始构建。”</p>
                <p className="mt-2 text-[11px] leading-5 text-[#81796d]">这是 ProductZero 的核心工作方式。</p>
              </div>
            </div>

            <div className="border-t border-black/[0.12]">
              {steps.map((step) => (
                <article key={step.number} className="grid gap-5 border-b border-black/[0.12] py-8 sm:grid-cols-[70px_1fr_auto] sm:items-start">
                  <span className="font-display text-4xl font-black leading-none text-[#b9ad99]">{step.number}</span>
                  <div>
                    <h3 className="text-xl font-bold tracking-[-0.025em] text-[#28251f]">{step.title}</h3>
                    <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#716b61]">{step.body}</p>
                  </div>
                  <span className="w-fit rounded-[2px] border border-black/[0.12] bg-[#f5f0e6] px-3 py-1 text-[9px] font-bold text-[#71695e]">{step.tag}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="principles" className="mx-auto max-w-[1180px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <h2 className="font-display max-w-[440px] text-balance text-4xl font-black leading-[1.18] text-[#181712] sm:text-5xl">
              AI 扩展思考，
              <br />
              你负责做决定。
            </h2>
            <p className="mt-6 max-w-[430px] text-[15px] leading-7 text-[#6c665c]">
              ProductZero 不把“生成”当作终点。它把需求、证据、假设和取舍放在同一张桌面上，帮助你决定下一步该验证什么。
            </p>
          </div>

          <div className="border-y border-black/[0.12]">
            {principles.map(([title, body], index) => (
              <div key={title} className="grid gap-4 border-b border-black/[0.1] py-7 last:border-b-0 sm:grid-cols-[42px_1fr]">
                <span className="font-mono text-[11px] font-bold text-[#a09686]">0{index + 1}</span>
                <div>
                  <h3 className="text-[18px] font-bold text-[#2b2822]">{title}</h3>
                  <p className="mt-2 max-w-[520px] text-[13px] leading-6 text-[#726c61]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-20 overflow-hidden rounded-[4px] bg-[#181712] px-7 py-10 text-white sm:px-11 sm:py-12">
          <div className="absolute -right-14 -top-24 size-72 rounded-full border border-white/[0.08]" />
          <div className="absolute -bottom-28 right-24 size-56 rounded-full border border-[#e75432]/25" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="max-w-[660px] font-display text-3xl font-bold leading-[1.25] tracking-[-0.035em] sm:text-4xl">
                从一句还没有想清楚的话开始。
              </p>
              <p className="mt-3 text-[12px] leading-6 text-white/55">先暴露风险，再决定下一步做什么。</p>
            </div>
            <Link href="/new" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[2px] bg-[#e75432] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#f06746]">
              开始推演 <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/[0.09]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 py-7 text-[11px] text-[#8a8377] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>ProductZero · AI product discovery workspace</span>
          <span>独立产品项目 · 2026</span>
        </div>
      </footer>
    </main>
  );
}




