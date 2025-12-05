import { FormEvent, useEffect, useMemo, useState } from "react";
import api from "../api";
import { Meter, Property } from "../App";

interface Props {
  properties: Property[];
  onUpdated: (list: Property[]) => void;
  selectedProperty: number | null;
  onSelect: (id: number) => void;
}

const TAGS = ["Дом", "Офис", "Склад", "Дача"];

export function PropertiesPage({ properties, onUpdated, selectedProperty, onSelect }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [meters, setMeters] = useState<Meter[]>([]);
  const [tags, setTags] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!properties.length) {
      api.get("properties/").then(({ data }) => onUpdated(data));
    }
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      api.get("meters/", { params: { property: selectedProperty } }).then(({ data }) => setMeters(data));
    } else {
      setMeters([]);
    }
  }, [selectedProperty]);

  useEffect(() => {
    setTags((prev) => {
      const next = { ...prev };
      properties.forEach((p) => {
        if (!next[p.id]) {
          next[p.id] = TAGS[p.id % TAGS.length];
        }
      });
      return next;
    });
  }, [properties]);

  const addProperty = async (e: FormEvent) => {
    e.preventDefault();
    const { data } = await api.post("properties/", { name, address });
    onUpdated([...properties, data]);
    setName("");
    setAddress("");
  };

  const groupedMeters = useMemo(() => {
    const groups: Record<string, Meter[]> = {};
    meters.forEach((m) => {
      if (!groups[m.resource_type]) groups[m.resource_type] = [];
      groups[m.resource_type].push(m);
    });
    return groups;
  }, [meters]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="subtitle">Карта объектов</p>
          <h1>Объекты и приборы в одном дереве</h1>
          <p className="subtitle">Выберите объект, чтобы сразу увидеть его приборы по типам.</p>
        </div>
        <div className="secondary-nav">
          <button className="active" type="button">
            Объекты
          </button>
          <button type="button" onClick={() => selectedProperty && onSelect(selectedProperty)}>
            Обновить
          </button>
        </div>
      </div>

      <div className="property-rail">
        <div className="surface">
          <h3>Каталог объектов</h3>
          <p className="subtitle">Выберите узел, чтобы увидеть его приборы и метки.</p>
          <div className="property-list">
            {properties.map((p) => {
              const active = selectedProperty === p.id;
              return (
                <div key={p.id} className={`property-card ${active ? "active" : ""}`}>
                  <div className="inline" style={{ justifyContent: "space-between" }}>
                    <strong>{p.name}</strong>
                    <span className="badge">{tags[p.id]}</span>
                  </div>
                  <p className="subtitle">{p.address}</p>
                  <div className="inline" style={{ justifyContent: "space-between", marginTop: 8 }}>
                    <button type="button" className="ghost" onClick={() => onSelect(p.id)}>
                      Открыть
                    </button>
                    <span className="subtitle">ID {p.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface">
          <div className="page-header" style={{ alignItems: "center" }}>
            <div>
              <h3>Паспорт объекта</h3>
              <p className="subtitle">Мгновенный обзор по активному объекту.</p>
            </div>
            {selectedProperty && <span className="badge">{tags[selectedProperty]}</span>}
          </div>

          {!selectedProperty && <p className="subtitle">Выберите объект слева.</p>}

          {selectedProperty && (
            <>
              <div className="hero-grid">
                <div className="info-tile">
                  <p className="subtitle">Приборов всего</p>
                  <div className="stat-value">{meters.length}</div>
                  <p className="subtitle">По активному объекту</p>
                </div>
                <div className="info-tile">
                  <p className="subtitle">Типов ресурсов</p>
                  <div className="stat-value">{Object.keys(groupedMeters).length || 0}</div>
                  <p className="subtitle">Сгруппировано по данным прибора</p>
                </div>
              </div>

              <div className="meter-stack">
                {Object.entries(groupedMeters).map(([resource, ms]) => (
                  <div key={resource} className="meter-card">
                    <p className="subtitle">{resource}</p>
                    <strong>{ms.length} сч.</strong>
                    <div className="chip-row" style={{ marginTop: 8 }}>
                      {ms.map((m) => (
                        <span key={m.id} className="chip">
                          #{m.serial_number || m.id} · {m.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {meters.length === 0 && <p className="subtitle">Приборов пока нет — добавьте на вкладке «Приборы».</p>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="surface">
        <h3>Добавить объект</h3>
        <p className="subtitle">Заполните форму, чтобы добавить новый объект.</p>
        <form onSubmit={addProperty} className="form-grid">
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
        </form>
      </div>
    </div>
  );
}
