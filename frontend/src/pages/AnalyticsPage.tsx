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
          <p className="subtitle">Сводка начислений и потребления по выбранному объекту.</p>
        </div>
      </div>

      <div className="card">
        <div className="section-grid">
          <div>
            <p className="subtitle">Объект</p>
            <h3>{properties.find((p) => p.id === selectedProperty)?.name}</h3>
          </div>
          <div>
            <p className="subtitle">Прогноз на месяц</p>
            <h3 style={{ margin: 0, fontSize: "26px" }}>{forecast.toFixed(2)} ₽</h3>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Начисления по месяцам</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
        <h3>Потребление</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total_consumption" name="Объем" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
