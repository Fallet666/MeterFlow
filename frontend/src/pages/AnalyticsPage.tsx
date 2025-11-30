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
    <div>
      <h1>Аналитика</h1>
      <div className="card inline">
        <div>
          <strong>Объект: </strong>
          {properties.find((p) => p.id === selectedProperty)?.name}
        </div>
        <div>
          <strong>Прогноз на месяц:</strong> {forecast.toFixed(2)} ₽
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
            <Bar dataKey="total_amount" name="Сумма" fill="#8884d8" />
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
