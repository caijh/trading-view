"use client";

import React, { useEffect, useRef } from "react";
import {
    CandlestickSeries,
    createChart,
    HistogramSeries,
    IChartApi,
    ISeriesApi,
    OhlcData,
    UTCTimestamp,
} from "lightweight-charts";

// Utility function to sync time scales of multiple charts
const syncCharts = (charts: IChartApi[]) => {
    if (charts.length < 2) return;
    const [mainChart, ...otherCharts] = charts;

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) {
            otherCharts.forEach(chart => chart.timeScale().setVisibleLogicalRange(range));
        }
    });
};

// Main KLineChart component
export default function KLineChart({ symbol = "AAPL.NS" }: { symbol: string }) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const volumeContainerRef = useRef<HTMLDivElement | null>(null);

    const mainChartRef = useRef<IChartApi | null>(null);
    const volumeChartRef = useRef<IChartApi | null>(null);

    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    // Initialize charts (runs once)
    useEffect(() => {
        if (!chartContainerRef.current || !volumeContainerRef.current) return;

        // Main Chart - Candlestick
        const mainChart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 600,
            layout: {
                background: { color: "#ffffff" },
                textColor: "#0f172a",
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                visible: false,
            },
        });
        mainChartRef.current = mainChart;

        // Candlestick Series
        candleSeriesRef.current = mainChart.addSeries(CandlestickSeries, {
            upColor: "#16a34a",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#16a34a",
            wickDownColor: "#ef4444",
        });

        // Volume Chart - Histogram
        const volumeChart = createChart(volumeContainerRef.current, {
            width: volumeContainerRef.current.clientWidth,
            height: 300,
            layout: {
                background: { color: "#ffffff" },
                textColor: "#0f172a",
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
            },
        });
        volumeChartRef.current = volumeChart;

        // Histogram Series
        volumeSeriesRef.current = volumeChart.addSeries(HistogramSeries, {
            color: "#26a69a",
            priceFormat: {
                type: "volume",
            },
            priceScaleId: "volume",
        });

        // Sync time scales
        syncCharts([mainChart, volumeChart]);

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current && volumeContainerRef.current) {
                mainChart.applyOptions({ width: chartContainerRef.current.clientWidth });
                volumeChart.applyOptions({ width: volumeContainerRef.current.clientWidth });
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            mainChart.remove();
            volumeChart.remove();
            mainChartRef.current = null;
            volumeChartRef.current = null;
        };
    }, []);

    // Fetch data and update chart on symbol change
    useEffect(() => {
        if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

        const fetchData = async () => {
            try {
                // Fetch data from the API with the provided symbol
                const API_URL = `/api/trading-data/stock/price/daily?code=${symbol}`;
                const response = await fetch(API_URL);
                const data = await response.json();

                if (data.code !== 0 || !data.data || data.data.length === 0) {
                    throw new Error("No data received or API error");
                }

                // Map API data to Lightweight Charts format
                const klineData: OhlcData[] = data.data.map((d: any) => ({
                    time: Math.floor(new Date(`${String(d.date).slice(0, 4)}-${String(d.date).slice(4, 6)}-${String(d.date).slice(6, 8)}`).getTime() / 1000) as UTCTimestamp,
                    open: parseFloat(d.open),
                    high: parseFloat(d.high),
                    low: parseFloat(d.low),
                    close: parseFloat(d.close),
                }));

                const volumeData = data.data.map((d: any, index: number) => ({
                    time: klineData[index].time,
                    value: parseFloat(d.volume),
                    // Set color based on closing price vs opening price
                    color: parseFloat(d.close) >= parseFloat(d.open) ? "#16a34a" : "#ef4444",
                }));

                // Set data to the charts
                candleSeriesRef.current?.setData(klineData);
                volumeSeriesRef.current?.setData(volumeData);

                // Fit content to view
                mainChartRef.current?.timeScale().fitContent();
                volumeChartRef.current?.timeScale().fitContent();

            } catch (e) {
                console.error("Failed to fetch K-line data:", e);
                // Optional: show a user-friendly error message on the chart
            }
        };

        fetchData().then(r => {});
    }, [symbol]);

    return (
        <div className="flex flex-col w-full h-full">
            <div ref={chartContainerRef} className="flex-grow"></div>
            <div ref={volumeContainerRef} className="h-[300px]"></div>
        </div>
    );
}
