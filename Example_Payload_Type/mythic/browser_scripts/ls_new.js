function(task, responses){
    if(task.status.includes("error")){
        const combined = responses.reduce( (prev, cur) => {
            return prev + cur;
        }, "");
        return {'plaintext': combined};
    }else if(task.completed && responses.length > 0){
        let data = "";
        try{
            data = JSON.parse(responses[0]);
        }catch(error){
           const combined = responses.reduce( (prev, cur) => {
                return prev + cur;
            }, "");
            return {'plaintext': combined};
        }
        let ls_path = "";
        if(data["parent_path"] === "/"){
            ls_path = data["parent_path"] + data["name"];
        }else{
            ls_path = data["parent_path"] + "/" + data["name"];
        }
        let headers = [
            {"plaintext": "actions", "type": "button", "width": 100, "disableSort": true},
            {"plaintext": "size", "type": "size", "width": 200},
            {"plaintext": "name", "type": "string", "fillWidth": true},
            {"plaintext": "owner", "type": "string", "width": 300},
            {"plaintext": "group", "type": "string", "width": 300},
            {"plaintext": "posix", "type": "string", "width": 100, "disableSort": true},

        ];
        let rows = [{
            "rowStyle":{},
            "name": {"plaintext": data["name"], "startIcon": data["is_file"] ? "file": "folder"},
            "size": {"plaintext": data["size"]},
            "owner": {"plaintext": data["permissions"]["owner"]},
            "group": {"plaintext": data["permissions"]["group"]},
            "posix": {"plaintext": data["permissions"]["posix"]},
            "actions": {"button": {
                "name": "Actions",
                "type": "menu",
                "value": [
                        {
                            "name": "View XATTRs",
                            "type": "dictionary",
                            "value": data["permissions"],
                            "leftColumnTitle": "XATTR",
                            "rightColumnTitle": "Values",
                            "title": "Viewing XATTRs"
                        },
                        {
                            "name": "Get Code Signatures",
                            "type": "task",
                            "ui_feature": "code_signatures:list",
                            "parameters": {"path": ls_path},
                        },
                        {
                            "name": "LS Path",
                            "type": "task",
                            "ui_feature": "file_browser:list",
                            "parameters": ls_path
                        },
                        {
                            "name": "Download File",
                            "type": "task",
                            "disabled": !data["is_file"],
                            "ui_feature": "file_browser:download",
                            "parameters": ls_path,
                            "startIcon": "download"
                        }
                    ]
                }}
        }];
        for(let i = 0; i < data["files"].length; i++){
            let ls_path = "";
            if(data["parent_path"] === "/"){
                ls_path = data["parent_path"] + data["name"] + "/" + data["files"][i]["name"];
            }else{
                ls_path = data["parent_path"] + "/" + data["name"] + "/" + data["files"][i]["name"];
            }
            let row = {
                "rowStyle": {},
                "name": {"plaintext": data["files"][i]["name"], "startIcon": data["files"][i]["is_file"] ? "file": "folder"},
                "size": {"plaintext": data["files"][i]["size"]},
                "owner": {"plaintext": data["files"][i]["permissions"]["owner"]},
                "group": {"plaintext": data["files"][i]["permissions"]["group"]},
                "posix": {"plaintext": data["files"][i]["permissions"]["posix"],
                    "cellStyle": {

                    }
                },
                "actions": {"button": {
                "name": "Actions",
                "type": "menu",
                "value": [
                        {
                            "name": "View XATTRs",
                            "type": "dictionary",
                            "value": data["files"][i]["permissions"],
                            "leftColumnTitle": "XATTR",
                            "rightColumnTitle": "Values",
                            "title": "Viewing XATTRs"
                        },
                        {
                            "name": "Get Code Signatures",
                            "type": "task",
                            "ui_feature": "code_signatures:list",
                            "parameters": ls_path
                        },
                        {
                            "name": "LS Path",
                            "type": "task",
                            "ui_feature": "file_browser:list",
                            "parameters": ls_path
                        },
                        {
                            "name": "Download File",
                            "type": "task",
                            "disabled": !data["files"][i]["is_file"],
                            "ui_feature": "file_browser:download",
                            "parameters": ls_path,
                            "startIcon": "download",
                            "startIconColor": "lightgreen",
                            "hoverText": "Task agent to download"
                        }
                    ]
                }}
            };
            rows.push(row);
        }
        return {"table":[{
            "headers": headers,
            "rows": rows,
            "title": "File Listing Data"
        }]};
    }else if(task.status === "processed"){
        // this means we're still downloading
        return {"plaintext": "Only have partial data so far..."}
    }else{
        // this means we shouldn't have any output
        return {"plaintext": "Not response yet from agent..."}
    }
}