import type { SectionProps } from "../types";
import { Editable } from "../editable";
import { SLink } from "../link";
import { Slider, ContactForm } from "./client-bits";
import { fmtNum } from "@/lib/utils";

const IMG = (p: Record<string, any>, k: string, d: string) => (p[k] as string) || d;

function Cta({ s, p, ghost }: { s: SectionProps["section"]; p: Record<string, any>; ghost?: boolean }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3" style={{ justifyContent: "inherit" }}>
      {p.ctaLabel && <SLink href={p.ctaHref || "/products"} className={`s-btn ${ghost ? "s-btn-ghost" : ""}`}><Editable sectionId={s.id} field="ctaLabel" value={p.ctaLabel} /></SLink>}
      {p.secondaryLabel && <SLink href={p.secondaryHref || "/collections"} className="s-btn s-btn-ghost"><Editable sectionId={s.id} field="secondaryLabel" value={p.secondaryLabel} /></SLink>}
    </div>
  );
}

function headingSize(s: SectionProps["section"], dflt: string) {
  return s.style.fontSize ? { fontSize: `${s.style.fontSize}px` } : undefined;
}

export function Hero({ section: s }: SectionProps) {
  const p = s.props;
  const h = (cls: string) => <Editable as="h1" sectionId={s.id} field="heading" value={p.heading} className={`s-heading ${cls}`} style={{ ...headingSize(s, ""), fontWeight: s.style.fontWeight }} />;
  const eyebrow = p.eyebrow && <Editable as="p" sectionId={s.id} field="eyebrow" value={p.eyebrow} className="s-eyebrow mb-4" />;
  const sub = <Editable as="p" sectionId={s.id} field="subheading" value={p.subheading} className="s-muted mt-5 max-w-xl text-[17px] leading-relaxed" />;
  const img = IMG(p, "image", "/media/demo/banner-lounge.svg");
  switch (s.variant) {
    case "fullbleed":
      return (
        <div className="relative flex min-h-[78vh] items-end overflow-hidden" style={{ color: "#fff" }}>
          <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          <div className="s-container relative w-full pb-16 pt-40">
            {eyebrow && <div style={{ color: "rgba(255,255,255,.8)" }}>{eyebrow}</div>}
            {h("max-w-4xl text-[44px] md:text-[76px]")}
            <Editable as="p" sectionId={s.id} field="subheading" value={p.subheading} className="mt-5 max-w-xl text-[17px] opacity-85" />
            <Cta s={s} p={p} />
          </div>
        </div>
      );
    case "centered":
      return (
        <div className="s-section s-container text-center">
          {eyebrow}
          {h("mx-auto max-w-4xl text-[42px] md:text-[72px]")}
          <div className="mx-auto max-w-xl">{sub}</div>
          <div className="flex justify-center"><Cta s={s} p={p} /></div>
          {p.image && <img src={img} alt="" className="s-rounded mx-auto mt-14 aspect-[21/9] w-full object-cover" />}
        </div>
      );
    case "editorial":
      return (
        <div className="s-section s-container">
          <div className="grid items-end gap-10 md:grid-cols-12">
            <div className="md:col-span-8">{eyebrow}{h("text-[48px] leading-[0.95] md:text-[110px]")}</div>
            <div className="md:col-span-4">
              <img src={img} alt="" className="s-rounded aspect-[4/5] w-full object-cover" />
            </div>
          </div>
          <div className="mt-10 grid gap-6 border-t pt-6 md:grid-cols-12" style={{ borderColor: "var(--c-border)" }}>
            <div className="md:col-span-6">{sub}</div>
            <div className="md:col-span-6 md:flex md:justify-end"><Cta s={s} p={p} /></div>
          </div>
        </div>
      );
    case "collage":
      return (
        <div className="s-section s-container grid items-center gap-12 md:grid-cols-2">
          <div>{eyebrow}{h("text-[40px] md:text-[60px]")}{sub}<Cta s={s} p={p} /></div>
          <div className="grid grid-cols-2 gap-4">
            <img src={img} alt="" className="s-rounded col-span-2 aspect-[16/9] w-full object-cover" />
            <img src={IMG(p, "image2", "/media/demo/banner-natural.svg")} alt="" className="s-rounded aspect-square w-full object-cover" />
            <img src={IMG(p, "image3", "/media/demo/banner-wedding.svg")} alt="" className="s-rounded aspect-square w-full object-cover" />
          </div>
        </div>
      );
    case "boxed":
      return (
        <div className="s-container py-8">
          <div className="relative overflow-hidden s-rounded">
            <img src={img} alt="" className="h-[560px] w-full object-cover md:h-[640px]" />
            <div className="absolute bottom-6 left-6 right-6 max-w-lg p-8 md:bottom-10 md:left-10 s-rounded" style={{ background: "var(--c-bg)", color: "var(--c-text)" }}>
              {eyebrow}{h("text-[32px] md:text-[44px]")}{sub}<Cta s={s} p={p} />
            </div>
          </div>
        </div>
      );
    case "minimal":
      return (
        <div className="s-container pb-12 pt-20 md:pt-28">
          {eyebrow}
          {h("max-w-5xl text-[38px] md:text-[64px]")}
          <div className="mt-10 flex flex-col justify-between gap-6 border-t pt-6 md:flex-row" style={{ borderColor: "var(--c-border)" }}>
            {sub}
            <Cta s={s} p={p} />
          </div>
        </div>
      );
    case "split-reverse":
    case "split":
    default:
      return (
        <div className={`s-section s-container grid items-center gap-12 md:grid-cols-2`}>
          <div className={s.variant === "split-reverse" ? "md:order-2" : ""}>{eyebrow}{h("text-[40px] md:text-[62px]")}{sub}<Cta s={s} p={p} /></div>
          <img src={img} alt="" className="s-rounded aspect-[4/3] w-full object-cover" />
        </div>
      );
  }
}

