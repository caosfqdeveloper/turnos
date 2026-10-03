import { useEffect, useState } from "react";

const API = "http://localhost/api";

const pad = (n) => String(n).padStart(2, "0");

const fechaLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const campo =
  "w-full rounded-lg border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-500";

const ETIQUETA = {
  reservado: "bg-green-100 text-green-700",
  cancelado: "bg-stone-200 text-stone-500",
  atendido: "bg-blue-100 text-blue-700",
};

export default function Panel() {
  const [clave, setClave] = useState(() => sessionStorage.getItem("clave") ?? "");
  const [claveInput, setClaveInput] = useState("");
  const [fecha, setFecha] = useState(fechaLocal());
  const [turnos, setTurnos] = useState(null);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    fetch(`${API}/turnos_dia.php?fecha=${fecha}`, { headers: { "X-Clave": clave } })
      .then((r) => r.json().then((d) => ({ status: r.status, d })))
      .then(({ status, d }) => {
        if (!activo) return;
        if (status === 401) {
          sessionStorage.removeItem("clave");
          setClave("");
          setError("Clave incorrecta.");
          return;
        }
        if (!d.success) {
          setError(d.message || "Error al cargar los turnos.");
          return;
        }
        setError("");
        setTurnos(d.turnos);
      })
      .catch(() => activo && setError("No se pudo conectar con el servidor."));
    return () => {
      activo = false;
    };
  }, [clave, fecha, recarga]);

  const entrar = (e) => {
    e.preventDefault();
    const c = claveInput.trim();
    sessionStorage.setItem("clave", c);
    setError("");
    setClave(c);
  };

  const salir = () => {
    sessionStorage.removeItem("clave");
    setClave("");
    setClaveInput("");
    setTurnos(null);
  };

  const cancelar = async (t) => {
    const hora = t.fecha_hora.slice(11, 16);
    if (!window.confirm(`¿Cancelar el turno de ${t.cliente_nombre} a las ${hora}?`)) return;
    try {
      const r = await fetch(`${API}/cancelar_turno.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Clave": clave },
        body: JSON.stringify({ id: t.id }),
      });
      const d = await r.json().catch(() => null);
      if (!d?.success) setError(d?.message || "No se pudo cancelar el turno.");
    } catch {
      setError("No se pudo conectar con el servidor.");
    }
    setRecarga((n) => n + 1);
  };

  if (!clave) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-start justify-center p-4 sm:p-8">
        <form
          onSubmit={entrar}
          className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4"
        >
          <h1 className="text-2xl font-bold text-stone-900">Panel del local</h1>
          <input
            type="password"
            required
            value={claveInput}
            onChange={(e) => setClaveInput(e.target.value)}
            className={campo}
            placeholder="Clave"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700"
          >
            Entrar
          </button>
          {error && (
            <p className="rounded-lg bg-red-100 p-3 font-medium text-red-700">{error}</p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-2xl font-bold text-stone-900">Turnos del día</h1>
            <a href="#/panel/barberos" className="text-sm text-stone-600 underline">
              Barberos
            </a>
          </div>
          <button type="button" onClick={salir} className="text-sm text-stone-500 underline">
            Salir
          </button>
        </div>

        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={campo}
        />

        {error && (
          <p className="mt-4 rounded-lg bg-red-100 p-3 font-medium text-red-700">{error}</p>
        )}

        <div className="mt-6 space-y-3">
          {turnos === null ? (
            <p className="text-stone-500">Cargando...</p>
          ) : turnos.length === 0 ? (
            <p className="text-stone-500">No hay turnos ese día.</p>
          ) : (
            turnos.map((t) => (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 p-4"
              >
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-stone-900">
                    {t.fecha_hora.slice(11, 16)} · {t.servicio ?? "Sin servicio"}
                  </p>
                  <p className="text-stone-700">
                    {t.cliente_nombre ?? "Sin nombre"}
                    {t.cliente_telefono && (
                      <>
                        {" "}
                        ·{" "}
                        <a className="underline" href={`tel:${t.cliente_telefono}`}>
                          {t.cliente_telefono}
                        </a>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-stone-500">
                    Con {t.profesional} · {t.duracion_min} min
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${ETIQUETA[t.estado] ?? ""}`}
                  >
                    {t.estado}
                  </span>
                  {t.estado === "reservado" && (
                    <button
                      type="button"
                      onClick={() => cancelar(t)}
                      className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
