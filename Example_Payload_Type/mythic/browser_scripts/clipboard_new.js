function(task, responses){
    if(task.status.includes("error")){
        const combined = responses.reduce( (prev, cur) => {
            return prev + cur;
        }, "");
        return {'plaintext': combined};
    }else if(task.completed){
        if(responses.length > 0){
            if(responses[0] === "Successfully set the clipboard"){
                return {"plaintext": responses[0]};
            }else{
                try{
                    let data = JSON.parse(responses[0]);
                    let output_table = [];
                    let all_keys = [];
                    for(const [k,v] of Object.entries(data)){
                        all_keys.push(k);
                        if(k === "public.utf8-plain-text"){
                            output_table.push({
                                "key":{"plaintext": k},
                                "value": {"plaintext": atob(v), "copyIcon": v.length > 0},
                                "fetch": {"button": {
                                    "name": "Fetch Data",
                                    "type": "task",
                                    "ui_feature": "clipboard:list",
                                    "parameters": {"read": [k]}
                                }},
                                "view": {"button": {
                                    "name": v=== "" ? "Empty": "View",
                                    "type": "dictionary",
                                    "value": {[k]:atob(v)},
                                    "disabled": v === "",
                                    "leftColumnTitle": "Key",
                                    "rightColumnTitle": "Values",
                                    "title": "Viewing " + k
                                }}
                            })
                        }else{
                            output_table.push({
                                "key":{"plaintext": k},
                                "value": {"plaintext": v, "copyIcon": v.length > 0},
                                "fetch": {"button": {
                                    "name": "Fetch Data",
                                    "type": "task",
                                    "ui_feature": "clipboard:list",
                                    "parameters":{"read": [k]}
                                }},
                                "view": {"button": {
                                    "name": v=== "" ? "Empty": "View",
                                    "type": "dictionary",
                                    "value": {[k]:v},
                                    "disabled": v === "",
                                    "leftColumnTitle": "Key",
                                    "rightColumnTitle": "Values",
                                    "title": "Viewing " + k
                                }}
                            })
                        }
                    }
                    output_table.push({
                        "key":{"plaintext": "Fetch All Clipboard Data"},
                        "value": {"plaintext": ""},
                        "fetch": {"button": {
                            "name": "Fetch All Data",
                            "type": "task",
                            "ui_feature": "clipboard:list",
                            "parameters": {"read": ["*"]}
                        }},
                        "view": {"button": {
                            "name": "View",
                            "type": "dictionary",
                            "value": {},
                            "disabled": true,
                            "leftColumnTitle": "Key",
                            "rightColumnTitle": "Values",
                            "title": "Viewing "
                        }}
                    })
                    return {
                        "table": [
                            {
                                "headers": [
                                    {"plaintext": "fetch", "type": "button", "width": 150, "disableSort": true},
                                    {"plaintext": "view", "type": "button", "width": 100, "disableSort": true},
                                    {"plaintext": "key", "type": "string", "fillWidth": true},
                                    {"plaintext": "value", "type": "string", "fillWidth": true},


                                ],
                                "rows": output_table,
                                "title": "Clipboard Data"
                            }
                        ]
                    }
                }catch(error){
                    console.log(error);
                    const combined = responses.reduce( (prev, cur) => {
                        return prev + cur;
                    }, "");
                    return {'plaintext': combined};
                }
            }
        }else{
            return {"plaintext": "No output from command"};
        }
    }else{
        return {"plaintext": "No data to display..."};
    }
}