from app import apfell, auth, links
from sanic import response
from jinja2 import Environment, PackageLoader
from app.forms.payloads_form import Payloads_JXA_Form

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
        obfuscation = form.obfuscation.data
        output_directory = form.output_directory.data
        callback_interval = form.callback_interval.data

        try:
            # take these inputs to create our payload and write it to output_directory
            base_jxa = open('./payloads/JXA.js', 'r')
            custom_jxa = open(output_directory, 'w')
            # read base_jxa and write it out to custom_jxa with our modifications
            # for now, obfuscation doesn't do anything
            for line in base_jxa:
                if "C2 = new RestC2(10" in line:
                    custom_jxa.write("C2 = new RestC2(" + str(callback_interval) + ", \"http://" +
                                     callback_host + ":" + str(callback_port) + "/\");")
                else:
                    custom_jxa.write(line)
            base_jxa.close()
            custom_jxa.close()
            success = "true"
        except Exception as e:
            print(e)
            errors['validate_errors'] = "Failed to create payload"
    errors['token_errors'] = '<br>'.join(form.csrf_token.errors)
    errors['callback_host_errors'] = '<br>'.join(form.callback_host.errors)
    errors['callback_port_errors'] = '<br>'.join(form.callback_port.errors)
    errors['obfuscation_errors'] = '<br>'.join(form.obfuscation.errors)
    errors['output_directory_errors'] = '<br>'.join(form.output_directory.errors)
    errors['callback_interval_errors'] = '<br>'.join(form.callback_interval.errors)

    template = env.get_template('payloads_jxa.html')
    content = template.render(name=user.name, links=links, form=form, errors=errors, success=success)
    return response.html(content)

# add links to the routes in this file at the bottom
links['payloads_jxa'] = apfell.url_for('payloads_jxa')
