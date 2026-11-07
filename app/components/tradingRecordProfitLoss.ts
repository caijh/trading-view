export interface ProfitLoss {
    amountText: string;
    rateText: string;
    positive: boolean;
}

export const DEFAULT_HOLDING_NUM = 100;

const formatSigned = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;

export const resolveHoldingNum = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) {
        return DEFAULT_HOLDING_NUM;
    }
    if (typeof value === "string" && value.trim() === "") {
        return DEFAULT_HOLDING_NUM;
    }

    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
        return DEFAULT_HOLDING_NUM;
    }
    return num;
};

export const formatQuantity = (value: string | number | null | undefined): string => {
    return resolveHoldingNum(value).toFixed(2);
};

export const getProfitLoss = (
    type: string | null,
    entry: string | number | null | undefined,
    exit: string | number | null | undefined,
    holdingNum: string | number | null | undefined,
): ProfitLoss | null => {
    if (
        entry === null ||
        entry === undefined ||
        String(entry).trim() === "" ||
        exit === null ||
        exit === undefined ||
        String(exit).trim() === ""
    ) {
        return null;
    }

    const entryNum = Number(entry);
    const exitNum = Number(exit);
    if (!Number.isFinite(entryNum) || !Number.isFinite(exitNum) || entryNum === 0) {
        return null;
    }

    const quantity = resolveHoldingNum(holdingNum);
    const value = type === "SHORT" ? entryNum - exitNum : exitNum - entryNum;
    return {
        amountText: formatSigned(value * quantity),
        rateText: `${formatSigned((value / entryNum) * 100)}%`,
        positive: value >= 0,
    };
};
