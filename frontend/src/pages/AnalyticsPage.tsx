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

interface ResourceSummaryItem {
  resource_type: string;
  total_consumption: number;
  total_amount: number;
  unit?: string;
}

interface AnalyticsResponse {
  period: { start_year: number; start_month: number; end_year: number; end_month: number };
  monthly: { month: string; total_amount: number; total_consumption: number; cumulative_amount: number }[];
  monthly_by_resource?: { month: string; resource_type: string; consumption: number; amount: number }[];
  summary: {
    total_amount: number;
    total_consumption: number;
    average_daily_amount?: number;
    peak_month: string | null;
    resources?: ResourceSummaryItem[];
  };
  comparison: { property__id: number; property__name: string; total_amount: number; total_consumption: number }[];
  forecast_amount: number;
}

type FavoriteChartConfig = {
  id: string;
  name: string;
  properties: number[];
  resourceType: string;
  rangePreset: keyof typeof RANGE_PRESETS;
};

const FAVORITES_KEY = "mf_favorite_charts";

const RESOURCE_LABELS: Record<string, string> = {
  electricity: "Электричество",
  cold_water: "Холодная вода",
  hot_water: "Горячая вода",
  gas: "Газ",
  heating: "Отопление",
};

const RANGE_PRESETS = {
  year: { label: "Год", months: 12 },
  half: { label: "6 месяцев", months: 6 },
  two: { label: "2 года", months: 24 },
};

const buildPeriodFromPreset = (preset: keyof typeof RANGE_PRESETS) => {
  const months = RANGE_PRESETS[preset].months;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  return {
    start_year: start.getFullYear(),
    start_month: start.getMonth() + 1,
    end_year: today.getFullYear(),
    end_month: today.getMonth() + 1,
  };
};

