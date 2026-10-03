import { useEffect, useState } from "react";
import FormularioTurno from "./FormularioTurno";
import Panel from "./Panel";
import Barberos from "./Barberos";

export default function App() {
  const [vista, setVista] = useState(window.location.hash);

  useEffect(() => {
    const alCambiar = () => setVista(window.location.hash);
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  if (vista === "#/panel/barberos") return <Barberos />;
  return vista === "#/panel" ? <Panel /> : <FormularioTurno />;
}
