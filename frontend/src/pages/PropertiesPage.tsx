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
          <div className="muted">Создайте и выберите активный объект для работы</div>
        </div>
      </div>

      <div className="card">
        <h3>Добавить объект</h3>
        <form onSubmit={addProperty} className="inline-form">
          <label>
            Название
            <input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Адрес
            <input placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>
          <button type="submit">Добавить</button>
        </form>
      </div>

      <div className="card">
        <h3>Список объектов</h3>
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Адрес</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id} className={selectedProperty === p.id ? "active" : ""}>
                <td>{p.name}</td>
                <td>{p.address}</td>
                <td>
                  <button onClick={() => onSelect(p.id)}>Использовать</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
