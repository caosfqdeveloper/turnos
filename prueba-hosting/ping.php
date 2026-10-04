<?php
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'metodo' => $_SERVER['REQUEST_METHOD'], 'hora' => date('c')]);
