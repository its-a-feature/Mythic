import peewee as p
import datetime
from app import apfell_db
import json
import app.crypto as crypto


class Operator(p.Model):
    username = p.CharField(max_length=64, unique=True, null=False)
    password = p.CharField(max_length=1024, null=False)

    class Meta:
        ordering = ['-id', ]
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k != 'password':
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        return r

    def __str__(self):
        return str(self.to_json())

    async def check_password(self, password):
        temp_pass = await crypto.hash_SHA512(password)
        return self.password == temp_pass.decode("utf-8")


class Payload(p.Model):
    # this is actually a sha256 from other information about the payload
    uuid = p.CharField(unique=True, null=True)
    # tag a payload with information like spearphish, custom bypass, lat mov, etc (indicates "how")
    tag = p.CharField(null=True)
    # creator of the payload, cannot be null! must be attributed to somebody (indicates "who")
    operator = p.ForeignKeyField(Operator, null=False)
    creation_time = p.DateTimeField(default=datetime.datetime.now, null=False)  # (indicates "when")
    payload_type = p.CharField(null=False)
    # this will signify if a current callback made / spawned a new callback that's checking in
    #   this helps track how we're getting callbacks (which payloads/tags/parents/operators)
    pcallback = p.ForeignKeyField(p.DeferredRelation('Callback'), null=True)
    callback_host = p.CharField(null=False)
    callback_port = p.IntegerField(null=False)
    obfuscation = p.BooleanField(null=False)
    callback_interval = p.IntegerField(null=False)
    use_ssl = p.BooleanField(null=False)
    location = p.CharField(null=True)  # location on disk of the payload

    class Meta:
        database = apfell_db

    async def create_uuid(self, info):
        hash = await crypto.hash_SHA256(info)
        return hash

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'operator':
                    r[k] = getattr(self, k).username
                elif k == 'pcallback':
                    r[k] = getattr(self, k).id
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['creation_time'] = r['creation_time'].strftime('%m/%d/%Y %H:%M:%S')
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
    operator = p.ForeignKeyField(Operator, null=True)
    payload_type = p.CharField(null=False)
    active = p.BooleanField(default=True, null=False)
    # keep track of the parent callback from this one
    pcallback = p.ForeignKeyField(p.DeferredRelation('Callback'), null=True)
    registered_payload = p.ForeignKeyField(Payload, null=False)  # what payload is associated with this callback

    class Meta:
        unique_together = ['host', 'pid']
        database = apfell_db

    def to_json(self):
        r = {}
        for k in self._data.keys():
            try:
                if k == 'pcallback':
                    r[k] = (getattr(self, k)).id
                elif k == 'operator':
                    r[k] = (getattr(self, k)).username
                elif k == 'registered_payload':
                    r[k] = (getattr(self, k)).uuid
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
    command = p.CharField(null=False)
    params = p.CharField(null=True)
    # make room for ATT&CK ID (T#) if one exists or enable setting this later
    attack_id = p.IntegerField(null=True)
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
                    r[k] = (getattr(self, k)).id
                elif k == 'operator':
                    r[k] = (getattr(self, k)).username
                else:
                    r[k] = getattr(self, k)
            except:
                r[k] = json.dumps(getattr(self, k))
        r['timestamp'] = r['timestamp'].strftime('%m/%d/%Y %H:%M:%S')
        return r

    def __str__(self):
        return str(self.to_json())


class Response(p.Model):
    response = p.CharField(null=True)
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


# ------------ LISTEN / NOTIFY ---------------------
def pg_register_newcallback():
    create_function_on_callback_changes = """
    DROP FUNCTION IF EXISTS notify_newcallback() cascade;
    CREATE FUNCTION notify_newcallback() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('newcallback', row_to_json(NEW)::text); RETURN NULL; END; $$;
    """
    create_trigger_on_callback_changes = """
    CREATE TRIGGER newcallback_trigger AFTER INSERT ON callback FOR EACH ROW EXECUTE PROCEDURE notify_newcallback();
    """
    try:
        apfell_db.execute_sql(create_function_on_callback_changes)
    except Exception as e:
        print(e)
    try:
        apfell_db.execute_sql(create_trigger_on_callback_changes)
    except Exception as e:
        print(e)


def pg_register_updatedcallback():
    create_function_on_callback_changes = """
        DROP FUNCTION IF EXISTS notify_updatedcallback() cascade;
        CREATE FUNCTION notify_updatedcallback() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('updatedcallback', row_to_json(NEW)::text); RETURN NULL; END; $$;
        """
    create_trigger_on_callback_changes = """
        CREATE TRIGGER updatedcallback_trigger AFTER UPDATE ON callback FOR EACH ROW EXECUTE PROCEDURE notify_updatedcallback();
        """
    try:
        apfell_db.execute_sql(create_function_on_callback_changes)
    except Exception as e:
        print(e)
    try:
        apfell_db.execute_sql(create_trigger_on_callback_changes)
    except Exception as e:
        print(e)

def pg_register_newtask():
    create_function_on_task_changes = """
    DROP FUNCTION IF EXISTS notify_newtask() cascade;
    CREATE FUNCTION notify_newtask() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('newtask', row_to_json(NEW)::text);RETURN NULL;END;$$;
    """
    create_trigger_on_task_changes = """
    CREATE TRIGGER newtask_trigger AFTER INSERT ON task FOR EACH ROW EXECUTE PROCEDURE notify_newtask();
    """
    # await db_objects.execute(notify_on_callback_changes)
    try:
        apfell_db.execute_sql(create_function_on_task_changes)
    except Exception as e:
        print(e)
    try:
        apfell_db.execute_sql(create_trigger_on_task_changes)
    except Exception as e:
        print(e)


def pg_register_newresponse():
    # https://stackoverflow.com/questions/25435669/fire-trigger-on-update-of-columna-or-columnb-or-columnc
    create_function_on_response_changes = """
    DROP FUNCTION IF EXISTS notify_newresponse() cascade;
    CREATE FUNCTION notify_newresponse() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('newresponse', row_to_json(NEW)::text);RETURN NULL;END;$$;
    """
    create_trigger_on_response_changes = """
    CREATE TRIGGER newresponse_trigger AFTER INSERT ON response FOR EACH ROW EXECUTE PROCEDURE notify_newresponse();
    """
    # await db_objects.execute(notify_on_callback_changes)
    try:
        apfell_db.execute_sql(create_function_on_response_changes)
    except Exception as e:
        print(e)
    try:
        apfell_db.execute_sql(create_trigger_on_response_changes)
    except Exception as e:
        print(e)


# Create the Tables
# don't forget to add in a new truncate command in database_api.py to clear the rows
Operator.create_table(True)
Payload.create_table(True)
Callback.create_table(True)
Task.create_table(True)
Response.create_table(True)
# Create the ability to do LISTEN / NOTIFY on these tables
pg_register_newcallback()
pg_register_newtask()
pg_register_newresponse()
pg_register_updatedcallback()
