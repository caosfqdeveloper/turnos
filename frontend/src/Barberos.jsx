import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "/api";
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const campo =
  "w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500";

const vacio = () => ({ id: null, nombre: "", activo: true, servicios: [], horarios: [] });

const resumenHorarios = (horarios) => {
  if (!horarios.length) return "Sin horarios cargados";
  const dias = [...new Set(horarios.map((h) => h.dia_semana))].sort();
  return dias.map((d) => DIAS[d - 1].slice(0, 3)).join(", ");
};

function Marco({ titulo, children }) {
  return (
    <div className="min-h-screen bg-stone-100 flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">{titulo}</h1>
          <a href="#/panel" className="text-sm text-stone-600 underline">
            Volver a turnos
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}

function Error({ children }) {
  return <p className="mt-4 rounded-lg bg-red-100 p-3 font-medium text-red-700">{children}</p>;
}

export default function Barberos() {
  const [clave] = useState(() => sessionStorage.getItem("clave") ?? "");
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [edicion, setEdicion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    fetch(`${API}/barberos.php`, { headers: { "X-Clave": clave } })
      .then((r) => r.json().then((d) => ({ status: r.status, d })))
      .then(({ status, d }) => {
        if (!activo) return;
        if (status === 401) {
          sessionStorage.removeItem("clave");
          window.location.hash = "#/panel";
          return;
        }
        if (!d.success) {
          setError(d.message || "Error al cargar los barberos.");
          return;
        }
        setError("");
        setDatos(d);
      })
      .catch(() => activo && setError("No se pudo conectar con el servidor."));
    return () => {
      activo = false;
    };
  }, [clave, recarga]);

  const guardar = async (b) => {
    setGuardando(true);
    setError("");
    try {
      const r = await fetch(`${API}/guardar_barbero.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Clave": clave },
        body: JSON.stringify(b),
      });
      const d = await r.json().catch(() => null);
      if (d?.success) {
        setEdicion(null);
        setRecarga((n) => n + 1);
      } else {
        setError(d?.message || `Respuesta inesperada del servidor (código ${r.status}).`);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = (b) => {
    const accion = b.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Querés ${accion} a ${b.nombre}?`)) return;
    guardar({ ...b, activo: !b.activo });
  };

  const cambiar = (clv, valor) => setEdicion((e) => ({ ...e, [clv]: valor }));

  const alternarServicio = (id) =>
    setEdicion((e) => ({
      ...e,
      servicios: e.servicios.includes(id)
        ? e.servicios.filter((s) => s !== id)
        : [...e.servicios, id],
    }));

  const agregarFranja = (dia) =>
    setEdicion((e) => ({
      ...e,
      horarios: [...e.horarios, { dia_semana: dia, hora_desde: "10:00", hora_hasta: "20:00" }],
    }));

  const cambiarFranja = (idx, clv, valor) =>
    setEdicion((e) => ({
      ...e,
      horarios: e.horarios.map((h, i) => (i === idx ? { ...h, [clv]: valor } : h)),
    }));

  const quitarFranja = (idx) =>
    setEdicion((e) => ({ ...e, horarios: e.horarios.filter((_, i) => i !== idx) }));

  if (!clave) {
    return (
      <Marco titulo="Barberos">
        <p className="text-stone-600">
          Primero ingresá con la clave en el{" "}
          <a href="#/panel" className="underline">
            panel
          </a>
          .
        </p>
      </Marco>
    );
  }

  if (edicion) {
    return (
      <Marco titulo={edicion.id ? "Editar barbero" : "Nuevo barbero"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            guardar(edicion);
          }}
          className="space-y-6"
        >
          <div>
            <label className="mb-1 block font-medium">Nombre</label>
            <input
              required
              minLength={2}
              value={edicion.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              className={campo}
              placeholder="Ej: Nico"
            />
          </div>

          <div>
            <p className="mb-2 font-medium">Servicios que hace</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {datos.servicios.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={edicion.servicios.includes(s.id)}
                    onChange={() => alternarServicio(s.id)}
                  />
                  {s.nombre}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium">Horarios de atención</p>
            <div className="space-y-3">
              {DIAS.map((nombreDia, i) => {
                const dia = i + 1;
                return (
                  <div key={dia} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{nombreDia}</span>
                      <button
                        type="button"
                        onClick={() => agregarFranja(dia)}
                        className="text-sm underline"
                      >
                        + Agregar franja
                      </button>
                    </div>
                    {edicion.horarios.map((h, idx) =>
                      h.dia_semana !== dia ? null : (
                        <div key={idx} className="mt-2 flex items-center gap-2">
                          <input
                            type="time"
                            required
                            value={h.hora_desde}
                            onChange={(e) => cambiarFranja(idx, "hora_desde", e.target.value)}
                            className={campo}
                          />
                          <span>a</span>
                          <input
                            type="time"
                            required
                            value={h.hora_hasta}
                            onChange={(e) => cambiarFranja(idx, "hora_hasta", e.target.value)}
                            className={campo}
                          />
                          <button
                            type="button"
                            onClick={() => quitarFranja(idx)}
                            className="px-2 text-red-700"
                            aria-label="Quitar franja"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-stone-500">
              Un día sin franjas es día libre. Para turno cortado, agregá dos franjas.
            </p>
          </div>

          {error && <Error>{error}</Error>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 rounded-lg bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700 disabled:bg-stone-400"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEdicion(null);
                setError("");
              }}
              className="rounded-lg border border-stone-300 px-4 py-3 hover:bg-stone-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Marco>
    );
  }

  return (
    <Marco titulo="Barberos">
      {error && <Error>{error}</Error>}

      {!datos ? (
        <p className="mt-4 text-stone-500">Cargando...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {datos.barberos.map((b) => (
            <div key={b.id} className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-stone-900">{b.nombre}</p>
                  <p className="text-sm text-stone-500">
                    {b.servicios.length} servicios · {resumenHorarios(b.horarios)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    b.activo ? "bg-green-100 text-green-700" : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {b.activo ? "activo" : "inactivo"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEdicion({ ...b })}
                  className="rounded-lg border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => alternarActivo(b)}
                  className="rounded-lg border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
                >
                  {b.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setEdicion(vacio())}
            className="w-full rounded-lg bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700"
          >
            + Agregar barbero
          </button>

          <p className="text-sm text-stone-500">
            Desactivar o cambiar horarios no cancela los turnos ya reservados: cancelalos desde
            la pantalla de turnos.
          </p>
        </div>
      )}
    </Marco>
  );
}
