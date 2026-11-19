/**
 * 15 trang thông tin tĩnh `/info/$page` cho link ở dải trên / footer (plan tieng-anh-cua-hang §6.5).
 * `title` = đúng chữ của link trỏ tới trang (h1).
 */
export interface InfoPageContent {
  title: string;
  paragraphs: string[];
  /** Link tới trang thông tin khác (slug) */
  links?: string[];
}

const PENDING = ["Content coming soon."];

export const INFO_PAGES = {
  "find-a-store": { title: "Find a Store", paragraphs: PENDING },
  membership: { title: "Become a Member", paragraphs: PENDING },
  feedback: { title: "Send Us Feedback", paragraphs: PENDING },
  help: {
    title: "Get Help",
    paragraphs: ["Choose a topic you need help with:"],
    links: ["delivery", "returns", "payment-options", "contact-us"]
  },
  "order-status": { title: "Order Status", paragraphs: PENDING },
  delivery: {
    title: "Delivery",
    paragraphs: [
      "Delivery costs 30.000 ₫ per order. Orders with a subtotal of 5.000.000 ₫ or more ship free.",
      "Orders arrive within 3–5 business days."
    ]
  },
  returns: {
    title: "Returns",
    paragraphs: ["Free returns within 30 days of delivery for unworn items."]
  },
  "payment-options": {
    title: "Payment Options",
    paragraphs: ["Cash on Delivery (COD)", "Bank transfer via payOS"]
  },
  "contact-us": { title: "Contact Us", paragraphs: ["Email: support@nike.local"] },
  "about-nike": {
    title: "About Nike",
    paragraphs: [
      "This is a student project replicating nike.com/vn. It runs locally only and does not sell anything. Nike names, logos, images and product descriptions belong to Nike, Inc."
    ]
  },
  news: { title: "News", paragraphs: PENDING },
  careers: { title: "Careers", paragraphs: PENDING },
  "terms-of-sale": { title: "Terms of Sale", paragraphs: PENDING },
  "terms-of-use": { title: "Terms of Use", paragraphs: PENDING },
  "privacy-policy": { title: "Privacy Policy", paragraphs: PENDING }
} satisfies Record<string, InfoPageContent>;

export type InfoSlug = keyof typeof INFO_PAGES;

export const isInfoSlug = (slug: string): slug is InfoSlug => Object.hasOwn(INFO_PAGES, slug);

/** Nhóm link footer (§6.5). */
export const FOOTER_GROUPS: { title: string; links: InfoSlug[] }[] = [
  { title: "Resources", links: ["find-a-store", "membership", "feedback"] },
  {
    title: "Help",
    links: ["help", "order-status", "delivery", "returns", "payment-options", "contact-us"]
  },
  { title: "Company", links: ["about-nike", "news", "careers"] }
];

export const LEGAL_LINKS: InfoSlug[] = ["terms-of-sale", "terms-of-use", "privacy-policy"];
