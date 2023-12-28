#! /bin/bash
if [ "$EUID" -ne 0 ]
  then echo "[-] Please run as root"
  exit
fi

# Pulls updates for the kali repo's and upgrades the current packages in Kali Linux
apt update

# Install Docker and Docker Compose
apt install docker.io docker-compose -y
