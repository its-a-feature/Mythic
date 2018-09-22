from app import apfell, links, use_ssl, db_objects
from sanic import response
from jinja2 import Environment, PackageLoader
from app.forms.payloads_form import Payloads_JXA_Form
from app.api import payloads_api
from app.database_models.model import Payload
import pathlib
from app.api.c2profiles_api import get_c2profiles_by_type_function
from app.api.payloads_api import write_jxa_payload_func
from sanic_jwt.decorators import protected, inject_user

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/payloads/jxa", methods=['GET', 'POST'])
@inject_user()
@protected()
async def payloads_jxa(request, user):
    form = Payloads_JXA_Form(request)
    errors = {}
    success = ""
    try:
        # pass True as the 3rd parameter indicating we only want to do this for our current operation's c2 profiles
        jxa_choices = await get_c2profiles_by_type_function('apfell-jxa', user, True)
    except Exception as e:
        jxa_choices = []
    if jxa_choices is None:
        jxa_choices = []
    form.c2_profile.choices = [(p['c2_profile'], p['c2_profile'] + ": " + p['c2_profile_description']) for p in jxa_choices]
    if request.method == 'POST' and form.validate():
        callback_host = form.callback_host.data
        callback_port = form.callback_port.data
        obfuscation = form.obfuscation.data  # not used yet, but in the future it will be
        output_directory = form.output_directory.data
        callback_interval = form.callback_interval.data
        default_tag = form.default_tag.data
        c2_profile = form.c2_profile.data
        # Now that we have the data, we need to register it
        data = {"tag": default_tag, "operator": user['username'], "payload_type": "apfell-jxa",
                "callback_host": callback_host, "callback_port": callback_port,
                "callback_interval": callback_interval, "obfuscation": obfuscation,
                "use_ssl": use_ssl, "location": output_directory, "c2_profile": c2_profile,
                "current_operation": user['current_operation']}
        resp = await payloads_api.register_payload_func(data)  # process this with our api
        if resp['status'] == "success":
            try:
                create_rsp = await write_jxa_payload_func({'uuid': resp['uuid'], 'loc': output_directory})
                if create_rsp['status'] == "success":
                    # now that we have a payload on disk, update the corresponding Payload object
                    payload = await db_objects.get(Payload, uuid=resp['uuid'])
                    payload.location = str(pathlib.Path(output_directory).resolve())
                    await db_objects.update(payload)
                    success = "true"
                    errors['uuid'] = resp['uuid']  # kind of hacky, but it works
                else:
                    success = "false"
                    print(create_rsp['error'])
            except Exception as e:
                print(e)
                errors['validate_errors'] = "Failed to create payload"
        else:
            print(resp)

    errors['callback_host_errors'] = '<br>'.join(form.callback_host.errors)
    errors['callback_port_errors'] = '<br>'.join(form.callback_port.errors)
    errors['obfuscation_errors'] = '<br>'.join(form.obfuscation.errors)
    errors['output_directory_errors'] = '<br>'.join(form.output_directory.errors)
    errors['default_tag_errors'] = '<br>'.join(form.default_tag.errors)
    errors['callback_interval_errors'] = '<br>'.join(form.callback_interval.errors)
    errors['c2_profile_errors'] = '<br>'.join(form.c2_profile.errors)

    template = env.get_template('payloads_jxa.html')
    content = template.render(name=user['username'], links=links, form=form, errors=errors, success=success)
    return response.html(content)

# add links to the routes in this file at the bottom
links['payloads_jxa'] = apfell.url_for('payloads_jxa')
