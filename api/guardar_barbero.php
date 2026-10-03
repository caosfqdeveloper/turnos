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

// id null = barbero nuevo
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
$activo = ($in['activo'] ?? true) ? 1 : 0;

// Servicios
$servicios = [];
foreach (is_array($in['servicios'] ?? null) ? $in['servicios'] : [] as $sid) {
    $v = filter_var($sid, FILTER_VALIDATE_INT);
    if ($v === false || $v < 1) {
        responder(400, false, 'Servicio inválido');
    }
    $servicios[$v] = $v;
}
$servicios = array_values($servicios);

// Horarios
$horarios = is_array($in['horarios'] ?? null) ? $in['horarios'] : [];
if (count($horarios) > 40) {
    responder(400, false, 'Demasiadas franjas horarias');
}
$hora = '/^([01]\d|2[0-3]):[0-5]\d$/';
$limpios = [];
$porDia = [];
foreach ($horarios as $h) {
    if (!is_array($h)) {
        responder(400, false, 'Horario inválido');
    }
    $dia = filter_var($h['dia_semana'] ?? null, FILTER_VALIDATE_INT);
    $desde = is_string($h['hora_desde'] ?? null) ? $h['hora_desde'] : '';
    $hasta = is_string($h['hora_hasta'] ?? null) ? $h['hora_hasta'] : '';
    if ($dia === false || $dia < 1 || $dia > 7 || !preg_match($hora, $desde) || !preg_match($hora, $hasta)) {
        responder(400, false, 'Horario inválido');
    }
    if ($hasta <= $desde) {
        responder(422, false, 'La hora de fin debe ser posterior a la de inicio');
    }
    $limpios[] = [$dia, $desde, $hasta];
    $porDia[$dia][] = [$desde, $hasta];
}
foreach ($porDia as $franjas) {
    usort($franjas, fn($a, $b) => strcmp($a[0], $b[0]));
    for ($i = 1; $i < count($franjas); $i++) {
        if ($franjas[$i][0] < $franjas[$i - 1][1]) {
            responder(422, false, 'Hay franjas que se superponen el mismo día');
        }
    }
}

try {
    $pdo = conectar();

    if ($servicios) {
        $marcas = implode(',', array_fill(0, count($servicios), '?'));
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM servicios WHERE activo = 1 AND id IN ($marcas)");
        $stmt->execute($servicios);
        if ((int) $stmt->fetchColumn() !== count($servicios)) {
            responder(404, false, 'Algún servicio no existe');
        }
    }

    $usuarioId = null;
    if ($id !== null) {
        $stmt = $pdo->prepare('SELECT usuario_id FROM profesionales WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $usuarioId = $stmt->fetchColumn();
        if ($usuarioId === false) {
            responder(404, false, 'Barbero no encontrado');
        }
    }

    $pdo->beginTransaction();

    if ($id === null) {
        $email = 'barbero-' . bin2hex(random_bytes(6)) . '@turnos.local';
        $pdo->prepare(
            "INSERT INTO usuarios (nombre, email, password_hash, rol)
             VALUES (:n, :e, 'sin-login', 'profesional')"
        )->execute([':n' => $nombre, ':e' => $email]);
        $usuarioId = (int) $pdo->lastInsertId();

        $pdo->prepare(
            "INSERT INTO profesionales (usuario_id, especialidad, duracion_turno_min, activo)
             VALUES (:u, 'Barbero', 30, :a)"
        )->execute([':u' => $usuarioId, ':a' => $activo]);
        $id = (int) $pdo->lastInsertId();
    } else {
        $pdo->prepare('UPDATE usuarios SET nombre = :n WHERE id = :u')
            ->execute([':n' => $nombre, ':u' => $usuarioId]);
        $pdo->prepare('UPDATE profesionales SET activo = :a WHERE id = :id')
            ->execute([':a' => $activo, ':id' => $id]);
    }

    $pdo->prepare('DELETE FROM profesional_servicio WHERE profesional_id = :id')->execute([':id' => $id]);
    $ins = $pdo->prepare('INSERT INTO profesional_servicio (profesional_id, servicio_id) VALUES (:p, :s)');
    foreach ($servicios as $sid) {
        $ins->execute([':p' => $id, ':s' => $sid]);
    }

    $pdo->prepare('DELETE FROM horarios_atencion WHERE profesional_id = :id')->execute([':id' => $id]);
    $ins = $pdo->prepare(
        'INSERT INTO horarios_atencion (profesional_id, dia_semana, hora_desde, hora_hasta)
         VALUES (:p, :d, :a, :b)'
    );
    foreach ($limpios as [$dia, $desde, $hasta]) {
        $ins->execute([':p' => $id, ':d' => $dia, ':a' => $desde . ':00', ':b' => $hasta . ':00']);
    }

    $pdo->commit();
    responder(200, true, 'Barbero guardado', ['id' => $id]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($e->getMessage());
    responder(500, false, 'Error interno del servidor');
}
