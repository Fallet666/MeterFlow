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

  if (!selectedProperty) return <div>Сначала выберите объект недвижимости.</div>;

  return (
    <div>
      <h1>Счётчики</h1>
      <form onSubmit={addMeter} className="card inline">
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
      </form>
      <div className="card">
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
