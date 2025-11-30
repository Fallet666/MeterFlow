import { FormEvent, useEffect, useState } from "react";
import api from "../api";
import { Meter, Property } from "../App";

interface Props {
  selectedProperty: number | null;
  properties: Property[];
  onSelectProperty: (id: number) => void;
}

export function ReadingsPage({ selectedProperty, properties, onSelectProperty }: Props) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [readingDate, setReadingDate] = useState("");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (selectedProperty) {
      api.get("meters/", { params: { property: selectedProperty } }).then(({ data }) => {
        setMeters(data);
        if (data.length > 0) setSelectedMeter(data[0].id);
        else setSelectedMeter(null);
      });
      api.get("readings/", { params: { meter__property: selectedProperty } }).then(({ data }) => setItems(data));
    } else {
      setMeters([]);
      setItems([]);
      setSelectedMeter(null);
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (!readingDate) {
      setReadingDate(new Date().toISOString().slice(0, 10));
    }
  }, [readingDate]);

  const addReading = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMeter) return;
    const { data } = await api.post("readings/", { meter: selectedMeter, value, reading_date: readingDate });
    setItems([data, ...items]);
    setValue("");
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Показания</h1>
          <p className="subtitle">Фиксируйте новые показания счётчиков без лишних переходов.</p>
        </div>
      </div>

      <div className="card">
        <div className="section-grid">
          <div>
            <p className="subtitle">Объект</p>
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
            <p className="subtitle">Совет</p>
            <p>Выберите объект, чтобы загрузить счетчики и внести новые показания.</p>
          </div>
        </div>
      </div>

      {!selectedProperty && <div className="card">Сначала выберите или создайте объект.</div>}

      {selectedProperty && (
        <form onSubmit={addReading} className="card">
          <div className="inline">
            <select
              value={selectedMeter || ""}
              onChange={(e) => setSelectedMeter(Number(e.target.value))}
              required
            >
              <option value="" disabled>
                Выберите счётчик
              </option>
              {meters.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.serial_number || m.id} ({m.resource_type})
                </option>
              ))}
            </select>
            <input type="date" value={readingDate} onChange={(e) => setReadingDate(e.target.value)} required />
            <input placeholder="Значение" value={value} onChange={(e) => setValue(e.target.value)} required />
            <button type="submit" disabled={!meters.length}>
              Сохранить
            </button>
          </div>
          {!meters.length && <p className="subtitle">Добавьте счётчики на вкладке "Счётчики".</p>}
        </form>
      )}

      <div className="card">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Журнал показаний</h3>
          <p className="subtitle">История ввода по выбранному объекту.</p>
        </div>
        {selectedProperty ? (
          items.length ? (
            <table>
              <thead>
                <tr>
                  <th>Счётчик</th>
                  <th>Значение</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.meter}</td>
                    <td>{r.value}</td>
                    <td>{r.reading_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="subtitle">Нет показаний для выбранного объекта.</p>
          )
        ) : (
          <p className="subtitle">Выберите объект, чтобы увидеть журнал показаний.</p>
        )}
      </div>
    </div>
  );
}
