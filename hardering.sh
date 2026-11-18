#!/bin/bash
set -e

echo "[1/2] Instalando y configurando Firewall (firewalld) de forma idempotente..."
sudo dnf install -y firewalld || sudo yum install -y firewalld
sudo systemctl enable --now firewalld

# Permitir puertos 22/tcp y 8000/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload

echo "[2/2] Asegurando demonios SSH (PermitRootLogin no)..."
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

echo "Hardening completado exitosamente."
