<?php
declare(strict_types=1);
require __DIR__ . '/comun.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(405, false, 'Método no permitido');
}

$profesionalId = filter_var($_GET['profesional_id'] ?? null, FILTER_VALIDATE_INT);
$servicioId = filter_var($_GET['servicio_id'] ?? null, FILTER_VALIDATE_INT);
$fechaTxt = $_GET['fecha'] ?? '';

if ($profesionalId === false || $profesionalId < 1 || $servicioId === false || $servicioId < 1) {
    responder(400, false, 'profesional_id y servicio_id son obligatorios');
}
$dia = is_string($fechaTxt) ? DateTimeImmutable::createFromFormat('!Y-m-d', $fechaTxt) : false;
if (!$dia || $dia->format('Y-m-d') !== $fechaTxt) {
    responder(400, false, 'Fecha inválida (use YYYY-MM-DD)');
}

try {
    $pdo = conectar();
    $duracion = duracionServicio($pdo, $profesionalId, $servicioId);
    if ($duracion === null) {
        responder(404, false, 'Profesional o servicio no disponible');
    }

    $ocupados = turnosOcupados($pdo, $profesionalId, $dia);
    $ahora = new DateTimeImmutable('now');

    $libres = [];
    foreach (iniciosDelDia($pdo, $profesionalId, $duracion, $dia) as $ini) {
        $fin = $ini->modify("+{$duracion} minutes");
        if ($ini <= $ahora || seSuperpone($ini, $fin, $ocupados)) {
            continue;
        }
        $libres[] = $ini->format('H:i');
    }

    responder(200, true, 'OK', ['horarios' => $libres]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
