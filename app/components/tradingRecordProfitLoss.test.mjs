import assert from "node:assert/strict";
import test from "node:test";

import {
    DEFAULT_HOLDING_NUM,
    formatQuantity,
    getProfitLoss,
    resolveHoldingNum,
} from "./tradingRecordProfitLoss.ts";

test("calculates total profit for a LONG trade", () => {
    assert.deepEqual(getProfitLoss("LONG", "100", "110", 100), {
        amountText: "+1000.00",
        rateText: "+10.00%",
        positive: true,
    });
});

test("calculates total loss for a LONG trade", () => {
    assert.deepEqual(getProfitLoss("LONG", "100", "95", 100), {
        amountText: "-500.00",
        rateText: "-5.00%",
        positive: false,
    });
});

test("calculates total profit for a SHORT trade", () => {
    assert.deepEqual(getProfitLoss("SHORT", "100", "90", 100), {
        amountText: "+1000.00",
        rateText: "+10.00%",
        positive: true,
    });
});

test("calculates total loss for a SHORT trade", () => {
    assert.deepEqual(getProfitLoss("SHORT", "100", "105", 100), {
        amountText: "-500.00",
        rateText: "-5.00%",
        positive: false,
    });
});

test("uses a non-default holding quantity", () => {
    assert.deepEqual(getProfitLoss("LONG", "100", "110", 50), {
        amountText: "+500.00",
        rateText: "+10.00%",
        positive: true,
    });
});

test("accepts numeric prices and quantities returned by the API serializer", () => {
    assert.deepEqual(getProfitLoss("LONG", 100, 110, 100), {
        amountText: "+1000.00",
        rateText: "+10.00%",
        positive: true,
    });
});

test("defaults missing or invalid holding quantities to 100", () => {
    const expected = {
        amountText: "+1000.00",
        rateText: "+10.00%",
        positive: true,
    };
    for (const value of [null, undefined, "", "   ", "abc", 0, -5, "Infinity", Number.NaN]) {
        assert.deepEqual(getProfitLoss("LONG", "100", "110", value), expected);
    }
});

test("resolveHoldingNum returns 100 for missing or invalid values", () => {
    for (const value of [null, undefined, "", "   ", "abc", 0, -5, "Infinity", Number.NaN]) {
        assert.equal(resolveHoldingNum(value), DEFAULT_HOLDING_NUM);
    }
    assert.equal(resolveHoldingNum("100"), 100);
    assert.equal(resolveHoldingNum(100), 100);
    assert.equal(resolveHoldingNum(50), 50);
});

test("formatQuantity formats effective quantities with two decimals", () => {
    assert.equal(formatQuantity(null), "100.00");
    assert.equal(formatQuantity(undefined), "100.00");
    assert.equal(formatQuantity("100"), "100.00");
    assert.equal(formatQuantity(50), "50.00");
    assert.equal(formatQuantity("abc"), "100.00");
    assert.equal(formatQuantity(0), "100.00");
});

test("returns null when the entry price is zero", () => {
    assert.equal(getProfitLoss("LONG", "0", "10", 100), null);
});

test("returns null when a price is missing or not finite", () => {
    assert.equal(getProfitLoss("LONG", "", "10", 100), null);
    assert.equal(getProfitLoss("LONG", "100", null, 100), null);
    assert.equal(getProfitLoss("LONG", "Infinity", "10", 100), null);
});
