from app import apfell, db_objects
from sanic.response import raw, json
from app.database_models.model import StagingInfo
import base64
import app.crypto as crypt
import json as js
from app.api.callback_api import create_callback_func
import app.database_models.model as db_model
import sys
from sanic_jwt.decorators import inject_user, scoped


# this is an unprotected API so that agents and c2 profiles can hit this when staging
@apfell.route(apfell.config['API_BASE'] + "/crypto/EKE/<uuid:string>", methods=['POST'])
async def EKE_AESPSK_Create_Callback(request, uuid):
    # get payload associated with UUID
    try:
        # if this works then we're creating a new session key
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
        # get the EKEPSK parameter from C2ProfileParametersInstance to get actual value to use
        try:
            query = await db_model.c2profileparameters_query()
            c2_param = await db_objects.get(query, c2_profile=payload.c2_profile, key="AESPSK")
            query = await db_model.c2profileparametersinstance_query()
            c2_param_instance = await db_objects.get(query, c2_profile_parameters=c2_param, payload=payload)
            AESPSK_String = c2_param_instance.value
        except Exception as e:
            print(str(e))
            return raw(b"", status=404)
        # decrypt request.body with this EKEPSK_String
        try:
            AESPSK = base64.b64decode(AESPSK_String)
            # print("message body: " + str(request.body) + "\n")
            encrypted_request = base64.b64decode(request.body)
            # print("about to decrypt")
            message = await crypt.decrypt_AES256(encrypted_request, AESPSK)
            decrypted_message_json = js.loads(message.decode('utf-8'))
            # print("decrypted message: " + str(decrypted_message_json))
        except Exception as e:
            print(str(e))
            return raw(b"", status=404)
        # get the SessionID and agent's public key from the message
        if "SESSIONID" not in decrypted_message_json or "PUB" not in decrypted_message_json:
            print("Failed to get \"SESSIONID\" or \"PUB\" from message")
            return raw(b"", status=404)
        # generate random AES256 key
        session_key_encoded = await crypt.create_key_AES256()
        # print("created base64 encoded session key: " + session_key_encoded)
        # Save session_key and SESSIONID into database
        try:
            stage_info = await db_objects.create(StagingInfo, session_id=decrypted_message_json['SESSIONID'],
                                                 session_key=session_key_encoded)
        except Exception as e:
            print(str(e))
            return raw(b"", status=404)
        # encrypt a nonce and the session_key_encoded with the message['PUB'] public key from the agent
        nonce = await crypt.create_key_AES256()
        response = js.dumps({"nonce": nonce, "SESSIONKEY": session_key_encoded})
        # print("created response: " + response)
        try:
            encrypted_message = await crypt.encrypt_pub_key(data=response.encode(),
                                                            key=base64.b64decode(decrypted_message_json['PUB']))
            encrypted_message_string = base64.b64encode(encrypted_message)
            # print("encrypted response with pub key: " + str(encrypted_message_string.decode('utf-8')))
        except Exception as e:
            print(e)
            await db_objects.delete(stage_info)
            return raw(b"", status=404)
        return raw(encrypted_message_string, status=200)
    except Exception as e:
        print(sys.exc_info()[-1].tb_lineno)
        print(str(e))
        pass
    try:
        # if we get here, then we're looking at an agent trying to post a new callback after getting a session key
        query = await db_model.staginginfo_query()
        staging_info = await db_objects.get(query, session_id=uuid)
        # use session_key to decrypt request.body
        encrypted_request = base64.b64decode(request.body)
        decrypted_message = await crypt.decrypt_AES256(data=encrypted_request,
                                                       key=base64.b64decode(staging_info.session_key))
        decrypted_message_json = js.loads(decrypted_message.decode('utf-8'))
        # pass this information along to the /callbacks API
        decrypted_message_json['encryption_key'] = staging_info.session_key
        decrypted_message_json['decryption_key'] = staging_info.session_key
        decrypted_message_json['encryption_type'] = "AES256"
        response = await create_callback_func(decrypted_message_json)
        # turn the json response to a string, encrypt it, and return it
        response_message = js.dumps(response)
        encrypted_response = await crypt.encrypt_AES256(response_message.encode(),
                                                        base64.b64decode(staging_info.session_key))
        encrypted_response_string = base64.b64encode(encrypted_response)
        # now that we've created the callback, we can get rid of the staging information
        await db_objects.delete(staging_info)
        return raw(encrypted_response_string, status=200)
    except Exception as e:
        # we failed to find staging info for the given uuid
        print(sys.exc_info()[-1].tb_lineno)
        print(str(e))
        return raw(b"", status=404)


