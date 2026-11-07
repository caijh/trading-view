"use client";

import { useCallback, useEffect, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";

interface NewsItem {
    title: string;
    snippet: string;
    url: string;
    source: string;
    published_date: string | null;
}

interface NewsData {
    symbol: string;
    search_code: string;
    name: string;
    exchange: string;
    days: number;
    provider: string;
    success: boolean;
    error_message: string | null;
    items: NewsItem[];
}

interface NewsPanelProps {
    symbol: string;
    name: string;
    onClose: () => void;
}

export default function NewsPanel({ symbol, name, onClose }: NewsPanelProps) {
    const [data, setData] = useState<NewsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNews = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `/api/trading-plus/news/stock?code=${encodeURIComponent(symbol)}&limit=20`,
                { signal }
            );
            const json = await response.json();
            if (!response.ok) {
                throw new Error(json?.msg || `HTTP error! status: ${response.status}`);
            }
            if (json.code !== 0 || !json.data) {
                throw new Error(json.msg || "加载新闻失败");
            }
            setData(json.data as NewsData);
        } catch (e) {
            if ((e as Error).name === "AbortError") return;
            console.error("Failed to fetch news:", e);
            setError("加载新闻失败，请稍后重试");
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [symbol]);

    useEffect(() => {
        const controller = new AbortController();
        fetchNews(controller.signal).then(() => {});
        return () => controller.abort();
    }, [fetchNews]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const items = data?.items ?? [];
    const unavailable = data !== null && !data.success && items.length === 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-[90vw] max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={`${name || symbol} 新闻`}
            >
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="min-w-0">
                        <div className="text-lg font-semibold text-slate-800 truncate">
                            News · {name || symbol}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                            {symbol} · 最近 3 天
                            {!loading && data ? ` · 共 ${items.length} 条` : ""}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            title="Reload News"
                            onClick={() => fetchNews()}
                            className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                        >
                            <FaSyncAlt className={loading ? "animate-spin" : ""} />
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

                <div className="overflow-auto flex-1 min-h-0">
                    {loading ? (
                        <div className="p-8 text-center text-sm text-slate-500">加载中...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-sm text-red-500">
                            {error}
                            <button
                                onClick={() => fetchNews()}
                                className="ml-2 text-blue-500 hover:text-blue-600 underline"
                            >
                                重试
                            </button>
                        </div>
                    ) : unavailable ? (
                        <div className="p-8 text-center text-sm text-amber-600">
                            新闻源暂不可用，请稍后重试
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">最近 3 天暂无新闻</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                                <li
                                    key={`${item.url || item.title}-${index}`}
                                    className="px-4 py-3 hover:bg-slate-50"
                                >
                                    <div className="font-medium text-slate-800 leading-snug">
                                        {item.url ? (
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-blue-600"
                                            >
                                                {item.title}
                                            </a>
                                        ) : (
                                            item.title
                                        )}
                                    </div>
                                    {item.snippet && (
                                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                                            {item.snippet}
                                        </p>
                                    )}
                                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                                        {item.source && <span>{item.source}</span>}
                                        {item.published_date && <span>{item.published_date}</span>}
                                        {item.url && (
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-auto text-blue-500 hover:text-blue-600"
                                            >
                                                查看原文
                                            </a>
                                        )}
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
