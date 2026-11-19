/** Mô tả nguyên văn + "Style: <mã>" (plan chi-tiet-giay §6.4 mục 10; bỏ "View Product Details", §11 câu 4). */
export function ProductDescription({ description, styleCode }: { description: string; styleCode: string }) {
  return (
    <div data-testid="pdp-description" className="flex flex-col gap-4 text-base leading-[1.75]">
      <p>{description}</p>
      <ul className="list-disc pl-6">
        <li>Style: {styleCode}</li>
      </ul>
    </div>
  );
}
