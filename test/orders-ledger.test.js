var test = require('node:test');
var assert = require('node:assert/strict');

var orders = require('../lib/orders');
var ledger = require('../lib/ledger');

test('order history sorts newest dates first across year and month boundaries', function () {
  var db = { orders: [
    { id: 1004, date: '30/01/2022' },
    { id: 1001, date: '28/12/2021' },
    { id: 1008, date: '15/03/2022' },
    { id: 1007, date: '04/03/2022' }
  ] };
  assert.deepEqual(orders.list(db).map(function (order) { return order.id; }), [1008, 1007, 1004, 1001]);
});

test('order date range compares calendar dates, accepting ISO filter dates', function () {
  var db = { orders: [
    { id: 1001, date: '28/12/2021' },
    { id: 1004, date: '30/01/2022' },
    { id: 1005, date: '01/02/2022' },
    { id: 1008, date: '15/03/2022' }
  ] };
  assert.deepEqual(orders.list(db, { from: '2022-01-01', to: '2022-01-31' }).map(function (order) { return order.id; }), [1004]);
});

test('Khata settlement parses string amounts and preserves decimal balance', function () {
  var db = {
    nextSettlementId: 501,
    customers: [{ id: 1, name: 'Meera Joshi', openingBalance: 450, totalBilled: 1982.01, totalSettled: 1200 }],
    settlements: []
  };
  var result = ledger.recordSettlement(db, 1, '500', 'upi', 'Payment');
  assert.equal(result.ok, true);
  assert.equal(result.settlement.amount, 500);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
});

test('Khata settlement rejects non-finite and non-positive amounts', function () {
  var db = { customers: [{ id: 1, name: 'Meera Joshi', totalSettled: 1200 }] };
  assert.equal(ledger.recordSettlement(db, 1, 'not-a-number').ok, false);
  assert.equal(ledger.recordSettlement(db, 1, 'Infinity').ok, false);
  assert.equal(ledger.recordSettlement(db, 1, '0').ok, false);
});
