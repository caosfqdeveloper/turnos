<?php
declare(strict_types=1);
require __DIR__ . '/comun.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, false, 'Método no permitido');
}
exigirClave();

$in = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) {
    responder(400, false, 'JSON inválido');
}

// id null = servicio nuevo
$id = $in['id'] ?? null;
if ($id !== null) {
    $id = filter_var($id, FILTER_VALIDATE_INT);
    if ($id === false || $id < 1) {
        responder(400, false, 'id inválido');
    }
}

$nombre = is_string($in['nombre'] ?? null) ? trim($in['nombre']) : '';
if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 100) {
    responder(400, false, 'Ingresá un nombre válido');
}

$duracion = filter_var($in['duracion_min'] ?? null, FILTER_VALIDATE_INT);
if ($duracion === false || $duracion < 5 || $duracion > 480 || $duracion % 5 !== 0) {
    responder(400, false, 'La duración tiene que ser múltiplo de 5 minutos (entre 5 y 480)');
}

$precio = filter_var($in['precio'] ?? null, FILTER_VALIDATE_FLOAT);
if ($precio === false || $precio < 0 || $precio > 10000000) {
    responder(400, false, 'Precio inválido');
}

$activo = ($in['activo'] ?? true) ? 1 : 0;

try {
    $pdo = conectar();

    if ($id === null) {
        $pdo->prepare(
            'INSERT INTO servicios (nombre, duracion_min, precio, activo) VALUES (:n, :d, :p, :a)'
        )->execute([':n' => $nombre, ':d' => $duracion, ':p' => $precio, ':a' => $activo]);
        $id = (int) $pdo->lastInsertId();
    } else {
        $stmt = $pdo->prepare('SELECT id FROM servicios WHERE id = :id');
        $stmt->execute([':id' => $id]);
        if ($stmt->fetchColumn() === false) {
            responder(404, false, 'Servicio no encontrado');
        }
        $pdo->prepare(
            'UPDATE servicios SET nombre = :n, duracion_min = :d, precio = :p, activo = :a WHERE id = :id'
        )->execute([':n' => $nombre, ':d' => $duracion, ':p' => $precio, ':a' => $activo, ':id' => $id]);
    }

    responder(200, true, 'Servicio guardado', ['id' => $id]);
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
