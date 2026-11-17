import type { OrderReceiptItemWithComposition } from '@/lib/orders/orderReceipt';

export type OrderReceiptPdf = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_type: string;
  delivery_address: string | null;
  delivery_zip_code: string | null;
  delivery_zone_name: string | null;
  delivery_estimate_days: number | null;
  payment_method: string | null;
  payment_provider: string;
  payment_status: string;
  subtotal_amount: number | null;
  discount_amount: number;
  promotion_code: string | null;
  shipping_fee: number;
  total_amount: number;
  items: OrderReceiptItemWithComposition[];
};

const pageWidth = 210;
const pageHeight = 297;
const margin = 16;
const contentWidth = pageWidth - margin * 2;

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function textValue(value: string | null | undefined, fallback = 'Não informado') {
  return value?.trim() || fallback;
}

export async function downloadOrderReceiptPdf(order: OrderReceiptPdf) {
  const { jsPDF } = await import('jspdf');
  const document = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = margin;

  const addPage = () => {
    document.addPage();
    y = margin;
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) addPage();
  };

  const write = (text: string, options: { size?: number; bold?: boolean; indent?: number; color?: [number, number, number] } = {}) => {
    const size = options.size || 10;
    const x = margin + (options.indent || 0);
    const width = contentWidth - (options.indent || 0);
    document.setFont('helvetica', options.bold ? 'bold' : 'normal');
    document.setFontSize(size);
    document.setTextColor(...(options.color || [35, 31, 29]));
    const lines = document.splitTextToSize(text, width) as string[];
    const lineHeight = size * 0.46;
    ensureSpace(lines.length * lineHeight + 1);
    document.text(lines, x, y);
    y += lines.length * lineHeight + 1.8;
  };

  const divider = () => {
    ensureSpace(4);
    document.setDrawColor(222, 214, 202);
    document.line(margin, y, pageWidth - margin, y);
    y += 4;
  };

  document.setFillColor(143, 29, 44);
  document.rect(0, 0, pageWidth, 10, 'F');
  y = 20;
  write('ALLVINO', { size: 18, bold: true, color: [143, 29, 44] });
  write('Extrato do pedido', { size: 13, bold: true });
  write(`Pedido #${order.id.slice(0, 8)} - ${new Date(order.created_at).toLocaleString('pt-BR')}`, { size: 9, color: [102, 96, 90] });
  divider();

  write('Cliente', { size: 11, bold: true });
  write(textValue(order.customer_name), { bold: true });
  write(`Telefone: ${textValue(order.customer_phone)}`, { size: 9, color: [102, 96, 90] });
  write(`Status: ${order.status} - Pagamento: ${order.payment_status}`, { size: 9, color: [102, 96, 90] });
  divider();

  write('Entrega e pagamento', { size: 11, bold: true });
  write(`Modalidade: ${textValue(order.delivery_type)}`, { size: 9 });
  if (order.delivery_address) write(`Endereço: ${order.delivery_address}`, { size: 9 });
  if (order.delivery_zip_code) write(`CEP: ${order.delivery_zip_code}`, { size: 9 });
  if (order.delivery_zone_name) {
    write(`Frete: ${order.delivery_zone_name}${order.delivery_estimate_days ? ` - até ${order.delivery_estimate_days} dia(s)` : ''}`, { size: 9 });
  }
  write(`Forma de pagamento: ${textValue(order.payment_method)} (${textValue(order.payment_provider)})`, { size: 9 });
  divider();

  write('Itens do pedido', { size: 11, bold: true });
  for (const item of order.items) {
    const itemName = textValue(item.product_name, 'Produto removido');
    write(`${item.quantity}x ${itemName}`, { bold: true });
    write(`${formatMoney(item.unit_price)} cada - ${formatMoney(item.quantity * item.unit_price)}`, { size: 9, color: [102, 96, 90] });
    if (item.kit_components.length > 0) {
      write('Composição do kit:', { size: 9, bold: true, indent: 5, color: [143, 29, 44] });
      for (const component of item.kit_components) {
        const total = item.quantity * component.quantity_per_kit;
        write(`- ${component.name}: ${component.quantity_per_kit} por kit (${total} no pedido)`, { size: 9, indent: 9 });
      }
    }
    y += 1;
  }
  divider();

  if (order.subtotal_amount !== null) write(`Subtotal: ${formatMoney(order.subtotal_amount)}`, { size: 10 });
  if (order.discount_amount > 0) {
    write(`Desconto${order.promotion_code ? ` (${order.promotion_code})` : ''}: -${formatMoney(order.discount_amount)}`, { size: 10, color: [25, 112, 74] });
  }
  if (order.shipping_fee > 0) write(`Frete: ${formatMoney(order.shipping_fee)}`, { size: 10 });
  write(`TOTAL: ${formatMoney(order.total_amount)}`, { size: 14, bold: true, color: [143, 29, 44] });

  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.setTextColor(116, 109, 100);
    document.text(`Allvino - extrato do pedido #${order.id.slice(0, 8)}`, margin, pageHeight - 9);
    document.text(`${page}/${pages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }

  document.save(`pedido-${order.id.slice(0, 8)}.pdf`);
}
