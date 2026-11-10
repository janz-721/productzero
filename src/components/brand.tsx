import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="ProductZero 首页">
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[3px] bg-[#e75432] text-[13px] font-black tracking-[-0.03em] text-white transition-transform duration-300 group-hover:-rotate-3">
        P0
        <span className="absolute -right-2 -top-2 size-5 rounded-full border border-white/25" />
      </span>
      {!compact && (
        <span className="text-[15px] font-bold tracking-[-0.035em] text-[#181712]">
          Product<span className="text-[#e75432]">Zero</span>
        </span>
      )}
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.09] bg-[#f3efe5]/95">
      <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between px-5 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-[#625e54] md:flex">
          <Link href="/new" className="accent-link transition-colors hover:text-[#181712]">开始推演</Link>
          <Link href="/prototype" className="accent-link transition-colors hover:text-[#181712]">原型实验</Link>
          <a href="#method" className="accent-link transition-colors hover:text-[#181712]">方法</a>
          <a href="#principles" className="accent-link transition-colors hover:text-[#181712]">设计原则</a>
        </nav>
        <Link
          href="/new"
          className="inline-flex h-10 items-center gap-2 rounded-[2px] bg-[#181712] px-5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#e75432]"
        >
          开始一次推演
          <ArrowIcon />
        </Link>
      </div>
    </header>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SparkIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2.75c.42 4.92 3.33 7.83 8.25 8.25-4.92.42-7.83 3.33-8.25 8.25C11.58 14.33 8.67 11.42 3.75 11 8.67 10.58 11.58 7.67 12 2.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M19 2v3M17.5 3.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
