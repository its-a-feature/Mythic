#!/bin/bash
# Mac specific config setup
if [[ $(uname) -eq "Darwin" ]]; then
    if ! which brew > /dev/null; then
        /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    fi
    brew install postgres
    pg_ctl -D /usr/local/var/postgres start
    initdb /usr/local/var/postgres
    createdb apfell_db
    psql -S apfell_db<<EOF
create user apfell_user password 'super_secret_apfell_user_password'
EOF
    psql -S apfell_db<<EOF
GRANT ALL PRIVILEGES ON DATABASE apfell_db TO apfell_user
EOF
    sed 's/local   all             all                                     trust/local   all             all                                     md5/g' -i /usr/local/var/postgres/pg_hba.conf
    pg_ctl -D /usr/local/var/postgres restart

    if ! which python3 > /dev/null; then
        brew install python3
    fi
    if ! which pip3 > /dev/null; then
        brew install pip3
    fi
elif [[ $EUID -ne 0 ]]; then
   echo -e "\n[-] This script must be run as root!\n"
   exit 1
else
    # we must be in linux, so install that way
    #install postgresql
    apt-get -y install postgresql

    #start postgresql
    service postgresql start

    #create a new db and user for us to use
    sudo -u postgres createdb apfell_db
    sudo -u postgres psql -S apfell_db<<EOF
create user apfell_user password 'super_secret_apfell_user_password'
EOF
    sudo -u postgres psql -S apfell_db<<EOF
GRANT ALL PRIVILEGES ON DATABASE apfell_db TO apfell_user
EOF

    #update file locations
    updatedb

    #edit the config file so that we can log in via our new user
    sed -i 's/local   all             all                                     peer/local   all             all                                     md5/g' $(locate main/pg_hba.conf)
    service postgresql restart

    #check for python3
    if ! which python3 > /dev/null; then
        apt-get -y install python3
    fi
    #check for pip3 with python3
    if ! which pip3 > /dev/null; then
        apt-get -y install python3-pip
    fi
    #check for openssl
    if ! which openssl > /dev/null; then
        apt-get -y install openssl
    fi
fi
#generate a self-signed cert for us to use
mkdir ./app/ssl > /dev/null 2>&1
openssl req -new -x509 -keyout ./app/ssl/apfell-ssl.key -out ./app/ssl/apfell-cert.pem -days 365 -nodes -subj "/C=US" >/dev/null 2>&1

#install the pip3 requirements
pip3 install -r requirements.txt

echo -e "\n[*] start server with \"sudo python3 server.py\"\n"