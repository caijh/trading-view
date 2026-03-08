"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import KLineChart from "@/app/components/KLineChart";
import StockList from "@/app/components/StockList";

export default function Chart() {
    const searchParams = useSearchParams();
    const code = searchParams.get("code");

    const [symbol, setSymbol] = useState<{ ticker: string; name: string }>({
        ticker: code || "AAPL.NS",
        name: "",
    });

    const [showModal, setShowModal] = useState(false);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const handleAnalysisData = (data: any) => {
        setAnalysisData(data);
    };

    // State for OHLC data when hovering over chart
    const [ohlcData, setOhlcData] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
    const [latestOHLC, setLatestOHLC] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
    
    const handleCrosshairMove = (data: { open: number; high: number; low: number; close: number } | null) => {
        setOhlcData(data);
    };
    
    const handleLatestOHLC = (data: { open: number; high: number; low: number; close: number } | null) => {
        setLatestOHLC(data);
    };
    
    // Use crosshair data if available, otherwise use latest OHLC
    const displayOHLC = ohlcData || latestOHLC;

    const [showSymbolInput, setShowSymbolInput] = useState(false);
    const [inputValue, setInputValue] = useState(symbol.ticker);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // 每次路径 code 变化时更新 symbol
    useEffect(() => {
        if (code) {
            setSymbol({ ticker: code, name: code });
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

    const submitSymbol = () => {
        const trimmed = inputValue.trim();
        if (trimmed) {
            setSymbol({ ticker: trimmed, name: trimmed });
        }
        setShowSymbolInput(false);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            submitSymbol();
        } else if (e.key === "Escape") {
            setShowSymbolInput(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50 text-slate-900">
            <div className="mx-auto p-4">
                <header className="mb-4 flex items-center justify-between" />

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
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-1.85z" />
                                                </svg>
                                            </button>
                                    </div>
                                    <div className="text-lg font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{symbol.ticker} — {symbol.name}</span>
                                            
                                            {/* OHLC Display - positioned next to symbol name */}
                                            {displayOHLC && (
                                                <span className="text-sm text-slate-600 ml-4">
                                                    O: <span className="font-medium">{displayOHLC.open.toFixed(2)}</span>
                                                    {' '}H: <span className="font-medium text-emerald-600">{displayOHLC.high.toFixed(2)}</span>
                                                    {' '}L: <span className="font-medium text-rose-600">{displayOHLC.low.toFixed(2)}</span>
                                                    {' '}C: <span className={`font-medium ${displayOHLC.close >= displayOHLC.open ? 'text-emerald-600' : 'text-rose-600'}`}>{displayOHLC.close.toFixed(2)}</span>
                                                </span>
                                            )}

                                            {/* popup input will be shown as a modal overlay instead of inline */}
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
                                        <i className="fas fa-chart-line"></i> {/* Font Awesome chart icon */}
                                    </button>

                                    <div className="text-sm text-slate-500">1D</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            <KLineChart 
                                symbol={symbol.ticker} 
                                onAnalysisDataAction={handleAnalysisData} 
                                onCrosshairMove={handleCrosshairMove}
                                onLatestOHLC={handleLatestOHLC}
                            />
                        </div>
                    </section>

                    {/* Symbol search modal overlay */}
                    {showSymbolInput && (
                        <div className="fixed inset-0 z-20 flex items-center justify-center bg-transparent backdrop-blur-sm">
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
                                    <button className="text-sm text-slate-600" onClick={() => setShowSymbolInput(false)}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* right: stock list */}
                    <aside className="col-span-3 h-full overflow-y-auto">
                        <StockList onSelectAction={(s) => setSymbol(s)} />
                    </aside>
                </main>
                {/* Modal to display analysis data */}
                {showModal && analysisData && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-16 bg-white p-4 rounded-lg shadow-lg z-10">
                        <div className="space-y-2 text-left">
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
                                    {Array.isArray(analysisData.patterns)
                                        ? analysisData.patterns.join(", ")
                                        : "No patterns available"}
                                </div>
                            </div>
                        </div>
                        {/* Close button */}
                        <button
                            className="absolute top-1 right-2 bg-gray-300 text-white p-2 rounded-full hover:bg-gray-400"
                            onClick={() => setShowModal(false)}
                            title="Close"
                        >
                            <i className="fas fa-times"></i> {/* Font Awesome close icon */}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
