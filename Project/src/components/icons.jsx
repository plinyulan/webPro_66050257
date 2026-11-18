import { Beef, CircleDot, CupSoda, Fish, Leaf, Soup, Utensils } from 'lucide-react';

// ไอคอนประจำหมวดหมู่ (ใช้แทนรูปอาหาร)
export const CATEGORY_ICON = {
  meat: Beef,
  seafood: Fish,
  balls: CircleDot,
  veg: Leaf,
  noodle: Soup,
  drink: CupSoda,
};

export function CategoryIcon({ categoryId, size = 18, ...props }) {
  const Icon = CATEGORY_ICON[categoryId] ?? Utensils;
  return <Icon size={size} strokeWidth={1.75} aria-hidden {...props} />;
}

// กล่องไอคอนสำหรับการ์ดเมนู โทนสีอ่อนตามหมวด
export function MenuThumb({ categoryId, size = 'md' }) {
  return (
    <span className={`thumb thumb-${size} cat-${categoryId}`} aria-hidden>
      <CategoryIcon categoryId={categoryId} size={size === 'sm' ? 16 : 26} />
    </span>
  );
}
