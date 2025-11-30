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

interface AnalyticsResponse {
  monthly: { month: string; total_amount: number }[];
  summary: { total_amount: number };
}

export function Dashboard({ selectedProperty, properties, onSelectProperty }: Props) {
  const [forecast, setForecast] = useState<number>(0);
  const [readings, setReadings] = useState<any[]>([]);
  const [charges, setCharges] = useState<AnalyticsResponse | null>(null);

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
      api
        .get<AnalyticsResponse>("analytics/", {
          params: {
            property: selectedProperty,
            start_year: new Date().getFullYear(),
            start_month: new Date().getMonth() + 1,
            end_year: new Date().getFullYear(),
            end_month: new Date().getMonth() + 1,
          },
        })
        .then(({ data }) => setCharges(data));
    }
  }, [selectedProperty]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Дашборд</h1>
          <p className="subtitle">Быстрый обзор начислений и последних показаний.</p>
        </div>
      </div>

      <div className="card">
        <div className="section-grid">
          <div>
            <p className="subtitle">Объект</p>
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
          </div>
          <div>
            <p className="subtitle">Прогноз на текущий месяц</p>
            <h3 style={{ margin: 0, fontSize: "26px" }}>{forecast.toFixed(2)} ₽</h3>
          </div>
        </div>
      </div>

      {charges && (
        <div className="section-grid">
          <div className="card">
            <p className="subtitle">Фактические начисления</p>
            <h3 style={{ fontSize: 26 }}>{charges.summary.total_amount.toFixed(2)} ₽</h3>
            <p className="subtitle">Текущий период</p>
          </div>
          <div className="card">
            <p className="subtitle">Оценка до конца месяца</p>
            <h3 style={{ fontSize: 26 }}>{forecast.toFixed(2)} ₽</h3>
            <p className="subtitle">На основе прошлых месяцев</p>
          </div>
          <div className="card">
            <p className="subtitle">Разница с прошлым</p>
            <h3 style={{ fontSize: 26 }}>
              {(
                (charges.monthly[charges.monthly.length - 1]?.total_amount || 0) -
                (charges.monthly[charges.monthly.length - 2]?.total_amount || 0)
              ).toFixed(2)} ₽
            </h3>
            <p className="subtitle">Последние два месяца</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Последние показания</h3>
          <p className="subtitle">Пять последних записей по выбранному объекту.</p>
        </div>
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
