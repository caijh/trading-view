"use client";

import { useEffect, useMemo, useState } from "react";

// 定义股票数据接口，以匹配 API 返回的结构
interface StockData {
    stock_code: string;
    stock_name: string;
    entry_price: string;
    take_profit: string;
    stop_loss: string;
    strategy_name: string;
}

// 定义组件内部使用的股票数据结构
interface MappedStock {
    ticker: string;
    name: string;
    price: number;
    take_profit: number;
    stop_loss: number;
    strategy_name: string;
}

export default function StockList({onSelect}: { onSelect: (stock: MappedStock) => void }) {
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("change");
    const [stocks, setStocks] = useState<MappedStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 使用 useEffect 获取数据
    useEffect(() => {
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
                console.log(response);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
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
                }));

                setStocks(mappedStocks);
            } catch (e) {
                console.error("Failed to fetch stock data:", e);
                setError("Failed to load stock data.");
            } finally {
                setLoading(false);
            }
        };

        fetchStocks().then(r => {});
    }, []);

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
                        <div className="text-lg font-medium">Watchlist</div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search ticker or name"
                            className="px-3 py-2 rounded border text-sm w-56"
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-2 py-2 rounded border text-sm"
                        >
                            <option value="Profit">Sort: Profit</option>
                            <option value="Price">Sort: Price</option>
                        </select>
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
                        <li key={s.ticker} className="p-3 hover:bg-slate-50 cursor-pointer" onClick={() => onSelect(s)}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{s.ticker} <span
                                        className="text-sm text-slate-500">{s.name}</span></div>
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

            <div className="p-3 text-center text-xs text-slate-400">· Click a row to load chart</div>
        </div>
    );
}
