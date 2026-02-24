"use client";

import { Suspense, useEffect, useState } from "react";
import Chart from "@/app/components/Chart";

function LoadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setProgress(6);
        const id = setInterval(() => {
            setProgress((p) => {
                if (p >= 95) return p;
                const inc = Math.floor(Math.random() * 10) + 4;
                return Math.min(95, p + inc);
            });
        }, 350);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="w-80">
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                    <div
                        className="h-2 bg-blue-500 rounded"
                        style={{ width: `${progress}%`, transition: "width 300ms ease" }}
                    />
                </div>
                <div className="text-sm text-center mt-2 text-slate-500">加载中 · {progress}%</div>
            </div>
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
