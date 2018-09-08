from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes


async def hash_SHA512(data):
    digest = hashes.Hash(hashes.SHA512(), backend=default_backend())
    digest.update(str.encode(data))
    return digest.finalize().hex()


async def hash_SHA256(data):
    digest = hashes.Hash(hashes.SHA256(), backend=default_backend())
    digest.update(str.encode(data))
    return digest.finalize().hex()


async def create_uuid(data):
    return await hash_SHA256(data)