import { useEffect, useState } from "react";

// ---- Datos del negocio (cambiar acá para cada cliente) ----
const NOMBRE_NEGOCIO = "Barbería & Peluquería";
const API = import.meta.env.VITE_API_URL ?? "/api";

// Número de WhatsApp del local: código de país + área + número, sin "+" ni espacios
const WHATSAPP_LOCAL = "549TUCODIGODEAREATUNUMERO";

const enlaceWhatsApp = (c) => {
  const texto =
    `Hola! Reservé un turno en ${NOMBRE_NEGOCIO}:\n` +
    `${c.servicio} con ${c.profesional}\n` +
    `${formatoFecha(c.fecha)}, ${c.hora} hs\n` +
    `A nombre de ${c.nombre}`;
  return `https://wa.me/${WHATSAPP_LOCAL}?text=${encodeURIComponent(texto)}`;
};

const pad = (n) => String(n).padStart(2, "0");

// Fecha local (no UTC) en formato YYYY-MM-DD
const fechaLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatoPrecio = (n) => `$${Number(n).toLocaleString("es-AR")}`;

const formatoFecha = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const campo =
  "w-full rounded-lg border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-500";

function Pantalla({ children }) {
  return (
    <div className="min-h-screen bg-stone-100 flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-stone-900">{NOMBRE_NEGOCIO}</h1>
        <p className="text-stone-500 mb-6">Reservá tu turno en menos de un minuto.</p>
        {children}
      </div>
    </div>
  );
}

