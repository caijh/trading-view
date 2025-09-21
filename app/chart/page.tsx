"use client";

import { Suspense } from "react";
import Chart from "@/app/components/Chart";

export default function ChartPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Chart />
        </Suspense>
    );
}
