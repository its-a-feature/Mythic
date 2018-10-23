import peewee as p
import datetime
from app import apfell_db
import json
import app.crypto as crypto


class Operator(p.Model):
    username = p.CharField(max_length=64, unique=True, null=False)
    password = p.CharField(max_length=1024, null=False)
    admin = p.BooleanField(null=True, default=False)
    creation_time = p.DateTimeField(default=datetime.datetime.now, null=False)
    last_login = p.DateTimeField(default=None, null=True)
    # option to simply de-activate an account instead of delete it so you keep all your relational data intact
    active = p.BooleanField(null=False, default=True)
    current_operation = p.ForeignKeyField(p.DeferredRelation('Operation'), null=True)

    class Meta:
        ordering = ['-id', ]
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'current_operation':
                    r[k] = getattr(self, k).name
                elif k != 'password':
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        if 'last_login' in r:
            r['last_login'] = r['last_login'].strftime('%m/%d/%Y %H:%M:%S')
        else:
            r['last_login'] = ""  # just indicate that account created, but they never logged in
        return r

    def __str__(self):
        return str(self.to_json())

    async def check_password(self, password):
        temp_pass = await crypto.hash_SHA512(password)
        return self.password.lower() == temp_pass.lower()

    async def hash_password(self, password):
        return await crypto.hash_SHA512(password)


# This is information about a class of payloads (like Apfell-jxa)
#   This will have multiple Command class objects associated with it
#   Users can create their own commands and payload types as well
class PayloadType(p.Model):
    ptype = p.CharField(null=False, unique=True)  # name of the payload type
    operator = p.ForeignKeyField(Operator, null=False)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.now)
    file_extension = p.CharField(null=True)
    compile_command = p.CharField(max_length=4096, default="")
    # if this type requires another payload to be already created
    wrapper = p.BooleanField(default=False, null=False)
    # how to encode the internal payload if needed
    wrapped_encoding_type = p.CharField(default="", null=False)
    # which payload is this one wrapping
    wrapped_payload_type = p.ForeignKeyField(p.DeferredRelation('PayloadType'), null=True)

    class Meta:
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'wrapped_payload_type':
                    r[k] = getattr(self, k).ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


# This has information about a specific command that can be executed by a PayloadType
#   Custom commands can be created by users
#   There will be a new Command instance for every cmd+payload_type combination
#      (each payload_type needs its own 'shell' command because they might be implemented differently)
class Command(p.Model):
    needs_admin = p.BooleanField(null=False, default=False)
    # generates get-help info on the command
    help_cmd = p.CharField(max_length=1024, null=False, default="")
    description = p.CharField(max_length=1024, null=False)
    cmd = p.CharField(null=False)  # shell, for example, doesn't have to be unique name
    # this command applies to what payload types (just apfell-jxa, maybe apfell-app or empire)
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    operator = p.ForeignKeyField(Operator, null=False)
    creation_time = p.DateTimeField(null=False, default=datetime.datetime.now)

    class Meta:
        indexes = ((('cmd', 'payload_type'), True),)
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'payload_type':
                    r[k] = getattr(self, k).ptype
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


# users will be associated with operations
#   payload_types and commands are associated with all operations
#   when creating a new operation, associate all the default c2profiles with it
class Operation(p.Model):
    name = p.CharField(null=False, unique=True)
    admin = p.ForeignKeyField(Operator, null=False)  # who is an admin of this operation
    complete = p.BooleanField(null=False, default=False)

    class Meta:
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'admin':
                    r[k] = getattr(self, k).username
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        return r

    def __str__(self):
        return str(self.to_json())


# because operators and operations are a many-to-many relationship, we need a join table to facilitate
#   this means operator class doesn't mention operation, and operation doesn't mention operator - odd, I know
class OperatorOperation(p.Model):
    operator = p.ForeignKeyField(Operator)
    operation = p.ForeignKeyField(Operation)

    class Meta:
        indexes = ( (('operator', 'operation'), True), )
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        return r

    def __str__(self):
        return str(self.to_json())


