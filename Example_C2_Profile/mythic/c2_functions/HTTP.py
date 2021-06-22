from mythic_c2_container.C2ProfileBase import *


class HTTP(C2Profile):
    name = "http"
    description = "Uses HTTP(S) connections with a simple query parameter or basic POST messages. For more configuration options use dynamicHTTP."
    author = "@its_a_feature_"
    is_p2p = False
    is_server_routed = False
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
            parameter_type=ParameterType.Date,
            default_value=365,
            required=False,
        ),
        C2ProfileParameter(
            name="encrypted_exchange_check",
            description="Perform Key Exchange",
            choices=["T", "F"],
            required=False,
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
            name="headers",
            description="HTTP Headers",
            required=False,
            parameter_type=ParameterType.Dictionary,
            default_value=[
                {
                    "name": "User-Agent",
                    "max": 1,
                    "default_value": "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko",
                    "default_show": True,
                },
                {
                    "name": "Host",
                    "max": 1,
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
            description="Crypto type",
            default_value="aes256_hmac",
            parameter_type=ParameterType.ChooseOne,
            choices=["aes256_hmac", "none"],
            required=False,
            crypto_type=True
        ),
        C2ProfileParameter(
            name="callback_host",
            description="Callback Host",
            default_value="https://domain.com",
            verifier_regex="^(http|https):\/\/[a-zA-Z0-9]+",
        ),
        C2ProfileParameter(
            name="get_uri",
            description="GET request URI (don't include leading /)",
            default_value="index",
            required=False,
        ),
        C2ProfileParameter(
            name="post_uri",
            description="POST request URI (don't include leading /)",
            default_value="data",
            required=False,
        ),
        C2ProfileParameter(
            name="query_path_name",
            description="Name of the query parameter for GET requests",
            default_value="q",
            required=False,
            verifier_regex="^[^\/]",
        ),
        C2ProfileParameter(
            name="proxy_host",
            description="Proxy Host",
            default_value="",
            required=False,
            verifier_regex="^$|^(http|https):\/\/[a-zA-Z0-9]+",
        ),
        C2ProfileParameter(
            name="proxy_port",
            description="Proxy Port",
            default_value="",
            verifier_regex="^$|^[0-9]+$",
            required=False,
        ),
        C2ProfileParameter(
            name="proxy_user",
            description="Proxy Username",
            default_value="",
            required=False,
        ),
        C2ProfileParameter(
            name="proxy_pass",
            description="Proxy Password",
            default_value="",
            required=False,
        ),
        C2ProfileParameter(
            name="callback_interval",
            description="Callback Interval in seconds",
            default_value="10",
            verifier_regex="^[0-9]+$",
            required=False,
        ),
    ]
