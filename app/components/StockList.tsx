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
    strategy_type: string;
    signal: number;
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
    strategy_type: string;
    signal: number;
}

export default function StockList({onSelectAction}: { onSelectAction: (stock: MappedStock) => void }) {
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("Profit");
    const [stocks, setStocks] = useState<MappedStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStocks = async () => {
        try {
            const postData = {};
            const response = await fetch('/api/trading-plus/strategy/trading?page=1&page_size=1000', {
                method: 'POST', // 明确指定为 POST 方法
                headers: {
                    'Content-Type': 'application/json', // 告诉服务器，您发送的是 JSON 格式的数据
                },
                body: JSON.stringify(postData), // 将 JavaScript 对象转换为 JSON 字符串
            });
            console.log(response)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 检查API响应结构是否正确
            if (!data?.data?.items || !Array.isArray(data.data.items)) {
                throw new Error("API响应格式不正确");
            }

            // 将 API 数据映射为组件所需格式
            const mappedStocks: MappedStock[] = data.data.items.map((item: StockData) => ({
                ticker: item.stock_code,
                name: item.stock_name,
                price: parseFloat(item.entry_price),
                take_profit: parseFloat(item.take_profit),
                stop_loss: parseFloat(item.stop_loss),
                strategy_name: item.strategy_name,
                holding: item.holding,
                strategy_type: item.strategy_type,
                signal: item.signal,
            }));

            setStocks(mappedStocks);
            setError(null);
        } catch (e) {
            console.error("Failed to fetch stock data:", e);
            setError("加载股票数据失败，请稍后重试");
            toast.error("加载股票数据失败");
        } finally {
            setLoading(false);
        }
    };

    // 使用 useEffect 获取数据
    useEffect(() => {
        fetchStocks().then(() => {});
    }, []);

    const reloadStocks = () => {
        setLoading(true);
        setError(null);
        fetchStocks().then(() => {}); // 重新加载数据
    };

    // 计算利润百分比
    const calculateProfitPercentage = (price: number, takeProfit: number, strategyType: string) => {
        if (strategyType === 'Long') {
            return ((takeProfit - price) / price * 100).toFixed(2);
        } else {
            // Short: profit when price goes down
            return ((price - takeProfit) / price * 100).toFixed(2);
        }
    };

    // 计算亏损百分比
    const calculateLossPercentage = (price: number, stopLoss: number, strategyType: string) => {
        if (strategyType === 'Long') {
            return ((stopLoss - price) / price * 100).toFixed(2);
        } else {
            // Short: loss when price goes up
            return ((price - stopLoss) / price * 100).toFixed(2);
        }
    };

    // 获取操作建议
    const getActionSuggestion = (strategyType: string, holding: boolean, signal: number) => {
        if (strategyType === 'Long') {
            if (!holding) {
                if (signal === 1) return 'B'; // Buy
                if (signal === 0) return 'N'; // No Position
                if (signal === -1) return 'S'; // Sell
            } else {
                if (signal === 1 || signal === 0) return 'H';
                if (signal === -1) return 'S';
            }
        }

        return null;
    };

    // 获取操作建议的样式
    const getActionSuggestionStyle = (suggestion: string | null) => {
        if (!suggestion) return '';
        switch (suggestion) {
            case 'B':
            case 'H':
                return 'bg-green-100 text-green-800';
            case 'N':
                return 'bg-yellow-100 text-yellow-800';
            case 'S':
                return 'bg-red-100 text-red-800';
            default:
                return '';
        }
    };

    // Custom dropdown component for selecting sort option
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

        const currentLabel = options.find((o) => o.value === sortBy)?.label || "Sort: Profit";

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
        if (!stocks || stocks.length === 0) return [];

        const q = query.trim().toLowerCase();
        return stocks
            .filter((s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
            .sort((a, b) => {
                if (sortBy === "Price") {
                    return b.price - a.price;
                } else {
                    // 按利润百分比排序，考虑 strategy_type
                    const aProfitPct = parseFloat(calculateProfitPercentage(a.price, a.take_profit, a.strategy_type));
                    const bProfitPct = parseFloat(calculateProfitPercentage(b.price, b.take_profit, b.strategy_type));
                    return bProfitPct - aProfitPct;
                }
            });
    }, [query, sortBy, stocks]);

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <FaGlasses className="text-lg text-slate-700" />
                        <h3 className="text-base font-semibold text-slate-800">Watchlist</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="搜索..."
                            className="px-3 py-1.5 rounded-md border border-slate-300 text-sm w-40 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        />
                        <div className="relative w-36">
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
                <div className="p-3 text-center text-sm text-slate-500 flex-1 flex items-center justify-center">
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        加载中...
                    </div>
                </div>
            ) : error ? (
                <div className="p-3 text-center text-sm text-red-500 flex-1 flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {error}
                    </div>
                    <button
                        onClick={reloadStocks}
                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                        <FaSyncAlt />
                        重试
                    </button>
                </div>
            ) : filtered.length > 0 ? (
                <ul className="divide-y flex-1 overflow-y-auto">
                    {filtered.map((s) => (
                        <li key={s.ticker} className="p-3 hover:bg-slate-50 cursor-pointer" onClick={() => onSelectAction(s)}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center">
                                        <span
                                            className={`w-2.5 h-2.5 rounded-full mr-2 ${s.holding ? 'bg-red-500' : 'bg-white border-2 border-gray-300'}`}
                                        />
                                        <div className="font-medium flex items-center">
                                            <span className="mr-2" style={{ minWidth: '80px' }}>
                {s.ticker}
            </span>
                                            {s.strategy_type === 'Long' && (
                                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded inline-block">
                    Long
                </span>
                                            )}
                                            {s.strategy_type === 'Short' && (
                                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded inline-block">
                    Short
                </span>
                                            )}
                                            {(() => {
                                                const suggestion = getActionSuggestion(s.strategy_type, s.holding, s.signal);
                                                return suggestion ? (
                                                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${getActionSuggestionStyle(suggestion)}`}>
                        {suggestion}
                    </span>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        · {s.ticker.split('.').pop()?.toUpperCase() || 'N/A'} {s.strategy_name}
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    {/* Entry 与价格同一行 */}
                                    <div className="flex items-center justify-end gap-1 text-sm">
                                        <span className="text-slate-500">Entry:</span>
                                        <span className="font-semibold text-slate-800">
                                            {s.price.toFixed(2)}
                                        </span>
                                        {/* 利润百分比 */}
                                        <div className={`text-sm font-medium ${parseFloat(calculateProfitPercentage(s.price, s.take_profit, s.strategy_type)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {calculateProfitPercentage(s.price, s.take_profit, s.strategy_type)}%
                                        </div>
                                        {/* 亏损百分比 */}
                                        <div className={`text-sm font-medium ${parseFloat(calculateLossPercentage(s.price, s.stop_loss, s.strategy_type)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {calculateLossPercentage(s.price, s.stop_loss, s.strategy_type)}%
                                        </div>
                                    </div>


                                    {/* TP / SL */}
                                    <div className="flex justify-end gap-2 text-sm">
                                        <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                                            {s.take_profit.toFixed(2)}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                                            {s.stop_loss.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="p-3 text-center text-sm text-slate-500 flex-1 flex items-center justify-center">
                    未找到股票数据
                </div>
            )}

            <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-4 border-t">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>持仓中</span>
                </div>
                <span>· 点击行加载图表 ·</span>
                <button
                    title="Reload Stocks"
                    onClick={reloadStocks}
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                    <FaSyncAlt />
                    <span>刷新</span>
                </button>
            </div>
        </div>
    );
}
