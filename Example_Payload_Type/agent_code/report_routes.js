exports.report_routes = function(task, command, params){
	let parameters = JSON.parse(params);
	let edges = [
					{
						"source": parameters['source'],
						"destination": parameters['destination'],
						"direction": parameters['direction'],
						"action": parameters['action'],
						"metadata": parameters['metadata']
					}
				];
	//C2.htmlPostData("api/v1.4/agent_message", data, apfell.id);
	return {"user_output": "Route submitted", "completed": true, "edges": edges};
};
