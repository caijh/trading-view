"use client";

import React, { useEffect, useRef } from "react";
import {
    CandlestickSeries,
    createChart,
    HistogramSeries,
    LineSeries,
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

// 查找时间正好等于 targetTime 的 K线点
const findClosestPoint = (data: OhlcData[], targetTime: number): OhlcData | null => {
    if (!data.length) return null;
    return data.find(d => d.time === targetTime) || null;
};

// Main KLineChart component
export default function KLineChart({symbol = "AAPL.NS"}: { symbol: string }) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const volumeContainerRef = useRef<HTMLDivElement | null>(null);

    const mainChartRef = useRef<IChartApi | null>(null);
    const volumeChartRef = useRef<IChartApi | null>(null);

    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    // keep refs for any line series we add so we can manage/cleanup later if needed
    const trendLinesRef = useRef<ISeriesApi<"Line">[]>([]);
    const priceLinesRef = useRef<any[]>([]); // price line objects (no strict typing here)

    // Initialize charts (runs once)
    useEffect(() => {
        if (!chartContainerRef.current || !volumeContainerRef.current) return;

        // Main Chart - Candlestick
        const mainChart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 600,
            layout: {
                background: {color: "#ffffff"},
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
            upColor: "#ef4444",
            downColor: "#16a34a",
            borderVisible: false,
            wickUpColor: "#ef4444",
            wickDownColor: "#16a34a",
        });

        // Volume Chart - Histogram
        const volumeChart = createChart(volumeContainerRef.current, {
            width: volumeContainerRef.current.clientWidth,
            height: 300,
            layout: {
                background: {color: "#ffffff"},
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
                mainChart.applyOptions({width: chartContainerRef.current.clientWidth});
                volumeChart.applyOptions({width: volumeContainerRef.current.clientWidth});
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);

            // optional: remove any trend lines we created (if chart still exists)
            try {
                // chart.removeSeries is the proper API to remove a series if needed
                trendLinesRef.current.forEach(ts => {
                    try {
                        mainChart.removeSeries(ts);
                    } catch { /* ignore */
                    }
                });
                trendLinesRef.current = [];
            } catch {
            }

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
                // Fetch K线数据
                const API_URL = `/api/trading-data/stock/price/daily?code=${symbol}`;
                const response = await fetch(API_URL);
                const data = await response.json();

                if (data.code !== 0 || !data.data || data.data.length === 0) {
                    throw new Error("No data received or API error");
                }

                // Map API data to Lightweight Charts format
                const klineData: OhlcData[] = data.data.map((d: any) => ({
                    time: Math.floor(
                        new Date(
                            `${String(d.date).slice(0, 4)}-${String(d.date).slice(4, 6)}-${String(d.date).slice(6, 8)}  00:00:00`
                        ).getTime() / 1000
                    ) as UTCTimestamp,
                    open: parseFloat(d.open),
                    high: parseFloat(d.high),
                    low: parseFloat(d.low),
                    close: parseFloat(d.close),
                }));

                const volumeData = data.data.map((d: any, index: number) => ({
                    time: klineData[index].time,
                    value: parseFloat(d.volume),
                    color: parseFloat(d.close) >= parseFloat(d.open) ? "#16a34a" : "#ef4444",
                }));

                // Clear any previous trend lines & price lines before drawing new ones
                try {
                    // remove previously added line series
                    trendLinesRef.current.forEach(ts => {
                        try {
                            mainChartRef.current?.removeSeries(ts);
                        } catch { /* ignore */
                        }
                    });
                    trendLinesRef.current = [];

                    // remove price lines created on candle series
                    // NOTE: series API has removePriceLine in many versions; to be safe try-catch
                    priceLinesRef.current.forEach((pl: any) => {
                        try {
                            candleSeriesRef.current?.removePriceLine?.(pl);
                        } catch { /* ignore */
                        }
                    });
                    priceLinesRef.current = [];
                } catch {
                }

                // Set data to the charts
                candleSeriesRef.current?.setData(klineData);
                volumeSeriesRef.current?.setData(volumeData);

                // Fit content to view
                mainChartRef.current?.timeScale().fitContent();
                volumeChartRef.current?.timeScale().fitContent();

                // ===== 新增：请求分板接口，画支撑/阻力/转折点 =====
                const analysisRes = await fetch(
                    `/api/trading-plus/analysis/stock?code=${symbol}`
                );
                const analysisJson = await analysisRes.json();

                if (analysisJson.code === 0 && analysisJson.data) {
                    const info = analysisJson.data;

                    // --- 支撑线 ---
                    if (info.support) {
                        try {
                            const pl = candleSeriesRef.current?.createPriceLine({
                                price: info.support,
                                color: "#22c55e",
                                lineWidth: 2,
                                lineStyle: 2, // dashed
                                title: "Support",
                            });
                            if (pl) priceLinesRef.current.push(pl);
                        } catch (err) {
                            // ignore if API variant does not support remove later
                        }
                    }

                    // --- 阻力线 ---
                    if (info.resistance) {
                        try {
                            const pl = candleSeriesRef.current?.createPriceLine({
                                price: info.resistance,
                                color: "#ef4444",
                                lineWidth: 2,
                                lineStyle: 2, // dashed
                                title: "Resistance",
                            });
                            if (pl) priceLinesRef.current.push(pl);
                        } catch (err) {
                        }
                    }

                    // --- 向上转折点 (蓝线) ---
                    if (info.turning_up_point_1 && info.turning_up_point_2) {
                        const up1 = Math.floor(new Date(info.turning_up_point_1 + " 00:00:00").getTime() / 1000);
                        const up2 = Math.floor(new Date(info.turning_up_point_2 + " 00:00:00").getTime() / 1000);

                        const p1 = findClosestPoint(klineData, up1);
                        const p2 = findClosestPoint(klineData, up2);

                        if (p1 && p2 && mainChartRef.current) {
                            const upLine = mainChartRef.current.addSeries(LineSeries, {
                                color: "#3b82f6",
                                lineWidth: 2,
                            });
                            upLine.setData([
                                {time: p2.time, value: p2.low},
                                {time: p1.time, value: p1.low},
                            ]);
                            trendLinesRef.current.push(upLine);
                        }
                    }

                    // --- 向下转折点 (橙线) ---
                    if (info.turning_down_point_1 && info.turning_down_point_2) {
                        const dn1 = Math.floor(new Date(info.turning_down_point_1 + " 00:00:00").getTime() / 1000);
                        const dn2 = Math.floor(new Date(info.turning_down_point_2 + " 00:00:00").getTime() / 1000);

                        const p1 = findClosestPoint(klineData, dn1);
                        const p2 = findClosestPoint(klineData, dn2);

                        if (p1 && p2 && mainChartRef.current) {
                            const downLine = mainChartRef.current.addSeries(LineSeries, {
                                color: "#f97316",
                                lineWidth: 2,
                            });
                            downLine.setData([
                                {time: p2.time, value: p2.high},
                                {time: p1.time, value: p1.high},
                            ]);
                            trendLinesRef.current.push(downLine);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch K-line or analysis data:", e);
            }
        };

        fetchData().then();
    }, [symbol]);

    return (
        <div className="flex flex-col w-full h-full">
            <div ref={chartContainerRef} className="flex-grow"></div>
            <div ref={volumeContainerRef} className="h-[300px]"></div>
        </div>
    );
}
