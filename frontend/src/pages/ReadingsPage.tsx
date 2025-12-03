import { FormEvent, useEffect, useState } from "react";
import api from "../api";
import { Meter, Property } from "../App";

const RESOURCE_LABELS: Record<string, string> = {
  electricity: "Электричество",
  cold_water: "Холодная вода",
  hot_water: "Горячая вода",
  gas: "Газ",
  heating: "Отопление",
};

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
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProperty) {
      api.get("meters/", { params: { property: selectedProperty } }).then(({ data }) => {
        setMeters(data);
        if (data.length > 0) setSelectedMeter(data[0].id);
        else setSelectedMeter(null);
      });
    } else {
      setMeters([]);
      setItems([]);
      setSelectedMeter(null);
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (!selectedProperty) return;
    const params: any = { meter__property: selectedProperty };
    if (selectedMeter) params.meter = selectedMeter;
    api
      .get("readings/", { params })
      .then(({ data }) => setItems(data))
      .catch(() => setError("Не удалось загрузить показания"));
  }, [selectedProperty, selectedMeter]);

  useEffect(() => {
    if (!readingDate) {
      setReadingDate(new Date().toISOString().slice(0, 10));
    }
  }, [readingDate]);

  const addReading = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!selectedMeter) {
      setError("Выберите счётчик");
      return;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setError("Введите корректное значение показания");
      return;
    }

    try {
      const { data } = await api.post("readings/", {
        meter: selectedMeter,
        value: numeric,
        reading_date: readingDate,
      });
      setItems([data, ...items]);
      setValue("");
      setStatus("Показание сохранено");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Не удалось сохранить показание");
    }
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
        <form onSubmit={addReading} className="card reading-form">
          <div className="section-grid">
            <label>
              Счётчик
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
                    {RESOURCE_LABELS[m.resource_type] || m.resource_type} · {m.serial_number || m.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Дата показания
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                required
              />
            </label>
            <label>
              Значение
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="Например, 1245.600"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </label>
            <div className="actions">
              <button type="submit" disabled={!meters.length}>
                Сохранить
              </button>
              {!meters.length && <p className="subtitle">Добавьте счётчики на вкладке "Счётчики".</p>}
              {status && <p className="success">{status}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Журнал показаний</h3>
          <p className="subtitle">
            История ввода по выбранному объекту{selectedMeter ? " и счётчику" : ""}.
          </p>
        </div>
        {selectedProperty ? (
          items.length ? (
            <table>
              <thead>
                <tr>
                  <th>Счётчик</th>
                  <th>Значение</th>
                  <th>Начисление</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const unit = r.unit || r.meter_detail?.unit;
                  return (
                    <tr key={r.id}>
                      <td>
                        {RESOURCE_LABELS[r.meter_detail?.resource_type || ""] || r.meter_detail?.resource_type || "Счётчик"}
                        <div className="subtitle">{r.meter_detail?.serial_number || r.meter}</div>
                      </td>
                      <td>{`${r.value} ${unit || ""}`.trim()}</td>
                      <td>{r.amount_value ? `${Number(r.amount_value).toFixed(2)} ₽` : "—"}</td>
                      <td>{r.reading_date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="subtitle">
              Нет показаний для выбранного {selectedMeter ? "счётчика" : "объекта"}.
            </p>
          )
        ) : (
          <p className="subtitle">Выберите объект, чтобы увидеть журнал показаний.</p>
        )}
      </div>
    </div>
  );
}
