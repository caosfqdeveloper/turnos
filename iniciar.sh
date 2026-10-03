#!/bin/bash
# Carga nvm para que "npm" exista dentro del script
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

sudo /opt/lampp/lampp start
pkill -f vite 2>/dev/null
code ~/turnos-sas
(sleep 4 && xdg-open http://localhost:5173) &
cd ~/turnos-sas/frontend && npm run dev
