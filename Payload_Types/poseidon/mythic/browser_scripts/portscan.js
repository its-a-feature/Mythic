function(task, response) {
    const capitalize = (s) => {
        if (typeof s !== 'string') return ''
        return s.charAt(0).toUpperCase() + s.slice(1)
    };
    var total_output = "";
    var total_results = "";
    for (var i = 0; i < response.length; i++) {
        try {
            total_results += response[i]["response"];
        } catch (error) {
            return response;
        }
    }
    var data = JSON.parse(total_results);

    for (i = 0; i < data.length; i++) {
    	output = "";
    	var row_style = "";
    	var rows = [];
    	var cell_style = {
            "hidden": "text-align:center",
            "type": "text-align:center"
        };
        var addedHeader = false;
        var headerDiv = '<div class="card-header shadow" style="top: 0px; background-color: #20B2AA; color: white;"><b>' + data[i]["range"] + '</b></div>';
        for (j = 0; j < data[i]["hosts"].length; j++) {
        	if (data[i]["hosts"][j]["open_ports"] != null) {
        		if (!addedHeader) {
        			output += headerDiv;
        			addedHeader = true;
        		}
        		var host = data[i]["hosts"][j];
        		rows.push({
                    "Open Ports": host["open_ports"].join(", "),
                    "Host": host["pretty_name"],
                    "row-style": row_style,
                    "cell-style": {
                        "hidden": "text-align:center",
                        "type": "text-align:center"
                    }
                });
        	}
        }
        if (rows.length != 0) {
        	output += support_scripts['poseidon_create_table']([{
                "name": "Open Ports",
                "size": "1em"
            }, {
                "name": "Host",
                "size": "1em"
            }], rows);
            output += "<br />";
            total_output += output;
        }
    }
    return total_output;
}