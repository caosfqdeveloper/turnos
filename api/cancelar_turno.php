<?php
declare(strict_types=1);
require __DIR__ . '/comun.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, false, 'Método no permitido');
}
exigirClave();

$in = json_decode(file_get_contents('php://input') ?: '', true);
$id = is_array($in) ? filter_var($in['id'] ?? null, FILTER_VALIDATE_INT) : false;
if ($id === false || $id < 1) {
    responder(400, false, 'id inválido');
}

try {
    $pdo = conectar();
    $stmt = $pdo->prepare("UPDATE turnos SET estado = 'cancelado' WHERE id = :id AND estado = 'reservado'");
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        responder(404, false, 'Turno no encontrado o ya cancelado');
    }
    responder(200, true, 'Turno cancelado');
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