export function Announcement({ section: s }: SectionProps) {
  return (
    <div className="px-4 py-2.5 text-center text-[13px]" style={{ background: s.style.bg || "var(--c-primary)", color: s.style.text || "var(--c-on-primary)" }}>
      <Editable sectionId={s.id} field="text" value={s.props.text} />
      {s.props.linkLabel && <SLink href={s.props.linkHref || "/products"} className="ml-2 underline underline-offset-2">{s.props.linkLabel}</SLink>}
    </div>
  );
}

export function ImageSlider({ section: s }: SectionProps) {
  const slides = (s.props.slides as { image: string; heading: string; text?: string; href?: string }[]) ?? [];
  return <Slider slides={slides} variant={s.variant} autoplay={s.props.autoplay !== false} />;
}

export function PromoBanner({ section: s }: SectionProps) {
  const p = s.props;
  if (s.variant === "image") {
    return (
      <div className="s-container py-6">
        <div className="relative overflow-hidden s-rounded" style={{ color: "#fff" }}>
          <img src={IMG(p, "image", "/media/demo/banner-exhibition.svg")} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative px-8 py-20 text-center md:py-28">
            <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading mx-auto max-w-3xl text-[34px] md:text-[52px]" />
            <Editable as="p" sectionId={s.id} field="text" value={p.text} className="mx-auto mt-4 max-w-xl opacity-85" />
            <div className="flex justify-center"><Cta s={s} p={p} /></div>
          </div>
        </div>
      </div>
    );
  }
  if (s.variant === "strip") {
    return (
      <div className="s-container py-6">
        <div className="flex flex-col items-start justify-between gap-6 border-y py-8 md:flex-row md:items-center" style={{ borderColor: "var(--c-text)" }}>
          <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[28px] md:text-[36px]" />
          <div className="flex items-center gap-6"><Editable as="p" sectionId={s.id} field="text" value={p.text} className="s-muted hidden max-w-sm md:block" />{p.ctaLabel && <SLink href={p.ctaHref || "/products"} className="s-btn">{p.ctaLabel}</SLink>}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="s-container py-6">
      <div className="grid items-center gap-8 px-8 py-14 md:grid-cols-[1.4fr_1fr] md:px-14 s-rounded" style={{ background: s.style.bg || "var(--c-primary)", color: s.style.text || "var(--c-on-primary)" }}>
        <div>
          <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[30px] md:text-[44px]" />
          <Editable as="p" sectionId={s.id} field="text" value={p.text} className="mt-3 max-w-lg opacity-80" />
        </div>
        <div className="md:text-right">{p.ctaLabel && <SLink href={p.ctaHref || "/products"} className="s-btn s-btn-ghost">{p.ctaLabel}</SLink>}</div>
      </div>
    </div>
  );
}

export function TextImage({ section: s }: SectionProps) {
  const p = s.props;
  const text = (
    <div>
      {p.eyebrow && <Editable as="p" sectionId={s.id} field="eyebrow" value={p.eyebrow} className="s-eyebrow mb-3" />}
      <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[32px] md:text-[44px]" style={headingSize(s, "")} />
      <Editable as="p" sectionId={s.id} field="body" value={p.body} className="s-muted mt-5 whitespace-pre-line text-[16px] leading-relaxed" />
      {p.ctaLabel && <div className="mt-7"><SLink href={p.ctaHref || "/about"} className="s-btn s-btn-ghost">{p.ctaLabel}</SLink></div>}
    </div>
  );
  const img = <img src={IMG(p, "image", "/media/demo/banner-natural.svg")} alt="" className="s-rounded aspect-[4/3] w-full object-cover" />;
  if (s.variant === "overlap") {
    return (
      <div className="s-section s-container">
        <div className="relative grid md:grid-cols-12">
          <div className="md:col-span-8">{img}</div>
          <div className="relative -mt-16 ml-6 p-8 md:col-span-5 md:col-start-8 md:-ml-10 md:mt-24 md:self-start s-rounded" style={{ background: "var(--c-surface)" }}>{text}</div>
        </div>
      </div>
    );
  }
  if (s.variant === "stacked") {
    return <div className="s-section s-container max-w-4xl"><div className="mb-10">{text}</div>{img}</div>;
  }
  return (
    <div className="s-section s-container grid items-center gap-12 md:grid-cols-2">
      <div className={s.variant === "image-right" ? "" : "md:order-2"}>{text}</div>
      {img}
    </div>
  );
}

export function Gallery({ section: s }: SectionProps) {
  const imgs = ((s.props.images as string[]) ?? []).filter(Boolean);
  const title = s.props.heading && <Editable as="h2" sectionId={s.id} field="heading" value={s.props.heading} className="s-heading mb-8 text-[30px] md:text-[40px]" />;
  if (s.variant === "strip")
    return (
      <div className="s-section">
        <div className="s-container">{title}</div>
        <div className="flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:px-8">{imgs.map((src, i) => <img key={i} src={src} alt="" className="s-rounded h-[340px] w-auto shrink-0 snap-start object-cover" />)}</div>
      </div>
    );
  if (s.variant === "masonry")
    return <div className="s-section s-container">{title}<div className="columns-2 gap-4 md:columns-3 [&>img]:mb-4">{imgs.map((src, i) => <img key={i} src={src} alt="" className={`s-rounded w-full object-cover ${i % 3 === 0 ? "aspect-[3/4]" : "aspect-[4/3]"}`} />)}</div></div>;
  return <div className="s-section s-container">{title}<div className="grid grid-cols-2 gap-4 md:grid-cols-4">{imgs.map((src, i) => <img key={i} src={src} alt="" className={`s-rounded aspect-square w-full object-cover ${i === 0 ? "md:col-span-2 md:row-span-2 md:aspect-auto md:h-full" : ""}`} />)}</div></div>;
}

export function Stats({ section: s, data }: SectionProps) {
  const live: Record<string, number> = {
    skus: data.products.length,
    units: data.products.reduce((a, p) => a + p.owned, 0),
    available: data.products.reduce((a, p) => a + p.available, 0),
    categories: data.categories.filter((c) => !c.parent_id).length,
    collections: data.collections.length,
  };
  const items = (s.props.items as { label: string; source?: string; value?: string }[]) ?? [];
  const val = (it: { source?: string; value?: string }) => (it.source && it.source !== "custom" ? fmtNum(live[it.source] ?? 0) : it.value ?? "");
  return (
    <div className="s-section s-container">
      {s.props.heading && <Editable as="h2" sectionId={s.id} field="heading" value={s.props.heading} className="s-heading mb-10 text-[30px] md:text-[40px]" />}
      <div className={`grid grid-cols-2 gap-6 ${items.length >= 4 ? "md:grid-cols-4" : items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} ${s.variant === "dividers" ? "divide-x" : ""}`} style={{ borderColor: "var(--c-border)" }}>
        {items.map((it, i) => (
          <div key={i} className={s.variant === "cards" ? "p-6 s-rounded" : "px-2"} style={s.variant === "cards" ? { background: "var(--c-surface)" } : undefined}>
            <p className="s-heading text-[44px] md:text-[56px]" style={{ color: "var(--c-accent)" }}>{val(it)}</p>
            <p className="s-muted mt-1 text-[14px]">{it.label}</p>
          </div>
        ))}
      </div>
      {s.props.note && <p className="s-muted mt-6 text-[12px]">{s.props.note}</p>}
    </div>
  );
}

export function Testimonials({ section: s }: SectionProps) {
  const items = (s.props.items as { quote: string; name: string; role?: string }[]) ?? [];
  if (s.variant === "large") {
    const it = items[0];
    return (
      <div className="s-section s-container max-w-4xl text-center">
        <p className="s-heading text-[28px] leading-snug md:text-[40px]">“{it?.quote}”</p>
        <p className="mt-6 font-medium">{it?.name}</p><p className="s-muted text-[14px]">{it?.role}</p>
      </div>
    );
  }
  return (
    <div className="s-section s-container">
      {s.props.heading && <Editable as="h2" sectionId={s.id} field="heading" value={s.props.heading} className="s-heading mb-10 text-[30px] md:text-[40px]" />}
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((it, i) => (
          <figure key={i} className="flex flex-col justify-between p-7 s-rounded" style={{ background: "var(--c-surface)" }}>
            <blockquote className="text-[16px] leading-relaxed">“{it.quote}”</blockquote>
            <figcaption className="mt-6"><p className="font-medium">{it.name}</p><p className="s-muted text-[13px]">{it.role}</p></figcaption>
          </figure>
        ))}
      </div>
      {s.props.note && <p className="s-muted mt-6 text-[12px]">{s.props.note}</p>}
    </div>
  );
}

