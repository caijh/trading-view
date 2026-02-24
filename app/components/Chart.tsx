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

                <main className="grid grid-cols-12 gap-4 h-[calc(100vh-64px)]">
                    {/* left: chart area */}
                    <section className="col-span-9 bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">Symbol</div>
                                    <div className="text-lg font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{symbol.ticker} — {symbol.name}</span>
                                            <button
                                                className="text-slate-600 hover:text-slate-800 p-1 rounded"
                                                onClick={openSymbolInput}
                                                title="Search symbol"
                                            >
                                                <i className="fas fa-search"></i>
                                            </button>

                                            {showSymbolInput && (
                                                <div className="ml-2 flex items-center gap-2">
                                                    <input
                                                        ref={inputRef}
                                                        value={inputValue}
                                                        onChange={(e) => setInputValue(e.target.value)}
                                                        onKeyDown={handleInputKeyDown}
                                                        className="border rounded px-2 py-1 text-sm"
                                                        placeholder="Enter symbol"
                                                    />
                                                    <button
                                                        className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                                                        onClick={submitSymbol}
                                                        title="Apply"
                                                    >
                                                        OK
                                                    </button>
                                                    <button
                                                        className="bg-gray-200 px-2 py-1 rounded text-sm"
                                                        onClick={() => setShowSymbolInput(false)}
                                                        title="Cancel"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
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
                            <KLineChart symbol={symbol.ticker} onAnalysisDataAction={handleAnalysisData}/>
                        </div>
                    </section>

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