# an instance of a c2profile
class C2Profile(p.Model):
    name = p.CharField(null=False)  # registered unique name for this c2 profile
    # server location of the profile on disk so we can start it as a sub process (needs to be a python 3+ module), it will be in a predictable location and named based on the name field here
    # no client locations are needed to be specified because there is a required structure to where the profile will be located
    description = p.CharField(null=True, default="")
    # list of payload types that are supported (i.e. have a corresponding module created for them on the client side
    operator = p.ForeignKeyField(Operator, null=False)  # keep track of who created/registred this profile
    # This has information about supported payload types, but that information is in a separate join table
    creation_time = p.DateTimeField(default=datetime.datetime.now, null=False)  # (indicates "when")
    running = p.BooleanField(null=False, default=False)
    operation = p.ForeignKeyField(Operation, null=False)

    class Meta:
        indexes = ((('name', 'operation'), True),)
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


# this is a join table between the many to many relationship between payload_types and c2profiles
#   ex: apfell-jxa PayloadType instance should be tied to default/twitter/etc c2profiles
#       and default c2profile should be tied to apfell-jxa, apfell-swift, etc
class PayloadTypeC2Profile(p.Model):
    payload_type = p.ForeignKeyField(PayloadType)
    c2_profile = p.ForeignKeyField(C2Profile)

    class Meta:
        indexes = ( (('payload_type', 'c2_profile'), True), )
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload_type':
                    r[k] = getattr(self, k).ptype
                    r['payload_type_id'] = getattr(self, k).id
                elif k == 'c2_profile':
                    r[k] = getattr(self, k).name
                    r['c2_profile_id'] = getattr(self, k).id
                    r['c2_profile_description'] = getattr(self, k).description
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        return r

    def __str__(self):
        return str(self.to_json())


# this is an instance of a payload
class Payload(p.Model):
    # this is actually a sha256 from other information about the payload
    uuid = p.CharField(unique=True, null=False)
    # tag a payload with information like spearphish, custom bypass, lat mov, etc (indicates "how")
    tag = p.CharField(null=True)
    # creator of the payload, cannot be null! must be attributed to somebody (indicates "who")
    operator = p.ForeignKeyField(Operator, null=False)
    creation_time = p.DateTimeField(default=datetime.datetime.now, null=False)  # (indicates "when")
    # this is fine because this is an instance of a payload, so it's tied to one PayloadType
    payload_type = p.ForeignKeyField(PayloadType, null=False)
    # this will signify if a current callback made / spawned a new callback that's checking in
    #   this helps track how we're getting callbacks (which payloads/tags/parents/operators)
    pcallback = p.ForeignKeyField(p.DeferredRelation('Callback'), null=True)
    location = p.CharField(null=True)  # location on disk of the payload
    c2_profile = p.ForeignKeyField(C2Profile, null=False)  # identify which C2 profile is being used
    operation = p.ForeignKeyField(Operation, null=False)

    class Meta:
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'pcallback':
                    r[k] = getattr(self, k).id
                elif k == 'c2_profile':
                    r[k] = getattr(self, k).name
                elif k == 'payload_type':
                    r[k] = getattr(self, k).ptype
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


# a specific payload instance has multiple commands associated with it, so we need to track that
#   commands can be loaded/unloaded at run time, so we need to track creation_time
class PayloadCommand(p.Model):
    payload = p.ForeignKeyField(Payload, null=False)
    command = p.ForeignKeyField(Command, null=False)
    creation_time = p.DateTimeField(default=datetime.datetime.now, null=False)

    class Meta:
        indexes = ((('payload', 'command'), True),)
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'payload':
                    r[k] = getattr(self, k).uuid
                elif k == 'command':
                    r[k] = getattr(self, k).cmd
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


#  C2 profiles will have various parameters that need to be stamped in at payload creation time
#    this will specify the name and value to look for
class C2ProfileParameters(p.Model):
    c2_profile = p.ForeignKeyField(C2Profile)
    name = p.CharField(null=False)  # what the parameter is called. ex: Callback address
    key = p.CharField(null=False)  # what the stamping should look for. ex: XXXXX

    class Meta:
        indexes = ((('c2_profile', 'name'), True),)
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'c2_profile':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        return r

    def __str__(self):
        return str(self.to_json())


