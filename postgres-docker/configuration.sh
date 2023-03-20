#!/bin/bash

if [ -d "/var/lib/postgresql/data" ]
then
    mv /var/lib/postgresql/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf
fi