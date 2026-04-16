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
import { parse } from "date-fns";
// @ts-ignore
import enUS from 'date-fns/locale/en-US'
// @ts-ignore
import zhCN from 'date-fns/locale/zh-CN'
import toast from "react-hot-toast";

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
    const k = 2 / (period + 1);
    let previousEMA = data[0].close;

    for (let i = 0; i < data.length; i++) {
        const current = data[i];
        const currentEMA = current.close * k + previousEMA * (1 - k);
        // @ts-expect-error: adding 'value' for LineSeries
        ema.push({...current, value: currentEMA});
        previousEMA = currentEMA;
    }

    return ema;
};

// Compute Simple Moving Average (SMA)
const calculateSMA = (data: OhlcData[], period: number): OhlcData[] => {
    const sma: OhlcData[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue;

        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        const avg = sum / period;

        // @ts-expect-error: adding 'value' for LineSeries
        sma.push({ ...data[i], value: avg });
    }
    return sma;
};

const getTime = (symbol: string, datetime_str: string, format_str: string): UTCTimestamp => {
    let locale = enUS;
    if (symbol.endsWith('.SH') || symbol.endsWith('.SZ') || symbol.endsWith('.HK')) {
        locale = zhCN;
    }
    const time = parse(datetime_str, format_str, new Date(), { locale });
    return Math.floor(time.getTime() / 1000) as UTCTimestamp;
};

// 实时价格轮询间隔（毫秒）
const REALTIME_POLL_INTERVAL = 30_000; // 30 秒

