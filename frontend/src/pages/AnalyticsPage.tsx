import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import api from "../api";
import { Property } from "../App";

interface Props {
  selectedProperty: number | null;
  properties: Property[];
}

export function AnalyticsPage({ selectedProperty, properties }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [forecast, setForecast] = useState(0);

  useEffect(() => {
    if (selectedProperty) {
      api.get("analytics/", { params: { property: selectedProperty } }).then(({ data }) => {
        setData(data.monthly || []);
        setForecast(Number(data.forecast_amount) || 0);
      });
    }
  }, [selectedProperty]);

  if (!selectedProperty) {
    return <div>Выберите объект для аналитики.</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Аналитика</h1>
          <div className="muted">Графики начислений и потребления по выбранному объекту</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Прогноз на месяц</div>
          <div className="stat-value">{forecast.toFixed(2)} ₽</div>
        </div>
      </div>

      <div className="card">
        <h3>Объект</h3>
        <div className="card-subtitle">{properties.find((p) => p.id === selectedProperty)?.name}</div>
      </div>

      <div className="card">
        <h3>Начисления по месяцам</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_amount" name="Сумма" fill="#60a5fa" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3>Потребление</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total_consumption" name="Объем" stroke="#34d399" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
