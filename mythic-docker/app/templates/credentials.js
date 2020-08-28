document.title = "Credentials";
var creds_div = new Vue({
    el: '#creds_div',
    data: {
        credentials: []
    },
    methods: {
        register_new_credential: function () {
            $('#createCredentialType').val('plaintext');
            $('#createCredentialAccount').val("");
            $('#createCredentialRealm').val("");
            $('#createCredentialComment').val("");
            $('#createCredentialCredential').val("");
            $('#createCredentialModal').modal('show');
            $('#createCredentialSubmit').unbind('click').click(function () {
                let data = {
                    "credential_type": $('#createCredentialType').val(),
                    "account": $('#createCredentialAccount').val(),
                    "realm": $('#createCredentialRealm').val(),
                    "comment": $('#createCredentialComment').val(),
                    "credential": $('#createCredentialCredential').val()
                };
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/credentials",
                    new_credential_callback, "POST", data);
            });
        },
        remove_credential: function (cred) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/credentials/" + cred['id'],
                remove_credential_callback, "DELETE", null);
        },
        edit_credential: function (cred) {
            $('#createCredentialType').val(cred.type);
            $('#createCredentialAccount').val(cred.account);
            $('#createCredentialRealm').val(cred.realm);
            $('#createCredentialComment').val(cred.comment);
            $('#createCredentialCredential').val(cred.credential);
            $('#createCredentialModal').modal('show');
            $('#createCredentialSubmit').unbind('click').click(function () {
                let data = {
                    "credential_type": $('#createCredentialType').val(),
                    "account": $('#createCredentialAccount').val(),
                    "realm": $('#createCredentialRealm').val(),
                    "comment": $('#createCredentialComment').val(),
                    "credential": $('#createCredentialCredential').val()
                };
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/credentials/" + cred.id,
                    update_credential_callback, "PUT", data);
            });
        }
    },
    delimiters: ['[[', ']]']
});

function new_credential_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] !== "success") {
            alertTop("danger", "Error creating a new credential: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function remove_credential_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            for (let i = 0; i < creds_div.credentials.length; i++) {
                if (data['id'] === creds_div.credentials[i]['id']) {
                    creds_div.credentials.splice(i, 1);
                    return;
                }
            }
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function update_credential_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            for (let i = 0; i < creds_div.credentials.length; i++) {
                if (data['id'] === creds_div.credentials[i]['id']) {
                    Vue.set(creds_div.credentials, i, data);
                    return;
                }
            }
        } else {
            alertTop("danger", "Error: " + data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

function startwebsocket_credentials() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/credentials/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let c = JSON.parse(event.data);
            creds_div.credentials.push(c);
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_credentials();