#!/bin/bash

cd /Mythic/mythic

export PYTHONPATH=/Mythic:/Mythic/mythic

python3.6 mythic_heartbeat.py &

python3.6 mythic_service.py
