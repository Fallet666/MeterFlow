import { FormEvent, useEffect, useState } from "react";
import api from "../api";
import { Meter, Property } from "../App";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

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

export function MetersPage({ selectedProperty, properties, onSelectProperty }: Props) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [resourceType, setResourceType] = useState("electricity");
  const [unit, setUnit] = useState("kwh");
  const [serial, setSerial] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [propertyReadings, setPropertyReadings] = useState<any[]>([]);

  useEffect(() => {
    if (selectedProperty) {
      api.get("meters/", { params: { property: selectedProperty } }).then(({ data }) => setMeters(data));
      api
        .get("readings/", { params: { meter__property: selectedProperty } })
        .then(({ data }) => setPropertyReadings(data));
    } else {
      setMeters([]);
      setPropertyReadings([]);
    }
  }, [selectedProperty]);

  const addMeter = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setError(null);
    if (!selectedProperty) return;
    if (!serial.trim()) {
      setError("Введите серийный номер");
      return;
    }
    try {
      const { data } = await api.post("meters/", {
        property: selectedProperty,
        resource_type: resourceType,
        unit,
        serial_number: serial,
      });
      setMeters([...meters, data]);
      setSerial("");
      setFeedback("Счётчик добавлен");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Не удалось добавить счётчик");
    }
  };

  const removeMeter = async (id: number) => {
    await api.delete(`meters/${id}/`);
    setMeters(meters.filter((m) => m.id !== id));
    setFeedback("Счётчик удалён");
  };

  const updateMeter = async (meter: Meter, patch: Partial<Meter>) => {
    const { data } = await api.patch(`meters/${meter.id}/`, patch);
    setMeters(meters.map((m) => (m.id === meter.id ? data : m)));
    setFeedback("Сохранено");
  };

  const meterHealth = (meter: Meter) => {
    const list = propertyReadings
      .filter((r) => r.meter === meter.id)
      .sort((a, b) => (a.reading_date < b.reading_date ? 1 : -1));
    if (!list.length) return { label: "нет данных", tone: "gray" };
    const lastDate = new Date(list[0].reading_date);
    const days = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 60) return { label: "неактивен", tone: "amber" };
    const deltas: number[] = [];
    list.slice(0, 6).forEach((r, idx) => {
      const next = list[idx + 1];
      if (next) deltas.push(Number(r.value) - Number(next.value));
    });
    const spikes = deltas.filter((d, i) => i > 0 && d > deltas[i - 1] * 1.4);
    if (spikes.length) return { label: "аномалия", tone: "rose" };
    const recent = list.filter((r) => (Date.now() - new Date(r.reading_date).getTime()) / (1000 * 60 * 60 * 24) < 30);
    if (recent.length >= 4) return { label: "активен", tone: "cyan" };
    return { label: "номинал", tone: "emerald" };
  };

  const miniSeries = (meter: Meter) =>
    propertyReadings
      .filter((r) => r.meter === meter.id)
      .sort((a, b) => (a.reading_date > b.reading_date ? 1 : -1))
      .slice(-8)
      .map((r) => ({ date: r.reading_date, value: Number(r.value) }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Счётчики</h1>
          <p className="subtitle">Добавьте приборы учета для выбранного объекта.</p>
        </div>
      </div>

      <div className="card glass">
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
            <p>Выберите объект и добавьте счетчики, чтобы фиксировать показания и начисления.</p>
          </div>
        </div>
      </div>

      {!selectedProperty && (
        <div className="card glass">Сначала выберите или создайте объект недвижимости.</div>
      )}

      {selectedProperty && (
        <form onSubmit={addMeter} className="card glass">
          <div className="inline">
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
              {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <input placeholder="Единицы" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <input placeholder="Серийный номер" value={serial} onChange={(e) => setSerial(e.target.value)} />
            <button type="submit">Добавить</button>
          </div>
          <div className="inline" style={{ justifyContent: "space-between" }}>
            {error && <p className="error">{error}</p>}
            {feedback && <p className="success">{feedback}</p>}
          </div>
        </form>
      )}

      <div className="card glass">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Список счётчиков</h3>
          <p className="subtitle">Все приборы учета на выбранном объекте.</p>
        </div>
        {selectedProperty ? (
          meters.length ? (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Тип ресурса</th>
                  <th>Ед. изм.</th>
                  <th>Серийный номер</th>
                  <th>Здоровье</th>
                  <th>Динамика</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {meters.map((m) => (
                  <tr key={m.id}>
                    <td>{RESOURCE_LABELS[m.resource_type] || m.resource_type}</td>
                    <td>{m.unit}</td>
                    <td>{m.serial_number}</td>
                    {(() => {
                      const health = meterHealth(m);
                      return (
                        <td>
                          <span className={`badge tone-${health.tone}`}>{health.label}</span>
                        </td>
                      );
                    })()}
                    <td style={{ minWidth: 160 }}>
                      <div className="mini-chart">
                        <ResponsiveContainer width="100%" height={60}>
                          <LineChart data={miniSeries(m)}>
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#67e8f9" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="link"
                        onClick={() => updateMeter(m, { is_active: !m.is_active })}
                      >
                        {m.is_active ? "Деактивировать" : "Активировать"}
                      </button>
                      <button type="button" className="link" onClick={() => removeMeter(m.id)}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="subtitle">Нет счетчиков для выбранного объекта. Добавьте первый выше.</p>
          )
        ) : (
          <p className="subtitle">Выберите объект, чтобы увидеть связанные счетчики.</p>
        )}
      </div>
    </div>
  );
}
