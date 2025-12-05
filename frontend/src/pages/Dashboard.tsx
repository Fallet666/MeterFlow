import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api";
import { Property } from "../App";

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
        .then(({ data }) => setReadings(data.slice(0, 5)));
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
  }, [selectedProperty]);

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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>EnergoBoard · Обзор</h1>
          <p className="subtitle">Светлый рабочий стол с прогнозом, начислениями и последними показаниями.</p>
        </div>
      </div>

      <div className="card">
        <div className="section-grid">
          <div>
            <p className="subtitle">Текущий объект</p>
            <select value={selectedProperty || ""} onChange={(e) => onSelectProperty(Number(e.target.value))}>
              <option value="" disabled>
                Выберите объект
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="subtitle" style={{ marginTop: 8 }}>Переключайтесь между объектами, чтобы увидеть прогнозы и историю.</p>
          </div>
          <div className="info-tile highlight-panel">
            <p className="subtitle">Прогноз на месяц</p>
            <div className="stat-value">{forecast.toFixed(2)} ₽</div>
            <span className="badge">Обновляется автоматически</span>
          </div>
        </div>
      </div>

      {charges && (
        <div className="hero-grid">
          <div className="info-tile">
            <p className="subtitle">Фактические начисления</p>
            <div className="stat-value">{currentMonthAmount.toFixed(2)} ₽</div>
            <p className="subtitle">За {currentMonthKey}</p>
          </div>
          <div className="info-tile">
            <p className="subtitle">Оценка до конца месяца</p>
            <div className="stat-value">{forecast.toFixed(2)} ₽</div>
            <p className="subtitle">На основе прошлых месяцев</p>
          </div>
          <div className="info-tile">
            <p className="subtitle">Разница с прошлым месяцем</p>
            <div className="stat-value">{(currentMonthAmount - previousMonthAmount).toFixed(2)} ₽</div>
            <p className="subtitle">Сравнение {currentMonthKey} и {previousMonthKey}</p>
          </div>
        </div>
      )}

      {favoriteCharts.length > 0 && (
        <div className="card">
          <div className="page-header" style={{ alignItems: "center" }}>
            <div>
              <h3>Избранные мини-графики</h3>
              <p className="subtitle">Подборки из раздела «Аналитика», доступные прямо с дашборда.</p>
            </div>
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
                        <Line type="monotone" dataKey="total_amount" stroke="#f97316" dot={false} />
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

      <div className="card">
        <div className="page-header" style={{ alignItems: "center" }}>
          <div>
            <h3>Последние показания</h3>
            <p className="subtitle">Пять последних записей по выбранному объекту.</p>
          </div>
        </div>
        <table>
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
