#!/bin/bash

cd /home/ec2-user/mi-proyecto

echo ">>> Pull de cambios"
git pull

echo ">>> Bajando contenedores"
docker compose -f docker-compose.prod.yml down

echo ">>> Borrando imágenes"
docker system prune -af

echo ">>> Reconstruyendo e iniciando"
docker compose -f docker-compose.prod.yml up -d --build

echo ">>> Deploy completado"