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
		var output = "";
		var rows = [];
    for (i = 0; i < data.length; i++) {
    	var row_style = "";
    	var cell_style = {
            "hidden": "text-align:center",
            "type": "text-align:center"
        };
        if (data[i]["success"]) {
            row_style = "background-color: #008000;"
        }
        rows.push({
            "Host": data[i]["host"],
            "Username": data[i]["username"],
            "Secret": data[i]["secret"],
            "Success": data[i]["success"],
            "Output": "<pre>" + data[i]["output"] + "</pre>",
            "Copy_Status": data[i]['copy_status'],
            "row-style": row_style,
            "cell-style": {
                "hidden": "text-align:center",
                "type": "text-align:center"
            }
        });
    }
    output += support_scripts['poseidon_create_table']([{
            "name": "Host",
            "size": "4em"
        }, {
            "name": "Username",
            "size": "4em"
        }, {
            "name": "Secret",
            "size": "4em"
        }, {
            "name": "Success",
            "size": "1em"
        }, {
        	"name": "Output",
        	"size": "10em"
        }, {
        	"name": "Copy_Status",
        	"size": "2em"
        }], rows);
        
        total_output += output;
    return total_output;
}