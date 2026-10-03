<?php
declare(strict_types=1);

date_default_timezone_set('America/Argentina/Buenos_Aires');

const PASO_MIN = 15; // los turnos pueden empezar cada 15 minutos
const ORIGENES_PERMITIDOS = ['http://localhost:5173', 'http://localhost:5174'];

header('Content-Type: application/json; charset=utf-8');
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origen, ORIGENES_PERMITIDOS, true)) {
    header('Access-Control-Allow-Origin: ' . $origen);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Clave');

// Preflight de CORS
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function responder(int $codigo, bool $ok, string $mensaje, array $extra = []): void
{
    http_response_code($codigo);
    echo json_encode(array_merge(['success' => $ok, 'message' => $mensaje], $extra));
    exit;
}

function conectar(): PDO
{
    return new PDO('mysql:host=localhost;dbname=turnos;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

// Duración del servicio, o null si no existe / el profesional no lo hace
function duracionServicio(PDO $pdo, int $profesionalId, int $servicioId): ?int
{
    $stmt = $pdo->prepare(
        'SELECT s.duracion_min
         FROM servicios s
         JOIN profesional_servicio ps ON ps.servicio_id = s.id
         JOIN profesionales p ON p.id = ps.profesional_id
         WHERE s.id = :s AND s.activo = 1 AND p.id = :p AND p.activo = 1'
    );
    $stmt->execute([':s' => $servicioId, ':p' => $profesionalId]);
    $d = $stmt->fetchColumn();
    return $d === false ? null : (int) $d;
}

// Todos los inicios válidos del día según los horarios de atención
function iniciosDelDia(PDO $pdo, int $profesionalId, int $duracion, DateTimeImmutable $dia): array
{
    $stmt = $pdo->prepare(
        'SELECT hora_desde, hora_hasta FROM horarios_atencion
         WHERE profesional_id = :p AND dia_semana = :d ORDER BY hora_desde'
    );
    $stmt->execute([':p' => $profesionalId, ':d' => (int) $dia->format('N')]);

    $inicios = [];
    foreach ($stmt->fetchAll() as $h) {
        $dia0 = $dia->format('Y-m-d');
        $desde = new DateTimeImmutable($dia0 . ' ' . $h['hora_desde']);
        $hasta = new DateTimeImmutable($dia0 . ' ' . $h['hora_hasta']);
        for (
            $t = $desde;
            $t->modify("+{$duracion} minutes") <= $hasta;
            $t = $t->modify('+' . PASO_MIN . ' minutes')
        ) {
            $inicios[] = $t;
        }
    }
    return $inicios;
}

// Turnos reservados del profesional ese día, con inicio y fin
function turnosOcupados(PDO $pdo, int $profesionalId, DateTimeImmutable $dia): array
{
    $ini = $dia->format('Y-m-d') . ' 00:00:00';
    $fin = $dia->modify('+1 day')->format('Y-m-d') . ' 00:00:00';

    $stmt = $pdo->prepare(
        "SELECT fecha_hora, duracion_min FROM turnos
         WHERE profesional_id = :p AND estado = 'reservado'
           AND fecha_hora >= :ini AND fecha_hora < :fin"
    );
    $stmt->execute([':p' => $profesionalId, ':ini' => $ini, ':fin' => $fin]);

    $ocupados = [];
    foreach ($stmt->fetchAll() as $t) {
        $i = new DateTimeImmutable($t['fecha_hora']);
        $ocupados[] = ['ini' => $i, 'fin' => $i->modify('+' . (int) $t['duracion_min'] . ' minutes')];
    }
    return $ocupados;
}

function seSuperpone(DateTimeImmutable $ini, DateTimeImmutable $fin, array $ocupados): bool
{
    foreach ($ocupados as $o) {
        if ($ini < $o['fin'] && $fin > $o['ini']) {
            return true;
        }
    }
    return false;
}

// Protege los endpoints del panel con la clave del dueño
function exigirClave(): void
{
    require_once __DIR__ . '/clave.php';
    $enviada = $_SERVER['HTTP_X_CLAVE'] ?? '';
    if (!is_string($enviada) || !hash_equals(CLAVE_PANEL, $enviada)) {
        responder(401, false, 'Clave incorrecta');
    }
}
