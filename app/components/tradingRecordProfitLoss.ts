export interface ProfitLoss {
    amountText: string;
    rateText: string;
    positive: boolean;
}

const formatSigned = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;

export const getProfitLoss = (
    type: string | null,
    entry: string | null,
    exit: string | null,
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

    const value = type === "SHORT" ? entryNum - exitNum : exitNum - entryNum;
    return {
        amountText: formatSigned(value),
        rateText: `${formatSigned((value / entryNum) * 100)}%`,
        positive: value >= 0,
    };
};
