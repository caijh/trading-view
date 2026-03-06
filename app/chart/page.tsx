"use client";

import { Suspense } from "react";
import Chart from "@/app/components/Chart";

function LoadingProgress() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="w-80">
                <div className="h-2 bg-gray-200 rounded overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 h-full w-1/3 rounded"
                        style={{
                            background: "linear-gradient(90deg, rgba(59,130,246,1), rgba(37,99,235,1))",
                            transform: "translateX(-100%)",
                            animation: "indeterminate 1.2s linear infinite",
                            willChange: "transform",
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes indeterminate {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}

export default function ChartPage() {
    return (
        <Suspense fallback={<LoadingProgress />}>
            <Chart />
        </Suspense>
    );
}
