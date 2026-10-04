import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "/api";

const campo =
  "w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500";

const vacio = () => ({ id: null, nombre: "", duracion_min: 30, precio: 0, activo: true });

const formatoPrecio = (n) => `$${Number(n).toLocaleString("es-AR")}`;

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

function Aviso({ children }) {
  return (
    <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 font-medium text-red-700">
      {children}
    </p>
  );
}

export default function Servicios() {
  const [clave] = useState(() => sessionStorage.getItem("clave") ?? "");
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [edicion, setEdicion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    fetch(`${API}/servicios_admin.php`, { headers: { "X-Clave": clave } })
      .then((r) => r.json().then((d) => ({ status: r.status, d })))
      .then(({ status, d }) => {
        if (!activo) return;
        if (status === 401) {
          sessionStorage.removeItem("clave");
          window.location.hash = "#/panel";
          return;
        }
        if (!d.success) {
          setError(d.message || "Error al cargar los servicios.");
          return;
        }
        setError("");
        setLista(d.servicios);
      })
      .catch(() => activo && setError("No se pudo conectar con el servidor."));
    return () => {
      activo = false;
    };
  }, [clave, recarga]);

  const guardar = async (s) => {
    setGuardando(true);
    setError("");
    try {
      const r = await fetch(`${API}/guardar_servicio.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Clave": clave },
        body: JSON.stringify({
          ...s,
          duracion_min: Number(s.duracion_min),
          precio: Number(s.precio),
        }),
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

  const alternarActivo = (s) => {
    const accion = s.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Querés ${accion} "${s.nombre}"?`)) return;
    guardar({ ...s, activo: !s.activo });
  };

  const cambiar = (clv, valor) => setEdicion((e) => ({ ...e, [clv]: valor }));

  if (!clave) {
    return (
      <Marco titulo="Servicios">
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
      <Marco titulo={edicion.id ? "Editar servicio" : "Nuevo servicio"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            guardar(edicion);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="nombre" className="mb-1 block font-medium">
              Nombre
            </label>
            <input
              id="nombre"
              required
              minLength={2}
              value={edicion.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              className={campo}
              placeholder="Ej: Corte"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="duracion" className="mb-1 block font-medium">
                Duración (minutos)
              </label>
              <input
                id="duracion"
                type="number"
                required
                min={5}
                max={480}
                step={5}
                value={edicion.duracion_min}
                onChange={(e) => cambiar("duracion_min", e.target.value)}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="precio" className="mb-1 block font-medium">
                Precio ($)
              </label>
              <input
                id="precio"
                type="number"
                required
                min={0}
                step={100}
                value={edicion.precio}
                onChange={(e) => cambiar("precio", e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={edicion.activo}
              onChange={(e) => cambiar("activo", e.target.checked)}
            />
            Activo (aparece en el formulario de reservas)
          </label>

          {error && <Aviso>{error}</Aviso>}

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
    <Marco titulo="Servicios">
      {error && <Aviso>{error}</Aviso>}

      {!lista ? (
        <p className="mt-4 text-stone-500">Cargando...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {lista.map((s) => (
            <div key={s.id} className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-stone-900">{s.nombre}</p>
                  <p className="text-sm text-stone-500">
                    {s.duracion_min} min · {formatoPrecio(s.precio)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    s.activo ? "bg-green-100 text-green-700" : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {s.activo ? "activo" : "inactivo"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEdicion({ ...s })}
                  className="rounded-lg border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => alternarActivo(s)}
                  className="rounded-lg border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
                >
                  {s.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setEdicion(vacio())}
            className="w-full rounded-lg bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700"
          >
            + Agregar servicio
          </button>

          <p className="text-sm text-stone-500">
            Los turnos ya reservados conservan la duración que tenían. Un servicio nuevo hay que
            asignarlo a cada barbero desde la pantalla de Barberos.
          </p>
        </div>
      )}
    </Marco>
  );
}
