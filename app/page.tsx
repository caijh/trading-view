"use client";


import React, { useState } from "react";
import KLineChart from "@/app/components/KLineChart";
import StockList from "@/app/components/StockList";


export default function Page() {
    const [symbol, setSymbol] = useState({ ticker: "AAPL.NS", name: "Apple Inc." });


    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto p-4">
                <header className="mb-4 flex items-center justify-between">
                </header>

                <main className="grid grid-cols-12 gap-4 h-[calc(100vh-64px)]">
                    {/* left: chart area */}
                    <section className="col-span-9 bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">Symbol</div>
                                    <div className="text-lg font-medium">{symbol.ticker} — {symbol.name}</div>
                                </div>
                                <div className="text-sm text-slate-500">1D</div>
                            </div>
                        </div>


                        <div className="p-4">
                            <KLineChart symbol={symbol.ticker} />
                        </div>
                    </section>


                    {/* right: stock list */}
                    <aside className="col-span-3 h-full overflow-y-auto">
                        <StockList onSelect={(s) => setSymbol(s)} />
                    </aside>
                </main>
            </div>
        </div>
    );
}
