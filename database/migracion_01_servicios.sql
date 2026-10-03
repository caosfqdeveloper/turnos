CREATE TABLE servicios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    duracion_min INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profesional_servicio (
    profesional_id BIGINT UNSIGNED NOT NULL,
    servicio_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (profesional_id, servicio_id),
    CONSTRAINT fk_ps_profesional FOREIGN KEY (profesional_id)
        REFERENCES profesionales(id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_servicio FOREIGN KEY (servicio_id)
        REFERENCES servicios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE turnos
    MODIFY usuario_id BIGINT UNSIGNED NULL,
    ADD COLUMN servicio_id BIGINT UNSIGNED NULL,
    ADD COLUMN duracion_min INT NOT NULL DEFAULT 30,
    ADD COLUMN cliente_nombre VARCHAR(150) NULL,
    ADD COLUMN cliente_telefono VARCHAR(30) NULL,
    ADD CONSTRAINT fk_turnos_servicio FOREIGN KEY (servicio_id)
        REFERENCES servicios(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Datos de ejemplo para barbería (precios ficticios)
DELETE FROM turnos;
DELETE FROM horarios_atencion;

UPDATE usuarios SET nombre = 'Martin (Barbero)' WHERE id = 2;
UPDATE usuarios SET nombre = 'Lucas (Barbero)' WHERE id = 3;
UPDATE profesionales SET especialidad = 'Barbero', duracion_turno_min = 30;

INSERT INTO servicios (id, nombre, duracion_min, precio) VALUES
(1, 'Corte', 30, 10000),
(2, 'Barba', 20, 6000),
(3, 'Corte y barba', 45, 14000),
(4, 'Color', 90, 25000);

INSERT INTO profesional_servicio (profesional_id, servicio_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 2), (2, 3), (2, 4);

-- Martes a sábado, 10:00 a 20:00
INSERT INTO horarios_atencion (profesional_id, dia_semana, hora_desde, hora_hasta)
SELECT p.id, d.dia, '10:00:00', '20:00:00'
FROM profesionales p
JOIN (SELECT 2 AS dia UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) d;
