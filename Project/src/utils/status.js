// สถานะออร์เดอร์: รอรับออร์เดอร์ → กำลังเตรียมอาหาร → เสิร์ฟแล้ว (หรือยกเลิก)
export const ORDER_STATUS = {
  pending: { label: 'รอรับออร์เดอร์' },
  preparing: { label: 'กำลังเตรียมอาหาร' },
  served: { label: 'เสิร์ฟแล้ว' },
  cancelled: { label: 'ยกเลิก' },
};

export const STATUS_FLOW = ['pending', 'preparing', 'served'];

export function nextStatus(status) {
  const i = STATUS_FLOW.indexOf(status);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

export const isActive = (status) => status === 'pending' || status === 'preparing';

// พนักงานเปลี่ยนสถานะได้เฉพาะขั้นถัดไป หรือยกเลิกออร์เดอร์ที่ยังไม่เสิร์ฟ
export const canTransition = (from, to) => nextStatus(from) === to || (isActive(from) && to === 'cancelled');
