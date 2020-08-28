document.title = "MITRE ATT&CK Mappings";
var navigator_base = {
	"name": "layer",
	"version": "2.1",
	"domain": "mitre-enterprise",
	"description": "Apfell output",
	"filters": {
		"stages": [
			"act"
		],
		"platforms": [
			"windows",
			"linux",
			"mac"
		]
	},
	"sorting": 0,
	"viewMode": 0,
	"hideDisabled": false,
	"techniques": [
	],
	"gradient": {
		"colors": [
			"#ff6666",
			"#ffe766",
			"#8ec843"
		],
		"minValue": 0,
		"maxValue": 100
	},
	"legendItems": [],
	"metadata": [],
	"showTacticRowBackground": false,
	"tacticRowBackground": "#dddddd",
	"selectTechniquesAcrossTactics": false
}

var attack_matrix = new Vue({
    el: '#attack_matrix',
    data: {
        matrix: {'initial-access': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'execution': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'persistence': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'privilege-escalation': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'defense-evasion': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'credential-access': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'discovery': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'lateral-movement': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'collection': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'exfiltration': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'command-and-control': [{'mappings': {}, 'name':'', 't_num': ''}],
                 'impact': [{"mappings":{}, "name":'', 't_num':''}]
                }
    },
    methods: {
        view_data: function(tactic, index){
            view_data_modal.cell_data = this.matrix[tactic][index];
            view_data_modal.tactic = tactic;
            view_data_modal.index = index;
            $('#showATTACKDataModal').modal('show');
        }
    },
    computed: {
        matrix_length: function(){
            if( this.matrix['initial-access'].length > 0){
                return this.matrix['initial-access'].length - 1;
            }else{
                return 0;
            }
        }
    },
    delimiters: ['[[',']]']
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mitreattack", initialize_attack, "GET", null);
function initialize_attack(response){
    try{
        let data = JSON.parse(response);
        //console.log('before');
        //console.log(JSON.stringify(data['attack']['privilege-escalation']));
        if(data['status'] === 'success'){
            //lets square out the matrix first before we push it to the UI
            let longest = 0;
            for(let key in data['attack']){
                if(data['attack'][key].length > longest){
                    longest = data['attack'][key].length;
                }
            }
            // now make sure each 'column' is 'longest' in length, fill with empty
            for(let key in data['attack']){
                while(data['attack'][key].length < longest){
                    data['attack'][key].push({'name': '', 't_num': '', 'mappings': []});
                }
            }
            //console.log('when setting');
            //console.log(JSON.stringify(data['attack']['privilege-escalation']));
            attack_matrix.matrix = data['attack'];
        }else{
            alertTop("warning", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mitreattack/listing", initialize_attack_options, "GET", null);
function initialize_attack_options(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            data['attack'].sort((a,b) => (a.t_num > b.t_num) ? 1 : ((b.t_num > a.t_num) ? -1 : 0));
            regexVue.options = data['attack'];
            regexVue.selected = regexVue.options[0].t_num;
        }else{
            alertTop("warning", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
/* eslint-disable no-unused-vars */
// this is called via Vue from the HTML code
function get_command_by_attack(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mitreattack/bycommand", attack_by_command, "GET", null);
}
/* eslint-enable no-unused-vars */
function attack_by_command(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            //lets square out the matrix first before we push it to the UI
            let longest = 0;
            for(let key in data['attack']){
                if(data['attack'][key].length > longest){
                    longest = data['attack'][key].length;
                }
            }
            // now make sure each 'column' is 'longest' in length, fill with empty
            for(let key in data['attack']){
                while(data['attack'][key].length < longest){
                    data['attack'][key].push({'name': '', 't_num': '', 'mappings': {}});
                }
            }
            attack_matrix.matrix = data['attack'];
        }else{
            alertTop("warning", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
/* eslint-disable no-unused-vars */
// this is called via Vue from the HTML code
function get_task_by_attack(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mitreattack/bytask", attack_by_task, "GET", null);
}
/* eslint-enable no-unused-vars */
function attack_by_task(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            //lets square out the matrix first before we push it to the UI
            let longest = 0;
            for(let key in data['attack']){
                if(data['attack'][key].length > longest){
                    longest = data['attack'][key].length;
                }
            }
            // now make sure each 'column' is 'longest' in length, fill with empty
            for(let key in data['attack']){
                while(data['attack'][key].length < longest){
                    data['attack'][key].push({'name': '', 't_num': '', 'mappings': {}});
                }
            }
            attack_matrix.matrix = data['attack'];
        }else{
            alertTop("warning", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}

var view_data_modal = new Vue({
    el: '#showATTACKDataModal',
    data: {
        cell_data: {},
        tactic: "",
        index: 0
    },
    methods:{
        remove_mapping: function(task_id, t_num){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mitreattack/task/" + task_id + "/attack/" + t_num, remove_task_mapping, "DELETE", null);
        }
    },
    delimiters: ['[[',']]']
});
function remove_task_mapping(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            for(const [key, ] of Object.entries(view_data_modal.cell_data['mappings'])){
                for(let i = 0; i < view_data_modal.cell_data['mappings'][key].length; i++){
                    if(view_data_modal.cell_data['mappings'][key][i]['task'] === data['task_id']){
                        view_data_modal.cell_data['mappings'][key].splice(i, 1);
                        if(view_data_modal.cell_data['mappings'][key].length === 0){
                            //if there are no more tasks for that type, remove the type as well
                            delete view_data_modal.cell_data['mappings'][key];
                        }
                        // update the global view so that if we delete all mappings, the cell un-highlights
                        Vue.set(attack_matrix.matrix[view_data_modal.tactic], view_data_modal.index, view_data_modal.cell_data);
                        return;
                    }
                }
            }
        }else{
            alertTop("warning", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
var regexVue = new Vue({
    el: '#regexGroup',
    data: {
        options: [],
        finalize: false,
        regex: "",
        selected: ""
    },
    methods: {
        submit_search: function(){
            let data = {"regex": this.regex, "apply": this.finalize, "attack": this.selected};
            regexOutput.tasks = [];
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/mitreattack/regex", submit_regex_callback, "POST", data);
            this.finalize = false;
        }
    },
    delimiters: ['[[',']]']
});
function submit_regex_callback(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === 'success'){
            if('matches' in data){
                for(let i = 0; i < data['matches'].length; i++){
                    data['matches'][i]['href'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + data['matches'][i]['id'];
                    data['matches'][i]['attack'] = data['matches'][i]['attack'].sort((a,b) =>(b.t_num > a.t_num) ? -1 : ((a.t_num > b.t_num) ? 1 : 0));
                }
                regexOutput.tasks = data['matches'];
            }else{
                regexOutput.tasks = [];
                alertTop("success", "Successfully updated matches", 1);
            }
        }else{
            alertTop("warning", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
var regexOutput = new Vue({
    el: '#regexOutput',
    data: {
        tasks: []
    },
    delimiters: ['[[',']]']
});
/* eslint-disable no-unused-vars */
// this is called via Vue from the HTML code
function output_to_navigator(){
    let nav_list = []
    for(const [key, value] of Object.entries(attack_matrix.matrix)){
        //Key will be the tactic, and each one has a list of techniques (all same length)
        for(let i = 0; i < value.length; i++){
            if(Object.keys(value[i]['mappings']).length > 0){
                nav_list.push({"techniqueID": value[i].t_num,
                                "tactic": key,
                                "color": "#fc3b3b",
                                "comment": "",
                                "enabled": true,
                                "metadata": []});
            }
        }
    }
    navigator_base['techniques'] = nav_list;
    let wnd = window.open("about:blank", "", "_blank");
    wnd.document.write('<html><body><pre>' + JSON.stringify(navigator_base, null, 2) + '</pre></body></html>');
    wnd.focus();
    navigator_base['techniques'] = [];
}
/* eslint-enable no-unused-vars */