export function Faq({ section: s }: SectionProps) {
  const items = (s.props.items as { q: string; a: string }[]) ?? [];
  const list = (
    <div className="divide-y border-y" style={{ borderColor: "var(--c-border)" }}>
      {items.map((it, i) => (
        <details key={i} className="group py-5" style={{ borderColor: "var(--c-border)" }}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">{it.q}<span className="text-xl transition group-open:rotate-45">+</span></summary>
          <p className="s-muted mt-3 whitespace-pre-line leading-relaxed">{it.a}</p>
        </details>
      ))}
    </div>
  );
  const title = <Editable as="h2" sectionId={s.id} field="heading" value={s.props.heading} className="s-heading text-[30px] md:text-[40px]" />;
  if (s.variant === "two-column")
    return <div className="s-section s-container grid gap-10 md:grid-cols-[1fr_1.6fr]"><div>{title}<Editable as="p" sectionId={s.id} field="subheading" value={s.props.subheading} className="s-muted mt-4" /></div>{list}</div>;
  return <div className="s-section s-container max-w-3xl"><div className="mb-8 text-center">{title}</div>{list}</div>;
}

export function Contact({ section: s, data }: SectionProps) {
  const p = s.props;
  const info = (
    <div className="space-y-5">
      <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[32px] md:text-[44px]" />
      <Editable as="p" sectionId={s.id} field="text" value={p.text} className="s-muted max-w-md" />
      <div className="space-y-1.5 text-[15px]"><p>{p.address}</p><p>{p.email}</p><p>{p.phone}</p><p className="s-muted text-[13px]">{p.hours}</p></div>
    </div>
  );
  return (
    <div className={`s-section s-container grid gap-12 ${s.variant === "stacked" ? "max-w-3xl" : "md:grid-cols-2"}`}>
      {info}
      <div className="p-6 md:p-8 s-rounded" style={{ background: "var(--c-surface)" }}>
        <ContactForm lang={data.lang} disabled={data.editor} defaultName={data.user?.name} />
      </div>
    </div>
  );
}

