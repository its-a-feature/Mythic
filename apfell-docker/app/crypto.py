from Crypto.Hash import SHA256, SHA512
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import unpad, pad
from Crypto.PublicKey import RSA
import base64


async def hash_SHA512(data) -> str:
    hash_digest = SHA512.new(data=str.encode(data))
    return hash_digest.hexdigest()


async def hash_SHA256(data) -> str:
    hash_digest = SHA256.new(data=str.encode(data))
    return hash_digest.hexdigest()


# https://pycryptodome.readthedocs.io/en/latest/src/examples.html
async def decrypt_AES256(data: bytes, key: bytes):
    # first 16 bytes should be the IV
    iv = data[:16]
    message = data[16:]
    decryption_cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    decrypted_message = decryption_cipher.decrypt(message)
    # now to remove any padding tha was added on to make it the right block size of 16
    return unpad(decrypted_message, 16)


async def encrypt_AES256(data: bytes, key: bytes) -> bytes:
    iv = get_random_bytes(16)  # generate a new random IV
    cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    ciphertext = cipher.encrypt(pad(data, 16))
    return iv + ciphertext


async def create_key_AES256() -> str:
    return base64.b64encode(get_random_bytes(32)).decode('utf-8')


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