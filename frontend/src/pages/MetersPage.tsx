import { FormEvent, useEffect, useState } from "react";
import api from "../api";
import { Meter } from "../App";

const RESOURCE_LABELS: Record<string, string> = {
  electricity: "Электричество",
  cold_water: "Холодная вода",
  hot_water: "Горячая вода",
  gas: "Газ",
  heating: "Отопление",
};

interface Props {
  selectedProperty: number | null;
}

export function MetersPage({ selectedProperty }: Props) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [resourceType, setResourceType] = useState("electricity");
  const [unit, setUnit] = useState("kwh");
  const [serial, setSerial] = useState("");

  useEffect(() => {
    if (selectedProperty) {
      api.get("meters/", { params: { property: selectedProperty } }).then(({ data }) => setMeters(data));
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

  if (!selectedProperty) return <div className="page">Сначала выберите объект недвижимости.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Счётчики</h1>
          <div className="muted">Добавьте приборы учёта для выбранного объекта</div>
        </div>
      </div>

      <div className="card">
        <h3>Новый счётчик</h3>
        <form onSubmit={addMeter} className="inline-form">
          <label>
            Тип ресурса
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
              {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Единицы измерения
            <input placeholder="kWh / м³" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
          <label>
            Серийный номер
            <input placeholder="Серийный номер" value={serial} onChange={(e) => setSerial(e.target.value)} />
          </label>
          <button type="submit">Добавить</button>
        </form>
      </div>

      <div className="card">
        <h3>Список счётчиков</h3>
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
      </div>
    </div>
  );
}
