exports.socks_send = function(task, command, params){
	//let parameters = JSON.parse(params);
	let data = {"socks": {} };
	data['socks']['data'] = [{"server_id": 34567, "data": ""}];
	let resp = C2.postResponse(task, data);
	return {"user_output": JSON.stringify(resp), "completed": true};
};
