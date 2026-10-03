<?php
declare(strict_types=1);
require __DIR__ . '/comun.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(405, false, 'Método no permitido');
}

try {
    $pdo = conectar();

    $servicios = $pdo->query(
        'SELECT id, nombre, duracion_min, precio FROM servicios WHERE activo = 1 ORDER BY id'
    )->fetchAll();
    foreach ($servicios as &$s) {
        $s['id'] = (int) $s['id'];
        $s['duracion_min'] = (int) $s['duracion_min'];
        $s['precio'] = (float) $s['precio'];
    }
    unset($s);

    $profesionales = $pdo->query(
        'SELECT p.id, u.nombre FROM profesionales p
         JOIN usuarios u ON u.id = p.usuario_id WHERE p.activo = 1 ORDER BY p.id'
    )->fetchAll();

    $rel = $pdo->query('SELECT profesional_id, servicio_id FROM profesional_servicio')->fetchAll();
    foreach ($profesionales as &$p) {
        $p['id'] = (int) $p['id'];
        $p['servicios'] = [];
        foreach ($rel as $r) {
            if ((int) $r['profesional_id'] === $p['id']) {
                $p['servicios'][] = (int) $r['servicio_id'];
            }
        }
    }
    unset($p);

    responder(200, true, 'OK', ['servicios' => $servicios, 'profesionales' => $profesionales]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
