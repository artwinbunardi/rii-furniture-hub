import type { Section, Theme } from "@/lib/site/types";
import type { SiteData, SectionProps } from "./types";
import * as M from "./sections/marketing";
import * as P from "./sections/products";
import * as C from "./sections/catalog";
import * as R from "./sections/reservation-sections";

export const COMPONENTS: Record<string, (p: SectionProps) => React.ReactNode> = {
  announcement: M.Announcement,
  hero: M.Hero,
  slider: M.ImageSlider,
  "promo-banner": M.PromoBanner,
  "text-image": M.TextImage,
  gallery: M.Gallery,
  stats: M.Stats,
  testimonials: M.Testimonials,
  faq: M.Faq,
  contact: M.Contact,
  "reservation-cta": M.ReservationCta,
  video: M.Video,
  "custom-content": M.CustomContent,
  "featured-products": P.FeaturedProducts,
  "category-grid": P.CategoryGrid,
  "collection-showcase": P.CollectionShowcase,
  "product-carousel": P.ProductCarousel,
  "search-availability": P.SearchAvailability,
  catalog: C.CatalogSection,
  "product-detail": C.ProductDetailSection,
  "collections-list": C.CollectionsListSection,
  "collection-detail": C.CollectionDetailSection,
  cart: R.CartSection,
  "my-reservations": R.MyReservationsSection,
  "reservation-detail": R.ReservationDetailSection,
  account: R.AccountSection,
  "login-form": R.LoginSection,
};

export function sectionWrapperStyle(s: Section): React.CSSProperties {
  const st = s.style ?? {};
  return {
    background: st.bg || undefined,
    color: st.text || undefined,
    paddingTop: st.paddingTop != null ? st.paddingTop : undefined,
    paddingBottom: st.paddingBottom != null ? st.paddingBottom : undefined,
    paddingLeft: st.paddingX != null ? st.paddingX : undefined,
    paddingRight: st.paddingX != null ? st.paddingX : undefined,
    marginTop: st.marginTop != null ? st.marginTop : undefined,
    marginBottom: st.marginBottom != null ? st.marginBottom : undefined,
    textAlign: st.align || undefined,
    borderRadius: st.radius != null ? st.radius : undefined,
    overflow: st.radius ? "hidden" : undefined,
  };
}

export function sectionWrapperClass(s: Section) {
  return [s.style?.hideMobile ? "s-hide-mobile" : "", s.style?.hideDesktop ? "s-hide-desktop" : ""].join(" ");
}

export function RenderSection({ section, theme, data }: { section: Section; theme: Theme; data: SiteData }) {
  const Comp = COMPONENTS[section.type];
  if (!Comp) return null;
  return (
    <section data-section-type={section.type} className={sectionWrapperClass(section)} style={sectionWrapperStyle(section)}>
      <Comp section={section} theme={theme} data={data} />
    </section>
  );
}

export function RenderSections({ sections, theme, data }: { sections: Section[]; theme: Theme; data: SiteData }) {
  return <>{sections.filter((s) => !s.hidden).map((s) => <RenderSection key={s.id} section={s} theme={theme} data={data} />)}</>;
}
