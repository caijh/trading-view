"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaSyncAlt, FaGlasses } from "react-icons/fa";
import toast from "react-hot-toast";

// 定义股票数据接口，以匹配 API 返回的结构
interface StockData {
    stock_code: string;
    stock_name: string;
    entry_price: string;
    take_profit: string;
    stop_loss: string;
    strategy_name: string;
    holding: boolean;
}

// 定义组件内部使用的股票数据结构
interface MappedStock {
    ticker: string;
    name: string;
    price: number;
    take_profit: number;
    stop_loss: number;
    strategy_name: string;
    holding: boolean;
}

export default function StockList({onSelectAction}: { onSelectAction: (stock: MappedStock) => void }) {
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("change");
    const [stocks, setStocks] = useState<MappedStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStocks = async () => {
        try {
            const postData = {
                // 这里放置您需要发送到服务器的数据
                // 例如：page: 1, page_size: 100
            };

            const response = await fetch('/api/trading-plus/strategy/trading?page=1&page_size=1000', {
                method: 'POST', // 明确指定为 POST 方法
                headers: {
                    'Content-Type': 'application/json', // 告诉服务器，您发送的是 JSON 格式的数据
                },
                body: JSON.stringify(postData), // 将 JavaScript 对象转换为 JSON 字符串
            });
            if (!response.ok) {
                toast.error(`HTTP error! status: ${response.status}`);
                return;
            }
            const data = await response.json();

            // 将 API 数据映射为组件所需格式
            const mappedStocks: MappedStock[] = data.data.items.map((item: StockData) => ({
                ticker: item.stock_code,
                name: item.stock_name,
                price: parseFloat(item.entry_price),
                take_profit: parseFloat(item.take_profit),
                stop_loss: parseFloat(item.stop_loss),
                strategy_name: item.strategy_name,
                holding: item.holding,
            }));

            setStocks(mappedStocks);
        } catch (e) {
            console.error("Failed to fetch stock data:", e);
            setError("Failed to load stock data.");
        } finally {
            setLoading(false);
        }
    };

    // 使用 useEffect 获取数据
    useEffect(() => {
        fetchStocks().then(r => {});
    }, []);

    const reloadStocks = () => {
        setLoading(true);
        setError(null);
        fetchStocks().then(r => {}); // 重新加载数据
    };

    // Custom dropdown component for selecting sort option (rendered below)
    function CustomSortDropdown({ sortBy, onChange }: { sortBy: string; onChange: (v: string) => void }) {
        const options = [
            { value: "Profit", label: "Sort: Profit" },
            { value: "Price", label: "Sort: Price" },
        ];
        const [open, setOpen] = useState(false);
        const ref = useRef<HTMLDivElement | null>(null);

        useEffect(() => {
            function handleClick(e: MouseEvent) {
                if (ref.current && !ref.current.contains(e.target as Node)) {
                    setOpen(false);
                }
            }
            document.addEventListener("mousedown", handleClick);
            return () => document.removeEventListener("mousedown", handleClick);
        }, []);

        const currentLabel = options.find((o) => o.value === sortBy)?.label || "Sort";

        return (
            <div className="relative" ref={ref}>
                <button
                    type="button"
                    onClick={() => setOpen((s) => !s)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded border text-xs bg-white"
                >
                    <span className="truncate">{currentLabel}</span>
                    <svg className="w-3 h-3 ml-2 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                    </svg>
                </button>

                {open && (
                    <ul className="absolute right-0 mt-1 w-full bg-white border rounded shadow-sm z-20">
                        {options.map((o) => (
                            <li
                                key={o.value}
                                className="px-2 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                            >
                                {o.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }


    // 过滤和排序逻辑
    const filtered = useMemo(() => {
        if (!stocks) return [];

        const q = query.trim().toLowerCase();
        return stocks
            .filter((s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
            .sort((a, b) => (sortBy === "Price" ? b.price - a.price : ((b.take_profit - b.price) - (a.take_profit - a.price))));
    }, [query, sortBy, stocks]);

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <div className="text-lg font-medium flex items-center gap-2">
                            <FaGlasses className="text-xl text-slate-700" />
                            <span className="sr-only">Watchlist</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search ticker or name"
                            className="px-2 py-1 rounded border text-xs w-36"
                        />
                        {/* custom dropdown to avoid browser native option styling */}
                        <div className="relative w-32">
                            {/* Options list for the custom dropdown */}
                            {/* keep these values in sync with previous select options */}
                            {/* eslint-disable-next-line react-hooks/rules-of-hooks */}
                            {null}
                            <CustomSortDropdown
                                sortBy={sortBy}
                                onChange={(v: string) => setSortBy(v)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 根据加载和错误状态显示不同的内容 */}
            {loading ? (
                <div className="p-3 text-center text-sm text-slate-500">Loading...</div>
            ) : error ? (
                <div className="p-3 text-center text-sm text-red-500">{error}</div>
            ) : filtered.length > 0 ? (
                <ul className="divide-y">
                    {filtered.map((s) => (
                        <li key={s.ticker} className="p-3 hover:bg-slate-50 cursor-pointer" onClick={() => onSelectAction(s)}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center">
                                        <span
                                            className={`w-2.5 h-2.5 rounded-full mr-2 ${s.holding ? 'bg-red-500' : 'bg-white border-2 border-gray-300'}`}
                                        />
                                        <div className="font-medium">{s.ticker} <span className="text-sm text-slate-500">{s.name}</span></div>
                                    </div>
                                    <div className="text-xs text-slate-400">Market
                                        · {s.ticker.split('.').pop()?.toUpperCase() || 'N/A'} {s.strategy_name}</div>
                                </div>
                                <div className="text-right space-y-1">
                                    {/* Entry 与价格同一行 */}
                                    <div className="flex items-center justify-end gap-1 text-sm">
                                        <span className="text-slate-500">Entry:</span>
                                        <span className="font-semibold text-slate-800">
      {s.price.toFixed(2)}
    </span>
                                    </div>

                                    {/* TP / SL */}
                                    <div className="flex justify-end gap-2 text-sm">
    <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600">
      TP {s.take_profit.toFixed(2)}
    </span>
                                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">
      SL {s.stop_loss.toFixed(2)}
    </span>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="p-3 text-center text-sm text-slate-500">No stocks found.</div>
            )}

            <div className="p-3 text-center text-xs text-slate-400">· Click a row to load chart ·
                <span className="mx-1"> </span>
                <button
                    title="Reload Stocks"
                    onClick={reloadStocks}
                    className="text-blue-500 hover:text-blue-600"
                >
                    <FaSyncAlt /> {/* Font Awesome Sync icon */}
                </button></div>
        </div>
    );
}
