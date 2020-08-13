exports.socks = function(task, command, params){
	let parameters = JSON.parse(params);
	let data = {"socks": {} };
	if(parameters['action'] === 'start'){
		data['socks'] = {"start": parameters['port']} ;
	}else{
		data['socks'] = {"stop": parameters['port']} ;
	}
	let resp = C2.postResponse(task, data);
	return {"user_output": JSON.stringify(resp), "completed": true};
};

    