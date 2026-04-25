"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import KLineChart, { OHLCWithPrevClose } from "@/app/components/KLineChart";
import StockList from "@/app/components/StockList";
import toast, { Toaster } from "react-hot-toast";

export default function Chart() {
    const searchParams = useSearchParams();
    const code = searchParams.get("code");

    const [symbol, setSymbol] = useState<{ ticker: string; name: string }>({
        ticker: "SPX.NS",
        name: '标普500指数',
    });

    const [showModal, setShowModal] = useState(false);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const handleAnalysisData = (data: any) => {
        setAnalysisData(data);
    };

    // Helper function to determine arrow icon and color based on trend/direction value
    const renderTrendIcon = (value: string) => {
        if (!value) return null;

        switch (value.toUpperCase()) {
            case 'UP':
                return <img src="/shangzhang.svg" alt="UP" className="h-5 w-5"/>;
            case 'DOWN':
                return <img src="/xiadie.svg" alt="DOWN" className="h-5 w-5"/>;
            case 'SIDE':
            default:
                return <img src="/heng.svg" alt="SIDE" className="h-5 w-5"/>;
        }
    };

    // ── OHLC 状态（含前收盘价）────────────────────────────────────────────────
    const [ohlcData, setOhlcData] = useState<OHLCWithPrevClose | null>(null);
    const [latestOHLC, setLatestOHLC] = useState<OHLCWithPrevClose | null>(null);

    const handleCrosshairMove = (data: OHLCWithPrevClose | null) => {
        setOhlcData(data);
    };

    const handleLatestOHLC = (data: OHLCWithPrevClose | null) => {
        setLatestOHLC(data);
    };

    // 鼠标悬停时优先展示悬停数据，否则展示最新 OHLC
    const displayOHLC = ohlcData || latestOHLC;

    // ── 涨跌幅计算工具 ────────────────────────────────────────────────────────
    const calcChange = (ohlc: OHLCWithPrevClose) => {
        if (!ohlc.prevClose || ohlc.prevClose === 0) return null;
        const change = ohlc.close - ohlc.prevClose;
        const pct = (change / ohlc.prevClose) * 100;
        return {change, pct};
    };

    const [showSymbolInput, setShowSymbolInput] = useState(false);
    const [inputValue, setInputValue] = useState(symbol.ticker);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // 每次路径 code 变化时更新 symbol
    useEffect(() => {
        if (code) {
            getStockInfo(code).then((stockInfo) => {
                if (stockInfo) {
                    setSymbol(stockInfo);
                }
            });
        }
    }, [code]);

    // focus the input when opened
    useEffect(() => {
        if (showSymbolInput && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [showSymbolInput]);

    const openSymbolInput = () => {
        setInputValue(symbol.ticker || "");
        setShowSymbolInput(true);
    };

    const getStockInfo = async (code: string) => {
        try {
            const res = await fetch(`/api/trading-data/stock?code=${encodeURIComponent(code)}`);
            const json = await res.json();

            if (json.code === 0 && json.data) {
                return {ticker: json.data.code as string, name: json.data.name as string};
            } else {
                toast.error('Stock not found.');
            }
        } catch (e) {
            console.error("Failed to fetch stock info:", e);
            toast.error('Failed to fetch stock info.');
        }
        return null;
    };

    const submitSymbol = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed) {
            setShowSymbolInput(false);
            return;
        }

        const stockInfo = await getStockInfo(trimmed);
        if (stockInfo) {
            setSymbol(stockInfo);
            setShowSymbolInput(false);
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            submitSymbol().then();
        } else if (e.key === "Escape") {
            setShowSymbolInput(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50 text-slate-900">
            <Toaster/>
            <div className="mx-auto p-4">
                <header className="mb-4 flex items-center justify-between"/>

                <main className="grid grid-cols-12 gap-2 h-[calc(100vh-64px)]">
                    {/* left: chart area */}
                    <section className="col-span-9 bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm text-slate-500">Symbol</div>
                                        <button
                                            className="text-slate-600 hover:text-slate-800 p-1 rounded"
                                            onClick={openSymbolInput}
                                            title="Search symbol"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                                                 viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-1.85z"/>
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="text-lg font-medium">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span>{symbol.ticker} — {symbol.name}</span>

                                            {/* ── OHLC + 涨跌幅展示 ──────────────────────────────── */}
                                            {displayOHLC && (() => {
                                                const result = calcChange(displayOHLC);
                                                const closeUp = displayOHLC.close >= displayOHLC.open;
                                                const changeUp = result ? result.change >= 0 : null;

                                                return (
                                                    <span
                                                        className="text-sm text-slate-600 ml-4 flex items-center gap-1 flex-wrap">
                                                        <span>
                                                            O: <span
                                                            className="font-medium">{displayOHLC.open.toFixed(2)}</span>
                                                        </span>
                                                        <span>
                                                            L: <span
                                                            className="font-medium text-rose-600">{displayOHLC.low.toFixed(2)}</span>
                                                        </span>
                                                        <span>
                                                            H: <span
                                                            className="font-medium text-emerald-600">{displayOHLC.high.toFixed(2)}</span>
                                                        </span>
                                                        <span>
                                                            C: <span
                                                            className={`font-medium ${closeUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {displayOHLC.close.toFixed(2)}
                                                            </span>
                                                        </span>

                                                        {/* 涨跌幅 */}
                                                        {result && (
                                                            <span
                                                                className={`font-semibold ml-1 ${changeUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {changeUp ? '▲' : '▼'}
                                                                {' '}{Math.abs(result.change).toFixed(2)}
                                                                {' '}({changeUp ? '+' : '-'}{Math.abs(result.pct).toFixed(2)}%)
                                                            </span>
                                                        )}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Icon button for displaying the analysis modal */}
                                    <button
                                        className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
                                        onClick={() => setShowModal(!showModal)}
                                        title="View Analysis"
                                    >
                                        <i className="fas fa-chart-line"></i>
                                    </button>
                                    <div className="text-sm text-slate-500">1D</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            <KLineChart
                                symbol={symbol.ticker}
                                onAnalysisDataAction={handleAnalysisData}
                                onCrosshairMoveAction={handleCrosshairMove}
                                onLatestOHLCAction={handleLatestOHLC}
                            />
                        </div>
                    </section>

                    {/* Symbol search modal overlay */}
                    {showSymbolInput && (
                        <div
                            className="fixed inset-0 z-20 flex items-center justify-center bg-transparent backdrop-blur-sm">
                            <div className="bg-white p-4 rounded shadow-lg w-[320px]">
                                <div className="mb-2 text-sm font-medium">Search Symbol</div>
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleInputKeyDown}
                                        className="flex-1 border rounded px-2 py-1 text-sm"
                                        placeholder="Enter symbol, e.g. AAPL.NS"
                                    />
                                    <button
                                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                                        onClick={submitSymbol}
                                    >
                                        OK
                                    </button>
                                </div>
                                <div className="mt-2 text-right">
                                    <button className="text-sm text-slate-600"
                                            onClick={() => setShowSymbolInput(false)}>Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* right: stock list */}
                    <aside className="col-span-3 h-full overflow-y-auto">
                        <StockList onSelectAction={(s) => setSymbol(s)}/>
                    </aside>
                </main>

                {/* Modal to display analysis data */}
                {showModal && analysisData && (
                    <div
                        className="absolute left-[60%] transform -translate-x-1/2 top-16 bg-white p-4 rounded-lg shadow-lg z-10">
                        <div className="space-y-2 text-left">
                            <div className="flex justify-between items-center">
                                <div><strong>Trending:</strong></div>
                                <div className="flex items-center gap-1">
                                    {renderTrendIcon(analysisData.trending)}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div><strong>Direction:</strong></div>
                                <div className="flex items-center gap-1">
                                    {renderTrendIcon(analysisData.direction)}
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <div><strong>Support:</strong></div>
                                <div>{analysisData.support}</div>
                            </div>
                            <div className="flex justify-between">
                                <div><strong>Resistance:</strong></div>
                                <div>{analysisData.resistance}</div>
                            </div>
                            <div className="flex justify-between">
                                <div><strong>Candlestick Signal:</strong></div>
                                <div>{analysisData.candlestick_signal}</div>
                            </div>
                            <div className="flex justify-between">
                                <div><strong>Indicator Signal:</strong></div>
                                <div>{analysisData.indicator_signal}</div>
                            </div>
                            <div className="flex justify-between">
                                <div><strong>Training Model Signal:</strong></div>
                                <div>{analysisData.training_model_signal}</div>
                            </div>
                            <div className="flex justify-between">
                                <div><strong>Patterns:</strong></div>
                                <div>
                                    {Array.isArray(analysisData.patterns) && analysisData.patterns.length > 0
                                        ? analysisData.patterns.join(", ")
                                        : "--"}
                                </div>
                            </div>

                            {/* Strategy */}
                            {analysisData.strategy && (
                                <>
                                    <div className="border-t pt-2 mt-2">
                                        <strong>Strategy</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <div><strong>Type:</strong></div>
                                        <div>{analysisData.strategy.strategy_type ?? "--"}</div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div><strong>Signal:</strong></div>
                                        <div>{analysisData.strategy.signal ?? "--"}</div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div><strong>Entry Price:</strong></div>
                                        <div>{analysisData.strategy.entry_price ?? "--"}</div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div><strong>Take Profit:</strong></div>
                                        <div>{analysisData.strategy.take_profit ?? "--"}</div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div><strong>Stop Loss:</strong></div>
                                        <div>{analysisData.strategy.stop_loss ?? "--"}</div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div><strong>Entry Patterns:</strong></div>
                                        <div>
                                            {Array.isArray(analysisData.strategy.entry_patterns) && analysisData.strategy.entry_patterns.length > 0
                                                ? analysisData.strategy.entry_patterns.join(", ")
                                                : "--"}
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <div><strong>Exit Patterns:</strong></div>
                                        <div>
                                            {Array.isArray(analysisData.strategy.exit_patterns) && analysisData.strategy.exit_patterns.length > 0
                                                ? analysisData.strategy.exit_patterns.join(", ")
                                                : "--"}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Close button */}
                        <button
                            className="absolute top-1 right-2 bg-gray-300 text-white p-2 rounded-full hover:bg-gray-400"
                            onClick={() => setShowModal(false)}
                            title="Close"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
