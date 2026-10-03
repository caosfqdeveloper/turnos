<?php
declare(strict_types=1);
require __DIR__ . '/comun.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(405, false, 'Método no permitido');
}
exigirClave();

$fechaTxt = $_GET['fecha'] ?? '';
$dia = is_string($fechaTxt) ? DateTimeImmutable::createFromFormat('!Y-m-d', $fechaTxt) : false;
if (!$dia || $dia->format('Y-m-d') !== $fechaTxt) {
    responder(400, false, 'Fecha inválida (use YYYY-MM-DD)');
}

try {
    $pdo = conectar();
    $stmt = $pdo->prepare(
        'SELECT t.id, t.fecha_hora, t.duracion_min, t.estado,
                t.cliente_nombre, t.cliente_telefono,
                s.nombre AS servicio, u.nombre AS profesional
         FROM turnos t
         LEFT JOIN servicios s ON s.id = t.servicio_id
         JOIN profesionales p ON p.id = t.profesional_id
         JOIN usuarios u ON u.id = p.usuario_id
         WHERE t.fecha_hora >= :ini AND t.fecha_hora < :fin
         ORDER BY t.fecha_hora, t.id'
    );
    $stmt->execute([
        ':ini' => $dia->format('Y-m-d') . ' 00:00:00',
        ':fin' => $dia->modify('+1 day')->format('Y-m-d') . ' 00:00:00',
    ]);
    $turnos = $stmt->fetchAll();
    foreach ($turnos as &$t) {
        $t['id'] = (int) $t['id'];
        $t['duracion_min'] = (int) $t['duracion_min'];
    }
    unset($t);

    responder(200, true, 'OK', ['turnos' => $turnos]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
