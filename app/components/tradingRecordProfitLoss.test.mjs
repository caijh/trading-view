import assert from "node:assert/strict";
import test from "node:test";

import { getProfitLoss } from "./tradingRecordProfitLoss.ts";

test("calculates profit for a LONG trade", () => {
    assert.deepEqual(getProfitLoss("LONG", "100", "110"), {
        amountText: "+10.00",
        rateText: "+10.00%",
        positive: true,
    });
});

test("calculates loss for a LONG trade", () => {
    assert.deepEqual(getProfitLoss("LONG", "100", "95"), {
        amountText: "-5.00",
        rateText: "-5.00%",
        positive: false,
    });
});

test("calculates profit for a SHORT trade", () => {
    assert.deepEqual(getProfitLoss("SHORT", "100", "90"), {
        amountText: "+10.00",
        rateText: "+10.00%",
        positive: true,
    });
});

test("calculates loss for a SHORT trade", () => {
    assert.deepEqual(getProfitLoss("SHORT", "100", "105"), {
        amountText: "-5.00",
        rateText: "-5.00%",
        positive: false,
    });
});

test("returns null when the entry price is zero", () => {
    assert.equal(getProfitLoss("LONG", "0", "10"), null);
});

test("accepts numeric prices returned by the API serializer", () => {
    assert.deepEqual(getProfitLoss("LONG", 100, 110), {
        amountText: "+10.00",
        rateText: "+10.00%",
        positive: true,
    });
});

test("returns null when a price is missing or not finite", () => {
    assert.equal(getProfitLoss("LONG", "", "10"), null);
    assert.equal(getProfitLoss("LONG", "100", null), null);
    assert.equal(getProfitLoss("LONG", "Infinity", "10"), null);
});
