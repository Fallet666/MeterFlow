import { useEffect, useState } from "react";
import api from "../api";
import { Property } from "../App";

interface Props {
  selectedProperty: number | null;
  properties: Property[];
  onSelectProperty: (id: number) => void;
}

interface ForecastResponse {
  forecast_amount: number;
}

export function Dashboard({ selectedProperty, properties, onSelectProperty }: Props) {
  const [forecast, setForecast] = useState<number>(0);
  const [readings, setReadings] = useState<any[]>([]);

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
    }
  }, [selectedProperty]);

  return (
    <div>
      <h1>Дашборд</h1>
      <div className="card inline">
        <div>
          <strong>Объект:</strong>
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
          <strong>Прогноз на текущий месяц:</strong> {forecast.toFixed(2)} ₽
        </div>
      </div>
      <div className="card">
        <h3>Последние показания</h3>
        <table>
          <thead>
            <tr>
              <th>Счётчик</th>
              <th>Значение</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td>{(r as any).meter}</td>
                <td>{r.value}</td>
                <td>{r.reading_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
