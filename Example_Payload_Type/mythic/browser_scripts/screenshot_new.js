function(task, responses){
    if(task.status.includes("error")){
        const combined = responses.reduce( (prev, cur) => {
            return prev + cur;
        }, "");
        return {'plaintext': combined};
    }else if(task.completed){
        if(responses.length > 0){
            let data = JSON.parse(responses[0]);
            return {"screenshot":[{
                "agent_file_id": [data["file_id"]],
                "variant": "contained",
                "name": "View Screenshot"
            }]};
        }else{
            return {"plaintext": "No data to display..."}
        }

    }else if(task.status === "processed"){
        // this means we're still downloading
        if(responses.length > 0){
            let data = JSON.parse(responses[0]);
            return {"screenshot":[{
                "agent_file_id": [data["file_id"]],
                "variant": "contained",
                "name": "View Partial Screenshot"
            }]};
        }
        return {"plaintext": "No data yet..."}
    }else{
        // this means we shouldn't have any output
        return {"plaintext": "Not response yet from agent..."}
    }
}