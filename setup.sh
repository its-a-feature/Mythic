#!/bin/bash

#make sure we're root
if [[ $EUID -ne 0 ]]; then
   echo -e "\n[-] This script must be run as root!\n"
   exit 1
fi

#install postgresql
apt-get -y install postgresql

#start postgresql
service postgresql start
sudo -u postgres createdb apfell_db

#check for python3
if ! which python3 > /dev/null; then
    apt-get -y install python3
fi
#check for pip3 with python3
if ! which pip3 > /dev/null; then
    apt-get -y install python3-pip
fi

#install the pip3 requirements
pip3 install -r requirements.txt

echo -e "\n[*] don\'t forget to edit app/__init__.py with the username and password for postgres"
echo -e "\n[*] start server with \"python3 server.py\"\n"
