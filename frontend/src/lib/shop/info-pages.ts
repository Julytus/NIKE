/**
 * 15 trang thông tin tĩnh `/thong-tin/$trang` cho link ở dải trên / footer (plan giao-dien-nike §6.5).
 * `title` = đúng chữ của link trỏ tới trang (h1).
 */
export interface InfoPageContent {
  title: string;
  paragraphs: string[];
  /** Link tới trang thông tin khác (slug) */
  links?: string[];
}

const PENDING = ["Nội dung đang được cập nhật."];

export const INFO_PAGES = {
  "tim-cua-hang": { title: "Tìm cửa hàng", paragraphs: PENDING },
  "thanh-vien": { title: "Trở thành thành viên", paragraphs: PENDING },
  "gop-y": { title: "Gửi góp ý", paragraphs: PENDING },
  "tro-giup": {
    title: "Trợ giúp",
    paragraphs: ["Chọn chủ đề bạn cần hỗ trợ:"],
    links: ["giao-hang", "doi-tra", "phuong-thuc-thanh-toan", "lien-he"]
  },
  "tra-cuu-don-hang": { title: "Tra cứu đơn hàng", paragraphs: PENDING },
  "giao-hang": {
    title: "Giao hàng",
    paragraphs: [
      "Phí giao hàng 30.000 ₫ cho mỗi đơn. Miễn phí giao hàng cho đơn có tạm tính từ 5.000.000 ₫.",
      "Đơn hàng được giao trong 3–5 ngày làm việc."
    ]
  },
  "doi-tra": {
    title: "Đổi trả",
    paragraphs: ["Đổi trả miễn phí trong 30 ngày kể từ khi nhận hàng, sản phẩm chưa qua sử dụng."]
  },
  "phuong-thuc-thanh-toan": {
    title: "Phương thức thanh toán",
    paragraphs: ["Thanh toán khi nhận hàng (COD)", "Chuyển khoản qua payOS"]
  },
  "lien-he": { title: "Liên hệ", paragraphs: ["Email: hotro@downbeat.local"] },
  "ve-nike": {
    title: "Về Nike",
    paragraphs: [
      "Đây là dự án học tập mô phỏng nike.com/vn, chỉ chạy local, không kinh doanh. Tên, logo, hình ảnh và mô tả sản phẩm thuộc về Nike, Inc."
    ]
  },
  "tin-tuc": { title: "Tin tức", paragraphs: PENDING },
  "tuyen-dung": { title: "Tuyển dụng", paragraphs: PENDING },
  "dieu-khoan-ban-hang": { title: "Điều khoản bán hàng", paragraphs: PENDING },
  "dieu-khoan-su-dung": { title: "Điều khoản sử dụng", paragraphs: PENDING },
  "chinh-sach-bao-mat": { title: "Chính sách bảo mật", paragraphs: PENDING }
} satisfies Record<string, InfoPageContent>;

export type InfoSlug = keyof typeof INFO_PAGES;

export const isInfoSlug = (slug: string): slug is InfoSlug => Object.hasOwn(INFO_PAGES, slug);

/** Nhóm link footer (§6.5). */
export const FOOTER_GROUPS: { title: string; links: InfoSlug[] }[] = [
  { title: "Tài nguyên", links: ["tim-cua-hang", "thanh-vien", "gop-y"] },
  {
    title: "Trợ giúp",
    links: ["tro-giup", "tra-cuu-don-hang", "giao-hang", "doi-tra", "phuong-thuc-thanh-toan", "lien-he"]
  },
  { title: "Công ty", links: ["ve-nike", "tin-tuc", "tuyen-dung"] }
];

export const LEGAL_LINKS: InfoSlug[] = ["dieu-khoan-ban-hang", "dieu-khoan-su-dung", "chinh-sach-bao-mat"];
