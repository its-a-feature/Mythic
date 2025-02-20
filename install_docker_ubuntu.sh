#! /bin/bash
if [ "$EUID" -ne 0 ]
  then echo "[-] Please run as root"
  exit
fi

# install the required services, pull docker the right docker for debian
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
   https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable" > /etc/apt/sources.list.d/docker.list

apt-get update

#apt-get install -y docker-ce docker-ce-cli containerd.io
apt-get install -y --no-install-recommends docker-ce docker-compose-plugin
