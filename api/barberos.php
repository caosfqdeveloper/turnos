<?php
declare(strict_types=1);
require __DIR__ . '/comun.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(405, false, 'Método no permitido');
}
exigirClave();

try {
    $pdo = conectar();

    $servicios = $pdo->query('SELECT id, nombre FROM servicios WHERE activo = 1 ORDER BY id')->fetchAll();
    foreach ($servicios as &$s) {
        $s['id'] = (int) $s['id'];
    }
    unset($s);

    $barberos = $pdo->query(
        'SELECT p.id, u.nombre, p.activo FROM profesionales p
         JOIN usuarios u ON u.id = p.usuario_id ORDER BY p.id'
    )->fetchAll();
    $rel = $pdo->query('SELECT profesional_id, servicio_id FROM profesional_servicio')->fetchAll();
    $hor = $pdo->query(
        'SELECT profesional_id, dia_semana, hora_desde, hora_hasta
         FROM horarios_atencion ORDER BY dia_semana, hora_desde'
    )->fetchAll();

    foreach ($barberos as &$b) {
        $b['id'] = (int) $b['id'];
        $b['activo'] = (int) $b['activo'] === 1;
        $b['servicios'] = [];
        foreach ($rel as $r) {
            if ((int) $r['profesional_id'] === $b['id']) {
                $b['servicios'][] = (int) $r['servicio_id'];
            }
        }
        $b['horarios'] = [];
        foreach ($hor as $h) {
            if ((int) $h['profesional_id'] === $b['id']) {
                $b['horarios'][] = [
                    'dia_semana' => (int) $h['dia_semana'],
                    'hora_desde' => substr($h['hora_desde'], 0, 5),
                    'hora_hasta' => substr($h['hora_hasta'], 0, 5),
                ];
            }
        }
    }
    unset($b);

    responder(200, true, 'OK', ['servicios' => $servicios, 'barberos' => $barberos]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
