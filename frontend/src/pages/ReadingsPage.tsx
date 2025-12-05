import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [resourceFilter, setResourceFilter] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

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
    api
      .get("readings/", { params })
      .then(({ data }) => setItems(data))
      .catch(() => setError("Не удалось загрузить показания"));
  }, [selectedProperty]);

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

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      if (selectedMeter && r.meter !== selectedMeter && r.meter_detail?.id !== selectedMeter) return false;
      if (resourceFilter && r.meter_detail?.resource_type !== resourceFilter) return false;
      if (start && r.reading_date < start) return false;
      if (end && r.reading_date > end) return false;
      return true;
    });
  }, [items, selectedMeter, resourceFilter, start, end]);

  const timeline = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredItems.forEach((r) => {
      const month = r.reading_date.slice(0, 7);
      if (!groups[month]) groups[month] = [];
      groups[month].push(r);
    });
    Object.values(groups).forEach((list) => list.sort((a, b) => (a.reading_date > b.reading_date ? -1 : 1)));
    const sortedMonths = Object.keys(groups).sort((a, b) => (a > b ? -1 : 1));
    return sortedMonths.map((month) => ({ month, records: groups[month] }));
  }, [filteredItems]);

  const summary = useMemo(() => {
    let total = 0;
    let withAmount = 0;
    filteredItems.forEach((r) => {
      total += r.value;
      if (r.amount_value) withAmount += r.amount_value;
    });
    return { total, withAmount, count: filteredItems.length };
  }, [filteredItems]);

  const monthInsights = (records: any[]) => {
    if (!records.length) return [] as string[];
    const sorted = [...records].sort((a, b) => (a.reading_date > b.reading_date ? 1 : -1));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const delta = last.value - first.value;
    const spike = sorted.reduce((acc, cur, idx) => {
      if (idx === 0) return acc;
      const diff = cur.value - sorted[idx - 1].value;
      return diff > acc ? diff : acc;
    }, 0);
    return [
      `Первое значение месяца: ${first.value} ${first.unit || first.meter_detail?.unit || ""}`,
      `Изменение за месяц: +${delta.toFixed(2)}`,
      spike ? `Максимальный шаг: +${spike.toFixed(2)}` : "",
    ].filter(Boolean);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="subtitle">Timeline</p>
          <h1>Лента показаний</h1>
          <p className="subtitle">Вертикальная хроника с фильтрами и событиями.</p>
        </div>
        <div className="secondary-nav">
          <button className="active" type="button">
            Лента
          </button>
          <button type="button" onClick={() => selectedProperty && onSelectProperty(selectedProperty)}>
            Обновить
          </button>
        </div>
      </div>

      <div className="surface">
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
          <div className="inline">
            <div>
              <p className="subtitle">Счётчик</p>
              <select value={selectedMeter || ""} onChange={(e) => setSelectedMeter(Number(e.target.value))}>
                <option value="" disabled>
                  Все счётчики
                </option>
                {meters.map((m) => (
                  <option value={m.id} key={m.id}>
                    {RESOURCE_LABELS[m.resource_type] || m.resource_type} · {m.serial_number || m.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="subtitle">Ресурс</p>
              <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)}>
                <option value="">Все</option>
                {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="subtitle">Диапазон</p>
              <div className="inline">
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {!selectedProperty && <div className="surface">Сначала выберите или создайте объект.</div>}

      {selectedProperty && (
        <div className="grid-2col">
          <form onSubmit={addReading} className="surface">
            <h3 style={{ marginBottom: 10 }}>Новое показание</h3>
            <div className="form-grid">
              <label>Счётчик</label>
              <select value={selectedMeter || ""} onChange={(e) => setSelectedMeter(Number(e.target.value))} required>
                <option value="" disabled>
                  Выберите счётчик
                </option>
                {meters.map((m) => (
                  <option value={m.id} key={m.id}>
                    {RESOURCE_LABELS[m.resource_type] || m.resource_type} · {m.serial_number || m.id}
                  </option>
                ))}
              </select>
              <label>Дата показания</label>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                required
              />
              <label>Значение</label>
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="Например, 1245.600"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
              <div></div>
              <div className="actions">
                <button type="submit" disabled={!meters.length}>
                  Сохранить
                </button>
                {!meters.length && <p className="subtitle">Добавьте счётчики на вкладке "Приборы".</p>}
                {status && <p className="success">{status}</p>}
                {error && <p className="error">{error}</p>}
              </div>
            </div>
            {selectedMeter && (
              <p className="subtitle" style={{ marginTop: 8 }}>
                Выбранный счётчик: {meters.find((m) => m.id === selectedMeter)?.serial_number || selectedMeter}
              </p>
            )}
          </form>

          <div className="surface">
            <h3>Краткая сводка</h3>
            <div className="timeline-summary">
              <span className="chip">Записей: {summary.count}</span>
              <span className="chip">Сумма значений: {summary.total.toFixed(2)}</span>
              <span className="chip">Начислений: {summary.withAmount.toFixed(2)} ₽</span>
            </div>
          </div>
        </div>
      )}

      <div className="surface">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Вертикальная лента</h3>
          <p className="subtitle">Группировка по месяцам с подсказками</p>
        </div>
        <div className="timeline">
          {timeline.map((section) => (
            <div key={section.month} className="timeline-month">
              <h4>{section.month}</h4>
              <div className="chip-row" style={{ marginBottom: 8 }}>
                {monthInsights(section.records).map((msg) => (
                  <span key={msg} className="chip">
                    {msg}
                  </span>
                ))}
              </div>
              <div className="timeline-list">
                {section.records.map((r) => {
                  const unit = r.unit || r.meter_detail?.unit;
                  return (
                    <div key={r.id} className="timeline-item">
                      <div>
                        <strong>{r.reading_date}</strong>
                        <p className="subtitle">{RESOURCE_LABELS[r.meter_detail?.resource_type || ""] || r.meter_detail?.resource_type || "Счётчик"}</p>
                      </div>
                      <div>
                        <div className="inline" style={{ justifyContent: "space-between" }}>
                          <span>{`${r.value} ${unit || ""}`.trim()}</span>
                          <span className="badge">{r.meter_detail?.serial_number || r.meter}</span>
                        </div>
                        <p className="subtitle">{r.amount_value ? `${Number(r.amount_value).toFixed(2)} ₽` : "Начисление не рассчитано"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {timeline.length === 0 && <p className="subtitle">Нет записей под выбранные фильтры.</p>}
        </div>
      </div>
    </div>
  );
}
