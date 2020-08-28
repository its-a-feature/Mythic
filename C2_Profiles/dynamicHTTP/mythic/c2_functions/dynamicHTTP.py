from C2ProfileBase import *


class DynamicHTTP(C2Profile):
    name = "dynamicHTTP"
    description = "Manipulate HTTP(S) requests and responses"
    author = "@its_a_feature_"
    is_p2p = False
    is_server_routed = False
    mythic_encrypts = True
    parameters = [
        C2ProfileParameter(
            name="AESPSK", description="Base64 of a 32B AES Key", default_value=""
        ),
        C2ProfileParameter(
            name="raw_c2_config", description="Agent JSON Config", default_value=""
        ),
    ]
