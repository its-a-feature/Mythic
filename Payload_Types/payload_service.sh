#!/bin/bash

python /Apfell_service/apfell_heartbeat.py &

mkdir /Apfell/apfell

hostname=$(hostname)

python /Apfell_service/apfell_service.py "$hostname"
