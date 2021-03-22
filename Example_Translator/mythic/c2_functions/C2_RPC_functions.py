import json
import base64
# translate_from_c2_format gets a message from Mythic that is in the c2-specific format
#     and returns a message that's translated into Mythic's JSON format
# If the associated C2Profile has `mythic_encrypts` set to False, then this function should also decrypt
#     the message
# request will be JSON with the following format:
# { "action": "translate_from_c2_format",
#   "enc_key": None or base64 of key if Mythic knows of one,
#   "dec_key": None or base64 of key if Mythic knows of one,
#   "uuid": uuid of the message,
#   "profile": name of the c2 profile,
#   "mythic_encrypts": True or False if Mythic thinks Mythic does the encryption or not,
#   "type": None or a keyword for the type of encryption. currently only option besides None is "AES256"
#   "message": base64 of the message that's currently in c2 specific format
# }
# If your agent/c2 profile combination is going to be doing some custom staging for
#   things like encrypted key exchanges, then you'll do that here as well
# If this isn't a staging message - This should return the JSON of the message in Mythic format
# If this is a staging message, you should return a JSON formatted message of the following:
# { "action": "translation_staging",
#   "enc_key": None or base64 of key if the next message will use encryption,
#   "dec_key": None or base64 of key if the next message will use encryption,
#   "type": None or a keyword for the type of encryption, this is to help you know what to do
#   "next_uuid": The next uuid that should be in front of the message from agent -> mythic
#       this can be generated via `import uuid` then str(uuid.uuid4())
#   "session_id": some way for you to track and coordinate multiple instances of the same payload staging at the same time,
#   "message": base64 of the message that'll go back to the agent
# }
# Mythic will save the next_uuid, enc_key, dec_key, type for the next message that comes in
# Mythic will base64 decode the "message" value and send that back to the agent
# This process can be repeated as many times as is necessary for your agent to do its staging protocol


async def translate_from_c2_format(request) -> dict:
    if not request["mythic_encrypts"]:
        return json.loads(base64.b64decode(request["message"]).decode()[36:])
    else:
        return json.loads(base64.b64decode(request["message"]))


# translate_to_c2_format gets a message from Mythic that is in Mythic's JSON format
#     and returns a message that's formatted into the c2-specific format
# If the associated C2Profile has `mythic_encrypts` set to False, then this function should also encrypt
#     the message
# request will be JSON with the following format:
# { "action": "translate_to_c2_format",
#   "enc_key": None or base64 of key if Mythic knows of one,
#   "dec_key": None or base64 of key if Mythic knows of one,
#   "uuid": uuid of the message,
#   "profile": name of the c2 profile,
#   "mythic_encrypts": True or False if Mythic thinks Mythic does the encryption or not,
#   "type": None or a keyword for the type of encryption. currently only option besides None is "AES256"
#   "message": JSON of the mythic message
# }
# This should return the bytes of the message in c2 specific format

async def translate_to_c2_format(request) -> bytes:
    if not request["mythic_encrypts"]:
        return base64.b64encode(request["uuid"].encode() + json.dumps(request["message"]).encode())
    else:
        return json.dumps(request["message"]).encode()


# generate_keys gets a message from Mythic that is in Mythic's JSON format
#     and returns a a JSON message with encryption and decryption keys for the specified type
# request will be JSON with the following format:
# { "action": "generate_keys",
#   "message": JSON of the C2 parameter that has a crypt_type that's not None and not empty
# }
# This should return the dicionary of keys like:
# {
#   "enc_key": "base64 of encryption key here",
#   "dec_key": "base64 of decryption key here",
# }

async def generate_keys(request) -> dict:
    return {"enc_key": None, "dec_key": None}
