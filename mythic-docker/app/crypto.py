from Crypto.Hash import SHA256, SHA512, SHA1, MD5, HMAC
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import unpad, pad
from Crypto.PublicKey import RSA
import base64
import ujson as json
from sanic.log import logger


async def encrypt_message(message: bytes, enc_metadata: dict, uuid: str, with_uuid: bool = True) -> str:
    return await encrypt_bytes_normalized(message, enc_metadata, uuid, with_uuid)


async def encrypt_bytes_normalized(message: bytes, enc_metadata: dict, uuid: str, with_uuid: bool = True) -> str:
    if enc_metadata["type"] is None or enc_metadata["type"] == "":
        # this means there's no encryption going on or Mythic isn't supposed to encrypt
        if with_uuid:
            return base64.b64encode((uuid.encode() + message)).decode()
        else:
            return base64.b64encode(message).decode()
    else:
        if enc_metadata["enc_key"] is None:
            enc_data = message
            if with_uuid:
                return base64.b64encode(uuid.encode() + enc_data).decode()
            else:
                return base64.b64encode(enc_data).decode()
        if enc_metadata["type"] == "aes256_hmac":
            if enc_metadata["enc_key"] is not None:
                enc_data = await encrypt_AES256(
                    data=message, key=enc_metadata["enc_key"]
                )
            else:
                enc_data = message
            if with_uuid:
                return base64.b64encode(uuid.encode() + enc_data).decode()
            else:
                return base64.b64encode(enc_data).decode()
        else:
            # we don't recognize the type specified
            logger.info("crypto.py encrypt, uh oh")
            return ""


async def decrypt_message(message: bytes, enc_metadata: dict, with_uuid: bool = True, return_json: bool = True, length: int = 36) -> dict:
    try:
        if with_uuid:
            message = message[length:]
        if enc_metadata["dec_key"] is not None:
            if enc_metadata["type"] == "aes256_hmac":
                decrypted = await decrypt_AES256(
                    data=message, key=enc_metadata["dec_key"]
                )
                # print(decrypted)
                if return_json:
                    decrypted = json.loads(decrypted)
            else:
                logger.info("crypto.py error, mythic decrypts, dec_key is not none, but type is not aes256_hmac")
                if return_json:
                    decrypted = {}
                else:
                    decrypted = b''
        else:
            #logger.info("crypto.py, dec_key is none and mythic decrypts")
            if return_json:
                try:
                    decrypted = json.loads(message)
                except Exception as d:
                    from app.api.operation_api import send_all_operations_message
                    logger.exception("crypto.py: " + str(d))
                    await send_all_operations_message(
                        message=f"Error Parsing agent message - step 4 (mythic decrypted a mythic message); Failed to load response as JSON: \n{str(d)}",
                        level="info", source="debug")
                    raise d
            else:
                decrypted = message
        return decrypted
    except Exception as e:
        from app.api.operation_api import send_all_operations_message
        logger.exception("crypto.py: " + str(e))
        await send_all_operations_message(
            message=f"Error Parsing agent message - step 4 (mythic decrypted a mythic message): \n{str(e)}",
            level="info", source="debug")
        raise e


async def hash_SHA512(data) -> str:
    if isinstance(data, str):
        hash_digest = SHA512.new(data=str.encode(data))
    else:
        hash_digest = SHA512.new(data=data)
    return hash_digest.hexdigest()


async def hash_SHA256(data) -> str:
    if isinstance(data, str):
        hash_digest = SHA256.new(data=str.encode(data))
    else:
        hash_digest = SHA256.new(data=data)
    return hash_digest.hexdigest()


async def hash_SHA1(data) -> str:
    if isinstance(data, str):
        hash_digest = SHA1.new(data=str.encode(data))
    else:
        hash_digest = SHA1.new(data=data)
    return hash_digest.hexdigest()


async def hash_MD5(data) -> str:
    if isinstance(data, str):
        hash_digest = MD5.new(data=str.encode(data))
    else:
        hash_digest = MD5.new(data=data)
    return hash_digest.hexdigest()


# https://pycryptodome.readthedocs.io/en/latest/src/examples.html
async def decrypt_AES256(data: bytes, key: bytes):
    # hmac should include IV
    mac = data[-32:]  # sha256 hmac at the end
    iv = data[:16]  # 16 Bytes for IV at the beginning
    message = data[16:-32]  # the rest is the message
    h = HMAC.new(key=key, msg=iv + message, digestmod=SHA256)
    h.verify(mac)
    decryption_cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    decrypted_message = decryption_cipher.decrypt(message)
    # print(decrypted_message)
    # now to remove any padding that was added on to make it the right block size of 16
    return unpad(decrypted_message, 16)


async def encrypt_AES256(data: bytes, key: bytes) -> bytes:
    h = HMAC.new(key, digestmod=SHA256)
    iv = get_random_bytes(16)  # generate a new random IV
    cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    ciphertext = cipher.encrypt(pad(data, 16))
    h.update(iv + ciphertext)
    return iv + ciphertext + h.digest()


async def create_key_AES256() -> str:
    return base64.b64encode(get_random_bytes(32)).decode("utf-8")


async def encrypt_pub_key(data: bytes, key: bytes):
    recipient_key = RSA.import_key(key)
    cipher_rsa = PKCS1_OAEP.new(recipient_key)
    encrypted_data = cipher_rsa.encrypt(data)
    return encrypted_data


async def decrypt_pub_key(data: bytes, key: bytes):
    recipient_key = RSA.import_key(key)
    cipher_rsa = PKCS1_OAEP.new(recipient_key)
    decrypted_data = cipher_rsa.decrypt(data)
    return decrypted_data