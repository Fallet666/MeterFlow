import { FormEvent, useEffect, useMemo, useState } from "react";
import api, { authApi } from "../api";
import { Property } from "../App";

interface Props {
  properties: Property[];
  onUpdated: (list: Property[]) => void;
  selectedProperty: number | null;
  user: any;
  onSelect: (id: number) => void;
}

export function PropertiesPage({ properties, onUpdated, selectedProperty, onSelect, user }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUsername = useMemo(() => {
    if (user?.username) return user.username;
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored)?.username : "";
  }, [user]);

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

  const openDeleteModal = (property: Property) => {
    setDeleteTarget(property);
    setDeletePassword("");
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeletePassword("");
    setDeleteError(null);
  };

  const confirmDeletion = async () => {
    if (!deleteTarget) return;
    if (!currentUsername) {
      setDeleteError("Не удалось определить пользователя для подтверждения.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await authApi.login(currentUsername, deletePassword);
      await api.delete(`properties/${deleteTarget.id}/`);
      const updated = properties.filter((item) => item.id !== deleteTarget.id);
      onUpdated(updated);
      if (selectedProperty === deleteTarget.id && updated.length) {
        onSelect(updated[0].id);
      }
      setFeedback("Объект успешно удалён.");
      closeDeleteModal();
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 400) {
        setDeleteError("Пароль неверный. Попробуйте снова.");
      } else {
        setDeleteError("Не удалось удалить объект. Попробуйте позже.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Объекты недвижимости</h1>
          <p className="subtitle">Создавайте и выбирайте активный объект для работы с показаниями.</p>
        </div>
      </div>
      {feedback && <div className="success">{feedback}</div>}

      <form onSubmit={addProperty} className="card">
        <div className="inline">
          <input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <button type="submit">Добавить</button>
        </div>
      </form>

      <div className="card">
        <div className="page-header" style={{ alignItems: "center" }}>
          <h3>Список объектов</h3>
          <p className="subtitle">Выберите активный объект для работы.</p>
        </div>
        <div className="table-wrapper">
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
                    <div className="table-actions">
                      <button className="pill" onClick={() => onSelect(p.id)}>
                        Использовать
                      </button>
                      <button type="button" className="ghost" onClick={() => openDeleteModal(p)}>
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Удалить объект «{deleteTarget.name}»?</h3>
            <p>Объект и все связанные данные будут удалены. Подтвердите действие, введя пароль.</p>
            <label>
              Пароль
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Введите пароль для подтверждения"
              />
            </label>
            {deleteError && <div className="error">{deleteError}</div>}
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={closeDeleteModal} disabled={isDeleting}>
                Отмена
              </button>
              <button type="button" className="danger" onClick={confirmDeletion} disabled={isDeleting || !deletePassword}>
                {isDeleting ? "Удаление..." : "Подтверждаю"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
