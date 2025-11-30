import { FormEvent, useEffect, useState } from "react";
import api from "../api";
import { Meter } from "../App";

interface Props {
  selectedProperty: number | null;
}

export function ReadingsPage({ selectedProperty }: Props) {
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
      });
      api.get("readings/", { params: { meter__property: selectedProperty } }).then(({ data }) => setItems(data));
    }
  }, [selectedProperty]);

  const addReading = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMeter) return;
    const { data } = await api.post("readings/", { meter: selectedMeter, value, reading_date: readingDate });
    setItems([data, ...items]);
    setValue("");
  };

  if (!selectedProperty) return <div>Сначала выберите объект.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Показания</h1>
          <p className="subtitle">Фиксируйте новые показания счётчиков без лишних переходов.</p>
        </div>
      </div>

      <form onSubmit={addReading} className="card">
        <div className="inline">
          <select value={selectedMeter || ""} onChange={(e) => setSelectedMeter(Number(e.target.value))}>
            {meters.map((m) => (
              <option value={m.id} key={m.id}>
                {m.serial_number || m.id} ({m.resource_type})
              </option>
            ))}
          </select>
          <input type="date" value={readingDate} onChange={(e) => setReadingDate(e.target.value)} required />
          <input placeholder="Значение" value={value} onChange={(e) => setValue(e.target.value)} required />
          <button type="submit">Сохранить</button>
        </div>
      </form>

      <div className="card">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Журнал показаний</h3>
          <p className="subtitle">История ввода по выбранному объекту.</p>
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
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.meter}</td>
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
