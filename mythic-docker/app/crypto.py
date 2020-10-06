from Crypto.Hash import SHA256, SHA512, SHA1, MD5, HMAC
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import unpad, pad
from Crypto.PublicKey import RSA
import base64
import ujson as json


async def encrypt_message(message: dict, enc_metadata: dict, uuid: str, with_uuid: bool = True) -> str:
    return await encrypt_bytes_normalized(json.dumps(message).encode(), enc_metadata, uuid, with_uuid)


async def encrypt_bytes_normalized(message: bytes, enc_metadata: dict, uuid: str, with_uuid: bool = True) -> str:
    if enc_metadata["type"] is None:
        # this means there's no encryption going on or Mythic isn't supposed to encrypt
        if with_uuid:
            return base64.b64encode((uuid.encode() + message)).decode()
        else:
            return base64.b64encode(message).decode()
    else:
        if enc_metadata["type"] == "AES256":
            enc_data = await encrypt_AES256(
                data=message, key=enc_metadata["enc_key"]
            )
            if with_uuid:
                return base64.b64encode(uuid.encode() + enc_data).decode()
            else:
                return base64.b64encode(enc_data).decode()
        else:
            # we don't recognize the type specified
            return ""


async def decrypt_message(message: bytes, enc_metadata: dict, with_uuid: bool = True, return_json: bool = True) -> dict:
    if with_uuid:
        message = message[36:]
    if enc_metadata["type"] is not None:
        if enc_metadata["type"] == "AES256":
            decrypted = await decrypt_AES256(
                data=message, key=enc_metadata["dec_key"]
            )
            # print(decrypted)
            if return_json:
                decrypted = json.loads(decrypted)
        else:
            if return_json:
                decrypted = {}
            else:
                decrypted = b''
    else:
        if return_json:
            decrypted = json.loads(message)
        else:
            decrypted = message
    return decrypted


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


class DiffieHellman(object):
    """
    A reference implementation of the Diffie-Hellman protocol.
    By default, this class uses the 6144-bit MODP Group (Group 17) from RFC 3526.
    This prime is sufficient to generate an AES 256 key when used with
    a 540+ bit exponent.
    Taken from: https://github.com/lowazo/pyDHE
    """

    import hashlib
    import ssl

    def __init__(self, generator=2, group=17, keyLength=540):
        """
        Generate the public and private keys.
        """
        min_keyLength = 180

        default_generator = 2
        valid_generators = [2, 3, 5, 7]

        # Sanity check fors generator and keyLength
        if generator not in valid_generators:
            print("Error: Invalid generator. Using default.")
            self.generator = default_generator
        else:
            self.generator = generator

        if keyLength < min_keyLength:
            print("Error: keyLength is too small. Setting to minimum.")
            self.keyLength = min_keyLength
        else:
            self.keyLength = keyLength

        self.prime = self.getPrime(group)

        self.privateKey = self.genPrivateKey(keyLength)
        self.publicKey = self.genPublicKey()

        self.random_function = self.ssl.RAND_bytes
        self.random_provider = "Python SSL"

    def getPrime(self, group=17):
        """
        Given a group number, return a prime.
        """
        default_group = 17

        primes = {
            5: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF,
            14: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF,
            15: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF,
            16: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C934063199FFFFFFFFFFFFFFFF,
            17: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C93402849236C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B332051512BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97FBEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AACC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58BB7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E6DCC4024FFFFFFFFFFFFFFFF,
            18: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C93402849236C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B332051512BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97FBEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AACC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58BB7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E6DBE115974A3926F12FEE5E438777CB6A932DF8CD8BEC4D073B931BA3BC832B68D9DD300741FA7BF8AFC47ED2576F6936BA424663AAB639C5AE4F5683423B4742BF1C978238F16CBE39D652DE3FDB8BEFC848AD922222E04A4037C0713EB57A81A23F0C73473FC646CEA306B4BCBC8862F8385DDFA9D4B7FA2C087E879683303ED5BDD3A062B3CF5B3A278A66D2A13F83F44F82DDF310EE074AB6A364597E899A0255DC164F31CC50846851DF9AB48195DED7EA1B1D510BD7EE74D73FAF36BC31ECFA268359046F4EB879F924009438B481C6CD7889A002ED5EE382BC9190DA6FC026E479558E4475677E9AA9E3050E2765694DFC81F56E880B96E7160C980DD98EDD3DFFFFFFFFFFFFFFFFF,
        }

        if group in primes.keys():
            return primes[group]
        else:
            print("Error: No prime with group %i. Using default." % group)
            return primes[default_group]

    def genRandom(self, bits):
        """
        Generate a random number with the specified number of bits
        """
        _rand = 0
        _bytes = bits // 8 + 8

        while len(bin(_rand)) - 2 < bits:

            try:
                _rand = int.from_bytes(self.random_function(_bytes), byteorder="big")
            except:
                _rand = int(self.random_function(_bytes).decode("hex"), 16)

        return _rand

    def genPrivateKey(self, bits):
        """
        Generate a private key using a secure random number generator.
        """
        return self.genRandom(bits)

    def genPublicKey(self):
        """
        Generate a public key X with g**x % p.
        """
        return pow(self.generator, self.privateKey, self.prime)

    def checkPublicKey(self, otherKey):
        """
        Check the other party's public key to make sure it's valid.
        Since a safe prime is used, verify that the Legendre symbol == 1
        """
        if otherKey > 2 and otherKey < self.prime - 1:
            if pow(otherKey, (self.prime - 1) // 2, self.prime) == 1:
                return True
        return False

    def genSecret(self, privateKey, otherKey):
        """
        Check to make sure the public key is valid, then combine it with the
        private key to generate a shared secret.
        """
        if self.checkPublicKey(otherKey) is True:
            sharedSecret = pow(otherKey, privateKey, self.prime)
            return sharedSecret
        else:
            raise Exception("Invalid public key.")

    def genKey(self, otherKey):
        """
        Derive the shared secret, then hash it to obtain the shared key.
        """
        self.sharedSecret = self.genSecret(self.privateKey, otherKey)

        # Convert the shared secret (int) to an array of bytes in network order
        # Otherwise hashlib can't hash it.
        try:
            _sharedSecretBytes = self.sharedSecret.to_bytes(
                len(bin(self.sharedSecret)) - 2 // 8 + 1, byteorder="big"
            )
        except AttributeError:
            _sharedSecretBytes = str(self.sharedSecret)

        s = self.hashlib.sha256()
        s.update(bytes(_sharedSecretBytes))
        self.key = s.digest()

    def getKey(self):
        """
        Return the shared secret key
        """
        return self.key
