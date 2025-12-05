import { FormEvent, useEffect, useState } from "react";
import api from "../api";
import { Property } from "../App";

interface Props {
  properties: Property[];
  onUpdated: (list: Property[]) => void;
  selectedProperty: number | null;
  onSelect: (id: number) => void;
}

export function PropertiesPage({ properties, onUpdated, selectedProperty, onSelect }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [meterStats, setMeterStats] = useState<Record<number, { total: number; active: number }>>({});

  useEffect(() => {
    if (!properties.length) {
      api.get("properties/").then(({ data }) => onUpdated(data));
    }
  }, []);

  useEffect(() => {
    api.get("meters/").then(({ data }) => {
      const stats: Record<number, { total: number; active: number }> = {};
      data.forEach((m: any) => {
        if (!stats[m.property]) stats[m.property] = { total: 0, active: 0 };
        stats[m.property].total += 1;
        if (m.is_active) stats[m.property].active += 1;
      });
      setMeterStats(stats);
    });
  }, [properties]);

  const addProperty = async (e: FormEvent) => {
    e.preventDefault();
    const { data } = await api.post("properties/", { name, address });
    onUpdated([...properties, data]);
    setName("");
    setAddress("");
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Объекты недвижимости</h1>
          <p className="subtitle">Создавайте и выбирайте активный объект для работы с показаниями.</p>
        </div>
      </div>

      <form onSubmit={addProperty} className="card glass">
        <div className="inline">
          <input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <button type="submit">Добавить</button>
        </div>
      </form>

      <div className="card glass">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Список объектов</h3>
          <p className="subtitle">Выберите активный объект для работы.</p>
        </div>
        <div className="property-grid">
          {properties.map((p) => {
            const stats = meterStats[p.id] || { total: 0, active: 0 };
            const healthLabel = stats.total === 0 ? "нет счётчиков" : `${stats.active}/${stats.total} активно`;
            const tone = stats.total === 0 ? "gray" : stats.active === stats.total ? "emerald" : "amber";
            return (
              <div key={p.id} className="favorite-chart" style={{ borderColor: selectedProperty === p.id ? "#67e8f9" : undefined }}>
                <div className="favorite-chart-header">
                  <div>
                    <strong>{p.name}</strong>
                    <p className="subtitle">{p.address}</p>
                  </div>
                  <span className={`badge tone-${tone}`}>{healthLabel}</span>
                </div>
                <div className="inline" style={{ justifyContent: "space-between" }}>
                  <button onClick={() => onSelect(p.id)} className="pill" type="button">
                    Сделать активным
                  </button>
                  <p className="subtitle subtle">ID: {p.id}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
