import json as js
import pprint
# JSON pulled from here:
# curl https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json -o full_attack.json
file = open("full_attack.json", "r")
output = open("attack.json", "w")
attack = js.load(file)
attack_list = []


def fix_tactic_names(names: [str]) -> [str]:
    final_names = []
    for n in names:
        no_dashes = n.replace("-", " ")
        capitalized = " ".join(
            [word.capitalize() for word in no_dashes.split(" ")]
        )
        final_names.append(capitalized)
    return final_names


def filter_attack():
    for obj in attack["objects"]:
        if obj["type"] == "attack-pattern":
            if "revoked" in obj and obj["revoked"]:
                #
                # this has revoked ATT&CK techniques, so we don't want to include those
                continue
            for ext_ref in obj["external_references"]:
                if "external_id" in ext_ref and ext_ref["source_name"] == "mitre-attack":
                    t_num = ext_ref["external_id"]
                    name = obj["name"]
                    if "x_mitre_platforms" in obj:  # "x_mitre_platform" is now not always present
                        os = obj["x_mitre_platforms"]
                    else:
                        print("no platform!")
                        print(obj)
                        return
                    tactics = [
                        x["phase_name"]
                        for x in (obj["kill_chain_phases"] if "kill_chain_phases" in obj else []) # Neither is "kill_chain_phases"
                        if x["kill_chain_name"] == "mitre-attack"
                    ]
                    # tactic = obj['kill_chain_phases'][0]['phase_name']
                    fixed_tactics = fix_tactic_names(tactics)
                    attack_list.append(
                        {"t_num": t_num, "name": name, "os": os, "tactic": fixed_tactics}
                    )


filter_attack()
full_output = {"techniques": attack_list}
output.write(js.dumps(full_output))
