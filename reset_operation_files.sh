#! /bin/bash
if [ "$EUID" -ne 0 ]
  then echo "[-] Please run as root"
  exit
fi

# stop our services
./stop_mythic.sh
# remove the apfell service files by their volume names
rm -rf mythic-docker/app/files/*

