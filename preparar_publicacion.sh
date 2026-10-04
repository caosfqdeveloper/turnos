#!/bin/bash
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd ~/turnos-sas/frontend && npm run build
mkdir -p ~/turnos-sas/publicar
rm -rf ~/turnos-sas/publicar/htdocs ~/turnos-sas/publicar/publicar.zip
mkdir -p ~/turnos-sas/publicar/htdocs/api
cp -r ~/turnos-sas/frontend/dist/. ~/turnos-sas/publicar/htdocs/
cp ~/turnos-sas/api/*.php ~/turnos-sas/publicar/htdocs/api/
rm -f ~/turnos-sas/publicar/htdocs/api/config.local.php ~/turnos-sas/publicar/htdocs/api/clave.php ~/turnos-sas/publicar/htdocs/api/config.ejemplo.php

# Clave nueva para el panel del hosting (no se muestra)
printf "<?php\nconst CLAVE_PANEL = '%s';\n" "$(openssl rand -hex 16)" > ~/turnos-sas/publicar/htdocs/api/clave.php

# Plantilla de datos de la base del hosting (hay que completarla)
cat > ~/turnos-sas/publicar/htdocs/api/config.local.php << 'CFG'
<?php
return [
    'db_host' => 'SERVIDOR_DE_LA_BASE',
    'db_name' => 'NOMBRE_COMPLETO_DE_LA_BASE',
    'db_user' => 'USUARIO_DE_LA_BASE',
    'db_pass' => 'CONTRASENA_DE_LA_BASE',
    'origenes' => ['https://turnos-sas-demo.infinityfree.me'],
];
CFG

echo "Referencias a localhost en el frontend (tiene que quedar vacío):"
grep -rl "localhost" ~/turnos-sas/publicar/htdocs --include=*.js --include=*.html || true
echo "Paquete listo en ~/turnos-sas/publicar/htdocs"
