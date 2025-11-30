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

export function MetersPage({ selectedProperty, properties, onSelectProperty }: Props) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [resourceType, setResourceType] = useState("electricity");
  const [unit, setUnit] = useState("kwh");
  const [serial, setSerial] = useState("");

  useEffect(() => {
    if (selectedProperty) {
      api.get("meters/", { params: { property: selectedProperty } }).then(({ data }) => setMeters(data));
    } else {
      setMeters([]);
    }
  }, [selectedProperty]);

  const addMeter = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    const { data } = await api.post("meters/", {
      property: selectedProperty,
      resource_type: resourceType,
      unit,
      serial_number: serial,
    });
    setMeters([...meters, data]);
    setSerial("");
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Счётчики</h1>
          <p className="subtitle">Добавьте приборы учета для выбранного объекта.</p>
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
            <p>Выберите объект и добавьте счетчики, чтобы фиксировать показания и начисления.</p>
          </div>
        </div>
      </div>

      {!selectedProperty && (
        <div className="card">Сначала выберите или создайте объект недвижимости.</div>
      )}

      {selectedProperty && (
        <form onSubmit={addMeter} className="card">
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
        </form>
      )}

      <div className="card">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Список счётчиков</h3>
          <p className="subtitle">Все приборы учета на выбранном объекте.</p>
        </div>
        {selectedProperty ? (
          meters.length ? (
            <table>
              <thead>
                <tr>
                  <th>Тип ресурса</th>
                  <th>Ед. изм.</th>
                  <th>Серийный номер</th>
                </tr>
              </thead>
              <tbody>
                {meters.map((m) => (
                  <tr key={m.id}>
                    <td>{RESOURCE_LABELS[m.resource_type] || m.resource_type}</td>
                    <td>{m.unit}</td>
                    <td>{m.serial_number}</td>
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
