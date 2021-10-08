import app
from app.database_models.model import StagingInfo, payload_query
import base64
import app.crypto as crypt
from sanic.log import logger
from uuid import uuid4


async def generate_enc_dec_keys(crypto_type):
    if crypto_type == "aes256_hmac":
        aes_key = await crypt.create_key_AES256()
        return {
            "enc_key": base64.b64decode(aes_key),
            "dec_key": base64.b64decode(aes_key)
        }
    else:
        return {
            "enc_key": None,
            "dec_key": None
        }


# async def decrypt_agent_message(request, callback):
#     try:
#         if callback.crypto_type != "" and callback.crypto_type is not None:
#             if callback.crypto_type == "aes256_hmac":
#                 # now handle the decryption
#                 decrypted_message = await crypt.decrypt_AES256(
#                     data=base64.b64decode(request.body),
#                     key=base64.b64decode(callback.decryption_key),
#                 )
#                 return js.loads(decrypted_message.decode("utf-8"))
#             return None
#         return request.json
#     except Exception as e:
#         print("Failed to decrypt in decrypt_agent_message: {}".format(str(e)))
#         return None
#
#
# async def encrypt_agent_message(message, callback):
#     try:
#         if callback.crypto_type != "" and callback.crypto_type is not None:
#             # encrypt the message before returning it
#             if callback.crypto_type == "aes256_hmac":
#                 raw_encrypted = await crypt.encrypt_AES256(
#                     data=message.encode(), key=callback.enc_key
#                 )
#                 return base64.b64encode(raw_encrypted)
#             return None
#         return message.encode()
#     except Exception as e:
#         print("failed to encrypt in encrypt_agent_message: {}".format(str(e)))
#     return None


async def staging_rsa(decrypted_message_json, UUID):
    if (
        "session_id" not in decrypted_message_json
        or "pub_key" not in decrypted_message_json
    ):
        logger.exception(
            'Failed to get "session_id" or "pub_key" from message in staging_rsa'
        )
        return None, None
    # generate random AES256 key
    session_key_encoded = await crypt.create_key_AES256()
    # print("created base64 encoded session key: " + session_key_encoded)
    # Save session_key and SESSIONID into database
    temp_uuid = str(uuid4())
    try:
        payload = await app.db_objects.get(payload_query, uuid=UUID)
        stage_info = await app.db_objects.create(
            StagingInfo,
            session_id=decrypted_message_json["session_id"],
            enc_key=base64.b64decode(session_key_encoded),
            dec_key=base64.b64decode(session_key_encoded),
            crypto_type="aes256_hmac",
            payload=payload,
            staging_uuid=temp_uuid,
        )
    except Exception as e:
        logger.exception("Issue creating staging info for a new callback: " + str(e))
        return None, None
    # encrypt a nonce and the session_key_encoded with the message['PUB'] public key from the agent
    session_key_encoded = await crypt.encrypt_pub_key(
        data=base64.b64decode(session_key_encoded),
        key=base64.b64decode(decrypted_message_json["pub_key"]),
    )
    response = {
        "uuid": temp_uuid,
        "session_key": base64.b64encode(session_key_encoded).decode(),
        "action": "staging_rsa",
        "session_id": decrypted_message_json["session_id"],
    }
    # print("created response: " + js.dumps(response))
    for k in decrypted_message_json:
        if k not in ["session_id", "pub_key", "action", "delegates", "uuid", "session_key"]:
            response[k] = decrypted_message_json[k]
    return response, stage_info