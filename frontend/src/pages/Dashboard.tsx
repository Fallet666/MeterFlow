import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api";
import { Meter, Property } from "../App";

const RESOURCE_LABELS: Record<string, string> = {
  electricity: "Электричество",
  cold_water: "Холодная вода",
  hot_water: "Горячая вода",
  gas: "Газ",
  heating: "Отопление",
};

interface Props {
  selectedProperty: number | null;
  properties: Property[];
  onSelectProperty: (id: number) => void;
}

interface ForecastResponse {
  forecast_amount: number;
}

interface AnalyticsResponse {
  monthly: { month: string; total_amount: number }[];
  summary: { total_amount: number };
  monthly_by_resource?: { month: string; resource_type: string; consumption: number; amount: number }[];
}

type FavoriteChartConfig = {
  id: string;
  name: string;
  properties: number[];
  resourceType: string;
  rangePreset: "year" | "half" | "two";
};

const FAVORITES_KEY = "mf_favorite_charts";
const RANGE_LABELS: Record<FavoriteChartConfig["rangePreset"], string> = {
  year: "Год",
  half: "6 месяцев",
  two: "2 года",
};

const getMonthKey = (dateObj: Date) => `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;

export function Dashboard({ selectedProperty, properties, onSelectProperty }: Props) {
  const [forecast, setForecast] = useState<number>(0);
  const [readings, setReadings] = useState<any[]>([]);
  const [propertyReadings, setPropertyReadings] = useState<any[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [estimatorMeter, setEstimatorMeter] = useState<number | null>(null);
  const [charges, setCharges] = useState<AnalyticsResponse | null>(null);
  const [favoriteCharts, setFavoriteCharts] = useState<FavoriteChartConfig[]>([]);
  const [favoritesData, setFavoritesData] = useState<Record<string, AnalyticsResponse>>({});

  useEffect(() => {
    if (!selectedProperty && properties.length > 0) {
      onSelectProperty(properties[0].id);
    }
  }, [properties]);

  useEffect(() => {
    if (selectedProperty) {
      api
        .get<ForecastResponse>("analytics/forecast/", { params: { property: selectedProperty } })
        .then(({ data }) => setForecast(Number(data.forecast_amount) || 0));
      api
        .get("readings/", { params: { meter__property: selectedProperty } })
        .then(({ data }) => {
          setReadings(data.slice(0, 5));
          setPropertyReadings(data);
        });
      api
        .get<Meter[]>("meters/", { params: { property: selectedProperty } })
        .then(({ data }) => {
          setMeters(data);
          if (!estimatorMeter && data.length) setEstimatorMeter(data[0].id);
        });
      const startDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      api
        .get<AnalyticsResponse>("analytics/", {
          params: {
            property: selectedProperty,
            start_year: startDate.getFullYear(),
            start_month: startDate.getMonth() + 1,
            end_year: new Date().getFullYear(),
            end_month: new Date().getMonth() + 1,
          },
        })
        .then(({ data }) => setCharges(data));
    }
  }, [selectedProperty, estimatorMeter]);

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavoriteCharts(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    favoriteCharts.forEach((favorite) => {
      api
        .get<AnalyticsResponse>("analytics/", {
          params: {
            properties: favorite.properties.join(","),
            resource_type: favorite.resourceType || undefined,
            ...getPeriodFromPreset(favorite.rangePreset),
          },
        })
        .then(({ data }) =>
          setFavoritesData((prev) => ({
            ...prev,
            [favorite.id]: data,
          })),
        )
        .catch(() => undefined);
    });
  }, [favoriteCharts]);

  const today = new Date();
  const currentMonthKey = getMonthKey(today);
  const previousMonthKey = getMonthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));

  const currentMonthAmount =
    charges?.monthly.find((m) => m.month === currentMonthKey)?.total_amount ?? 0;
  const previousMonthAmount =
    charges?.monthly.find((m) => m.month === previousMonthKey)?.total_amount ?? 0;

  const getMeterLabel = (reading: any) => {
    const meter = reading.meter_detail || {};
    const label = RESOURCE_LABELS[meter.resource_type] || meter.resource_type || "Счётчик";
    const serial = meter.serial_number || meter.id || reading.meter;
    const unit = meter.unit ? ` ${meter.unit}` : "";
    return `${label} – ${serial}${unit ? ` ${unit}` : ""}`;
  };

  const getValueWithUnit = (reading: any) => {
    const unit = reading.unit || reading.meter_detail?.unit;
    return `${reading.value} ${unit || ""}`.trim();
  };

  const getPeriodFromPreset = (preset: FavoriteChartConfig["rangePreset"]) => {
    const monthsMap: Record<FavoriteChartConfig["rangePreset"], number> = {
      year: 12,
      half: 6,
      two: 24,
    };
    const months = monthsMap[preset];
    const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
    return {
      start_year: start.getFullYear(),
      start_month: start.getMonth() + 1,
      end_year: today.getFullYear(),
      end_month: today.getMonth() + 1,
    };
  };

  const estimatorSeries = useMemo(() => {
    if (!estimatorMeter) return [];
    return propertyReadings
      .filter((r) => r.meter === estimatorMeter)
      .sort((a, b) => (a.reading_date > b.reading_date ? 1 : -1))
      .slice(-10)
      .map((item) => ({
        date: item.reading_date,
        value: Number(item.value),
      }));
  }, [propertyReadings, estimatorMeter]);

  const estimator = useMemo(() => {
    if (estimatorSeries.length < 2) return { daily: 0, monthly: 0 };
    const deltas: number[] = [];
    for (let i = 1; i < estimatorSeries.length; i += 1) {
      const prev = estimatorSeries[i - 1];
      const curr = estimatorSeries[i];
      const dayDiff = Math.max(
        1,
        (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24),
      );
      deltas.push((curr.value - prev.value) / dayDiff);
    }
    const avgDaily = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    const rateSamples = propertyReadings
      .filter((r) => r.meter === estimatorMeter && r.amount_value)
      .sort((a, b) => (a.reading_date > b.reading_date ? -1 : 1))
      .slice(0, 6);
    const unitRate =
      rateSamples.length > 0
        ? rateSamples.reduce((sum, r) => sum + Number(r.amount_value) / Math.max(1, Number(r.value)), 0) /
          rateSamples.length
        : 0;

    return {
      daily: Math.max(0, avgDaily),
      monthly: Math.max(0, avgDaily * 30 * (unitRate || 1)),
    };
  }, [estimatorSeries, propertyReadings, estimatorMeter]);

  const healthStatuses = useMemo(() => {
    const map: Record<number, { status: string; tone: string; hint: string }> = {};
    meters.forEach((m) => {
      const meterReadings = propertyReadings
        .filter((r) => r.meter === m.id)
        .sort((a, b) => (a.reading_date < b.reading_date ? 1 : -1));

      if (!meterReadings.length) {
        map[m.id] = { status: "нет данных", tone: "gray", hint: "Показаний пока нет" };
        return;
      }

      const latest = new Date(meterReadings[0].reading_date);
      const daysDiff = (Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 60) {
        map[m.id] = { status: "неактивен", tone: "amber", hint: "Нет записей более 60 дней" };
        return;
      }

      const deltas: number[] = [];
      meterReadings.slice(0, 6).forEach((r, idx) => {
        const next = meterReadings[idx + 1];
        if (next) deltas.push(Number(r.value) - Number(next.value));
      });
      const spikes = deltas.filter((d, i) => i > 0 && d > deltas[i - 1] * 1.5);
      if (spikes.length > 0) {
        map[m.id] = { status: "аномалия", tone: "rose", hint: "Резкий скачок последних записей" };
        return;
      }

      const avg = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
      const variance =
        deltas.reduce((sum, d) => sum + (d - avg) ** 2, 0) / Math.max(1, deltas.length);
      if (variance < 1 && deltas.length >= 3) {
        map[m.id] = { status: "номинал", tone: "emerald", hint: "Стабильные показания" };
        return;
      }

      const recentCount = meterReadings.filter((r) => {
        const diff = (Date.now() - new Date(r.reading_date).getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 30;
      }).length;

      if (recentCount >= 4) {
        map[m.id] = { status: "активен", tone: "cyan", hint: "Регулярные записи" };
      } else {
        map[m.id] = { status: "под наблюдением", tone: "blue", hint: "Записи редкие" };
      }
    });

    return map;
  }, [meters, propertyReadings]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Дашборд</h1>
          <p className="subtitle">Премиальная консоль состояния потребления и начислений.</p>
        </div>
        <div className="pill ghost">Ctrl + K — палитра команд</div>
      </div>

      <div className="card glass">
        <div className="section-grid">
          <div>
            <p className="subtitle">Активный объект</p>
            <select
              value={selectedProperty || ""}
              onChange={(e) => onSelectProperty(Number(e.target.value))}
            >
              <option value="" disabled>
                Выберите объект
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="subtitle">Прогноз на текущий месяц</p>
            <h3 className="accent-number">{forecast.toFixed(2)} ₽</h3>
            <p className="subtitle subtle">На основе тренда за прошлые месяцы</p>
          </div>
          <div>
            <p className="subtitle">Итог текущего месяца</p>
            <h3 className="accent-number">{currentMonthAmount.toFixed(2)} ₽</h3>
            <p className="subtitle subtle">{currentMonthKey}</p>
          </div>
          <div>
            <p className="subtitle">Дельта к предыдущему</p>
            <h3 className="accent-number">{(currentMonthAmount - previousMonthAmount).toFixed(2)} ₽</h3>
            <p className="subtitle subtle">Сравнение с {previousMonthKey}</p>
          </div>
        </div>
      </div>

      {favoriteCharts.length > 0 && (
        <div className="card glass">
          <div className="page-header" style={{ alignItems: "center" }}>
            <h3>Избранные графики</h3>
            <p className="subtitle">Мини-виджеты из конструктора аналитики</p>
          </div>
          <div className="favorite-grid">
            {favoriteCharts.slice(0, 3).map((fav) => {
              const favData = favoritesData[fav.id];
              return (
                <div className="favorite-chart" key={fav.id}>
                  <strong>{fav.name}</strong>
                  <p className="subtitle">
                    {RANGE_LABELS[fav.rangePreset]} · {RESOURCE_LABELS[fav.resourceType] || (fav.resourceType ? fav.resourceType : "все ресурсы")}
                  </p>
                  {favData ? (
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={favData.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Line type="monotone" dataKey="total_amount" stroke="#7c9bff" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="subtitle">Загрузка...</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="section-grid">
        <div className="card glass">
          <div className="page-header" style={{ alignItems: "center" }}>
            <h3>Real-time Estimator</h3>
            <p className="subtitle">Прогноз потребления и стоимости по последним записям.</p>
          </div>
          <div className="section-grid">
            <div>
              <p className="subtitle">Счётчик</p>
              <select value={estimatorMeter || ""} onChange={(e) => setEstimatorMeter(Number(e.target.value))}>
                {meters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {RESOURCE_LABELS[m.resource_type] || m.resource_type} · {m.serial_number}
                  </option>
                ))}
              </select>
              <div className="stat-grid">
                <div>
                  <p className="subtitle">Дневной прогноз</p>
                  <h3 className="accent-number">{estimator.daily.toFixed(2)}</h3>
                  <p className="subtitle subtle">Средний прирост в сутки</p>
                </div>
                <div>
                  <p className="subtitle">Месячный чек</p>
                  <h3 className="accent-number">{estimator.monthly.toFixed(2)} ₽</h3>
                  <p className="subtitle subtle">Расчётно на 30 дней</p>
                </div>
              </div>
            </div>
            <div className="spark-card">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={estimatorSeries}>
                  <defs>
                    <linearGradient id="estimatorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#1f2937" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#67e8f9" fill="url(#estimatorGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card glass">
          <div className="page-header" style={{ alignItems: "center" }}>
            <h3>Монитор здоровья счётчиков</h3>
            <p className="subtitle">Фронтенд-проверка активности и стабильности.</p>
          </div>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Счётчик</th>
                <th>Статус</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="stack">
                      <span>{RESOURCE_LABELS[m.resource_type] || m.resource_type}</span>
                      <span className="subtitle subtle">{m.serial_number}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge tone-${healthStatuses[m.id]?.tone || "gray"}`}>
                      {healthStatuses[m.id]?.status || "—"}
                    </span>
                  </td>
                  <td className="subtitle">{healthStatuses[m.id]?.hint || "Данных мало"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card glass">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Последние показания</h3>
          <p className="subtitle">Пять последних записей по выбранному объекту.</p>
        </div>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Счётчик</th>
              <th>Значение</th>
              <th>Начисление</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td>{getMeterLabel(r)}</td>
                <td>{getValueWithUnit(r)}</td>
                <td>{r.amount_value ? `${Number(r.amount_value).toFixed(2)} ₽` : "—"}</td>
                <td>{r.reading_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