// Main KLineChart component
export default function KLineChart({ symbol, onAnalysisDataAction, onCrosshairMoveAction, onLatestOHLCAction }: {
    symbol: string,
    onAnalysisDataAction: (data: any) => void,
    onCrosshairMoveAction?: (data: { open: number; high: number; low: number; close: number } | null) => void,
    onLatestOHLCAction?: (data: { open: number; high: number; low: number; close: number } | null) => void
}) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const volumeContainerRef = useRef<HTMLDivElement | null>(null);

    const mainChartRef = useRef<IChartApi | null>(null);
    const volumeChartRef = useRef<IChartApi | null>(null);

    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const candleSeriesMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    const trendLinesRef = useRef<ISeriesApi<"Line">[]>([]);
    const priceLinesRef = useRef<any[]>([]);

    const eam5SeriesRef = useRef<ISeriesApi<"Line"> | undefined>(undefined);
    const sma20SeriesRef = useRef<ISeriesApi<"Line"> | undefined>(undefined);

    const klineDataRef = useRef<OhlcData[]>([]);

    // 实时轮询的 timer ref，symbol 切换或闭市时清除
    const realtimeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const onCrosshairMoveRef = useRef(onCrosshairMoveAction);
    useEffect(() => { onCrosshairMoveRef.current = onCrosshairMoveAction; }, [onCrosshairMoveAction]);

    const onLatestOHLCRef = useRef(onLatestOHLCAction);
    useEffect(() => { onLatestOHLCRef.current = onLatestOHLCAction; }, [onLatestOHLCAction]);

    let locale = 'ja-JP';
    if (symbol.endsWith('.NS')) locale = 'en-US';

    // ─── 初始化图表（只执行一次）────────────────────────────────────────────
    useEffect(() => {
        if (!chartContainerRef.current || !volumeContainerRef.current) return;

        const mainChart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: window.innerHeight - 500,
            layout: { background: { color: "#ffffff" }, textColor: "#0f172a" },
            rightPriceScale: { borderVisible: false },
            timeScale: { visible: false },
            crosshair: {
                mode: 1,
                vertLine: { visible: true, labelVisible: true },
                horzLine: { visible: true, labelVisible: true },
            },
        });
        mainChart.applyOptions({ localization: { locale, dateFormat: 'yyyy-MM-dd' } });
        mainChartRef.current = mainChart;

        candleSeriesRef.current = mainChart.addSeries(CandlestickSeries, {
            upColor: "#16a34a",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#16a34a",
            wickDownColor: "#ef4444",
        });
        candleSeriesMarkersRef.current = createSeriesMarkers(candleSeriesRef.current, []);

        const volumeChart = createChart(volumeContainerRef.current, {
            width: volumeContainerRef.current.clientWidth,
            height: 300,
            layout: { background: { color: "#ffffff" }, textColor: "#0f172a" },
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false, timeVisible: true },
        });
        volumeChart.applyOptions({ localization: { locale, dateFormat: 'yyyy-MM-dd' } });
        volumeChartRef.current = volumeChart;

        volumeSeriesRef.current = volumeChart.addSeries(HistogramSeries, {
            color: "#26a69a",
            priceFormat: { type: "volume" },
            priceScaleId: "volume",
        });

        syncCharts([mainChart, volumeChart]);

        mainChart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time) {
                onCrosshairMoveRef.current?.(null);
                return;
            }
            const dataPoint = klineDataRef.current.find(d => d.time === param.time);
            if (dataPoint) {
                onCrosshairMoveRef.current?.({
                    open: dataPoint.open, high: dataPoint.high,
                    low: dataPoint.low, close: dataPoint.close,
                });
            } else {
                onCrosshairMoveRef.current?.(null);
            }
        });

        const handleResize = () => {
            if (chartContainerRef.current && volumeContainerRef.current) {
                mainChart.applyOptions({ width: chartContainerRef.current.clientWidth });
                volumeChart.applyOptions({ width: volumeContainerRef.current.clientWidth });
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            try {
                trendLinesRef.current.forEach(ts => { try { mainChart.removeSeries(ts); } catch { } });
                trendLinesRef.current = [];
            } catch { }
            mainChart.remove();
            volumeChart.remove();
            mainChartRef.current = null;
            volumeChartRef.current = null;
        };
    }, []);

    // ─── symbol 变化时：加载历史数据 + 分析线 + 按需开启实时轮询 ────────────
    useEffect(() => {
        if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

        // 每次 symbol 变化先停掉旧轮询
        if (realtimeTimerRef.current) {
            clearInterval(realtimeTimerRef.current);
            realtimeTimerRef.current = null;
        }

        const controller = new AbortController();
        const { signal } = controller;

        // 立即清图，避免旧图线残留
        const clearOverlays = () => {
            try {
                trendLinesRef.current.forEach(ts => { try { mainChartRef.current?.removeSeries(ts); } catch { } });
                trendLinesRef.current = [];
                priceLinesRef.current.forEach((pl: any) => { try { candleSeriesRef.current?.removePriceLine?.(pl); } catch { } });
                priceLinesRef.current = [];
                candleSeriesMarkersRef.current?.setMarkers([]);
            } catch { }
        };

        // ── 实时价格：用接口数据更新/追加最新一根日线 ──────────────────────
        const applyRealtimePrice = (priceData: any) => {
            if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

            const dateStr = priceData.time.split(' ')[0] + ' 09:30:00';
            const ts = getTime(symbol, dateStr, 'yyyy-MM-dd HH:mm:ss');

            const updatedCandle: OhlcData = {
                time: ts,
                open:  parseFloat(priceData.open),
                high:  parseFloat(priceData.high),
                low:   parseFloat(priceData.low),
                close: parseFloat(priceData.close),
            };

            candleSeriesRef.current.update(updatedCandle);
            volumeSeriesRef.current.update({
                time: ts,
                value: parseFloat(priceData.volume),
                color: updatedCandle.close >= updatedCandle.open ? "#16a34a" : "#ef4444",
            });

            // ── 同步更新本地缓存 ─────────────────────────────────────────────────
            const idx = klineDataRef.current.findIndex(d => d.time === ts);
            if (idx >= 0) {
                klineDataRef.current[idx] = updatedCandle;
            } else {
                klineDataRef.current.push(updatedCandle);
            }

            // ── 更新均线（只 update 最新一个点，不做全量 setData）────────────────
            const latestKline = klineDataRef.current;

            // EMA5：k 值 = 2/(5+1)，从头迭代拿到最新 EMA 值
            if (eam5SeriesRef.current && latestKline.length >= 1) {
                const ema5All = calculateEMA(latestKline, 5);
                const last = ema5All[ema5All.length - 1];
                if (last) eam5SeriesRef.current.update(last as any);
            }

            // SMA20：只需最近 20 根收盘价均值
            if (sma20SeriesRef.current && latestKline.length >= 20) {
                const sum = latestKline.slice(-20).reduce((acc, d) => acc + d.close, 0);
                sma20SeriesRef.current.update({ time: ts, value: sum / 20 } as any);
            }

            // ── 通知父组件最新 OHLC ──────────────────────────────────────────────
            onLatestOHLCRef.current?.({
                open: updatedCandle.open, high: updatedCandle.high,
                low: updatedCandle.low, close: updatedCandle.close,
            });
        };

        // ── 启动实时轮询 ────────────────────────────────────────────────────
        const startRealtimePolling = () => {
            // 立即拉一次
            fetchRealtimePrice().then(r => {});
            realtimeTimerRef.current = setInterval(fetchRealtimePrice, REALTIME_POLL_INTERVAL);
        };

        const fetchRealtimePrice = async () => {
            // 组件已卸载或 symbol 已切换则停止
            if (signal.aborted) {
                if (realtimeTimerRef.current) {
                    clearInterval(realtimeTimerRef.current);
                    realtimeTimerRef.current = null;
                }
                return;
            }
            try {
                const res = await fetch(`/api/trading-data/stock/price?code=${symbol}`);
                if (!res.ok) return;
                const json = await res.json();
                if (json.code === 0 && json.data) {
                    let open = parseFloat(json.data.open)
                    if (open > 0) {
                        applyRealtimePrice(json.data);
                    }
                }
            } catch {
                // 网络抖动静默处理，下次 interval 继续
            }
        };

        // ── 主流程：加载历史 K 线 ────────────────────────────────────────────
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/trading-data/stock/price/daily?code=${symbol}`, { signal });
                if (!response.ok) {
                    toast.error(`HTTP error! status: ${response.status}`);
                    return;
                }
                const data = await response.json();

                if (data.code !== 0 || !data.data || data.data.length === 0) {
                    toast.error("No data received or API error");
                    return;
                }

                const klineData: OhlcData[] = data.data.map((d: any) => ({
                    time: getTime(symbol, String(d.time), 'yyyyMMddHHmmss'),
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

                clearOverlays();

                candleSeriesRef.current?.setData(klineData);
                volumeSeriesRef.current?.setData(volumeData);
                klineDataRef.current = klineData;

                // EMA5
                const eam5Data = calculateEMA(klineData, 5);
                if (!eam5SeriesRef.current) {
                    eam5SeriesRef.current = mainChartRef.current?.addSeries(LineSeries, {
                        color: "#ff6347", lineWidth: 2, lineStyle: 0, title: 'EMA5',
                    });
                }
                eam5SeriesRef.current?.setData(eam5Data);

                // SMA20
                const sma20Data = calculateSMA(klineData, 20);
                if (!sma20SeriesRef.current) {
                    sma20SeriesRef.current = mainChartRef.current?.addSeries(LineSeries, {
                        color: "#8b5cf6", lineWidth: 2, lineStyle: 0, title: "SMA20",
                    });
                }
                sma20SeriesRef.current?.setData(sma20Data);

                mainChartRef.current?.timeScale().fitContent();
                volumeChartRef.current?.timeScale().fitContent();

                // 通知父组件最新静态 OHLC
                const latestData = klineData[klineData.length - 1];
                onLatestOHLCRef.current?.({
                    open: latestData.open, high: latestData.high,
                    low: latestData.low, close: latestData.close,
                });

                // ── 检查市场状态，决定是否开启实时轮询 ──────────────────────
                const statusRes = await fetch(`/api/trading-data/market/status?stock_code=${symbol}`, { signal });
                if (signal.aborted) return;

                if (statusRes.ok) {
                    const statusJson = await statusRes.json();
                    // data 为 "MarketOpen" 或其他非 "MarketClosed" 字符串视为开市
                    const isOpen = statusJson.code === 0 && statusJson.data !== "MarketClosed";
                    if (isOpen) {
                        startRealtimePolling();
                    }
                }

                // ── 分析接口：画支撑/阻力/转折点 ─────────────────────────────
                const analysisRes = await fetch(
                    `/api/trading-plus/analysis/stock?code=${symbol}`,
                    { signal }
                );
                if (signal.aborted) return;

                const analysisJson = await analysisRes.json();

                if (analysisJson.code === 0 && analysisJson.data) {
                    const info = analysisJson.data;
                    onAnalysisDataAction(info);

                    // 支撑线
                    if (info.support) {
                        try {
                            const pl = candleSeriesRef.current?.createPriceLine({
                                price: info.support, color: "#22c55e",
                                lineWidth: 2, lineStyle: 2, title: "Support",
                            });
                            if (pl) priceLinesRef.current.push(pl);
                        } catch { }
                    }

                    // 阻力线
                    if (info.resistance) {
                        try {
                            const pl = candleSeriesRef.current?.createPriceLine({
                                price: info.resistance, color: "#ef4444",
                                lineWidth: 2, lineStyle: 2, title: "Resistance",
                            });
                            if (pl) priceLinesRef.current.push(pl);
                        } catch { }
                    }

                    // 向上转折点（蓝线）
                    if (info.turning_up_point_1 && info.turning_up_point_2) {
                        const up2 = getTime(symbol, info.turning_up_point_1, 'yyyy-MM-dd HH:mm:ss');
                        const up1 = getTime(symbol, info.turning_up_point_2, 'yyyy-MM-dd HH:mm:ss');
                        const p1 = findClosestPoint(klineData, up1);
                        const p2 = findClosestPoint(klineData, up2);

                        if (p1 && p2 && mainChartRef.current) {
                            const idxLast = klineData.length - 1;
                            const last = klineData[idxLast];
                            const idx1 = klineData.findIndex(d => d.time === p1.time);
                            const idx2 = klineData.findIndex(d => d.time === p2.time);
                            const slope = (p2.low - p1.low) / (idx2 - idx1);
                            const intercept = p1.low - slope * idx1;

                            const upLine = mainChartRef.current.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 2, lineStyle: 0 });
                            upLine.setData([{ time: p1.time, value: p1.low }, { time: p2.time, value: p2.low }]);
                            trendLinesRef.current.push(upLine);

                            const dashedLine = mainChartRef.current.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 2, lineStyle: 1 });
                            dashedLine.setData([{ time: p2.time, value: p2.low }, { time: last.time, value: slope * idxLast + intercept }]);
                            trendLinesRef.current.push(dashedLine);
                        }
                    }

                    // 向下转折点（橙线）
                    if (info.turning_down_point_1 && info.turning_down_point_2) {
                        const dn2 = getTime(symbol, info.turning_down_point_1, 'yyyy-MM-dd HH:mm:ss');
                        const dn1 = getTime(symbol, info.turning_down_point_2, 'yyyy-MM-dd HH:mm:ss');
                        const p1 = findClosestPoint(klineData, dn1);
                        const p2 = findClosestPoint(klineData, dn2);

                        if (p1 && p2 && mainChartRef.current) {
                            const idxLast = klineData.length - 1;
                            const last = klineData[idxLast];
                            const idx1 = klineData.findIndex(d => d.time === p1.time);
                            const idx2 = klineData.findIndex(d => d.time === p2.time);
                            const slope = (p2.high - p1.high) / (idx2 - idx1);
                            const intercept = p1.high - slope * idx1;

                            const downLine = mainChartRef.current.addSeries(LineSeries, { color: "#f97316", lineWidth: 2, lineStyle: 0 });
                            downLine.setData([{ time: p1.time, value: p1.high }, { time: p2.time, value: p2.high }]);
                            trendLinesRef.current.push(downLine);

                            const dashedDownLine = mainChartRef.current.addSeries(LineSeries, { color: "#f97316", lineWidth: 2, lineStyle: 1 });
                            dashedDownLine.setData([{ time: p2.time, value: p2.high }, { time: last.time, value: slope * idxLast + intercept }]);
                            trendLinesRef.current.push(dashedDownLine);
                        }
                    }

                    const markers: SeriesMarker<UTCTimestamp>[] = [];

                    // 转折点数组
                    if (info.turning && Array.isArray(info.turning) && info.turning.length > 1) {
                        const turningPoints = info.turning
                            .map((item: { time: string; type: number }) => {
                                const time = item.time;
                                const ts = getTime(symbol, time, 'yyyy-MM-dd HH:mm:ss');
                                const p = findClosestPoint(klineData, ts);
                                if (!p) return null;
                                return { time: p.time, value: item.type === 1 ? p.low : p.high };
                            })
                            .filter(Boolean) as { time: UTCTimestamp; value: number }[];

                        if (turningPoints.length > 1 && mainChartRef.current) {
                            const turningLine = mainChartRef.current.addSeries(LineSeries, { color: "#374151", lineWidth: 2 });
                            turningLine.setData(turningPoints);
                            trendLinesRef.current.push(turningLine);

                            const last = turningPoints[turningPoints.length - 1];
                            const prev = turningPoints[turningPoints.length - 2];
                            let markerColor = "#6b7280";
                            let markerShape: "arrowUp" | "arrowDown" | "circle" = "circle";
                            let markerPosition: "aboveBar" | "belowBar" = "aboveBar";

                            if (last.value < prev.value) {
                                markerColor = "#22c55e"; markerShape = "arrowUp"; markerPosition = "belowBar";
                            } else if (last.value > prev.value) {
                                markerColor = "#ef4444"; markerShape = "arrowDown"; markerPosition = "aboveBar";
                            }
                            markers.push({ time: last.time, position: markerPosition, color: markerColor, shape: markerShape, text: "Turning" });
                        }
                    }

                    // K 线形态 Markers
                    if (info.candlestick_patterns && Array.isArray(info.candlestick_patterns)) {
                        const markerMap = new Map<UTCTimestamp, SeriesMarker<UTCTimestamp>>();
                        info.candlestick_patterns.forEach((pattern: any) => {
                            pattern.match_indexes.forEach((dateStr: string) => {
                                const ts = Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;
                                let color = "#facc15";
                                let shape: "arrowUp" | "arrowDown" | "circle" = "circle";
                                let position: "aboveBar" | "belowBar" = "aboveBar";

                                if (info.candlestick_signal === 1) { color = "#22c55e"; shape = "arrowUp"; position = "belowBar"; }
                                else if (info.candlestick_signal === -1) { color = "#ef4444"; shape = "arrowDown"; position = "aboveBar"; }

                                if (markerMap.has(ts)) {
                                    const existing = markerMap.get(ts)!;
                                    existing.text = existing.text ? `${existing.text}, ${pattern.label}` : pattern.label;
                                } else {
                                    markerMap.set(ts, { time: ts, position, color, shape, text: pattern.label });
                                }
                            });
                        });
                        markers.push(...Array.from(markerMap.values()));
                    }
                    candleSeriesMarkersRef.current?.setMarkers(markers);
                }
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                console.error("Failed to fetch K-line or analysis data:", e);
            }
        };

        clearOverlays();
        fetchData().then();

        return () => {
            // symbol 切换或卸载：取消所有请求 + 停止实时轮询
            controller.abort();
            if (realtimeTimerRef.current) {
                clearInterval(realtimeTimerRef.current);
                realtimeTimerRef.current = null;
            }
        };
    }, [symbol]);

    return (
        <div className="flex flex-col w-full h-full">
            <div ref={chartContainerRef} className="flex-grow"></div>
            <div ref={volumeContainerRef} className="h-[300px]"></div>
        </div>
    );
}
