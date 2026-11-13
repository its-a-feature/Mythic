import {buildLinkInfoValue} from './linkInfoUtils';

const callback = (id) => ({
    id,
    host: `HOST-${id}`,
    payload: {uuid: `payload-${id}`},
    agent_callback_id: `callback-${id}`,
    c2profileparametersinstances: [
        {c2_profile_id: 5, c2profileparameter: {name: 'port', crypto_type: false}, value: `${id}00`},
        {c2_profile_id: 6, c2profileparameter: {name: 'other', crypto_type: false}, value: 'excluded'},
        {c2_profile_id: 5, c2profileparameter: {name: 'key', crypto_type: true}, value: 'aes256_hmac',
            enc_key_base64: 'ZW5j', dec_key_base64: 'ZGVj'},
    ],
});
const edge = {id: 901, source: callback(12), destination: callback(34), c2profile: {id: 5, name: 'mesh'}};

test.each([[12, 34], [34, 12], ['12', 34]])(
    'keeps the graph edge ID and resolves the peer for callback %s', (currentID, peerID) => {
        const value = buildLinkInfoValue(edge, currentID);
        expect(`@link:edge=${value.edge_id}`).toBe('@link:edge=901');
        expect(value).toEqual({
            edge_id: 901,
            host: `HOST-${peerID}`,
            agent_uuid: `payload-${peerID}`,
            callback_uuid: `callback-${peerID}`,
            c2_profile: {name: 'mesh', parameters: {
                port: `${peerID}00`,
                key: {crypto_type: 'aes256_hmac', enc_key: 'ZW5j', dec_key: 'ZGVj'},
            }},
        });
    }
);

test('returns an empty value when no links are available', () => {
    expect(buildLinkInfoValue(undefined, 12)).toEqual({});
});
