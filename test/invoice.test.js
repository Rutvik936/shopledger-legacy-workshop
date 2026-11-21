var test = require('node:test');
var assert = require('node:assert/strict');

var pricing = require('../lib/pricing');
var tax = require('../lib/tax');
var invoice = require('../lib/invoice');
var reports = require('../lib/reports');

function memoryOrder(overrides) {
  return Object.assign({
    id: 1,
    date: '21/11/2026',
    customer: 'Test Customer',
    paymentMode: 'cash',
    status: 'completed',
    items: [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 1 }],
    coupon: '',
    subtotal: 100,
    discount: 0,
    tax: 5,
    total: 105
  }, overrides || {});
}

test('order pricing applies HSN slab and splits GST into CGST and SGST', function () {
  var totals = pricing.computeTotals([{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }], '');
  assert.equal(totals.tax, 5);
  assert.equal(totals.cgst, 2.5);
  assert.equal(totals.sgst, 2.5);
  assert.equal(totals.total, 105);
});

test('invoice uses the HSN GST slab recorded on order items', function () {
  var order = memoryOrder();
  var figures = invoice.computeInvoiceFigures(order);
  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.tax, order.tax);
  assert.equal(figures.total, order.total);
});

test('invoice applies percent coupons to subtotal with configured caps', function () {
  var order = memoryOrder({
    items: [
      { id: 1, name: 'Rice', hsn: '1006', price: 640, qty: 1 },
      { id: 4, name: 'Sunflower Oil', hsn: '1512', price: 190, qty: 2 }
    ],
    coupon: 'SAVE10',
    discount: 102,
    tax: 45.9,
    total: 963.9
  });
  var figures = invoice.computeInvoiceFigures(order);
  assert.equal(figures.discount, 102);
  assert.equal(figures.tax, 45.9);
  assert.equal(figures.total, 963.9);
});

test('invoice honors percent coupon maximum discount cap', function () {
  var order = memoryOrder({
    items: [{ id: 5, name: 'Groundnut Oil', hsn: '1508', price: 1120, qty: 2 }],
    coupon: 'SAVE10',
    discount: 150,
    tax: 104.5,
    total: 2194.5
  });
  var figures = invoice.computeInvoiceFigures(order);
  assert.equal(figures.discount, 150);
  assert.equal(figures.tax, 104.5);
  assert.equal(figures.total, 2194.5);
});

test('invoice honors flat coupon minimum subtotal', function () {
  var order = memoryOrder({
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    coupon: 'FLAT50',
    discount: 0,
    tax: 5,
    total: 105
  });
  var figures = invoice.computeInvoiceFigures(order);
  assert.equal(figures.discount, 0);
  assert.equal(figures.total, 105);
});

test('GST reconciliation compares invoice and ledger totals and skips cancelled orders', function () {
  var db = {
    orders: [memoryOrder(), memoryOrder({ id: 2, status: 'cancelled', total: 118 })]
  };
  var result = reports.getGstReconciliation(db);
  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.rows[0].delta, 0);
  assert.equal(result.rows[0].matched, true);
});

test('tax module accepts an explicit gstRate and splits rounded tax', function () {
  assert.equal(tax.getRateForItem({ gstRate: 12 }), 0.12);
  assert.deepEqual(tax.splitCgstSgst(1.01), { cgst: 0.51, sgst: 0.5 });
});