# c2 profiles will have various parameters that need to be stamped in when the payload is created
#   This is an opportunity to specify key-value pairs for specific C2 profiles
#   There can be many of these per c2 profile or none
#   This holds the specific values used in the C2ProfileParameters and which payload they're associated with
class C2ProfileParametersInstance(p.Model):
    c2_profile_parameters = p.ForeignKeyField(C2ProfileParameters)
    value = p.CharField(null=False, max_length=4096)  # this is what we will stamp in instead
    payload = p.ForeignKeyField(Payload)  # the specific payload instance these values apply to

    class Meta:
        indexes = ((('c2_profile_parameters', 'value', 'payload'), True), )
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'c2_profile_parameters':
                    r['c2_profile'] = getattr(self, k).c2_profile.name
                    r['c2_profile_name'] = getattr(self, k).name
                    r['c2_profile_key'] = getattr(self, k).key
                elif k == 'payload':
                    r[k] = getattr(self, k).uuid
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        return r

    def __str__(self):
        return str(self.to_json())


class Callback(p.Model):
    init_callback = p.DateTimeField(default=datetime.datetime.now, null=False)
    last_checkin = p.DateTimeField(default=datetime.datetime.now, null=False)
    user = p.CharField(null=False)
    host = p.CharField(null=False)
    pid = p.IntegerField(null=False)
    ip = p.CharField(max_length=100, null=False)
    description = p.CharField(max_length=1024, null=True)
    operator = p.ForeignKeyField(Operator, null=False)
    active = p.BooleanField(default=True, null=False)
    # keep track of the parent callback from this one
    pcallback = p.ForeignKeyField(p.DeferredRelation('Callback'), null=True)
    registered_payload = p.ForeignKeyField(Payload, null=False)  # what payload is associated with this callback
    integrity_level = p.IntegerField(null=True, default=2)  # keep track of a callback's integrity level, check default integrity level numbers though and what they correspond to. Might be different for windows/mac/linuxl
    operation = p.ForeignKeyField(Operation, null=False)
    # the following information comes from the c2 profile if it wants to provide some form of encryption
    encryption_type = p.CharField(null=True)  # the kind of encryption on this callback (aes, xor, rc4, etc)
    decryption_key = p.CharField(null=True, max_length=4096)  # base64 of the key to use to decrypt traffic
    encryption_key = p.CharField(null=True, max_length=4096)  # base64 of the key to use to encrypt traffic

    class Meta:
        indexes = ((('host', 'pid'), True),)
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'pcallback':
                    r[k] = getattr(self, k).id
                elif k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'registered_payload':
                    r[k] = getattr(self, k).uuid
                    r['payload_type'] = getattr(self, k).payload_type.ptype
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                elif k == 'encryption_key' or k == 'decryption_key':
                    pass  # we don't need to include these things all over the place, explicitly ask for them for more control
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['init_callback'] = r['init_callback'].strftime('%m/%d/%Y %H:%M:%S')
        r['last_checkin'] = r['last_checkin'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


class Task(p.Model):
    command = p.ForeignKeyField(Command, null=False)
    params = p.CharField(null=True, max_length=512000)  #this will have the instance specific params (ex: id)
    # make room for ATT&CK ID (T#) if one exists or enable setting this later
    attack_id = p.IntegerField(null=True)  # task will be more granular than command, so attack_id should live here
    timestamp = p.DateTimeField(default=datetime.datetime.now, null=False)
    # every task is associated with a specific callback that executes the task
    callback = p.ForeignKeyField(Callback, null=False)
    # the operator to issue the command can be different from the one that spawned the callback
    operator = p.ForeignKeyField(Operator, null=False)
    status = p.CharField(null=False, default="submitted")  # [submitted, processing, processed]

    class Meta:
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'callback':
                    r[k] = getattr(self, k).id
                elif k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'command':
                    r[k] = getattr(self, k).cmd
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


class Response(p.Model):
    response = p.CharField(null=True, max_length=512000)
    timestamp = p.DateTimeField(default=datetime.datetime.now, null=False)
    task = p.ForeignKeyField(Task, null=False)

    class Meta:
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'task':
                    r[k] = (getattr(self, k)).to_json()
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


class FileMeta(p.Model):
    total_chunks = p.IntegerField(null=False)  # how many total chunks will there be
    chunks_received = p.IntegerField(null=False, default=0)  # how many we've received so far
    task = p.ForeignKeyField(Task, null=True)  # what task caused this file to exist in the database
    complete = p.BooleanField(null=False, default=False)
    path = p.CharField(null=False, max_length=5000)  # where the file is located on local disk
    operation = p.ForeignKeyField(Operation, null=False)
    timestamp = p.DateTimeField(default=datetime.datetime.now, null=False)

    class Meta:
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'task':
                    r[k] = getattr(self, k).id
                    r['cmd'] = getattr(self, k).command.cmd
                elif k == 'operation':
                    r[k] = getattr(self, k).name
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


# ------------ LISTEN / NOTIFY ---------------------
def pg_register_newinserts():
    inserts = ['callback', 'task', 'payload', 'c2profile', 'operator', 'operation', 'payloadtype',
               'command', 'operatoroperation', 'payloadtypec2profile', 'filemeta', 'payloadcommand']
    for table in inserts:
        create_function_on_insert = "DROP FUNCTION IF EXISTS notify_new" + table + "() cascade;" + \
                                    "CREATE FUNCTION notify_new" + table + \
                                    "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('new" + table + \
                                    "', row_to_json(NEW)::text); RETURN NULL; END; $$;"
        create_trigger_on_insert = "CREATE TRIGGER new" + table + \
                                   "_trigger AFTER INSERT ON " + table + " FOR EACH ROW EXECUTE PROCEDURE notify_new" + \
                                   table + "();"
        try:
            apfell_db.execute_sql(create_function_on_insert)
            apfell_db.execute_sql(create_trigger_on_insert)
        except Exception as e:
            print(e)


def pg_register_bignewinserts():
    inserts = ['response']
    for table in inserts:
        create_function_on_insert = "DROP FUNCTION IF EXISTS notify_new" + table + "() cascade;" + \
                                    "CREATE FUNCTION notify_new" + table + \
                                    "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('new" + table + \
                                    "', NEW.id::text); RETURN NULL; END; $$;"
        create_trigger_on_insert = "CREATE TRIGGER new" + table + \
                                   "_trigger AFTER INSERT ON " + table + " FOR EACH ROW EXECUTE PROCEDURE notify_new" + \
                                   table + "();"
        try:
            apfell_db.execute_sql(create_function_on_insert)
            apfell_db.execute_sql(create_trigger_on_insert)
        except Exception as e:
            print(e)


def pg_register_updates():
    updates = ['callback', 'task', 'response', 'payload', 'c2profile', 'operator', 'operation', 'payloadtype',
               'command', 'operatoroperation', 'payloadtypec2profile', 'filemeta', 'payloadcommand']
    for table in updates:
        create_function_on_changes = "DROP FUNCTION IF EXISTS notify_updated" + table + "() cascade;" + \
                                     "CREATE FUNCTION notify_updated" + table + \
                                     "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('updated" + \
                                     table + "', row_to_json(NEW)::text); RETURN NULL; END; $$;"
        create_trigger_on_changes = "CREATE TRIGGER updated" + table + \
                                    "_trigger AFTER UPDATE ON " + table + \
                                    " FOR EACH ROW EXECUTE PROCEDURE notify_updated" + table + "();"
        try:
            apfell_db.execute_sql(create_function_on_changes)
            apfell_db.execute_sql(create_trigger_on_changes)
        except Exception as e:
            print(e)


def setup():
    current_time = str(datetime.datetime.now())
    try:
        # Create default apfell_admin
        create_apfell_admin = "INSERT INTO operator (username, password, admin, last_login, creation_time, active)" + \
                              " VALUES ('apfell_admin', " + \
                              "'E3D5B5899BA81F553666C851A66BEF6F88FC9713F82939A52BC8D0C095EBA68E604B788347D489CC93A61599C6A37D0BE51EE706F405AF5D862947EF8C36A201', " + \
                              "True, DEFAULT, '" + current_time + "',True) ON CONFLICT (username) DO NOTHING;"
        apfell_db.execute_sql(create_apfell_admin)
        # Create 'default' operation
        create_default_operation = "INSERT INTO operation (name, admin_id, complete) VALUES ('default', " + \
                                   "(SELECT id FROM operator WHERE username='apfell_admin'), false) ON CONFLICT (name) DO NOTHING;"
        apfell_db.execute_sql(create_default_operation)
        # Create default C2 profile
        create_default_c2profile = "INSERT INTO c2profile (name, description, operator_id, " + \
                                   "creation_time, running, operation_id) VALUES ('default', 'default RESTful C2 channel', " + \
                                   "(SELECT id FROM operator WHERE username='apfell_admin'), " + \
                                   "'" + current_time + "',True," + \
                                   "(SELECT id FROM operation WHERE name='default')) ON CONFLICT (name, operation_id) DO NOTHING;"
        apfell_db.execute_sql(create_default_c2profile)
        c2profile_parameters = [('callback_host', 'callback_host'), ('callback_port', 'callback_port'), ('callback_interval', 'callback_interval')]
        for name,key in c2profile_parameters:
            create_default_c2profile_params = "INSERT INTO c2profileparameters (c2_profile_id, name, key) VALUES (" + \
                "(SELECT id FROM c2profile WHERE name='default' and operation_id=(SELECT id FROM operation WHERE name='default')), '" + name + "', '" + key + "') on CONFLICT (c2_profile_id, name) DO NOTHING;"
            apfell_db.execute_sql(create_default_c2profile_params)
            print("created default c2_profile parameter: " + str(name))

        # Create default payload types, only one supported by default right now
        default_payload_types = ['apfell-jxa']
        for ptype in default_payload_types:
            create_payload_type = "INSERT INTO payloadtype (ptype, operator_id, creation_time, file_extension, compile_command, wrapper, wrapped_encoding_type, wrapped_payload_type_id) VALUES ('" + ptype + \
                "', (SELECT id FROM operator WHERE username='apfell_admin'), '" + current_time + \
                "', 'js', '', False, '', null) ON CONFLICT (ptype) DO NOTHING;"
            apfell_db.execute_sql(create_payload_type)
            print("created default payload type: " + str(ptype))
        # Add apfell_admin to the default operation
        create_default_assignment = "INSERT INTO operatoroperation (operator_id, operation_id) VALUES (" + \
            "(SELECT id FROM operator WHERE username='apfell_admin')," + \
            "(SELECT id FROM operation WHERE name='default')) ON CONFLICT (operator_id, operation_id) DO NOTHING;"
        apfell_db.execute_sql(create_default_assignment)
        print("created default operator-operation assignment")
        # Add default commands to default profiles
        # one manual example for now, but need an easier way to automate this
        # Add default payload_type and c2_profile mapping
        for ptype in default_payload_types:
            create_ptype_c2_mappings = "INSERT INTO payloadtypec2profile (payload_type_id, c2_profile_id) VALUES (" + \
                "(SELECT id FROM payloadtype WHERE ptype='" + ptype + "')," + \
                "(SELECT id FROM c2profile WHERE name='default' and operation_id=(SELECT id from operation where name='default'))) ON CONFLICT (payload_type_id, c2_profile_id) DO NOTHING;"
            apfell_db.execute_sql(create_ptype_c2_mappings)
            print("created default c2 to payload type mapping for: " + ptype)
        # Create default commands that are associated with payloadtypes
        file = open('./app/templates/default_commands.json', 'r')
        command_file = json.load(file)
        for cmd_group in command_file['payload_types']:
            for cmd in cmd_group['commands']:
                create_cmd = "INSERT INTO command (cmd, needs_admin, description, help_cmd, payload_type_id, operator_id, creation_time) " + \
                    "VALUES ('" + cmd['cmd'] + "', " + cmd['needs_admin'] + ", '" + cmd['description'].replace("'", "''") + "', '" + \
                    cmd['help_cmd'] + "', (SELECT id FROM payloadtype WHERE ptype='" + cmd_group['name'] + "')," + \
                    "(SELECT id FROM operator WHERE username='apfell_admin'), '" + current_time + "') ON CONFLICT " + \
                    "(cmd, payload_type_id) DO NOTHING;"
                apfell_db.execute_sql(create_cmd)

        file.close()
    except Exception as e:
        print(e)


# don't forget to add in a new truncate command in database_api.py to clear the rows if you add a new table
Operator.create_table(True)
PayloadType.create_table(True)
Command.create_table(True)
Operation.create_table(True)
OperatorOperation.create_table(True)
C2Profile.create_table(True)
PayloadTypeC2Profile.create_table(True)
Payload.create_table(True)
Callback.create_table(True)
Task.create_table(True)
Response.create_table(True)
FileMeta.create_table(True)
PayloadCommand.create_table(True)
C2ProfileParameters.create_table(True)
C2ProfileParametersInstance.create_table(True)
# setup default admin user and c2 profile
setup()
# Create the ability to do LISTEN / NOTIFY on these tables
pg_register_newinserts()
pg_register_bignewinserts()
pg_register_updates()

