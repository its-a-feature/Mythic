from app import apfell, auth, links, use_ssl, db_objects
from sanic import response
from jinja2 import Environment, PackageLoader
from app.forms.payloads_form import Payloads_JXA_Form
from app.api import payloads_api
from app.database_models.model import Payload
import pathlib

env = Environment(loader=PackageLoader('app', 'templates'))


@apfell.route("/payloads/jxa", methods=['GET', 'POST'])
@auth.login_required(user_keyword='user')
async def payloads_jxa(request, user):
    form = Payloads_JXA_Form(request)
    errors = {}
    success = ""
    if request.method == 'POST' and form.validate():
        callback_host = form.callback_host.data
        callback_port = form.callback_port.data
        obfuscation = form.obfuscation.data  # not used yet, but in the future it will be
        output_directory = form.output_directory.data
        callback_interval = form.callback_interval.data
        default_tag = form.default_tag.data

        # Now that we have the data, we need to register it
        data = {"tag": default_tag, "operator": user.name, "payload_type": "apfell-jxa",
                "callback_host": callback_host, "callback_port": callback_port,
                "callback_interval": callback_interval, "obfuscation": obfuscation,
                "use_ssl": use_ssl, "location": output_directory}
        resp = await payloads_api.register_payload_func(data)  # process this with our api
        if resp['status'] == "success":
            try:
                # take these inputs to create our payload and write it to output_directory
                base_jxa = open('./app/payloads/JXA.js', 'r')
                custom_jxa = open(output_directory, 'w')
                # read base_jxa and write it out to custom_jxa with our modifications
                # for now, obfuscation doesn't do anything
                http = "https" if use_ssl else "http"
                for line in base_jxa:
                    if "C2 = new RestC2(10" in line:
                        custom_jxa.write("C2 = new RestC2(" + str(callback_interval) + ", \"" + http + "://" +
                                         callback_host + ":" + str(callback_port) + "/\");")
                    elif 'this.uuid = "XXXX";' in line:
                        custom_jxa.write('this.uuid = "' + resp['uuid'] + '";')
                    else:
                        custom_jxa.write(line)
                base_jxa.close()
                custom_jxa.close()
                # now that we have a payload on disk, update the corresponding Payload object
                payload = await db_objects.get(Payload, uuid=resp['uuid'])
                payload.location = str(pathlib.Path(output_directory).resolve())
                await db_objects.update(payload)
                success = "true"
            except Exception as e:
                print(e)
                errors['validate_errors'] = "Failed to create payload"
        else:
            print(resp)

    errors['token_errors'] = '<br>'.join(form.csrf_token.errors)
    errors['callback_host_errors'] = '<br>'.join(form.callback_host.errors)
    errors['callback_port_errors'] = '<br>'.join(form.callback_port.errors)
    errors['obfuscation_errors'] = '<br>'.join(form.obfuscation.errors)
    errors['output_directory_errors'] = '<br>'.join(form.output_directory.errors)
    errors['default_tag_errors'] = '<br>'.join(form.default_tag.errors)
    errors['callback_interval_errors'] = '<br>'.join(form.callback_interval.errors)

    template = env.get_template('payloads_jxa.html')
    content = template.render(name=user.name, links=links, form=form, errors=errors, success=success)
    return response.html(content)

# add links to the routes in this file at the bottom
links['payloads_jxa'] = apfell.url_for('payloads_jxa')
