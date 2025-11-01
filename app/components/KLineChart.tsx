"use client";

import React, { useEffect, useRef } from "react";
import {
    CandlestickSeries,
    createChart,
    createSeriesMarkers,
    HistogramSeries,
    IChartApi,
    ISeriesApi,
    ISeriesMarkersPluginApi,
    LineSeries,
    OhlcData,
    SeriesMarker,
    Time,
    UTCTimestamp
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


// Compute Exponential Moving Average (EMA)
const calculateEMA = (data: OhlcData[], period: number): OhlcData[] => {
    const ema: OhlcData[] = [];
    const k = 2 / (period + 1); // smoothing factor
    let previousEMA = data[0].close; // First EMA is just the first close

    for (let i = 0; i < data.length; i++) {
        const current = data[i];
        const currentEMA = current.close * k + previousEMA * (1 - k);
        // @ts-expect-error: The 'value' property is not present on the original type, but it's being added here to store the EMA value
        ema.push({...current, value: currentEMA}); // Store value as 'value' key

        previousEMA = currentEMA;
    }

    return ema;
};

// Main KLineChart component
export default function KLineChart({symbol = "AAPL.NS"}: { symbol: string }) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const volumeContainerRef = useRef<HTMLDivElement | null>(null);

    const mainChartRef = useRef<IChartApi | null>(null);
    const volumeChartRef = useRef<IChartApi | null>(null);

    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const candleSeriesMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    // keep refs for any line series we add so we can manage/cleanup later if needed
    const trendLinesRef = useRef<ISeriesApi<"Line">[]>([]);
    const priceLinesRef = useRef<any[]>([]); // price line objects (no strict typing here)

    const eam5SeriesRef = useRef<ISeriesApi<"Line"> | undefined>(undefined); // Store EMA5 series

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
        candleSeriesMarkersRef.current = createSeriesMarkers(candleSeriesRef.current, [])

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
                volumeSeriesRef.current?.setData(volumeData)

                // Calculate EMA5 data
                const eam5Data = calculateEMA(klineData, 5);
                // Add EMA5 Line
                if (!eam5SeriesRef.current) {
                    eam5SeriesRef.current = mainChartRef.current?.addSeries(LineSeries, {
                        color: "#ff6347", // Tomato color for EMA5
                        lineWidth: 2,
                        lineStyle: 0, // Solid line
                    });
                }
                eam5SeriesRef.current?.setData(eam5Data);
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
                        const up2 = Math.floor(new Date(info.turning_up_point_1 + " 00:00:00").getTime() / 1000);
                        const up1 = Math.floor(new Date(info.turning_up_point_2 + " 00:00:00").getTime() / 1000);

                        const p1 = findClosestPoint(klineData, up1);
                        const p2 = findClosestPoint(klineData, up2);

                        if (p1 && p2 && mainChartRef.current) {
                            const idx1 = klineData.findIndex(d => d.time === p1.time);
                            const idx2 = klineData.findIndex(d => d.time === p2.time);
                            const idxLast = klineData.length - 1;
                            const last = klineData[idxLast];

                            // 将 time 映射为索引，避免直接用 timestamp 算斜率
                            const x1 = idx1;
                            const x2 = idx2;
                            const y1 = p1.low;
                            const y2 = p2.low;

                            const slope = (y2 - y1) / (x2 - x1);
                            const intercept = y1 - slope * x1;
                            const yLast = slope * idxLast + intercept;

                            // --- 实线部分 ---
                            const upLine = mainChartRef.current.addSeries(LineSeries, {
                                color: "#3b82f6",
                                lineWidth: 2,
                                lineStyle: 0, // 实线
                            });
                            upLine.setData([
                                {time: p1.time, value: p1.low},
                                {time: p2.time, value: p2.low},
                            ]);
                            trendLinesRef.current.push(upLine);

                            // --- 虚线延伸部分 ---
                            const dashedLine = mainChartRef.current.addSeries(LineSeries, {
                                color: "#3b82f6",
                                lineWidth: 2,
                                lineStyle: 1, // 虚线
                            });
                            dashedLine.setData([
                                {time: p2.time, value: p2.low},
                                {time: last.time, value: yLast},
                            ]);
                            trendLinesRef.current.push(dashedLine);
                        }
                    }


                    // --- 向下转折点 (橙线) ---
                    if (info.turning_down_point_1 && info.turning_down_point_2) {
                        const dn2 = Math.floor(new Date(info.turning_down_point_1 + " 00:00:00").getTime() / 1000);
                        const dn1 = Math.floor(new Date(info.turning_down_point_2 + " 00:00:00").getTime() / 1000);

                        const p1 = findClosestPoint(klineData, dn1);
                        const p2 = findClosestPoint(klineData, dn2);

                        if (p1 && p2 && mainChartRef.current) {
                            const idx1 = klineData.findIndex(d => d.time === p1.time);
                            const idx2 = klineData.findIndex(d => d.time === p2.time);
                            const idxLast = klineData.length - 1;
                            const last = klineData[idxLast];

                            // 将 time 映射为索引，计算线性方程
                            const x1 = idx1;
                            const x2 = idx2;
                            const y1 = p1.high;
                            const y2 = p2.high;

                            const slope = (y2 - y1) / (x2 - x1);
                            const intercept = y1 - slope * x1;
                            const yLast = slope * idxLast + intercept;

                            // --- 实线部分 ---
                            const downLine = mainChartRef.current.addSeries(LineSeries, {
                                color: "#f97316", // 橙色
                                lineWidth: 2,
                                lineStyle: 0, // 实线
                            });
                            downLine.setData([
                                {time: p1.time, value: p1.high},
                                {time: p2.time, value: p2.high},
                            ]);
                            trendLinesRef.current.push(downLine);

                            // --- 虚线延伸部分 ---
                            const dashedDownLine = mainChartRef.current.addSeries(LineSeries, {
                                color: "#f97316",
                                lineWidth: 2,
                                lineStyle: 1, // 虚线
                            });
                            dashedDownLine.setData([
                                {time: p2.time, value: p2.high},
                                {time: last.time, value: yLast},
                            ]);
                            trendLinesRef.current.push(dashedDownLine);
                        }
                    }


                    const markers: SeriesMarker<UTCTimestamp>[] = []
                    // --- 转折点数组 (箭头自动方向+颜色) ---
                    if (info.turning && Array.isArray(info.turning) && info.turning.length > 1) {
                        const turningPoints = info.turning
                            .map((item: { time: string; type: number }) => {
                                const ts = Math.floor(new Date(item.time).getTime() / 1000) as UTCTimestamp;
                                const p = findClosestPoint(klineData, ts);
                                if (!p) return null;

                                return {
                                    time: p.time,
                                    value: item.type === 1 ? p.low : p.high,
                                };
                            })
                            .filter(Boolean) as { time: UTCTimestamp; value: number }[];

                        if (turningPoints.length > 1 && mainChartRef.current) {
                            const turningLine = mainChartRef.current.addSeries(LineSeries, {
                                color: "#374151", // 黑色带一点灰
                                lineWidth: 2,
                            });
                            turningLine.setData(turningPoints);
                            trendLinesRef.current.push(turningLine);

                            // 最后一个点决定箭头方向
                            const last = turningPoints[turningPoints.length - 1];
                            const prev = turningPoints[turningPoints.length - 2];

                            let markerColor = "#6b7280"; // 默认灰
                            let markerShape: "arrowUp" | "arrowDown" | "circle" = "circle";
                            let markerPosition: "aboveBar" | "belowBar" = "aboveBar";

                            if (last.value < prev.value) {
                                // 上涨转折
                                markerColor = "#22c55e"; // 绿色
                                markerShape = "arrowUp";
                                markerPosition = "belowBar";
                            } else if (last.value > prev.value) {
                                // 下跌转折
                                markerColor = "#ef4444"; // 红色
                                markerShape = "arrowDown";
                                markerPosition = "aboveBar";
                            }

                            markers.push({
                                time: last.time,
                                position: markerPosition,
                                color: markerColor,
                                shape: markerShape,
                                text: "Turning",
                            });
                        }
                    }


                    // --- 修复标记（Markers）逻辑 ---
                    if (info.candlestick_patterns && Array.isArray(info.candlestick_patterns)) {
                        const markerMap = new Map<UTCTimestamp, SeriesMarker<UTCTimestamp>>();

                        info.candlestick_patterns.forEach((pattern: any) => {
                            pattern.match_indexes.forEach((dateStr: string) => {
                                const ts = Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;

                                let color = "#facc15"; // neutral
                                let shape: "arrowUp" | "arrowDown" | "circle" = "circle";
                                let position: "aboveBar" | "belowBar" = "aboveBar";

                                if (info.candlestick_signal === 1) { // 看涨
                                    color = "#22c55e"; // green
                                    shape = "arrowUp";
                                    position = "belowBar";
                                } else if (info.candlestick_signal === -1) { // 看跌
                                    color = "#ef4444"; // red
                                    shape = "arrowDown";
                                    position = "aboveBar";
                                }

                                // 如果同一天已有 marker，则合并文字
                                if (markerMap.has(ts)) {
                                    const existing = markerMap.get(ts)!;
                                    existing.text = existing.text
                                        ? `${existing.text}, ${pattern.label}`
                                        : pattern.label;
                                    // 保持颜色/形状/位置不变（或根据优先级更新）
                                } else {
                                    markerMap.set(ts, {
                                        time: ts,
                                        position,
                                        color,
                                        shape,
                                        text: pattern.label,
                                    });
                                }
                            });
                        });

                        markers.push(...(Array.from(markerMap.values())));
                    }
                    candleSeriesMarkersRef.current?.setMarkers(markers);
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