function Aviso({ ok, children }) {
  return (
    <div
      role="alert"
      className={`mt-4 rounded-lg p-4 font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {children}
    </div>
  );
}

export default function FormularioTurno() {
  const [catalogo, setCatalogo] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");

  const [servicioId, setServicioId] = useState("");
  const [profesionalId, setProfesionalId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const [recarga, setRecarga] = useState(0);
  const [resultado, setResultado] = useState({ clave: "", lista: [] });

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [confirmado, setConfirmado] = useState(null);

  const hoy = fechaLocal();
  const servicios = catalogo?.servicios ?? [];
  const profesionales = catalogo?.profesionales ?? [];
  const servicio = servicios.find((s) => String(s.id) === servicioId);
  const profesionalesDelServicio = profesionales.filter((p) =>
    p.servicios.includes(Number(servicioId))
  );

  // Catálogo de servicios y profesionales
  useEffect(() => {
    fetch(`${API}/servicios.php`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error();
        setCatalogo({ servicios: d.servicios, profesionales: d.profesionales });
      })
      .catch(() =>
        setErrorCarga(
          "No se pudo cargar el catálogo. Verificá que XAMPP (Apache) esté corriendo."
        )
      );
  }, []);

  // Horarios libres según servicio, profesional y fecha
  const clave =
    servicioId && profesionalId && fecha
      ? `${servicioId}|${profesionalId}|${fecha}|${recarga}`
      : "";
  const buscando = clave !== "" && resultado.clave !== clave;
  const horarios = clave !== "" && resultado.clave === clave ? resultado.lista : [];

  useEffect(() => {
    if (!clave) return;
    const [s, p, f] = clave.split("|");
    let activo = true;
    fetch(`${API}/horarios_libres.php?servicio_id=${s}&profesional_id=${p}&fecha=${f}`)
      .then((r) => r.json())
      .then((d) => activo && setResultado({ clave, lista: d.success ? d.horarios : [], fallo: !d.success }))
      .catch(() => activo && setResultado({ clave, lista: [], fallo: true }));
    return () => {
      activo = false;
    };
  }, [clave]);

  const elegirServicio = (id) => {
    setServicioId(id);
    setHora("");
    const posibles = profesionales.filter((p) => p.servicios.includes(Number(id)));
    setProfesionalId(posibles.length ? String(posibles[0].id) : "");
  };

  const reservar = async (e) => {
    e.preventDefault();
    if (!hora) {
      setError("Elegí un horario.");
      return;
    }
    setError("");
    setEnviando(true);

    try {
      const r = await fetch(`${API}/guardar_turno.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicio_id: Number(servicioId),
          profesional_id: Number(profesionalId),
          fecha_hora: `${fecha} ${hora}:00`,
          cliente_nombre: nombre,
          cliente_telefono: telefono,
        }),
      });
      const d = await r.json().catch(() => null);

      if (d?.success) {
        setConfirmado({
          servicio: servicio.nombre,
          precio: servicio.precio,
          profesional: profesionales.find((p) => String(p.id) === profesionalId)?.nombre,
          fecha,
          hora,
          nombre,
        });
      } else {
        setError(d?.message || `Respuesta inesperada del servidor (código ${r.status}).`);
        setHora("");
        setRecarga((n) => n + 1); // refresca los horarios libres
      }
    } catch {
      setError("No se pudo conectar con el servidor. Verificá que XAMPP (Apache) esté corriendo.");
    } finally {
      setEnviando(false);
    }
  };

  const nuevaReserva = () => {
    setConfirmado(null);
    setHora("");
    setNombre("");
    setTelefono("");
    setRecarga((n) => n + 1);
  };

  if (errorCarga) {
    return (
      <Pantalla>
        <Aviso>{errorCarga}</Aviso>
      </Pantalla>
    );
  }

  if (!catalogo) {
    return (
      <Pantalla>
        <p className="text-stone-500">Cargando...</p>
      </Pantalla>
    );
  }

  if (confirmado) {
    return (
      <Pantalla>
        <Aviso ok>¡Turno confirmado, {confirmado.nombre}!</Aviso>
        <div className="mt-4 rounded-lg border border-stone-200 p-4 space-y-1 text-stone-700">
          <p>
            <b>Servicio:</b> {confirmado.servicio} ({formatoPrecio(confirmado.precio)})
          </p>
          <p>
            <b>Con:</b> {confirmado.profesional}
          </p>
          <p>
            <b>Día:</b> {formatoFecha(confirmado.fecha)}
          </p>
          <p>
            <b>Hora:</b> {confirmado.hora} hs
          </p>
        </div>
        <a
          href={enlaceWhatsApp(confirmado)}
          target="_blank"
          rel="noreferrer"
          className="mt-6 block w-full rounded-lg bg-green-600 px-4 py-3 text-center font-semibold text-white hover:bg-green-700"
        >
          Avisar al local por WhatsApp
        </a>
        <button
          type="button"
          onClick={nuevaReserva}
          className="mt-6 w-full rounded-lg bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700"
        >
          Reservar otro turno
        </button>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <form onSubmit={reservar} className="space-y-6">
        <section>
          <h2 className="mb-2 font-semibold text-stone-800">1. Elegí el servicio</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {servicios.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => elegirServicio(String(s.id))}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  String(s.id) === servicioId
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 hover:border-stone-500"
                }`}
              >
                <span className="block font-medium">{s.nombre}</span>
                <span className="block text-sm opacity-80">
                  {s.duracion_min} min · {formatoPrecio(s.precio)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {servicio && (
          <section className="space-y-4">
            <div>
              <h2 className="mb-2 font-semibold text-stone-800">2. Elegí con quién</h2>
              <select
                value={profesionalId}
                onChange={(e) => {
                  setProfesionalId(e.target.value);
                  setHora("");
                }}
                className={campo}
              >
                {profesionalesDelServicio.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-stone-800">3. Elegí el día</h2>
              <input
                type="date"
                min={hoy}
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setHora("");
                }}
                className={campo}
              />
            </div>
          </section>
        )}

        {servicio && fecha && (
          <section>
            <h2 className="mb-2 font-semibold text-stone-800">4. Elegí el horario</h2>
            {buscando ? (
              <p className="text-stone-500">Buscando horarios...</p>
            ) : resultado.fallo ? (
              <p className="font-medium text-red-700">
                No se pudieron cargar los horarios. Verificá la conexión y volvé a elegir la fecha.
              </p>
            ) : horarios.length === 0 ? (
              <p className="text-stone-500">
                No hay horarios libres ese día. Probá con otra fecha.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {horarios.map((h) => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => setHora(h)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                      h === hora
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-300 hover:border-stone-500"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {hora && (
          <section className="space-y-4">
            <h2 className="font-semibold text-stone-800">5. Tus datos</h2>
            <input
              type="text"
              required
              minLength={2}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={campo}
              placeholder="Nombre y apellido"
              aria-label="Nombre y apellido"
              autoComplete="name"
            />
            <input
              type="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={campo}
              placeholder="Teléfono (ej: 1155551234)"
              aria-label="Teléfono"
              autoComplete="tel"
            />
          </section>
        )}

        <button
          type="submit"
          disabled={enviando || !hora}
          className="w-full rounded-lg bg-stone-900 px-4 py-3 font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {enviando ? "Reservando..." : "Confirmar turno"}
        </button>

        {error && <Aviso>{error}</Aviso>}
      </form>
    </Pantalla>
  );
}
