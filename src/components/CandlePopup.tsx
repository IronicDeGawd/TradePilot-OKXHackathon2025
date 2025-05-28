import React, { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { okxCEXService } from "@/lib/okx-cex";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  ComposedChart,
  Legend,
  Line,
} from "recharts";

interface OKXCandle {
  ts: string;
  o: string;
  h: string;
  l: string;
  c: string;
  vol: string;
  volCcy: string;
}

interface CandlePopupProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ChartCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: any;
}

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const candle = payload.find((p: any) => p.name === "Close");
    const volume = payload.find((p: any) => p.name === "Volume");

    if (!candle) return null;

    return (
      <div className="bg-dark-bg p-3 border border-dark-border rounded-lg shadow-lg">
        <p className="font-semibold mb-1">{label}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <p>
            Open:{" "}
            <span className="font-medium">
              ${Number(payload[0]?.payload.open).toFixed(2)}
            </span>
          </p>
          <p>
            Close:{" "}
            <span className="font-medium">
              ${Number(payload[0]?.payload.close).toFixed(2)}
            </span>
          </p>
          <p>
            High:{" "}
            <span className="text-green-400 font-medium">
              ${Number(payload[0]?.payload.high).toFixed(2)}
            </span>
          </p>
          <p>
            Low:{" "}
            <span className="text-red-400 font-medium">
              ${Number(payload[0]?.payload.low).toFixed(2)}
            </span>
          </p>
          <p className="col-span-2">
            Volume:{" "}
            <span className="text-blue-400 font-medium">
              {volume?.value >= 1000000
                ? `${(volume?.value / 1000000).toFixed(1)}M`
                : volume?.value >= 1000
                ? `${(volume?.value / 1000).toFixed(1)}K`
                : volume?.value.toFixed(0)}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const CandlePopup: React.FC<CandlePopupProps> = ({
  symbol,
  isOpen,
  onClose,
}) => {
  const [candleData, setCandleData] = useState<OKXCandle[]>([]);
  const [chartData, setChartData] = useState<ChartCandle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && symbol) {
      fetchCandleData();
    }
  }, [isOpen, symbol]);

  const fetchCandleData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await okxCEXService.getCandleData(symbol, "1H", 24);
      setCandleData(data);

      if (data.length === 0) {
        setError("No candle data available for this token");
        return;
      }

      // Transform data for the chart
      const formattedData = data.map((candle) => ({
        timestamp: parseInt(candle.ts),
        time: formatTime(candle.ts),
        open: parseFloat(candle.o),
        high: parseFloat(candle.h),
        low: parseFloat(candle.l),
        close: parseFloat(candle.c),
        volume: parseFloat(candle.volCcy),
      }));

      // Sort by timestamp ascending
      formattedData.sort((a, b) => a.timestamp - b.timestamp);
      setChartData(formattedData);
    } catch (err) {
      setError("Failed to fetch candle data");
      console.error("Error fetching candle data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: string | number) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    if (num < 1) return `$${num.toFixed(4)}`;
    return `$${num.toFixed(2)}`;
  };

  const formatTime = (timestamp: string | number) => {
    const date = new Date(
      typeof timestamp === "string" ? parseInt(timestamp) : timestamp
    );
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatVolume = (volume: string | number) => {
    const num = typeof volume === "string" ? parseFloat(volume) : volume;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatPriceAxis = (value: number) => {
    if (value < 0.01) return value.toFixed(6);
    if (value < 1) return value.toFixed(4);
    if (value > 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(2);
  };

  const formatVolumeAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const getCandleColor = (open: number, close: number) => {
    return close >= open ? "#10b981" : "#ef4444"; // green : red
  };

  if (!isOpen) return null;

  // Calculate the minimum and maximum price with some padding
  const yMin = chartData.length
    ? Math.min(...chartData.map((c) => c.low)) * 0.995
    : 0;
  const yMax = chartData.length
    ? Math.max(...chartData.map((c) => c.high)) * 1.005
    : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-primary-500" />
            <div>
              <h2 className="text-xl font-bold">{symbol} Hourly Candles</h2>
              <p className="text-sm text-gray-400">
                Last 24 hours of 1H candle data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading candle data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-2">⚠️</div>
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchCandleData}
                className="mt-4 btn-secondary text-sm"
              >
                Retry
              </button>
            </div>
          ) : chartData.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-bg p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Latest Price</p>
                  <p className="text-lg font-bold">
                    {formatPrice(chartData[chartData.length - 1]?.close || 0)}
                  </p>
                </div>
                <div className="bg-dark-bg p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">24H High</p>
                  <p className="text-lg font-bold text-green-400">
                    {formatPrice(Math.max(...chartData.map((c) => c.high)))}
                  </p>
                </div>
                <div className="bg-dark-bg p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">24H Low</p>
                  <p className="text-lg font-bold text-red-400">
                    {formatPrice(Math.min(...chartData.map((c) => c.low)))}
                  </p>
                </div>
                <div className="bg-dark-bg p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Total Volume</p>
                  <p className="text-lg font-bold text-blue-400">
                    {formatVolume(
                      chartData.reduce((sum, c) => sum + c.volume, 0)
                    )}
                  </p>
                </div>
              </div>

              {/* Price Chart */}
              <div className="mt-6 bg-dark-bg p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Price Chart (1H)</h3>

                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                        height={50}
                        tickMargin={10}
                      />
                      <YAxis
                        yAxisId="price"
                        domain={[yMin, yMax]}
                        tick={{ fill: "#9ca3af" }}
                        tickFormatter={formatPriceAxis}
                        width={60}
                        orientation="right"
                      />
                      <YAxis
                        yAxisId="volume"
                        orientation="left"
                        tickFormatter={formatVolumeAxis}
                        tick={{ fill: "#9ca3af" }}
                        width={60}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={36} />

                      {/* Candlesticks */}
                      {chartData.map((candle, index) => (
                        <React.Fragment key={index}>
                          {/* High-Low line (wick) */}
                          <Line
                            yAxisId="price"
                            type="monotone"
                            dataKey="high"
                            stroke={getCandleColor(candle.open, candle.close)}
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                            legendType="none"
                          />
                          <Line
                            yAxisId="price"
                            type="monotone"
                            dataKey="low"
                            stroke={getCandleColor(candle.open, candle.close)}
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                            legendType="none"
                          />
                          {/* Price line */}
                          <Line
                            yAxisId="price"
                            type="monotone"
                            dataKey="close"
                            stroke="#fff"
                            dot={false}
                            strokeWidth={1.5}
                            name="Close"
                          />
                        </React.Fragment>
                      ))}

                      {/* Volume bars */}
                      <Bar
                        yAxisId="volume"
                        dataKey="volume"
                        fill="#3b82f6"
                        opacity={0.5}
                        name="Volume"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No candle data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandlePopup;
