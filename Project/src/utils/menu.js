// ค้นหา / กรอง / เรียงเมนู (ฟังก์ชันบริสุทธิ์ ทดสอบได้ง่าย)
export function filterMenu(menu, { search = '', category = 'all', onlyAvailable = false, sort = 'default' } = {}) {
  const keyword = search.trim().toLowerCase();
  const result = menu.filter(
    (item) =>
      (category === 'all' || item.categoryId === category) &&
      (!onlyAvailable || item.available) &&
      (!keyword ||
        item.name.toLowerCase().includes(keyword) ||
        (item.description || '').toLowerCase().includes(keyword)),
  );
  if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
  return result;
}

// ตรวจข้อมูลฟอร์มเมนู คืน object ของ error (ว่าง = ผ่าน)
export function validateMenuItem({ name, price, categoryId }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'กรุณากรอกชื่อเมนู';
  else if (name.trim().length > 40) errors.name = 'ชื่อเมนูยาวเกิน 40 ตัวอักษร';
  const p = Number(price);
  if (price === '' || Number.isNaN(p)) errors.price = 'กรุณากรอกราคาเป็นตัวเลข';
  else if (p <= 0 || p > 10000) errors.price = 'ราคาต้องอยู่ระหว่าง 1 – 10,000 บาท';
  if (!categoryId) errors.categoryId = 'กรุณาเลือกหมวดหมู่';
  return errors;
}

export const TABLE_ID_PATTERN = /^[A-Z]\d{2}$/;