# this is an unprotected API so that agents and c2 profiles can hit this when staging
@apfell.route(apfell.config['API_BASE'] + "/crypto/DHEKE/<uuid:string>", methods=['POST'])
async def DHEKE_AESPSK_Create_Callback(request, uuid):
    # get payload associated with UUID
    try:
        # if this works then we're creating a new session key
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
        # get the EKEPSK parameter from C2ProfileParametersInstance to get actual value to use
        try:
            query = await db_model.c2profileparameters_query()
            c2_param = await db_objects.get(query, c2_profile=payload.c2_profile, key="AESPSK")
            query = await db_model.c2profileparametersinstance_query()
            c2_param_instance = await db_objects.get(query, c2_profile_parameters=c2_param, payload=payload)
            AESPSK_String = c2_param_instance.value
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return raw(b"", status=404)
        # decrypt request.body with this EKEPSK_String
        try:
            AESPSK = base64.b64decode(AESPSK_String)
            # print("message body: " + str(request.body) + "\n")
            encrypted_request = base64.b64decode(request.body)
            # print("about to decrypt")
            message = await crypt.decrypt_AES256(encrypted_request, AESPSK)
            decrypted_message_json = js.loads(message.decode('utf-8'))
            # print("decrypted message: " + str(decrypted_message_json))
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return raw(b"", status=404)
        # get the SessionID and agent's public key from the message
        if "SESSIONID" not in decrypted_message_json or "PUB" not in decrypted_message_json:
            print("Failed to get \"SESSIONID\" or \"PUB\" from message")
            return raw(b"", status=404)
        # generate random AES256 key via Diffie-Hellman
        dh = DiffieHellman()
        # print(dh.publicKey)
        dh.genKey(decrypted_message_json['PUB'])
        session_key_encoded = base64.b64encode(dh.getKey()).decode('utf-8')
        # print(session_key_encoded)
        # print("created base64 encoded session key: " + session_key_encoded)
        # Save session_key and SESSIONID into database
        try:
            stage_info = await db_objects.create(StagingInfo, session_id=decrypted_message_json['SESSIONID'],
                                                 session_key=session_key_encoded)
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            return raw(b"", status=404)
        # encrypt a nonce and the session_key_encoded same staging PSK
        nonce = await crypt.create_key_AES256()
        response = js.dumps({"nonce": nonce, "SERVERPUB": dh.publicKey})
        # print(response)
        # print("created response: " + response)
        try:
            encrypted_message = await crypt.encrypt_AES256(data=response.encode(),
                                                            key=AESPSK)
            encrypted_message_string = base64.b64encode(encrypted_message)
            # print("encrypted response with pub key: " + str(encrypted_message_string.decode('utf-8')))
        except Exception as e:
            print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
            await db_objects.delete(stage_info)
            return raw(b"", status=404)
        return raw(encrypted_message_string, status=200)
    except Exception as e:
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        pass
    try:
        # if we get here, then we're looking at an agent trying to post a new callback after getting a session key
        query = await db_model.staginginfo_query()
        staging_info = await db_objects.get(query, session_id=uuid)
        # use session_key to decrypt request.body
        encrypted_request = base64.b64decode(request.body)
        # print(staging_info.session_key)
        decrypted_message = await crypt.decrypt_AES256(data=encrypted_request,
                                                       key=base64.b64decode(staging_info.session_key))
        decrypted_message_json = js.loads(decrypted_message.decode('utf-8'))
        # pass this information along to the /callbacks API
        decrypted_message_json['encryption_key'] = staging_info.session_key
        decrypted_message_json['decryption_key'] = staging_info.session_key
        decrypted_message_json['encryption_type'] = "AES256"
        response = await create_callback_func(decrypted_message_json)
        # turn the json response to a string, encrypt it, and return it
        response_message = js.dumps(response)
        encrypted_response = await crypt.encrypt_AES256(response_message.encode(),
                                                        base64.b64decode(staging_info.session_key))
        encrypted_response_string = base64.b64encode(encrypted_response)
        # now that we've created the callback, we can get rid of the staging information
        await db_objects.delete(staging_info)
        return raw(encrypted_response_string, status=200)
    except Exception as e:
        # we failed to find staging info for the given uuid
        print(str(sys.exc_info()[-1].tb_lineno) + " " + str(e))
        return raw(b"", status=404)


# this is an unprotected API so that agents and c2 profiles can hit this when staging
@apfell.route(apfell.config['API_BASE'] + "/crypto/aes_psk/<uuid:string>", methods=['POST'])
async def AESPSK_Create_Callback(request, uuid):
    # get payload associated with UUID
    try:
        query = await db_model.payload_query()
        payload = await db_objects.get(query, uuid=uuid)
        # get the AES_PSK parameter from C2ProfileParametersInstance to get actual value to use
        try:
            query = await db_model.c2profileparameters_query()
            c2_param = await db_objects.get(query, c2_profile=payload.c2_profile, key="AESPSK")
            query = await db_model.c2profileparametersinstance_query()
            c2_param_instance = await db_objects.get(query, c2_profile_parameters=c2_param, payload=payload)
            AESPSK_String = c2_param_instance.value
            # print("AESb64key: " + AESPSK_String )
        except Exception as e:
            print(str(e))
            return raw(b"")
        # decrypt request.body with this AES_PSK
        try:
            AESPSK = base64.b64decode(AESPSK_String)
            # print("message body: " + str(request.body) + "\n")
            encrypted_request = base64.b64decode(request.body)
            # print("about to decrypt\n")
            message = await crypt.decrypt_AES256(encrypted_request, AESPSK)
            decrypted_message_json = js.loads(message.decode('utf-8'))
            # print("decrypted message: " + str(decrypted_message_json))
            # pass this information along to the /callbacks API
            decrypted_message_json['encryption_key'] = AESPSK_String
            decrypted_message_json['decryption_key'] = AESPSK_String
            decrypted_message_json['encryption_type'] = "AES256"
            # print("calling create callback func")
            response = await create_callback_func(decrypted_message_json)
            # turn the json response to a string, encrypt it, and return it
            response_message = js.dumps(response)
            # print("create callback response: " + response_message)
            encrypted_response = await crypt.encrypt_AES256(response_message.encode(), AESPSK)
            encrypted_response_string = base64.b64encode(encrypted_response)
            # print("encrypted response: " + str(encrypted_response_string))
            return raw(encrypted_response_string, status=200)
        except Exception as e:
            print(str(e))
            return raw(b"")
    except Exception as e:
        print("failed to find payload")
        print(str(e))
        return raw(b"")


