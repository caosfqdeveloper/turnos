-- Editá estos valores y ejecutá el archivo
SET @nombre = 'Nico (Barbero)';
SET @email  = 'nico@turnos.com';   -- tiene que ser único

INSERT INTO usuarios (nombre, email, password_hash, rol)
VALUES (@nombre, @email, 'sin-login', 'profesional');
SET @uid = LAST_INSERT_ID();

INSERT INTO profesionales (usuario_id, especialidad, duracion_turno_min, activo)
VALUES (@uid, 'Barbero', 30, 1);
SET @pid = LAST_INSERT_ID();

-- Servicios que hace (ids de la tabla servicios: 1 Corte, 2 Barba, 3 Corte y barba, 4 Color)
INSERT INTO profesional_servicio (profesional_id, servicio_id)
SELECT @pid, id FROM servicios WHERE id IN (1, 2, 3);

-- Horarios (dia_semana: 1 lunes ... 7 domingo). Ejemplo: miércoles con turno cortado y sábado corrido
INSERT INTO horarios_atencion (profesional_id, dia_semana, hora_desde, hora_hasta) VALUES
(@pid, 3, '10:00', '14:00'),
(@pid, 3, '16:00', '20:00'),
(@pid, 6, '09:00', '15:00');
