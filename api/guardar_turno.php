<?php
declare(strict_types=1);
require __DIR__ . '/comun.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, false, 'Método no permitido');
}

$in = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) {
    responder(400, false, 'JSON inválido');
}

$profesionalId = filter_var($in['profesional_id'] ?? null, FILTER_VALIDATE_INT);
$servicioId = filter_var($in['servicio_id'] ?? null, FILTER_VALIDATE_INT);
$fechaTxt = $in['fecha_hora'] ?? null;
$nombre = is_string($in['cliente_nombre'] ?? null) ? trim($in['cliente_nombre']) : '';
$telefono = is_string($in['cliente_telefono'] ?? null) ? trim($in['cliente_telefono']) : '';

if (
    $profesionalId === false || $profesionalId < 1 ||
    $servicioId === false || $servicioId < 1 ||
    !is_string($fechaTxt)
) {
    responder(400, false, 'Faltan datos obligatorios o son inválidos');
}
if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 150) {
    responder(400, false, 'Ingresá un nombre válido');
}
if (!preg_match('/^[0-9+\-\s()]{6,30}$/', $telefono)) {
    responder(400, false, 'Ingresá un teléfono válido');
}

$inicio = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $fechaTxt);
if (!$inicio || $inicio->format('Y-m-d H:i:s') !== $fechaTxt) {
    responder(400, false, 'Formato de fecha_hora inválido (use YYYY-MM-DD HH:MM:SS)');
}
if ($inicio <= new DateTimeImmutable('now')) {
    responder(422, false, 'No se puede reservar un turno en el pasado');
}

try {
    $pdo = conectar();

    $duracion = duracionServicio($pdo, $profesionalId, $servicioId);
    if ($duracion === null) {
        responder(404, false, 'Profesional o servicio no disponible');
    }
    $fin = $inicio->modify("+{$duracion} minutes");

    // Bloquea la agenda del profesional: dos reservas simultáneas no se pisan
    $pdo->beginTransaction();
    $pdo->prepare('SELECT id FROM profesionales WHERE id = :id FOR UPDATE')
        ->execute([':id' => $profesionalId]);

    $fallar = function (int $codigo, string $msg) use ($pdo): void {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        responder($codigo, false, $msg);
    };

    $valido = false;
    foreach (iniciosDelDia($pdo, $profesionalId, $duracion, $inicio) as $t) {
        if ($t == $inicio) {
            $valido = true;
            break;
        }
    }
    if (!$valido) {
        $fallar(422, 'Horario fuera de la atención del profesional');
    }

    if (seSuperpone($inicio, $fin, turnosOcupados($pdo, $profesionalId, $inicio))) {
        $fallar(409, 'Horario no disponible');
    }

    $stmt = $pdo->prepare(
        "INSERT INTO turnos
            (usuario_id, profesional_id, servicio_id, fecha_hora, duracion_min,
             cliente_nombre, cliente_telefono, estado)
         VALUES (NULL, :p, :s, :f, :d, :n, :t, 'reservado')"
    );
    $stmt->execute([
        ':p' => $profesionalId,
        ':s' => $servicioId,
        ':f' => $fechaTxt,
        ':d' => $duracion,
        ':n' => $nombre,
        ':t' => $telefono,
    ]);
    $id = (int) $pdo->lastInsertId();
    $pdo->commit();

    responder(201, true, 'Turno registrado correctamente', ['turno_id' => $id]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (($e->errorInfo[1] ?? null) === 1062) { // mismo inicio, reserva simultánea
        responder(409, false, 'Horario no disponible');
    }
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
