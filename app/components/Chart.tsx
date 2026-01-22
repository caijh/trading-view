"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
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

    // 每次路径 code 变化时更新 symbol
    useEffect(() => {
        if (code) {
            setSymbol({ ticker: code, name: code });
        }
    }, [code]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
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
                                        {symbol.ticker} — {symbol.name}
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
                            <KLineChart symbol={symbol.ticker} onAnalysisData={handleAnalysisData}/>
                        </div>
                    </section>

                    {/* right: stock list */}
                    <aside className="col-span-3 h-full overflow-y-auto">
                        <StockList onSelect={(s) => setSymbol(s)} />
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