export function ReservationCta({ section: s }: SectionProps) {
  const p = s.props;
  if (s.variant === "card")
    return (
      <div className="s-container py-10">
        <div className="mx-auto max-w-3xl border p-10 text-center s-rounded" style={{ borderColor: "var(--c-border)" }}>
          <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[28px] md:text-[38px]" />
          <Editable as="p" sectionId={s.id} field="text" value={p.text} className="s-muted mx-auto mt-3 max-w-lg" />
          <div className="flex justify-center"><Cta s={s} p={p} /></div>
        </div>
      </div>
    );
  if (s.variant === "minimal")
    return (
      <div className="s-container flex flex-col items-center justify-between gap-6 py-12 md:flex-row">
        <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[26px] md:text-[32px]" />
        {p.ctaLabel && <SLink href={p.ctaHref || "/products"} className="s-btn">{p.ctaLabel}</SLink>}
      </div>
    );
  return (
    <div style={{ background: s.style.bg || "var(--c-secondary)" }}>
      <div className="s-section s-container text-center">
        <Editable as="p" sectionId={s.id} field="eyebrow" value={p.eyebrow} className="s-eyebrow mb-3" />
        <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading mx-auto max-w-3xl text-[32px] md:text-[48px]" />
        <Editable as="p" sectionId={s.id} field="text" value={p.text} className="s-muted mx-auto mt-4 max-w-xl" />
        <div className="flex justify-center"><Cta s={s} p={p} /></div>
      </div>
    </div>
  );
}

