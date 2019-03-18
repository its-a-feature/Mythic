from app import apfell, db_objects
from sanic.response import raw, json
from app.database_models.model import StagingInfo
import base64
import app.crypto as crypt
import json as js
from app.api.callback_api import create_callback_func
import app.database_models.model as db_model


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
            c2_param_instance = await db_objects.get(query, c2_profile_parameters=c2_param)
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
        print(str(e))
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
            c2_param_instance = await db_objects.get(query, c2_profile_parameters=c2_param)
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


@apfell.route(apfell.config['API_BASE'] + "/list_crypto_options", methods=['GET'])
async def list_crypto_options(request):
    return json({'types': ['AES256']})