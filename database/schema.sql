-- =========================================================
-- Sistema de Turnos
-- MySQL 8.0+
-- Engine: InnoDB
-- Charset: utf8mb4
-- Zona horaria asumida: America/Argentina/Buenos_Aires
-- =========================================================

SET NAMES utf8mb4;
SET time_zone = '-03:00';



-- =========================================================
-- Tabla: usuarios
-- Almacena administradores, profesionales y clientes.
-- =========================================================
CREATE TABLE usuarios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'profesional', 'cliente') NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Email único para evitar duplicados.
    CONSTRAINT uq_usuarios_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: profesionales
-- Extiende a un usuario con datos específicos de atención.
-- =========================================================
CREATE TABLE profesionales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NOT NULL,
    especialidad VARCHAR(150) NOT NULL,
    duracion_turno_min INT NOT NULL DEFAULT 30,
    activo TINYINT(1) NOT NULL DEFAULT 1,

    -- Un usuario profesional solo puede tener un registro.
    CONSTRAINT uq_profesionales_usuario UNIQUE (usuario_id),

    -- Si se elimina el usuario profesional, se elimina su perfil.
    CONSTRAINT fk_profesionales_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: horarios_atencion
-- Define disponibilidad semanal del profesional.
-- dia_semana: 1=Lunes ... 7=Domingo
-- =========================================================
CREATE TABLE horarios_atencion (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    profesional_id BIGINT UNSIGNED NOT NULL,
    dia_semana TINYINT UNSIGNED NOT NULL,
    hora_desde TIME NOT NULL,
    hora_hasta TIME NOT NULL,

    -- Día válido entre 1 y 7.
    CONSTRAINT chk_horarios_dia_semana
        CHECK (dia_semana BETWEEN 1 AND 7),

    -- El horario de fin debe ser mayor al de inicio.
    CONSTRAINT chk_horarios_rango
        CHECK (hora_hasta > hora_desde),

    CONSTRAINT fk_horarios_profesional
        FOREIGN KEY (profesional_id)
        REFERENCES profesionales(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Índice para consultas por profesional.
    INDEX idx_horarios_profesional (profesional_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Tabla: turnos
--
-- Restricción clave:
-- Un profesional NO puede tener dos turnos reservados
-- en la misma fecha y hora.
--
-- Se resuelve con una columna generada que solo toma
-- valor cuando el estado es 'reservado'. Como MySQL
-- permite múltiples NULL en índices únicos, los turnos
-- cancelados o atendidos no bloquean el horario.
-- =========================================================
CREATE TABLE turnos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    usuario_id BIGINT UNSIGNED NOT NULL,
    profesional_id BIGINT UNSIGNED NOT NULL,

    fecha_hora DATETIME NOT NULL,

    estado ENUM('reservado', 'cancelado', 'atendido')
        NOT NULL DEFAULT 'reservado',

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Solo participa del índice único cuando está reservado.
    fecha_hora_reservada DATETIME
        GENERATED ALWAYS AS (
            CASE
                WHEN estado = 'reservado'
                THEN fecha_hora
                ELSE NULL
            END
        ) STORED,

    CONSTRAINT fk_turnos_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_turnos_profesional
        FOREIGN KEY (profesional_id)
        REFERENCES profesionales(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Evita doble reserva activa para el mismo profesional.
    CONSTRAINT uq_turno_reservado_profesional_horario
        UNIQUE (profesional_id, fecha_hora_reservada),

    -- Índice para agenda del profesional.
    INDEX idx_turnos_profesional_fecha (
        profesional_id,
        fecha_hora
    ),

    -- Índice para historial del cliente.
    INDEX idx_turnos_usuario (usuario_id),

    -- Índice por estado.
    INDEX idx_turnos_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- DATOS DE EJEMPLO
-- =========================================================

-- -------------------------
-- Usuarios
-- -------------------------
INSERT INTO usuarios (
    id,
    nombre,
    email,
    password_hash,
    rol
) VALUES
(
    1,
    'Administrador General',
    'admin@turnos.com',
    '$2y$10$abcdefghijklmnopqrstuv',
    'admin'
),
(
    2,
    'Dra. Ana Perez',
    'ana.perez@turnos.com',
    '$2y$10$abcdefghijklmnopqrstuv',
    'profesional'
),
(
    3,
    'Dr. Juan Gomez',
    'juan.gomez@turnos.com',
    '$2y$10$abcdefghijklmnopqrstuv',
    'profesional'
),
(
    4,
    'Carlos Lopez',
    'carlos.lopez@turnos.com',
    '$2y$10$abcdefghijklmnopqrstuv',
    'cliente'
),
(
    5,
    'Maria Fernandez',
    'maria.fernandez@turnos.com',
    '$2y$10$abcdefghijklmnopqrstuv',
    'cliente'
),
(
    6,
    'Lucia Martinez',
    'lucia.martinez@turnos.com',
    '$2y$10$abcdefghijklmnopqrstuv',
    'cliente'
);

-- -------------------------
-- Profesionales
-- -------------------------
INSERT INTO profesionales (
    id,
    usuario_id,
    especialidad,
    duracion_turno_min,
    activo
) VALUES
(
    1,
    2,
    'Clinica Medica',
    30,
    1
),
(
    2,
    3,
    'Cardiologia',
    45,
    1
);

-- -------------------------
-- Horarios de atención
-- -------------------------
INSERT INTO horarios_atencion (
    profesional_id,
    dia_semana,
    hora_desde,
    hora_hasta
) VALUES
(1, 1, '08:00:00', '14:00:00'),
(1, 3, '08:00:00', '14:00:00'),
(1, 5, '08:00:00', '14:00:00'),

(2, 2, '09:00:00', '17:00:00'),
(2, 4, '09:00:00', '17:00:00'),
(2, 6, '09:00:00', '13:00:00');

-- -------------------------
-- Turnos
-- -------------------------
INSERT INTO turnos (
    usuario_id,
    profesional_id,
    fecha_hora,
    estado
) VALUES
(
    4,
    1,
    '2026-10-05 09:00:00',
    'reservado'
),
(
    5,
    1,
    '2026-10-05 09:30:00',
    'reservado'
),
(
    6,
    1,
    '2026-10-05 10:00:00',
    'cancelado'
),
(
    4,
    2,
    '2026-10-06 11:00:00',
    'reservado'
),
(
    5,
    2,
    '2026-10-06 12:00:00',
    'atendido'
);