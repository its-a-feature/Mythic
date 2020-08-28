from C2ProfileBase import *


class Websocket(C2Profile):
    name = "leviathan-websocket"
    description = "Websocket C2 Server for Leviathan"
    author = "@xorrior"
    is_p2p = False
    is_server_routed = False
    mythic_encrypts = True
    parameters = [
        C2ProfileParameter(
            name="callback_host",
            description="Callback Host",
            default_value="ws://127.0.0.1",
            verifier_regex="^(ws|wss)://[a-zA-Z0-9]+",
        ),
        C2ProfileParameter(
            name="callback_interval",
            description="Callback Interval in seconds",
            default_value="10",
            verifier_regex="^[0-9]+$",
            required=False,
        ),
        C2ProfileParameter(
            name="ENDPOINT_REPLACE",
            description="Websockets Endpoint",
            default_value="socket",
            required=False,
        ),
        C2ProfileParameter(
            name="callback_port",
            description="Callback Port",
            default_value="8081",
            verifier_regex="^[0-9]+$",
            required=False,
        ),
    ]
