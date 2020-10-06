from C2ProfileBase import *


class HTTP(C2Profile):
    name = "HTTP"
    description = "Uses HTTP(S) connections with a simple query parameter or basic POST messages. For more configuration options use dynamicHTTP."
    author = "@its_a_feature_"
    is_p2p = False
    is_server_routed = False
    mythic_encrypts = True
    parameters = [
        C2ProfileParameter(
            name="callback_port",
            description="Callback Port",
            default_value="80",
            verifier_regex="^[0-9]+$",
            required=False,
        ),
        C2ProfileParameter(
            name="killdate",
            description="Kill Date",
            default_value="yyyy-mm-dd",
            required=False,
        ),
        C2ProfileParameter(
            name="encrypted_exchange_check",
            description="Perform Key Exchange",
            choices=["T", "F"],
            parameter_type=ParameterType.ChooseOne,
        ),
        C2ProfileParameter(
            name="callback_jitter",
            description="Callback Jitter in percent",
            default_value="23",
            verifier_regex="^[0-9]+$",
            required=False,
        ),
        C2ProfileParameter(
            name="domain_front",
            description="Host header value for domain fronting",
            default_value="",
            required=False,
        ),
        C2ProfileParameter(
            name="USER_AGENT",
            description="User Agent",
            default_value="Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko",
            required=False,
        ),
        C2ProfileParameter(
            name="AESPSK",
            description="Base64 of a 32B AES Key",
            default_value="",
            required=False,
        ),
        C2ProfileParameter(
            name="callback_host",
            description="Callback Host",
            default_value="https://domain.com",
            verifier_regex="^(http|https):\/\/[a-zA-Z0-9]+",
        ),
        C2ProfileParameter(
            name="callback_interval",
            description="Callback Interval in seconds",
            default_value="10",
            verifier_regex="^[0-9]+$",
            required=False,
        ),
    ]
"""
C2ProfileParameter(
            name="callback_port",
            description="Callback Port",
            default_value="80",
            verifier_regex="^[0-9]+$",
            required=False,
        ),
        C2ProfileParameter(
            name="encrypted_exchange_check",
            description="Perform Key Exchange",
            choices=["T", "F"],
            parameter_type=ParameterType.ChooseOne,
        ),
        C2ProfileParameter(
            name="callback_jitter",
            description="Callback Jitter in percent",
            default_value="23",
            verifier_regex="^[0-9]+$",
            required=False,
        ),
        C2ProfileParameter(
            name="domain_front",
            description="Host header value for domain fronting",
            default_value="",
            required=False,
        ),
        C2ProfileParameter(
            name="callback_host",
            description="Callback Host",
            default_value="https://domain.com",
            parameter_type=ParameterType.Array,
            verifier_regex="^(http|https):\/\/[a-zA-Z0-9]+",
        ),

        C2ProfileParameter(
            name="killdate",
            description="Kill Date",
            parameter_type=ParameterType.Date,
            default_value=365,
            required=False,
        ),
        C2ProfileParameter(
            name="USER_AGENT",
            description="User Agent",
            required=False,
            parameter_type=ParameterType.Dictionary,
            default_value=[
                {
                    "name": "USER_AGENT",
                    "max": 1,
                    "default_value": "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko",
                    "default_show": True,
                },
                {
                    "name": "host",
                    "max": 2,
                    "default_value": "",
                    "default_show": False,
                },
                {
                    "name": "*",
                    "max": -1,
                    "default_value": "",
                    "default_show": False
                }
            ]
        ),
        C2ProfileParameter(
            name="AESPSK",
            description="Base64 of a 32B AES Key",
            default_value="",
            required=False,
        ),
        C2ProfileParameter(
            name="callback_interval",
            description="Callback Interval in seconds",
            default_value="10",
            verifier_regex="^[0-9]+$",
            required=False,
        ),"""