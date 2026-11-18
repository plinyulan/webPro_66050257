// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '../src/context/CartContext.jsx';
import CartPanel from '../src/components/CartPanel.jsx';
import MenuForm from '../src/components/MenuForm.jsx';
import OrderCard from '../src/components/OrderCard.jsx';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const pork = { id: 1, name: 'หมูสไลซ์', price: 79, categoryId: 'meat' };

function AddButton() {
  const { dispatch } = useCart();
  return <button onClick={() => dispatch({ type: 'ADD', item: pork })}>add-pork</button>;
}

const renderCart = (onCheckout = vi.fn()) =>
  render(
    <CartProvider tableId="A05">
      <AddButton />
      <CartPanel tableId="A05" onCheckout={onCheckout} />
    </CartProvider>,
  );

describe('CartPanel', () => {
  it('ตะกร้าว่าง → แสดงข้อความ', () => {
    renderCart();
    expect(screen.getByText(/ยังไม่มีรายการ/)).toBeTruthy();
  });

  it('เพิ่มสินค้า ปรับจำนวน และคำนวณยอดรวม', () => {
    renderCart();
    fireEvent.click(screen.getByText('add-pork'));
    fireEvent.click(screen.getByLabelText('เพิ่มจำนวน'));
    expect(screen.getByText('รวม 2 รายการ')).toBeTruthy();
    expect(screen.getAllByText('฿158').length).toBeGreaterThan(0);
  });

  it('ลบรายการออกจากตะกร้า', () => {
    renderCart();
    fireEvent.click(screen.getByText('add-pork'));
    fireEvent.click(screen.getByLabelText('ลบ หมูสไลซ์'));
    expect(screen.getByText(/ยังไม่มีรายการ/)).toBeTruthy();
  });

  it('ยืนยัน 2 ขั้นตอน แล้วส่งหมายเหตุให้ onCheckout', async () => {
    const onCheckout = vi.fn().mockResolvedValue();
    renderCart(onCheckout);
    fireEvent.click(screen.getByText('add-pork'));
    fireEvent.change(screen.getByPlaceholderText(/ไม่ใส่ผักชี/), { target: { value: 'เผ็ดน้อย' } });
    fireEvent.click(screen.getByText('สั่งอาหาร'));
    expect(onCheckout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('ยืนยันการสั่งอาหาร'));
    await waitFor(() => expect(onCheckout).toHaveBeenCalledWith('เผ็ดน้อย'));
  });

  it('สั่งไม่สำเร็จ → แสดง error จากเซิร์ฟเวอร์', async () => {
    renderCart(vi.fn().mockRejectedValue(new Error('เมนูนี้หมดแล้ว')));
    fireEvent.click(screen.getByText('add-pork'));
    fireEvent.click(screen.getByText('สั่งอาหาร'));
    fireEvent.click(screen.getByText('ยืนยันการสั่งอาหาร'));
    expect(await screen.findByText('เมนูนี้หมดแล้ว')).toBeTruthy();
  });

  it('ตะกร้าถูกเก็บไว้ใน localStorage แยกตามโต๊ะ', () => {
    renderCart();
    fireEvent.click(screen.getByText('add-pork'));
    expect(JSON.parse(localStorage.getItem('suki-cart-A05'))[0]).toMatchObject({ menuId: 1, qty: 1 });
  });
});

describe('MenuForm', () => {
  const categories = [{ id: 'meat', name: 'เนื้อสัตว์' }];

  it('ข้อมูลไม่ครบ → แสดง error และไม่เรียก onSubmit', () => {
    const onSubmit = vi.fn();
    render(<MenuForm categories={categories} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('เพิ่มเมนู'));
    expect(screen.getByText('กรุณากรอกชื่อเมนู')).toBeTruthy();
    expect(screen.getByText('กรุณาเลือกหมวดหมู่')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('โหมดแก้ไข → กรอกค่าเดิมไว้ และส่งค่าที่แปลงแล้ว', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <MenuForm
        initial={{ id: 1, name: 'หมู', price: 79, categoryId: 'meat', description: '', available: true }}
        categories={categories}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByDisplayValue('79'), { target: { value: '89' } });
    fireEvent.click(screen.getByText('บันทึกการแก้ไข'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'หมู', price: 89 })));
  });
});

describe('OrderCard', () => {
  const order = {
    id: 7, tableId: 'A05', status: 'pending', total: 79, note: 'ไม่ใส่ผัก',
    createdAt: new Date().toISOString(), items: [{ menuId: 1, name: 'หมูสไลซ์', price: 79, qty: 1 }],
  };

  it('ฝั่งพนักงาน: ปุ่มเลื่อนไปสถานะถัดไป', () => {
    const onChange = vi.fn();
    render(<OrderCard order={order} mode="staff" onChangeStatus={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /กำลังเตรียมอาหาร/ }));
    expect(onChange).toHaveBeenCalledWith(order, 'preparing');
    expect(screen.getByText('โต๊ะ A05')).toBeTruthy();
  });

  it('ฝั่งลูกค้า: ไม่มีปุ่มเปลี่ยนสถานะ แต่ยกเลิกได้ตอน pending', () => {
    const onCancel = vi.fn();
    render(<OrderCard order={order} onCancel={onCancel} />);
    expect(screen.queryByRole('button', { name: /กำลังเตรียมอาหาร/ })).toBeNull();
    fireEvent.click(screen.getByText('ยกเลิก'));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByText(/ไม่ใส่ผัก/)).toBeTruthy();
  });
});
