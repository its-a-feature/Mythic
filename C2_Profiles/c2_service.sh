#!/bin/bash

python3 /Apfell_service/apfell_heartbeat.py &

hostname=$(hostname)

python3 /Apfell_service/apfell_service.py "$hostname"
