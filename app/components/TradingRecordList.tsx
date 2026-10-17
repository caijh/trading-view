"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface TradingRecord {
    stock_code: string | null;
    stock_name: string | null;
    type: string | null;
    entry_price: string | null;
    exit_price: string | null;
    buy_patterns: string[] | null;
    sell_patterns: string[] | null;
    created_at: string | null;
    updated_at: string | null;
}

interface RecordListData {
    total: number;
    page_num: number;
    page: number;
    page_size: number;
    has_next: boolean;
    has_prev: boolean;
    items: TradingRecord[];
}

interface FilterState {
    type: string;
    stockCode: string;
    startDate: string;
    endDate: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const formatPrice = (v: string | null) => {
    if (v === null || v === undefined || v === "") return "--";
    const num = Number(v);
    return Number.isNaN(num) ? "--" : num.toFixed(2);
};

const formatPatterns = (patterns: string[] | null) => {
    if (!Array.isArray(patterns) || patterns.length === 0) return "--";
    return patterns.join(", ");
};

const formatTime = (v: string | null) => {
    if (!v) return "--";
    const date = new Date(v);
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString("zh-CN", { hour12: false });
};

export default function TradingRecordList() {
    const [filters, setFilters] = useState<FilterState>({
        type: "ALL",
        stockCode: "",
        startDate: "",
        endDate: "",
    });
    const [appliedFilters, setAppliedFilters] = useState<FilterState>(filters);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [data, setData] = useState<RecordListData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRecords = useCallback(async (p: number, ps: number, f: FilterState) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: String(p),
                page_size: String(ps),
            });
            if (f.type !== "ALL") {
                params.set("type", f.type);
            }
            if (f.stockCode.trim()) {
                params.set("stock_code", f.stockCode.trim());
            }
            if (f.startDate) {
                params.set("start_date", f.startDate);
            }
            if (f.endDate) {
                params.set("end_date", f.endDate);
            }

            const response = await fetch(`/api/trading-plus/trading-record/list?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = await response.json();
            if (json.code !== 0 || !json.data) {
                throw new Error(json.msg || "加载交易记录失败");
            }
            setData(json.data as RecordListData);
        } catch (e) {
            console.error("Failed to fetch trading records:", e);
            setError("加载交易记录失败，请稍后重试");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords(page, pageSize, appliedFilters).then(() => {});
    }, [page, pageSize, appliedFilters, fetchRecords]);

    const applyFilters = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const handlePageSizeChange = (value: string) => {
        setPage(1);
        setPageSize(Number(value));
    };

    const hasNext = data?.has_next ?? false;
    const hasPrev = data?.has_prev ?? false;

    return (
        <div className="min-h-[calc(100vh-90px)] bg-slate-50 text-slate-900">
            <div className="mx-auto p-4">
                <header className="mb-4 flex items-center justify-between">
                    <div className="text-lg font-semibold">交易记录</div>
                    <Link
                        href="/chart"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        返回图表
                    </Link>
                </header>

                {/* 筛选栏 */}
                <div className="mb-4 bg-white rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">方向</span>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                            className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">全部</option>
                            <option value="LONG">LONG</option>
                            <option value="SHORT">SHORT</option>
                        </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">股票代码</span>
                        <input
                            value={filters.stockCode}
                            onChange={(e) => setFilters((prev) => ({ ...prev, stockCode: e.target.value }))}
                            placeholder="如 AAPL.NS"
                            className="px-2 py-1.5 rounded-md border border-slate-300 text-xs w-40 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">开始日期</span>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                            className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">结束日期</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                            className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </label>

                    <button
                        onClick={applyFilters}
                        className="px-3 py-1.5 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600"
                    >
                        查询
                    </button>
                </div>

                {/* 表格 */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-sm text-slate-500">加载中...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-sm text-red-500">{error}</div>
                    ) : !data || data.items.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">暂无交易记录</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">股票代码</th>
                                        <th className="px-4 py-3 font-medium">股票名称</th>
                                        <th className="px-4 py-3 font-medium">方向</th>
                                        <th className="px-4 py-3 font-medium">买入价</th>
                                        <th className="px-4 py-3 font-medium">卖出价</th>
                                        <th className="px-4 py-3 font-medium">买入形态</th>
                                        <th className="px-4 py-3 font-medium">卖出形态</th>
                                        <th className="px-4 py-3 font-medium">创建时间</th>
                                        <th className="px-4 py-3 font-medium">更新时间</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.items.map((record, idx) => (
                                        <tr key={(record.stock_code ?? "") + "-" + idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium">{record.stock_code || "--"}</td>
                                            <td className="px-4 py-3">{record.stock_name || "--"}</td>
                                            <td className="px-4 py-3">
                                                {record.type === "LONG" ? (
                                                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded inline-block">
                                                        Long
                                                    </span>
                                                ) : record.type === "SHORT" ? (
                                                    <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded inline-block">
                                                        Short
                                                    </span>
                                                ) : (
                                                    record.type || "--"
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{formatPrice(record.entry_price)}</td>
                                            <td className="px-4 py-3">{formatPrice(record.exit_price)}</td>
                                            <td className="px-4 py-3 max-w-[220px] break-words">{formatPatterns(record.buy_patterns)}</td>
                                            <td className="px-4 py-3 max-w-[220px] break-words">{formatPatterns(record.sell_patterns)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{formatTime(record.created_at)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{formatTime(record.updated_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 分页 */}
                    {data && data.total > 0 && (
                        <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <span>共 {data.total} 条</span>
                                <span>·</span>
                                <span>第 {data.page} / {data.page_num || 1} 页</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs">
                                    <span>每页</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeChange(e.target.value)}
                                        className="px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
                                    >
                                        {PAGE_SIZE_OPTIONS.map((size) => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={!hasPrev}
                                        className="px-3 py-1 rounded-md border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        上一页
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={!hasNext}
                                        className="px-3 py-1 rounded-md border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        下一页
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
