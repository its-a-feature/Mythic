#!/bin/bash

#make sure we're root
if [[ $EUID -ne 0 ]]; then
   echo -e "\n[-] This script must be run as root!\n"
   exit 1
fi

sudo service postgresql restart
#delete all rows in our tables
sudo -u postgres psql -q -S apfell_db<<EOF
DROP TABLE payload CASCADE;
DROP TABLE operator CASCADE;
DROP TABLE callback CASCADE;
DROP TABLE task CASCADE;
DROP TABLE response CASCADE;
DROP TABLE c2profile CASCADE;
DROP TABLE operation CASCADE;
DROP TABLE operatoroperation CASCADE;
DROP TABLE payloadtype CASCADE;
DROP TABLE command CASCADE;
DROP TABLE payloadtypec2profile CASCADE;
DROP TABLE commandparameters CASCADE;
DROP TABLE filemeta CASCADE;
DROP TABLE payloadcommand CASCADE;
DROP TABLE c2profileparameters CASCADE;
DROP TABLE c2profileparametersinstance CASCADE;
DROP TABLE attackid CASCADE;
DROP TABLE credential CASCADE;
DROP TABLE keylog CASCADE;
EOF

RED='\033[0;31m'
NC='\033[0m' # No Color
printf "\n\n${RED}==========================================\n"
printf "===============WARNING====================\n"
printf "DELETE YOUR COOKIES OR YOUR WILL HAVE A BAD TIME\n"
printf "==========================================\n"