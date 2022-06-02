function(task, responses){
    if(task.status.includes("error")){
        const combined = responses.reduce( (prev, cur) => {
            return prev + cur;
        }, "");
        return {'plaintext': combined};
    }else if(task.completed){
        if(responses.length > 0){

            let headers = [
            {"plaintext": "pid", "type": "number", "width": 100},
            {"plaintext": "name", "type": "string", "fillWidth": true},
            {"plaintext": "bundle", "type": "string", "fillWidth": true},
            {"plaintext": "entitlements", "type": "button", "width": 200}];
            let data = "";
            try{
                data = JSON.parse(responses[0]);
            }catch(error){
               const combined = responses.reduce( (prev, cur) => {
                    return prev + cur;
                }, "");
                return {'plaintext': combined};
            }
            let rows = [];
            for(let i = 0; i < data.length; i++){
                let row = {
                    "name": {"plaintext": data[i]["name"]},
                    "pid": {"plaintext": data[i]["pid"]},
                    "bundle": {"plaintext": data[i]["bundle"], "copyIcon": true},
                    "entitlements": {"button": {
                        "name": "",
                        "startIcon": "list",
                        "type": "dictionary",
                        "value": data[i]["entitlements"],
                        "disabled": Object.keys(data[i]["entitlements"]).length === 0,
                        "leftColumnTitle": "Entitlements",
                        "rightColumnTitle": "Value",
                        "title": "Viewing Entitlements"
                    }},
                };
                rows.push(row);
            }
            return {"table":[{
                "headers": headers,
                "rows": rows,
                "title": "Process Entitlements"
            }]};
        }else{
            const combined = responses.reduce( (prev, cur) => {
                return prev + cur;
            }, "");
            return {'plaintext': combined};
        }
    }else if(task.status === "processed"){
        // this means we're still downloading
        return {"plaintext": "Only have partial data so far..."}
    }else{
        // this means we shouldn't have any output
        return {"plaintext": "Not response yet from agent..."}
    }
}