function embedUrl(url: string) {
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = /vimeo\.com\/(\d+)/.exec(url);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function Video({ section: s }: SectionProps) {
  const p = s.props;
  const url = (p.url as string) || "";
  const emb = embedUrl(url);
  const media = emb ? (
    <iframe src={emb} title={p.heading || "Video"} className="aspect-video w-full s-rounded" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
  ) : url ? (
    <video src={url} controls className="aspect-video w-full s-rounded bg-black" />
  ) : (
    <div className="flex aspect-video w-full items-center justify-center s-rounded s-muted" style={{ background: "var(--c-surface)" }}>Video URL</div>
  );
  if (s.variant === "with-text")
    return (
      <div className="s-section s-container grid items-center gap-10 md:grid-cols-[1fr_1.5fr]">
        <div><Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[30px] md:text-[40px]" /><Editable as="p" sectionId={s.id} field="text" value={p.text} className="s-muted mt-4" /></div>
        {media}
      </div>
    );
  return <div className="s-section s-container">{p.heading && <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading mb-8 text-center text-[30px] md:text-[40px]" />}{media}</div>;
}

export function CustomContent({ section: s }: SectionProps) {
  const p = s.props;
  const cols = s.variant === "two-column";
  return (
    <div className={`s-section s-container ${cols ? "" : "max-w-3xl"}`}>
      {p.heading && <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading mb-6 text-[30px] md:text-[40px]" style={headingSize(s, "")} />}
      <div className={cols ? "grid gap-10 md:grid-cols-2" : ""}>
        <Editable as="div" sectionId={s.id} field="body" value={p.body} className="whitespace-pre-line text-[16px] leading-[1.75]" />
        {cols && <Editable as="div" sectionId={s.id} field="body2" value={p.body2} className="s-muted whitespace-pre-line text-[16px] leading-[1.75]" />}
      </div>
    </div>
  );
}
