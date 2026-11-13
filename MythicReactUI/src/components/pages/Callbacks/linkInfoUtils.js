export const buildLinkInfoValue = (edge, callbackID) => {
    if(!edge){
        return {};
    }
    const peer = String(edge.source.id) === String(callbackID) ? edge.destination : edge.source;
    const parameters = peer.c2profileparametersinstances.reduce((values, parameter) => {
        if(parameter.c2_profile_id === edge.c2profile.id){
            values[parameter.c2profileparameter.name] = parameter.c2profileparameter.crypto_type ? {
                crypto_type: parameter.value,
                enc_key: parameter.enc_key_base64,
                dec_key: parameter.dec_key_base64,
            } : parameter.value;
        }
        return values;
    }, {});
    return {
        edge_id: edge.id,
        host: peer.host,
        agent_uuid: peer.payload.uuid,
        callback_uuid: peer.agent_callback_id,
        c2_profile: {name: edge.c2profile.name, parameters},
    };
};
