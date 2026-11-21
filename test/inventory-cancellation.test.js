var test = require('node:test');
var assert = require('node:assert/strict');

var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

test('inventory check allows selling the exact remaining sellable quantity', function () {
  var products = [{ id: 6, name: 'A2 Gir Cow Ghee', stock: 1, reserved: 0 }];
  assert.deepEqual(inventory.check(products, [{ id: 6, qty: 1 }]), { ok: true });
});

test('inventory check allows selling stock minus wholesale reservations exactly', function () {
  var products = [{ id: 11, name: 'Chilli Powder', stock: 4, reserved: 3 }];
  assert.deepEqual(inventory.check(products, [{ id: 11, qty: 1 }]), { ok: true });
});

test('cancelling an order restores its items to physical stock without changing reservations', function () {
  var db = {
    products: [
      { id: 6, name: 'A2 Gir Cow Ghee', stock: 0, reserved: 0 },
      { id: 11, name: 'Chilli Powder', stock: 3, reserved: 3 }
    ],
    orders: [{
      id: 1007,
      status: 'pending',
      paymentMode: 'cash',
      items: [{ id: 6, qty: 1 }, { id: 11, qty: 1 }]
    }]
  };

  var result = orders.cancel(db, 1007, 'Test cancellation');
  assert.equal(result.ok, true);
  assert.equal(db.products[0].stock, 1);
  assert.equal(db.products[1].stock, 4);
  assert.equal(db.products[1].reserved, 3);
});
