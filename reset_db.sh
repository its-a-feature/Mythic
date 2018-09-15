#!/bin/bash

#make sure we're root
if [[ $EUID -ne 0 ]]; then
   echo -e "\n[-] This script must be run as root!\n"
   exit 1
fi

sudo service postgresql restart
#delete all rows in our tables
sudo -u postgres psql -q -S apfell_db<<EOF
TRUNCATE payload CASCADE;
TRUNCATE operator CASCADE;
TRUNCATE callback CASCADE;
TRUNCATE task CASCADE;
TRUNCATE response CASCADE;
TRUNCATE c2profile CASCADE;
TRUNCATE operation CASCADE;
TRUNCATE operatoroperation CASCADE;
TRUNCATE payloadtype CASCADE;
TRUNCATE command CASCADE;
TRUNCATE payloadtypec2profile CASCADE;
EOF