""" Implements Diffie-Hellman as a standalone pythong file. Taken from Empire
DH code from: https://github.com/lowazo/pyDHE """

import os
import hashlib
# If a secure random number generator is unavailable, exit with an error.
try:
    import ssl
    random_function = ssl.RAND_bytes
    random_provider = "Python SSL"
except:
    random_function = os.urandom
    random_provider = "os.urandom"

class DiffieHellman(object):
    """
    A reference implementation of the Diffie-Hellman protocol.
    By default, this class uses the 6144-bit MODP Group (Group 17) from RFC 3526.
    This prime is sufficient to generate an AES 256 key when used with
    a 540+ bit exponent.
    """

    def __init__(self, generator=2, group=17, keyLength=540):
        """
        Generate the public and private keys.
        """
        min_keyLength = 180

        default_generator = 2
        valid_generators = [2, 3, 5, 7]

        # Sanity check fors generator and keyLength
        if(generator not in valid_generators):
            print("Error: Invalid generator. Using default.")
            self.generator = default_generator
        else:
            self.generator = generator

        if(keyLength < min_keyLength):
            print("Error: keyLength is too small. Setting to minimum.")
            self.keyLength = min_keyLength
        else:
            self.keyLength = keyLength

        self.prime = self.getPrime(group)

        self.privateKey = self.genPrivateKey(keyLength)
        self.publicKey = self.genPublicKey()

    def getPrime(self, group=17):
        """
        Given a group number, return a prime.
        """
        default_group = 17

        primes = {
        5:  0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF,
        14: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF,
        15: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF,
        16: 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C934063199FFFFFFFFFFFFFFFF,
        17:
        0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C93402849236C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B332051512BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97FBEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AACC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58BB7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E6DCC4024FFFFFFFFFFFFFFFF,
        18:
        0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C93402849236C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B332051512BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97FBEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AACC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58BB7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E6DBE115974A3926F12FEE5E438777CB6A932DF8CD8BEC4D073B931BA3BC832B68D9DD300741FA7BF8AFC47ED2576F6936BA424663AAB639C5AE4F5683423B4742BF1C978238F16CBE39D652DE3FDB8BEFC848AD922222E04A4037C0713EB57A81A23F0C73473FC646CEA306B4BCBC8862F8385DDFA9D4B7FA2C087E879683303ED5BDD3A062B3CF5B3A278A66D2A13F83F44F82DDF310EE074AB6A364597E899A0255DC164F31CC50846851DF9AB48195DED7EA1B1D510BD7EE74D73FAF36BC31ECFA268359046F4EB879F924009438B481C6CD7889A002ED5EE382BC9190DA6FC026E479558E4475677E9AA9E3050E2765694DFC81F56E880B96E7160C980DD98EDD3DFFFFFFFFFFFFFFFFF
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

        while(len(bin(_rand))-2 < bits):

            try:
                _rand = int.from_bytes(random_function(_bytes), byteorder='big')
            except:
                _rand = int(random_function(_bytes).encode('hex'), 16)

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
        if(otherKey > 2 and otherKey < self.prime - 1):
            if(pow(otherKey, (self.prime - 1)//2, self.prime) == 1):
                return True
        return False

    def genSecret(self, privateKey, otherKey):
        """
        Check to make sure the public key is valid, then combine it with the
        private key to generate a shared secret.
        """
        if(self.checkPublicKey(otherKey) is True):
            sharedSecret = pow(otherKey, privateKey, self.prime)
            return sharedSecret
        else:
            raise Exception("Invalid public key.")

    def genKey(self, otherKey):
        """
        Derive the shared secret, then hash it to obtain the shared key.
        """
        self.sharedSecret = self.genSecret(self.privateKey, otherKey)
        #print("Shared secret:")
        #print(self.sharedSecret)
        s = hashlib.sha256()
        s.update(bytes(str(self.sharedSecret).encode()))
        self.key = s.digest()

    def getKey(self):
        """
        Return the shared secret key
        """
        return self.key