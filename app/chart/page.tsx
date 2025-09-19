"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import KLineChart from "@/app/components/KLineChart";
import StockList from "@/app/components/StockList";

export default function ViewPage() {
    const searchParams = useSearchParams();
    const code = searchParams.get("code");

    const [symbol, setSymbol] = useState<{ ticker: string; name: string }>({
        ticker: code || "AAPL.NS",
        name: "",
    });

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
