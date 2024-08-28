#! /bin/bash
if [ "$EUID" -ne 0 ]
  then echo "[-] Please run as root"
  exit
fi

# Pulls updates for the kali repo's and upgrades the current packages in Kali Linux
apt update

# Install Docker and Docker Compose
#apt install docker.io docker-compose -y
apt install -y apt-transport-https ca-certificates curl gnupg2 software-properties-common
curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add -
add-apt-repository -y "deb [arch=amd64] https://download.docker.com/linux/debian bookworm stable"
apt update
apt-get install -y --no-install-recommends docker-ce docker-compose-plugin