export function AnalyticsPage({ selectedProperty, properties }: Props) {
  const [rangePreset, setRangePreset] = useState<keyof typeof RANGE_PRESETS>("year");
  const [resourceType, setResourceType] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteCharts, setFavoriteCharts] = useState<FavoriteChartConfig[]>([]);
  const [favoriteName, setFavoriteName] = useState("");
  const [favoriteData, setFavoriteData] = useState<Record<string, AnalyticsResponse | null>>({});

  useEffect(() => {
    if (selectedProperty && !selectedIds.length) {
      setSelectedIds([selectedProperty]);
    }
  }, [selectedProperty]);

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavoriteCharts(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  const periodParams = useMemo(() => {
    return buildPeriodFromPreset(rangePreset);
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

  useEffect(() => {
    favoriteCharts.forEach((favorite) => {
      api
        .get<AnalyticsResponse>("analytics/", {
          params: {
            properties: favorite.properties.join(","),
            resource_type: favorite.resourceType || undefined,
            ...buildPeriodFromPreset(favorite.rangePreset),
          },
        })
        .then(({ data }) =>
          setFavoriteData((prev) => ({
            ...prev,
            [favorite.id]: data,
          })),
        )
        .catch(() => undefined);
    });
  }, [favoriteCharts]);

  const toggleProperty = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const persistFavorites = (items: FavoriteChartConfig[]) => {
    setFavoriteCharts(items);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  };

  const addFavorite = () => {
    if (!selectedIds.length) return;
    const id = `${Date.now()}`;
    const name = favoriteName || `Подборка ${favoriteCharts.length + 1}`;
    const next: FavoriteChartConfig = {
      id,
      name,
      properties: selectedIds,
      resourceType,
      rangePreset,
    };
    persistFavorites([...favoriteCharts, next]);
    setFavoriteName("");
  };

  const removeFavorite = (id: string) => {
    persistFavorites(favoriteCharts.filter((f) => f.id !== id));
  };

  if (!properties.length) return <div className="card">Добавьте объект, чтобы увидеть аналитику.</div>;

  const resourceSummary = data?.summary.resources || [];
  const averageDailyAmount = useMemo(() => {
    if (!data) return 0;
    const fallbackDays = Math.max(1, (data.monthly?.length || 1) * 30);
    return data.summary.average_daily_amount ?? data.summary.total_amount / fallbackDays;
  }, [data]);

  const monthlyByResource = useMemo(() => {
    const grouped: Record<string, { month: string; consumption: number; amount: number }[]> = {};
    (data?.monthly_by_resource || []).forEach((item) => {
      if (!grouped[item.resource_type]) grouped[item.resource_type] = [];
      grouped[item.resource_type].push({
        month: item.month,
        consumption: item.consumption,
        amount: item.amount,
      });
    });
    Object.values(grouped).forEach((list) => list.sort((a, b) => (a.month > b.month ? 1 : -1)));
    return grouped;
  }, [data]);

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
            <div className="property-grid">
              {properties.map((p) => {
                const active = selectedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`pill property-chip ${active ? "active" : ""}`}
                    onClick={() => toggleProperty(p.id)}
                  >
                    <span className="property-name">{p.name}</span>
                  </button>
                );
              })}
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

      <div className="card">
        <div className="section-grid" style={{ alignItems: "flex-end" }}>
          <div>
            <p className="subtitle">Конструктор графиков</p>
            <div className="inline">
              <input
                placeholder="Название виджета"
                value={favoriteName}
                onChange={(e) => setFavoriteName(e.target.value)}
              />
              <button type="button" onClick={addFavorite} disabled={!selectedIds.length}>
                Сохранить текущую конфигурацию
              </button>
            </div>
            <p className="subtitle">Фиксирует выбранные объекты, ресурс и диапазон.</p>
          </div>
          <div>
            <p className="subtitle">Избранные</p>
            <div className="favorite-list">
              {favoriteCharts.length === 0 && <p className="subtitle">Пока нет избранных графиков.</p>}
              {favoriteCharts.map((fav) => (
                <div key={fav.id} className="favorite-item">
                  <div>
                    <strong>{fav.name}</strong>
                    <p className="subtitle">
                      {fav.properties.length} объ., {RESOURCE_LABELS[fav.resourceType] || (fav.resourceType ? fav.resourceType : "все ресурсы")}, {RANGE_PRESETS[fav.rangePreset].label}
                    </p>
                  </div>
                  <button type="button" className="link" onClick={() => removeFavorite(fav.id)}>
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="card error">{error}</div>}

      {data && (
        <>
          <div className="section-grid">
            <div className="card">
              <p className="subtitle">Начисления за период</p>
              <h3 style={{ fontSize: 28 }}>{data.summary.total_amount.toFixed(2)} ₽</h3>
              <p className="subtitle">Среднесуточные начисления {averageDailyAmount.toFixed(2)} ₽</p>
            </div>
            <div className="card">
              <p className="subtitle">Сумма начислений</p>
              <h3 style={{ fontSize: 28 }}>{data.summary.total_amount.toFixed(2)} ₽</h3>
              <p className="subtitle">Прогноз: {data.forecast_amount.toFixed(2)} ₽</p>
            </div>
            <div className="card">
              <p className="subtitle">Пиковый месяц</p>
              <h3 style={{ fontSize: 24 }}>{data.summary.peak_month || "—"}</h3>
              <p className="subtitle">Отслеживайте всплески начислений по сумме.</p>
            </div>
          </div>

          {resourceSummary.length > 0 && (
            <div className="card">
              <div className="page-header" style={{ alignItems: "center" }}>
                <h3>Всего за период по ресурсам</h3>
                <p className="subtitle">Потребление и начисления для каждого типа ресурса</p>
              </div>
              <div className="resource-grid">
                {resourceSummary.map((res) => (
                  <div key={res.resource_type} className="resource-card">
                    <p className="subtitle">{RESOURCE_LABELS[res.resource_type] || res.resource_type}</p>
                    <h3 style={{ margin: 0, fontSize: 22 }}>
                      {res.total_amount.toFixed(2)} ₽
                    </h3>
                    <p className="subtitle">
                      {res.total_consumption.toFixed(2)} {res.unit || ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="page-header" style={{ alignItems: "center" }}>
              <h3>Начисления по месяцам (₽)</h3>
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
              <h3>Накопительный итог (₽)</h3>
              <p className="subtitle">Суммарные начисления с начала периода</p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cumulative_amount" name="Кумулятивно ₽" stroke="#60a5fa" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {Object.entries(monthlyByResource).map(([resource, points]) => (
            <div className="card" key={resource}>
              <div className="page-header" style={{ alignItems: "center" }}>
                <h3>{RESOURCE_LABELS[resource] || resource}: потребление</h3>
                <p className="subtitle">Единицы: {resourceSummary.find((r) => r.resource_type === resource)?.unit || "ед."}</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="consumption" name="Потребление" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}

          {favoriteCharts.length > 0 && (
            <div className="card">
              <div className="page-header" style={{ alignItems: "center" }}>
                <h3>Избранные графики</h3>
                <p className="subtitle">Сохранённые конфигурации как мини-виджеты</p>
              </div>
              <div className="favorite-grid">
                {favoriteCharts.map((fav) => {
                  const chartData = favoriteData[fav.id];
                  return (
                    <div key={fav.id} className="favorite-chart">
                      <div className="favorite-chart-header">
                        <div>
                          <strong>{fav.name}</strong>
                          <p className="subtitle">
                            {RANGE_PRESETS[fav.rangePreset].label} · {RESOURCE_LABELS[fav.resourceType] || (fav.resourceType ? fav.resourceType : "все ресурсы")}
                          </p>
                        </div>
                        <button className="link" type="button" onClick={() => removeFavorite(fav.id)}>
                          Удалить
                        </button>
                      </div>
                      {chartData ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={chartData.monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="total_amount" name="Начисления" stroke="#7c9bff" />
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
              <h3>Сравнение объектов</h3>
              <p className="subtitle">Суммарные начисления и потребление</p>
            </div>
            <div className="table-wrapper">
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
                      <td>
                        {resourceType
                          ? `${row.total_consumption.toFixed(2)} ${resourceSummary[0]?.unit || ""}`
                          : "—"}
                      </td>
                      <td>{row.total_amount.toFixed(2)} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {loading && <div className="card">Загрузка...</div>}
    </div>
  );
}
