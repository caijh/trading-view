"use client";

import { useCallback, useEffect, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";

interface Account {
    id: number;
    name: string | null;
    amount: number | null;
}

interface AccountSummary {
    count: number;
    total_amount: number;
}

interface AccountListProps {
    onClose: () => void;
}

const formatAmount = (v: number | null | undefined) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "--";
    return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getAccountLabel = (acc: Account) => acc.name || `#${acc.id}`;

export default function AccountList({ onClose }: AccountListProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [summary, setSummary] = useState<AccountSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [listRes, summaryRes] = await Promise.all([
                fetch(`/api/trading-plus/account/list`),
                fetch(`/api/trading-plus/account/summary`),
            ]);
            if (!listRes.ok) {
                throw new Error(`HTTP error! status: ${listRes.status}`);
            }
            const listJson = await listRes.json();
            if (listJson.code !== 0 || !listJson.data) {
                throw new Error(listJson.msg || "加载账号列表失败");
            }
            setAccounts(listJson.data as Account[]);

            // 汇总接口失败不影响列表展示
            if (summaryRes.ok) {
                const summaryJson = await summaryRes.json();
                if (summaryJson.code === 0 && summaryJson.data) {
                    setSummary(summaryJson.data as AccountSummary);
                }
            }
        } catch (e) {
            console.error("Failed to fetch accounts:", e);
            setError("加载账号失败，请稍后重试");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData().then(() => {});
    }, [fetchData]);

    const totalAmount = summary
        ? summary.total_amount
        : accounts.reduce((sum, acc) => sum + (acc.amount ?? 0), 0);
    const accountCount = summary ? summary.count : accounts.length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-[90vw] max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 弹窗标题栏 */}
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="text-lg font-semibold">账号</div>
                    <div className="flex items-center gap-3">
                        <button
                            title="Reload Accounts"
                            onClick={() => fetchData()}
                            className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                        >
                            <FaSyncAlt />
                            <span>刷新</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-sm"
                            title="关闭"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 汇总条 */}
                {!loading && !error && (
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-sm bg-slate-50">
                        <span className="text-slate-500">
                            共 <span className="font-medium text-slate-700">{accountCount}</span> 个账号
                        </span>
                        <span className="text-slate-500">
                            金额合计{" "}
                            <span className="font-semibold text-slate-800">{formatAmount(totalAmount)}</span>
                        </span>
                    </div>
                )}

                {/* 账号列表 */}
                <div className="overflow-auto flex-1">
                    {loading ? (
                        <div className="p-8 text-center text-sm text-slate-500">加载中...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-sm text-red-500">
                            {error}
                            <button
                                onClick={() => fetchData()}
                                className="ml-2 text-blue-500 hover:text-blue-600 underline"
                            >
                                重试
                            </button>
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">暂无账号</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {accounts.map((acc) => (
                                <li
                                    key={acc.id}
                                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                                >
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-800 truncate">
                                            {getAccountLabel(acc)}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">ID: {acc.id}</div>
                                    </div>
                                    <div className="text-right whitespace-nowrap ml-4">
                                        <div className="font-semibold text-slate-800">
                                            {formatAmount(acc.amount)}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">金额</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
