import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api";
import { Property } from "../App";

interface Props {
  selectedProperty: number | null;
  properties: Property[];
}

interface AnalyticsResponse {
  period: { start_year: number; start_month: number; end_year: number; end_month: number };
  monthly: { month: string; total_amount: number; total_consumption: number; cumulative_amount: number }[];
  summary: { total_amount: number; total_consumption: number; average_daily: number; peak_month: string | null };
  comparison: { property__id: number; property__name: string; total_amount: number; total_consumption: number }[];
  forecast_amount: number;
}

const RANGE_PRESETS = {
  year: { label: "Год", months: 12 },
  half: { label: "6 месяцев", months: 6 },
  two: { label: "2 года", months: 24 },
};

export function AnalyticsPage({ selectedProperty, properties }: Props) {
  const [rangePreset, setRangePreset] = useState<keyof typeof RANGE_PRESETS>("year");
  const [resourceType, setResourceType] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProperty && !selectedIds.length) {
      setSelectedIds([selectedProperty]);
    }
  }, [selectedProperty]);

  const periodParams = useMemo(() => {
    const months = RANGE_PRESETS[rangePreset].months;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
    return {
      start_year: start.getFullYear(),
      start_month: start.getMonth() + 1,
      end_year: today.getFullYear(),
      end_month: today.getMonth() + 1,
    };
  }, [rangePreset]);

  useEffect(() => {
    if (!selectedIds.length) return;
    setLoading(true);
    setError(null);
    api
      .get<AnalyticsResponse>("analytics/", {
        params: {
          properties: selectedIds.join(","),
          resource_type: resourceType || undefined,
          ...periodParams,
        },
      })
      .then(({ data }) => setData(data))
      .catch(() => setError("Не удалось загрузить аналитику"))
      .finally(() => setLoading(false));
  }, [selectedIds, resourceType, periodParams]);

  const toggleProperty = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  if (!properties.length) return <div className="card">Добавьте объект, чтобы увидеть аналитику.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Аналитика</h1>
          <p className="subtitle">Гибкая панель для сравнения объектов, ресурсов и периодов.</p>
        </div>
      </div>

      <div className="card">
        <div className="section-grid" style={{ alignItems: "flex-end" }}>
          <div>
            <p className="subtitle">Объекты</p>
            <div className="inline" style={{ flexWrap: "wrap" }}>
              {properties.map((p) => (
                <label key={p.id} className="pill" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleProperty(p.id)}
                    style={{ width: 16 }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="subtitle">Диапазон</p>
            <div className="inline">
              {Object.entries(RANGE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  className={`pill ${rangePreset === key ? "active" : ""}`}
                  onClick={() => setRangePreset(key as keyof typeof RANGE_PRESETS)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="subtitle">Ресурс</p>
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
              <option value="">Все</option>
              <option value="electricity">Электричество</option>
              <option value="cold_water">Холодная вода</option>
              <option value="hot_water">Горячая вода</option>
              <option value="gas">Газ</option>
              <option value="heating">Отопление</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="card error">{error}</div>}

      {data && (
        <>
          <div className="section-grid">
            <div className="card">
              <p className="subtitle">Всего за период</p>
              <h3 style={{ fontSize: 28 }}>{data.summary.total_consumption.toFixed(2)} ед.</h3>
              <p className="subtitle">Среднесуточное потребление {data.summary.average_daily.toFixed(2)}</p>
            </div>
            <div className="card">
              <p className="subtitle">Сумма начислений</p>
              <h3 style={{ fontSize: 28 }}>{data.summary.total_amount.toFixed(2)} ₽</h3>
              <p className="subtitle">Прогноз: {data.forecast_amount.toFixed(2)} ₽</p>
            </div>
            <div className="card">
              <p className="subtitle">Пиковый месяц</p>
              <h3 style={{ fontSize: 24 }}>{data.summary.peak_month || "—"}</h3>
              <p className="subtitle">Отслеживайте всплески и провалы потребления.</p>
            </div>
          </div>

          <div className="card">
            <div className="page-header" style={{ alignItems: "center" }}>
              <h3>Начисления по месяцам</h3>
              <p className="subtitle">Детализация выбранного диапазона</p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_amount" name="Сумма" fill="#7c9bff" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="page-header" style={{ alignItems: "center" }}>
              <h3>Динамика потребления</h3>
              <p className="subtitle">Накопительный график</p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_consumption" name="Потребление" stroke="#82ca9d" />
                <Line type="monotone" dataKey="cumulative_amount" name="Кумулятивно ₽" stroke="#60a5fa" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="page-header" style={{ alignItems: "center" }}>
              <h3>Сравнение объектов</h3>
              <p className="subtitle">Суммарные начисления и потребление</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Объект</th>
                  <th>Потребление</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {data.comparison.map((row) => (
                  <tr key={row.property__id}>
                    <td>{row.property__name}</td>
                    <td>{row.total_consumption.toFixed(2)}</td>
                    <td>{row.total_amount.toFixed(2)} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && <div className="card">Загрузка...</div>}
    </div>
  );
}
