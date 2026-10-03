<?php
declare(strict_types=1);
require __DIR__ . '/comun.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(405, false, 'Método no permitido');
}
exigirClave();

try {
    $pdo = conectar();
    $filas = $pdo->query(
        'SELECT id, nombre, duracion_min, precio, activo FROM servicios ORDER BY id'
    )->fetchAll();
    foreach ($filas as &$f) {
        $f['id'] = (int) $f['id'];
        $f['duracion_min'] = (int) $f['duracion_min'];
        $f['precio'] = (float) $f['precio'];
        $f['activo'] = (int) $f['activo'] === 1;
    }
    unset($f);

    responder(200, true, 'OK', ['servicios' => $filas]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
