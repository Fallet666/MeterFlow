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

  useEffect(() => {
    if (!properties.length) {
      api.get("properties/").then(({ data }) => onUpdated(data));
    }
  }, []);

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

      <form onSubmit={addProperty} className="card">
        <h3 style={{ marginBottom: 10 }}>Новый объект</h3>
        <div className="form-grid">
          <label htmlFor="name">Название</label>
          <input id="name" placeholder="Например, ЖК Солнечный" value={name} onChange={(e) => setName(e.target.value)} required />
          <label htmlFor="address">Адрес</label>
          <input
            id="address"
            placeholder="Город, улица, дом"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <div></div>
          <button type="submit">Добавить объект</button>
        </div>
      </form>

      <div className="card">
        <div className="page-header" style={{ alignItems: "center" }}>
          <div>
            <h3>Список объектов</h3>
            <p className="subtitle">Выберите активный объект для работы.</p>
          </div>
        </div>
        <div className="property-grid">
          {properties.map((p) => {
            const active = selectedProperty === p.id;
            return (
              <div key={p.id} className={`property-card ${active ? "active" : ""}`}>
                <div className="badge" style={{ marginBottom: 8 }}>{active ? "Активный" : "Доступен"}</div>
                <h3 style={{ marginBottom: 6 }}>{p.name}</h3>
                <p className="subtitle">{p.address}</p>
                <div className="inline" style={{ justifyContent: "space-between", marginTop: 12 }}>
                  <button type="button" className="ghost" onClick={() => onSelect(p.id)}>
                    Использовать
                  </button>
                  <span className="subtitle">ID {p.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
