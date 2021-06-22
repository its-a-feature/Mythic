document.title = "Active Callbacks";
/* eslint-disable no-unused-vars */
// this is called from within browser_scripts functions, not directly
var support_scripts = {};
/* eslint-enable no-unused-vars */
var browser_scripts = {}
try {
    eval(atob(" {{support_scripts}} "));
} catch (error) {
    alertTop("danger", "Support Scripting error: " + error.toString());
}
try {
    eval(atob(" {{browser_scripts}} "));
} catch (error) {
    alertTop("danger", "Browser Scripting error: " + error.toString());
}
var callbacks = {}; //all callback data
var tasks = []; //current tasks we're displaying
var all_tasks = {}; //dictionary of arrays of tasks (for each callback's tasks)
var meta = {
    "proxies": [],
    "file_browser": {}
}; //dictionary of dictionary of metadata
var finished_callbacks = false;
var ptype_cmd_params = {}; //where we keep track of payload type -> command -> command_parameter mappings for what has called in
var websockets = {};  // current open websocket dictionary
var callback_table = new Vue({
    el: '#callback_table',
    data: {
        callbacks,
        filter: "",
        sort: "id",
        size: 25,
        direction: -1,
        selected_node: undefined,
        view_selection: "table view",
        view_options: ["table view", "graph view", "tree view"],
        high_integrity_color: "red",
        disconnected_color: "orange",
        children_color: "#32DFEC",
        started_filebrowser_websocket: false,
        graph_view_pieces: {
            simulation: undefined,
            node: undefined,
            link: undefined,
            edgelabel: undefined,
            edgepath: undefined,
            gDraw: undefined,
            selected_label_watcher: undefined,
            selected_node_labels: ['user', 'host'],
            node_labels: ['user', 'host', 'pid', 'id', 'os', 'ip', 'external_ip', 'integrity_level', 'description'],
            json_data: {"links": [], "nodes": []}
        },
        tree_view_pieces: {
            selected_label_watcher: undefined,
            selected_node_labels: ['user', 'host'],
            gDraw: undefined,
            node_labels: ['user', 'host', 'pid', 'id', 'os', 'ip', 'external_ip', 'integrity_level', 'description'],
            json_data: [],
            elements: [], // has all the nodes
            edges: [], // all of the raw edges
        }
    },
    methods: {
        adjust_pane_sizes: function(){
            $('#editPanesTop').val(this.size);
            $('#editPanesBottom').val(task_data.size);
            $('#editPanesModal').modal('show');
            $('#editPanesSubmit').unbind('click').click(function () {
                callback_table.size = $('#editPanesTop').val();
                task_data.size = $('#editPanesBottom').val();
                if (callback_table.view_selection === "graph view") {
                    $('#rect').css('height', 'calc(' + callback_table.size + 'vh)');
                    $('#d3_selectable_force_directed_graph').css('height', 'calc(' + callback_table.size + 'vh)');
                    let parentWidth = d3.select('svg').node().parentNode.clientWidth;
                    let parentHeight = d3.select('svg').node().parentNode.clientHeight;
                    let svg = d3.select('svg').attr('width', parentWidth).attr('height', parentHeight);
                    callback_table.graph_node_update();
                }
                if (callback_table.view_selection === "tree view") {
                    $('#rect').css('height', 'calc(' + callback_table.size + 'vh)');
                    $('#d3_selectable_force_directed_graph').css('height', 'calc(' + callback_table.size + 'vh)');
                    let parentWidth = d3.select('svg').node().parentNode.clientWidth;
                    let parentHeight = d3.select('svg').node().parentNode.clientHeight;
                    let svg = d3.select('svg').attr('width', parentWidth).attr('height', parentHeight);
                    callback_table.tree_node_update();
                }
            });
        },
        deselect_all_but_callback: function (callback) {
            Object.keys(task_data.meta).forEach(function (key) {
                if (key !== "file_browser") {
                    Vue.set(task_data.meta[key], 'console_selected', false);
                    Vue.set(task_data.meta[key], 'screencaptures_selected', false);
                    Vue.set(task_data.meta[key], 'keylogs_selected', false);
                    Vue.set(task_data.meta[key], 'process_list_selected', false);
                    Vue.set(task_data.meta[key], 'file_browser_selected', false);
                }
            });
            Object.keys(this.callbacks).forEach(function (key) {
                Vue.set(callbacks[key], 'selected', false);
            });
            //Vue.set(task_data.meta[callback.id], 'selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);

            task_data.input_field_placeholder['data'] = callback.user + "@" + callback.host + "(Callback:" + callback.id + ")";
            task_data.input_field_placeholder['cid'] = callback.id;
        },
        interact_button: function (callback) {
            try {
                if (callback.id in websockets) {
                    websockets[callback.id].close();
                    delete websockets[callback.id];
                }
                websockets[callback.id] = startwebsocket_callback(callback.id);
            } catch (error) {
                console.log(error);
                alertTop("danger", "Network connections not established yet, please click \"Interact\" again", 2);
                return;
            }
            //make sure we save that this tab was selected for later
            if (!(callback.id in task_data.meta)) {
                return;
            }
            add_to_storage("tasks", callback.id);
            //get the data from teh background process (all_tasks) into the bottom tab that's being loaded (task_data.meta)
            Vue.set(task_data.meta[callback.id], 'data', all_tasks[callback.id]);
            this.deselect_all_but_callback(callback);
            Vue.set(task_data.meta[callback.id], 'tasks', true);
            Vue.set(task_data.meta[callback.id], 'console_selected', true);
            task_data.callback_tokens = meta[callback.id].tokens;
            if(task_data.callback_tokens.length > 0){
                task_data.selected_token = task_data.callback_tokens[0]["token"]["TokenId"];
            }else{task_data.selected_token = undefined;}

            task_data.meta[callback.id]['display'] = callback.user + "@" + callback.host + "(Callback: " + callback.id + ")";
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#tasks' + callback.id.toString() + 'tab').click();
                $('#commandline').focus();

            }, 0);
            //set the autocomplete for the input field
            autocomplete(document.getElementById("commandline"), meta[callback.id]['commands']);
            meta[callback.id]['badges'] = 0;
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'] + "/all_tasking", get_all_tasking_callback, "GET", null);
        },
        edit_description: function (callback) {
            $('#editDescriptionText').val(callback.description);
            $('#editDescriptionModal').modal('show');
            $('#editDescriptionModal').on('shown.bs.modal', function () {
                $('#editDescriptionText').focus();
                $("#editDescriptionText").unbind('keydown').on('keydown', function (e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
                        $('#editDescriptionSubmit').click();
                    }
                });
            });
            $('#editDescriptionSubmit').unbind('click').click(function () {
                let newDescription = $('#editDescriptionText').val();
                if (newDescription !== callback.description) {
                    //only bother sending the update request if the description is actually different
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'], edit_description_callback, "PUT", {"description": newDescription});
                }
            });
        },
        exit_callback: function (callback) {
            //task the callback to exit on the host
            let tasked = false;
            for (let i = 0; i < task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']].length; i++) {
                if (task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']][i]["supported_ui_features"].includes("callback_table:exit") && !tasked){
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + callback['id'], null, "POST", {
                        "command": task_data.ptype_cmd_params[callbacks[callback.id]['payload_type']][i].cmd,
                        "params": ""
                    });
                    tasked = true;
                }
            }
            if(!tasked){
                alertTop("warning", "Failed to find a command that supports 'callback_table:exit'");
            }
        },
        remove_callback: function (callback) {
            if (meta[callback.id] === undefined) {
                stop_getting_callback_updates(callback.id, true);
                return
            }
            //if(meta[callback.id]['selected']){
            //    move('left', true);
            //}
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'], null, "PUT", {"active": false});
            stop_getting_callback_updates(callback.id, true);
        },
        show_screencaptures: function (callback) {
            Vue.set(meta[callback.id], 'screencaptures', true);
            this.deselect_all_but_callback(callback);
            add_to_storage("screencaptures", callback.id);
            Vue.set(task_data.meta[callback.id], 'screencaptures_selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/bycallback/" + callback['id'], view_callback_screenshots, "GET");
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#screencaptures' + callback.id.toString() + 'tab').click();
                $('#commandline').focus();
            }, 0);
        },
        show_keylogs: function (callback) {
            Vue.set(meta[callback.id], 'keylogs', true);
            add_to_storage("keylogs", callback.id);
            this.deselect_all_but_callback(callback);
            Vue.set(task_data.meta[callback.id], 'keylogs_selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/keylogs/callback/" + callback['id'], view_callback_keylogs, "GET");
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#keylogs' + callback.id.toString() + 'tab').click();
                $('#commandline').focus();
            }, 0);
        },
        show_file_browser: function (callback) {
            if( !this.started_filebrowser_websocket){
                startwebsocket_filebrowser();
                alertTop("info", "Started streaming file browser data...");
                this.started_filebrowser_websocket = true;
            }
            Vue.set(meta[callback.id], 'file_browser', true);
            this.deselect_all_but_callback(callback);
            Vue.set(meta[callback.id], 'file_browser_selected', true);
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#file_browser' + callback.id.toString() + 'tab').click();
                task_data.host = callback.host;
                task_data.callback = callback.id;
                task_data.path = ".";
                $('#commandline').focus();
            }, 0);
        },
        show_proxies: function (callback) {
            Vue.set(meta[callback.id], 'proxies', true);
            this.deselect_all_but_callback(callback);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/proxies/", (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        for (let i = 0; i < data['proxies'].length; i++) {
                            if (!Object.prototype.hasOwnProperty.call(callback_table.callbacks, data['proxies'][i]['id'])) {
                                Vue.set(callback_table.callbacks, data['proxies'][i]['id'], data['proxies'][i]);
                            }
                        }
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "GET");
            Vue.set(task_data.meta[callback.id], 'proxies_selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#proxies' + callback.id.toString() + 'tab').click();
                $('#commandline').focus();
            }, 0);
        },
        show_process_list: function (callback) {
            Vue.set(meta[callback.id], 'process_list', true);
            Vue.set(meta[callback.id], 'host', callback.host);
            add_to_storage("process_list", callback.id);
            this.deselect_all_but_callback(callback);
            Vue.set(task_data.meta[callback.id], 'process_list_selected', true);
            Vue.set(callback_table.callbacks[callback['id']], 'selected', true);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/process_list/", function (response) {
                try {
                    //console.log(response);
                    let data = JSON.parse(response);
                    if (data['status'] === "success" && Object.keys(data['process_list']).length !== 0) {
                        Vue.set(meta[callback.id], 'process_list_data', data['process_list']);
                        Vue.set(meta[callback.id], 'process_list_tree', data['tree_list']);
                    } else if (data['status'] === "error") {
                        alertTop("danger", data['error']);
                    } else {
                        Vue.set(meta[callback.id], 'process_list_data', {
                            "callback": callback.id,
                            "host": callback.host,
                            "process_list": [],
                            "task": "",
                            "timestamp": ""
                        });
                        Vue.set(meta[callback.id], 'process_list_tree', {});
                    }
                    startwebsocket_processlist(callback.id);
                    task_data.$forceUpdate();
                    $('#commandline').focus();
                } catch (error) {
                    //console.log(error);
                    alertTop("danger", "session expired, refresh please");
                }
            }, "POST", {"host": callback.host});
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                $('#process_list' + callback.id.toString() + 'tab').click();
            }, 0);
        },
        check_all_callbacks: function () {
            for (let i in this.callbacks) {
                this.callbacks[i]['selected'] = $('#all_callback_checkbox').is(":checked");
            }
        },
        split_callback: function (callback) {
            window.open("{{http}}://{{links.server_ip}}:{{links.server_port}}/split_callbacks/" + callback.id, '_blank').focus();
        },
        toggle_lock: function (callback) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'], toggle_lock_callback, "PUT", {"locked": !callback.locked});
        },
        apply_filter: function (callback) {
            if (this.filter.includes(":")) {
                let pieces = this.filter.split(":");
                if (pieces[0] in callback) {
                    if (callback[pieces[0]] === null) {
                        return false
                    }
                    return callback[pieces[0]].toString().includes(pieces[1]);
                }
            }
            return callback.active;
        },
        sort_callbacks: function (column) {
            //if column == current sort, reverse direction
            if (column === this.sort) {
                this.direction = this.direction * -1;
            }
            this.sort = column;
        },
        hide_selected: function () {
            let selected_list = [];
            for (let i in this.callbacks) {
                if (this.callbacks[i]['selected']) {
                    selected_list.push(this.callbacks[i]['id']);
                }
            }
            group_modify.callbacks = selected_list;
            $('#group_modify').modal('show');
            $('#group_modify_submit').unbind('click').click(function () {
                for (let i in selected_list) {
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + selected_list[i], null, "PUT", {"active": false});
                    stop_getting_callback_updates(selected_list[i], true);
                }
                group_modify.callbacks = [];
            });
        },
        exit_selected: function () {
            let selected_list = [];
            for (let i in this.callbacks) {
                if (this.callbacks[i]['selected']) {
                    selected_list.push(this.callbacks[i]['id']);
                }
            }
            group_modify.callbacks = selected_list;
            $('#group_modify').modal('show');
            $('#group_modify_submit').unbind('click').click(function () {
                for (let i in selected_list) {
                    let tasked = false;
                    for (let j = 0; j < task_data.ptype_cmd_params[callbacks[selected_list[i]]['payload_type']].length; j++) {
                        if(task_data.ptype_cmd_params[callbacks[selected_list[i]]['payload_type']][j]["supported_ui_features"].includes("callback_table:exit") && !tasked){
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + selected_list[i], null, "POST", {
                                "command": task_data.ptype_cmd_params[callbacks[selected_list[i]]['payload_type']][j].cmd,
                                "params": ""
                            });
                        }
                    }
                }
                group_modify.callbacks = [];
            });
        },
        display_callback_info: function (callback) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + callback['id'], view_callback_info, "GET");
        },
        graph_node_update: function () {
            // pulled a lot from http://bl.ocks.org/fancellu/2c782394602a93921faff74e594d1bb1
            let defs = d3.select('svg').append('svg:defs');
            //let parentWidth = d3.select('svg').node().parentNode.clientWidth;
            //let parentHeight = d3.select('svg').node().parentNode.clientHeight;
            //let svg = d3.select('svg').attr('width', parentWidth).attr('height', parentHeight);

            function contextMenu() {
                let height = 13,
                    width = 76,
                    margin = 2, // fraction of width
                    items = [],
                    style = {
                        'rect': {
                            'mouseout': {
                                'fill': 'rgb(244,244,244)'
                            },
                            'mouseover': {
                                'fill': 'steelblue'
                            }
                        },
                        'text': {
                            'fill': 'steelblue',
                            'font-size': '13'
                        }
                    };

                function menu(x, y, l) {
                    callback_table.graph_view_pieces.gDraw.select('.context-menu').remove();
                    // Draw the menu
                    callback_table.graph_view_pieces.gDraw
                        .append('g').attr('class', 'context-menu')
                        .selectAll('tmp')
                        .data(items).enter()
                        .append('g').attr('class', 'menu-entry')
                        .attr('cursor', 'pointer')
                        .on('mouseover', function () {
                            d3.select(this).style('fill', style.rect.mouseover.fill);
                        })
                        .on('mouseout', function () {
                            d3.select(this)
                                .style('fill', style.rect.mouseout.fill);
                        })
                        .on('click', function () {
                            if (l['id'] <= 0) {
                                return
                            }
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/edges/" + l['id'],
                                (response) => {
                                    try {
                                        let data = JSON.parse(response);
                                        if (data['status'] === 'error') {
                                            alertTop("danger", data['error']);
                                        }
                                    } catch (error) {
                                        alertTop("danger", "Session expired, please refresh");
                                    }
                                }, "DELETE", null);
                            callback_table.graph_view_pieces.gDraw.select('.context-menu').remove();
                        });

                    callback_table.graph_view_pieces.gDraw.selectAll('.menu-entry')
                        .append('rect')
                        .attr('x', x)
                        .attr('y', function (d, i) {
                            return y + (i * height);
                        })
                        .attr('width', width)
                        .attr('height', height)
                        .style('fill', style.rect.mouseout.fill);

                    callback_table.graph_view_pieces.gDraw.selectAll('.menu-entry')
                        .append('text')
                        .text(function (d) {
                            return d;
                        })
                        .attr('x', x)
                        .attr('y', function (d, i) {
                            return y + (i * height);
                        })
                        .attr('dy', height - margin / 2)
                        .attr('dx', margin)
                        .style('fill', style.text.fill)
                        .style('font-size', style.text['font-size']);
                }

                menu.items = function () {
                    if (!arguments.length) return items;
                    for (let i in arguments) items.push(arguments[i]);
                    return menu;
                }
                return menu;
            }

            let menu = contextMenu().items('Remove Link');
            this.graph_view_pieces.json_data.nodes.forEach(function (d) {
                if (document.getElementById("avatar" + d.payload_type) === null) {
                    defs.append("svg:pattern")
                        .attr("id", "avatar" + d.payload_type)
                        //.attr("patternUnits", "objectBoundingBox")
                        .attr("viewBox", "0 0 100 100")
                        .attr("width", "100%")
                        .attr("height", "100%")
                        .append("svg:image")
                        .attr("width", "100px")
                        .attr("height", "100px")
                        .attr("xlink:href", function () {
                            return "/static/" + d.payload_type + ".svg";
                        });
                }
            });
            // be sure to remove links that try to link to nodes no longer there
            this.graph_view_pieces.link = this.graph_view_pieces.gDraw.selectAll(".link")
                .data(this.graph_view_pieces.json_data.links, function (d) {
                    return 'link' + d.id
                });
            this.graph_view_pieces.link.exit().remove();
            this.graph_view_pieces.link = this.graph_view_pieces.link
                .enter().append("line")
                .attr("class", "link")
                .attr('marker-end', 'url(#arrowhead)')
                .attr("stroke-width", function () {
                    return 2.5;
                })
                .style("stroke", function (d) {
                    //console.log(d.source);
                    //console.log(d.destination);
                    if (d.source.integrity_level === -1 || d.destination.integrity_level === -1) {
                        return callback_table.disconnected_color;
                    } else if (d.source.integrity_level > 2) {
                        return callback_table.high_integrity_color;
                    } else {
                        return "{{config['text-color']}}";
                    }
                }).lower()
                .on("contextmenu", function (d) {
                    //handle right click
                    d3.event.preventDefault();
                    menu(d3.mouse(this)[0], d3.mouse(this)[1], d);
                })
                .merge(this.graph_view_pieces.link);
            this.graph_view_pieces.edgepath = this.graph_view_pieces.gDraw.selectAll(".edgepath")
                .data(this.graph_view_pieces.json_data.links, function (d) {
                    return 'edgepath' + d.id;
                });
            this.graph_view_pieces.edgepath.exit().remove();
            this.graph_view_pieces.edgepath.selectAll("path").remove();
            this.graph_view_pieces.edgepath = this.graph_view_pieces.edgepath
                .enter()
                .append('path')
                .attr("class", "edgepath")
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0)
                .attr("id", function (d) {
                    return 'edgepath' + d.id
                })
                .style("pointer-events", "none")
                .merge(this.graph_view_pieces.edgepath);
            this.graph_view_pieces.edgelabel = this.graph_view_pieces.gDraw.selectAll(".edgelabel")
                .data(this.graph_view_pieces.json_data.links, function (d) {
                    return 'edgelabel' + d.id;
                });
            this.graph_view_pieces.edgelabel.exit().remove();
            this.graph_view_pieces.edgelabel.selectAll("text").remove();
            this.graph_view_pieces.edgelabel.selectAll("textPath").remove();
            this.graph_view_pieces.edgelabel = this.graph_view_pieces.edgelabel
                .enter()
                .append('text')
                .style("pointer-events", "none")
                .attr("class", "edgelabel")
                .attr("id", function (d) {
                    return 'edgelabel' + d.id
                })
                .attr("font-size", 15)
                .attr("dy", "1rem")
                .attr("fill", "{{config['text-color']}}")
                .merge(this.graph_view_pieces.edgelabel);

            this.graph_view_pieces.edgelabel.append('textPath')
                .attr('xlink:href', function (d) {
                    return '#edgepath' + d.id
                })
                .style("text-anchor", "middle")
                .style("pointer-events", "none")
                .attr("startOffset", "50%")
                .text(function (d) {
                    return d.c2_profile;
                });
            this.graph_view_pieces.node = this.graph_view_pieces.gDraw.selectAll(".node")
                .data(this.graph_view_pieces.json_data.nodes, function (d) {
                    return 'node' + d.id;
                });
            this.graph_view_pieces.node.exit().remove(); // remove old ones
            this.graph_view_pieces.node.selectAll('node').remove();
            this.graph_view_pieces.node = this.graph_view_pieces.node.enter().append("g")
                .attr("class", "node")
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged))
                .on("click", function (d) {
                    // this is what happens when you click a node
                    callback_table.selected_node = d;
                    if (d.id > 0) {
                        callback_table.interact_button(d);
                    }
                })
                .on("dblclick", dragended).merge(this.graph_view_pieces.node);
            this.graph_view_pieces.node.selectAll("text").remove();
            this.graph_view_pieces.node.selectAll("circle").remove();
            this.graph_view_pieces.node.append("circle").attr("class", "circle").style("fill", "{{ config['background-color'] }}").style("r", 20);
            this.graph_view_pieces.node.append("circle")
                .attr("class", "circle")
                .style("fill", function (d) {
                    return "url(#avatar" + d.payload_type + ")";
                })
                .attr("r", 20)
                .style("stroke", function (d) {
                    if (d.integrity_level === -1 || d.integrity_level === undefined) {
                        return callback_table.disconnected_color;
                    } else if (d.integrity_level === 0) {
                        return "darkblue";
                    } else if (d.integrity_level < 3) {
                        return "{{config['text-color']}}";
                    } else {
                        return callback_table.high_integrity_color;
                    }
                }).style("stroke-width", "3px");
            this.graph_view_pieces.node.append("text")
                .attr("dx", -30)
                .attr("dy", "3em")
                .style("text-anchor", "middle")
                .style("fill", "{{config['text-color']}}")
                .attr("startOffset", "50%")
                .text(function (d) {
                    if (d.id > 0) {
                        return callback_table.graph_view_pieces.selected_node_labels.map(function (x) {
                            return d[x];
                        }).join(", ");
                    } else {
                        return d.description;
                    }

                });
            this.graph_view_pieces.simulation.nodes(this.graph_view_pieces.json_data.nodes);
            this.graph_view_pieces.simulation.force("link").links(this.graph_view_pieces.json_data.links);
            //this.graph_view_pieces.simulation.alpha(1).restart();
        },
        tree_node_update: function () {
            // use edges and elements to make the tree data
            let parentWidth = d3.select('svg').node().parentNode.clientWidth;
            let parentHeight = d3.select('svg').node().parentNode.clientHeight;
            let svg = d3.select('svg').attr('width', parentWidth).attr('height', parentHeight);
            d3.select('rect').attr('width', parentWidth).attr('height', parentHeight);
            this.tree_view_pieces.json_data = [{
                id: 0,
                user: "Mythic",
                host: "Mythic",
                ip: "{{links.server_ip}}",
                os: "Ubuntu Docker",
                integrity_level: 0,
                payload_type: "mythic",
                pid: 0,
                description: "Symbolic entry for the Mythic Server"
            }];
            for (let i = 0; i < this.tree_view_pieces.edges.length; i++) {
                // add all edges to the tree
                if (this.tree_view_pieces.edges[i]['direction'] === 1) {
                    if (typeof (this.tree_view_pieces.edges[i]['destination']['id']) === 'string' ||
                        this.tree_view_pieces.edges[i]['destination']['id'] === 0) {
                        this.tree_view_pieces.json_data.push(
                            Object.assign({},
                                this.tree_view_pieces.edges[i]['source'],
                                {
                                    "parent": this.tree_view_pieces.edges[i]['destination']['id'],
                                    "id": this.tree_view_pieces.edges[i]['source']['id']
                                }
                            ));
                    } else {
                        this.tree_view_pieces.json_data.push(
                            Object.assign({},
                                this.tree_view_pieces.edges[i]['destination'],
                                {
                                    "parent": this.tree_view_pieces.edges[i]['source']['id'],
                                    "id": this.tree_view_pieces.edges[i]['destination']['id']
                                }
                            ));
                    }
                } else if (this.tree_view_pieces.edges[i]['direction'] === 2) {
                    if (!this.tree_view_pieces.edges[i]['source']['active']) {
                        this.tree_view_pieces.edges[i]['source'] = {
                            id: this.tree_view_pieces.edges[i]['source']['id'],
                            user: "removed",
                            integrity_level: -1,
                            host: "removed",
                            payload_type: "undefined",
                            active: true,
                            description: "User removed from callbacks"
                        };
                    }
                    //console.log("adding dir2 object");
                    this.tree_view_pieces.json_data.push(
                        Object.assign({},
                            this.tree_view_pieces.edges[i]['destination'],
                            {
                                "parent": this.tree_view_pieces.edges[i]['source']['id'],
                                "id": this.tree_view_pieces.edges[i]['destination']['id']
                            }
                        ));
                }
            }
            let added_no_route = false;
            for (let i = 0; i < this.tree_view_pieces.elements.length; i++) {
                //for each element,make sure it has  an entry in .json_data where .json_data id == element id
                //if one doesn't exist, we need to fix it
                let found = false;
                for (let j = 0; j < this.tree_view_pieces.json_data.length; j++) {
                    if (this.tree_view_pieces.elements[i]['id'] === this.tree_view_pieces.json_data[j]['id']) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    if (!added_no_route) {
                        added_no_route = true;
                        this.tree_view_pieces.json_data.push(
                            {
                                id: "c0",
                                user: "No Route Exists",
                                host: "No Route Exists",
                                ip: "{{links.server_ip}}",
                                os: "No Route Exists",
                                integrity_level: 0,
                                payload_type: "mythic",
                                pid: 0,
                                parent: 0,
                                description: "Agents that have no route back to Mythic"
                            }
                        );

                    }
                    console.log("failed to find the following:");
                    console.log(this.tree_view_pieces.elements[i]);
                    this.tree_view_pieces.json_data.push(
                        Object.assign({},
                            this.tree_view_pieces.elements[i],
                            {"parent": "c0"}
                        ));
                }
            }
            let defs = svg.append('svg:defs');
            this.tree_view_pieces.elements.forEach(function (d) {
                if (document.getElementById("avatar" + d.payload_type) === null) {
                    defs.append("svg:pattern")
                        .attr("id", "avatar" + d.payload_type)
                        //.attr("patternUnits", "objectBoundingBox")
                        .attr("viewBox", "0 0 100 100")
                        .attr("width", "100%")
                        .attr("height", "100%")
                        .append("svg:image")
                        .attr("width", "100px")
                        .attr("height", "100px")
                        .attr("xlink:href", function () {
                            return "/static/" + d.payload_type + ".svg";
                        });
                }
            });

            let root = d3.stratify()
                .id(function (d) {
                    return d.id;
                })
                .parentId(function (d) {
                    return d.parent;
                })(this.tree_view_pieces.json_data);
            callback_table.tree_view_pieces.gDraw.select("#links").selectAll(".link").remove();
            callback_table.tree_view_pieces.gDraw.select("#nodes").selectAll(".node").remove();
            callback_table.tree_view_pieces.gDraw.selectAll("circle").remove();
            d3.tree().nodeSize([50, 50])(root);
            update_collapse(root);

            function update_collapse(source) {
                let duration = 750;
                let nodes = root.descendants(),
                    links = root.descendants().slice(1);
                nodes.forEach(function (d) {
                    d.y = d.depth * 180
                });
                let link = callback_table.tree_view_pieces.gDraw.select("#links").selectAll(".link")
                    .data(links, function (d) {
                        return d.id
                    })
                    .style('stroke-width', function (d) {
                        if (d.children) {
                            return d3.max(d.children, function (x) {
                                return 1 + (0.1 * x.depth);
                            });
                        } else if (d._children) {
                            return d3.max(d._children, function (x) {
                                return 1 + (0.1 * x.depth);
                            });
                        } else {
                            return 1;
                        }
                        //return widthScale(d.data.host.length)
                    });
                let linkEnter = link.enter().append("path")
                    .attr("class", "link")
                    .attr("d", function () {
                        let x = source.x0 === undefined ? 0 : source.x0;
                        let y = source.y0 === undefined ? 0 : source.y0;
                        let o = {x: x, y: y};
                        return diagonal(o, o)
                    }).style('stroke-width', function (d) {
                        if (d.children) {
                            return d3.max(d.children, function (x) {
                                return 1 + (0.1 * x.depth);
                            });
                        } else if (d._children) {
                            return d3.max(d._children, function (x) {
                                return 1 + (0.1 * x.depth);
                            });
                        } else {
                            return 1;
                        }
                        //return widthScale(d.data.host.length)
                    }).attr("stroke", function (d) {
                        if (d.data.integrity_level === -1 || !d.data.active || d.data.integrity_level === undefined) {
                            return callback_table.disconnected_color;
                        } else if (d.data.integrity_level < 3) {
                            return "{{config['text-color']}}";
                        } else {
                            return callback_table.high_integrity_color;
                        }
                    }).attr("fill", "transparent");
                let linkUpdate = linkEnter.merge(link);
                linkUpdate.transition()
                    .duration(duration)
                    .attr('d', function (d) {
                        return diagonal(d, d.parent)
                    });
                link.exit().transition()
                    .duration(duration)
                    .attr('d', function () {
                        let x = source.x === undefined ? 0 : source.x;
                        let y = source.y === undefined ? 0 : source.y;
                        let o = {x: x, y: y};
                        return diagonal(o, o)
                    })
                    .style('stroke-width', function (d) {
                        if (d.children) {
                            return d3.max(d.children, function (x) {
                                return 1 + (0.1 * x.depth);
                            });
                        } else if (d._children) {
                            return d3.max(d._children, function (x) {
                                return 1 + (0.1 + x.depth);
                            });
                        } else {
                            return 1;
                        }
                        //return widthScale(d.data.host.length)
                    })
                    .remove();
                let node = callback_table.tree_view_pieces.gDraw.select("#nodes").selectAll(".node")
                    .data(nodes, function (d) {
                        return d.id
                    });
                let nodeEnter = node.enter().append('g')
                    .attr('class', 'node')
                    .attr("transform", function () {
                        return "translate(" +
                            (source.y0 === undefined ? 0 : source.y0) +
                            "," +
                            (source.x0 === undefined ? 0 : source.x0) +
                            ")";
                    })
                    .on("click", function (d) {
                        // this is what happens when you click a node
                        callback_table.selected_node = d.data;
                        if (callback_table.selected_node.id in callback_table.callbacks) {
                            callback_table.selected_node = callback_table.callbacks[callback_table.selected_node.id];
                        }
                        if (d.data.active && d.data.id > 0) {
                            callback_table.interact_button(d.data);
                        }
                    })
                    .on("contextmenu", function (d) {
                        d3.event.preventDefault();
                        click_collapse(d);
                    });
                nodeEnter.append("circle").attr("class", "circle").style("fill", "{{ config['background-color'] }}").style("r", 20);
                nodeEnter.append("circle")
                    .attr("r", 20)
                    .attr("stroke-width", "3px")
                    .style("fill", function (d) {
                        return "url(#avatar" + d.data.payload_type + ")"
                    })
                    .attr("stroke", function (d) {
                        if (d.data.integrity_level === -1 || d.data.integrity_level === undefined) {
                            return callback_table.disconnected_color;
                        } else if (d.data.integrity_level === 0) {
                            return "darkblue";
                        } else if (d.data.integrity_level < 3) {
                            return "{{config['text-color']}}";
                        } else {
                            return callback_table.high_integrity_color;
                        }
                    })
                    .style("filter", function (d) {
                        if (d.children || d._children) {
                            return "url(#children)";
                        } else {
                            return "";
                        }
                    });
                nodeEnter.append("text")
                    .attr("dx", function () {
                        return 25;
                    })
                    .attr("dy", "1.2em")
                    .style("fill", "{{config['text-color']}}")
                    .style("text-anchor", function () {
                            return "start"
                        }
                    )
                    .text(function (d) {
                        if (d.data.id > 0) {
                            return callback_table.tree_view_pieces.selected_node_labels.map(function (x) {
                                return d.data[x];
                            }).join(", ");
                        } else {
                            return d.data['user'];
                        }
                    });
                let nodeUpdate = nodeEnter.merge(node);

                nodeUpdate.transition()
                    .duration(duration)
                    .attr("transform", function (d) {
                        return "translate(" +
                            d.y + "," + d.x + ")";
                    });
                nodeUpdate.select('circle')
                    .attr('cursor', 'pointer');
                let nodeExit = node.exit().transition()
                    .duration(duration)
                    .attr("transform", function () {
                        return "translate(" + source.y + "," + source.x + ")";
                    })
                    .remove();
                nodeExit.select('circle')
                    .attr('r', 1e-6);
                nodeExit.select('text')
                    .style('fill-opacity', 1e-6);

                // nodes.forEach(function(d){ d.y = d.depth * 180});
                // Toggle children on click.
                function click_collapse(d) {
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
                    }
                    update_collapse(d);
                }

                nodes.forEach(function (d) {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });

                function diagonal(s, d) {
                    let path = `M ${s.y} ${s.x}
                            C ${(s.y + d.y) / 2} ${s.x},
                              ${(s.y + d.y) / 2} ${d.x},
                              ${d.y} ${d.x}`;

                    return path
                }
            }
        }
    },
    computed: {
        sorted_callbacks: function () {
            return Object.values(this.callbacks).sort((a, b) => {
                let modifier = this.direction;
                if (a[this.sort] < b[this.sort]) {
                    return -1 * modifier;
                } else if (a[this.sort] > b[this.sort]) {
                    return 1 * modifier;
                } else {
                    return 0;
                }
            });
        },
        multiple_selected: function () {
            let multiple_selected = 0;
            for (let i in this.callbacks) {
                if (this.callbacks[i]['selected']) {
                    multiple_selected++;
                }
            }
            return multiple_selected > 1;
        },
    },
    watch: {
        view_selection: {
            handler(imp) {
                document.querySelectorAll('.g-main').forEach(e => e.remove());
                document.querySelectorAll('g').forEach(e => e.remove());
                document.querySelectorAll('defs').forEach(e => e.remove());
                //document.querySelectorAll('link').forEach(e => e.remove());
                if (this.graph_view_pieces.selected_label_watcher !== undefined) {
                    this.graph_view_pieces.selected_label_watcher();
                    this.graph_view_pieces.selected_label_watcher = undefined;
                }
                if (this.tree_view_pieces.selected_label_watcher !== undefined) {
                    this.tree_view_pieces.selected_label_watcher();
                    this.tree_view_pieces.selected_label_watcher = undefined;
                }
                if (this.graph_view_pieces.simulation !== undefined) {
                    this.graph_view_pieces.simulation.stop();
                    this.graph_view_pieces.simulation = undefined;
                }
                if (imp === 'table view') {
                    callback_table.size = 25;
                    task_data.size = 51;
                    //$('#callback_table').css('height', 'calc(30vh)');
                    //$('#bottom-tabs-content').css("height", "calc(51vh)");
                } else if (imp === "graph view") {
                    callback_table.size = 51;
                    task_data.size = 30;
                    //$('#callback_table').css('height', 'calc(51vh)');
                    //$('#rect').css('height', 'calc(45vh)');
                    //$('#d3_selectable_force_directed_graph').css('height', 'calc(45vh)');
                   // $('#bottom-tabs-content').css("height", "calc(30vh)");
                    this.graph_view_pieces.selected_label_watcher = this.$watch(['graph_view_pieces', 'selected_node_labels'].join('.'), () => {
                        this.graph_node_update();
                    });
                    setTimeout(() => { // setTimeout to put this into event queue
                        // executed after render
                        Vue.nextTick().then(function () {
                            let parentWidth = d3.select('svg').node().parentNode.clientWidth;
                            let parentHeight = d3.select('svg').node().parentNode.clientHeight;
                            let svg = d3.select('svg').attr('width', parentWidth).attr('height', parentHeight);
                            let gMain = svg.append('g').classed('g-main', true);
                            let rect = gMain.append('rect')
                                .attr('width', parentWidth)
                                .attr('height', parentHeight)
                                .style("fill", "{{config['background-color']}}")
                                .attr('id', "rect");
                            callback_table.graph_view_pieces.gDraw = gMain.append('g');
                            rect.on("click", function () {
                                callback_table.graph_view_pieces.gDraw.select('.context-menu').remove();
                            });
                            let zoom = d3.zoom().on('zoom', () => {
                                callback_table.graph_view_pieces.gDraw.attr('transform', d3.event.transform);
                            });
                            gMain.call(zoom);
                            svg.append('defs').append('marker')
                                .attr("id", "arrowhead")
                                .attr("viewBox", "-0 -5 10 10")
                                .attr("refX", 25)
                                .attr("refY", 0)
                                .attr("orient", "auto")
                                .attr("markerWidth", 10)
                                .attr("markerHeight", 5)
                                .attr("xoverflow", "visible")
                                .append('svg:path')
                                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                                .attr('fill', "{{config['text-color']}}")
                                .style('stroke', 'none');
                            callback_table.graph_view_pieces.link = callback_table.graph_view_pieces.gDraw.selectAll(".link");
                            callback_table.graph_view_pieces.edgepath = callback_table.graph_view_pieces.gDraw.selectAll(".edgepath");
                            callback_table.graph_view_pieces.edgelabel = callback_table.graph_view_pieces.gDraw.selectAll(".edgelabel");
                            callback_table.graph_view_pieces.node = callback_table.graph_view_pieces.gDraw.selectAll(".node");
                            callback_table.graph_view_pieces.simulation = d3.forceSimulation()
                                .force("link", d3.forceLink()
                                    .id(function (d) {
                                        return d.id;
                                    })
                                    .distance(function (d) {
                                        //return Math.max(d.metadata.length * 12, 100);
                                        //return 120;
                                        if (d.direction === 1) {
                                            let children = callback_table.graph_view_pieces.json_data.links.filter((x) => {
                                                if (typeof (d.target.id) === "string") {
                                                    return d.source.id === x.source.id;
                                                } else {
                                                    return d.target.id === x.source.id;
                                                }

                                            });
                                            return 110 * Math.max(children.length, 1);
                                        }
                                    }).strength(1)
                                )
                                .force("charge", d3.forceManyBody().strength(-400))
                                //.force("center", d3.forceCenter(parentWidth / 2, parentHeight / 2))
                                //.force("collision", d3.forceCollide().radius(function(d){
                                //    if(d.id === 1){return 60}
                                //    return 30;
                                //}))
                                .force("x", d3.forceX(parentWidth / 2).strength(0.05))
                                .force("y", d3.forceY(parentHeight / 2).strength(0.05));
                            callback_table.graph_view_pieces.simulation.nodes(callback_table.graph_view_pieces.json_data.nodes).on("tick", ticked);
                            callback_table.graph_view_pieces.simulation.force("link").links(callback_table.graph_view_pieces.json_data.links);

                            function ticked() {
                                // update node and line positions at every step of
                                // the force simulation
                                parentWidth = d3.select('svg').node().parentNode.clientWidth;
                                parentHeight = d3.select('svg').node().parentNode.clientHeight;
                                callback_table.graph_view_pieces.link
                                    .attr("x1", function (d) {
                                        //return Math.max(20, Math.min(parentWidth - 20, d.source.x));
                                        return d.source.x;
                                    })
                                    .attr("y1", function (d) {
                                        //return Math.max(20, Math.min(parentHeight - 20, d.source.y));
                                        return d.source.y;
                                    })
                                    .attr("x2", function (d) {
                                        //return Math.max(20, Math.min(parentWidth - 20, d.target.x));
                                        return d.target.x;
                                    })
                                    .attr("y2", function (d) {
                                        //return Math.max(20, Math.min(parentHeight - 20, d.target.y));
                                        return d.target.y;
                                    });
                                callback_table.graph_view_pieces.node
                                    .attr("transform", function (d) {
                                        return "translate(" +
                                            // Math.max(20, Math.min(parentWidth - 20, d.x)) + "," +
                                            // Math.max(20, Math.min(parentHeight - 20, d.y)) + ")";
                                            d.x + "," + d.y + ")";
                                    });
                                callback_table.graph_view_pieces.edgepath
                                    .attr('d', function (d) {
                                        return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
                                    });
                                callback_table.graph_view_pieces.edgelabel.attr('transform', function (d) {
                                    if (d.target.x < d.source.x) {
                                        let bbox = this.getBBox();
                                        let rx = bbox.x + bbox.width / 2;
                                        let ry = bbox.y + bbox.height / 2;
                                        return 'rotate(180 ' + rx + ' ' + ry + ')';
                                    } else {
                                        return 'rotate(0)';
                                    }
                                });
                                d3.select('svg').attr('width', parentWidth).attr('height', parentHeight);
                            }

                            callback_table.graph_view_pieces.simulation.alpha(1).restart();
                            callback_table.graph_node_update();
                        });
                    }, 0);
                } else if (imp === 'tree view') {
                    callback_table.size = 51;
                    task_data.size = 30;
                    //$('#callback_table').css('height', 'calc(51vh)');
                    //$('#rect').css('height', 'calc(45vh)');
                    //$('#d3_selectable_force_directed_graph').css('height', 'calc(45vh)');
                   // $('#bottom-tabs-content').css("height", "calc(30vh)");
                    this.tree_view_pieces.selected_label_watcher = this.$watch(['tree_view_pieces', 'selected_node_labels'].join('.'), () => {
                        this.tree_node_update();
                    });
                    setTimeout(() => { // setTimeout to put this into event queue
                        // executed after render
                        Vue.nextTick().then(function () {
                            let parentWidth = d3.select('svg').node().parentNode.clientWidth;
                            let parentHeight = d3.select('svg').node().parentNode.clientHeight;
                            let svg = d3.select('svg').attr('width', parentWidth).attr('height', parentHeight);
                            let gMain = svg.append('g').classed('g-main', true);
                            gMain.append('rect')
                                .attr('width', parentWidth)
                                .attr('height', parentHeight)
                                .style("fill", "{{config['background-color']}}");
                            gMain.append("g").attr("id", "links");
                            gMain.append("g").attr("id", "nodes");

                            let filter = svg.append("defs").append("filter").attr("id", "children");
                            filter.append("feMorphology").attr("in", "SourceAlpha").attr("result", "DILATED").attr("operator", "dilate").attr("radius", "2.5");
                            filter.append("feFlood").attr("flood-color", callback_table.children_color).attr("flood-opacity", "1").attr("result", "COLORED");
                            filter.append("feComposite").attr("in", "COLORED").attr("in2", "DILATED").attr("operator", "in").attr("result", "OUTLINE");
                            let merge = filter.append("feMerge");
                            merge.append("feMergeNode").attr("in", "OUTLINE");
                            merge.append("feMergeNode").attr("in", "SourceGraphic");
                            callback_table.tree_view_pieces.gDraw = gMain;
                            let zoom = d3.zoom().scaleExtent([0.1, 7]).on('zoom', () => {
                                callback_table.tree_view_pieces.gDraw.attr("transform", d3.event.transform);
                            });
                            svg.call(zoom);
                            callback_table.tree_node_update();
                        });
                    }, 0);
                }
            }
        },
    },
    delimiters: ['[[', ']]']
});

function dragstarted(d) {
    if (!d3.event.active) callback_table.graph_view_pieces.simulation.alphaTarget(0.9).restart();

    if (!d.selected) {
        // if this node isn't selected, then we have to unselect every other node
        callback_table.graph_view_pieces.node.classed("selected", function (p) {
            return p.selected = p.previouslySelected = false;
        });
    }

    d3.select(this).classed("selected", function () {
        d.previouslySelected = d.selected;
        return d.selected = true;
    });

    callback_table.graph_view_pieces.node.filter(function (n) {
        return n.selected;
    })
        .each(function (n) { //d.fixed |= 2;
            n.fx = n.x;
            n.fy = n.y;
        })

}

function dragged() {
    callback_table.graph_view_pieces.node.filter(function (d) {
        return d.selected;
    })
        .each(function (d) {
            d.fx += d3.event.dx;
            d.fy += d3.event.dy;
        })
}

function dragended(d) {
    d3.event.preventDefault();
    d3.event.stopPropagation();
    d.fx = null;
    d.fy = null;
}

function startwebsocket_callback_graphedges() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/graph_edges/current_operation');
    callback_table.tree_view_pieces.edges = [];
    //callback_table.graph_view_pieces.json_data['links'] = [];
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            //console.log(event.data);
            //console.log("got message from websocket");
            add_edge_for_graph_view(event);
            add_edge_for_tree_view(event);
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

function add_edge_for_graph_view(event) {
    let cb = JSON.parse(event.data);
    cb['tmp_src'] = JSON.parse(cb['source']);
    cb['source'] = cb['tmp_src']['id'];
    if(cb['tmp_src']['active'] === false && JSON.parse(cb['destination'])["active"] === false){
        return;
    }
    cb['target'] = JSON.parse(cb['destination'])['id'];

    if ("name" in cb) {
        //console.log("adding c2 node and edge");
        // add the c2 node
        let found_s = false;
        let found_d = false;
        for (let i = 0; i < callback_table.graph_view_pieces.json_data.nodes.length; i++) {
            if (callback_table.graph_view_pieces.json_data.nodes[i]['id'] === 0) {
                found_d = true;
            } else if (callback_table.graph_view_pieces.json_data.nodes[i]['id'] === cb['source']) {
                found_s = true;
            }
        }
        if (!found_d) {
            // we need to add the Mythic node
            callback_table.graph_view_pieces.json_data.nodes.push({
                id: 0,
                user: "Mythic",
                integrity_level: 0,
                payload_type: "mythic",
                host: "Mythic Docker",
                description: "Mythic server"
            });
        }
        if (!found_s) {
            callback_table.graph_view_pieces.json_data.nodes.push({
                id: cb['source'],
                user: cb['name'],
                integrity_level: 0,
                payload_type: "mythic",
                host: cb['name'],
                description: cb['name']
            });
        }
        callback_table.graph_view_pieces.json_data['links'].push(cb);
        return;
    }
    cb['value'] = 1;
    //if there's an edge for cb['source'] with destination of 0, remove that edge first
    let found_link = false;
    for (let i = 0; i < callback_table.graph_view_pieces.json_data['links'].length; i++) {
        if (callback_table.graph_view_pieces.json_data['links'][i]['id'] === cb['id']) {
            //this means we're updating a link
            found_link = true;
            if (cb['end_timestamp'] === null) {
                // update something else about the link
                //first check to see if the source and destination nodes exist:
                let found_s = false;
                let found_t = false;
                for (let j = 0; j < callback_table.graph_view_pieces.json_data.nodes.length; j++) {
                    if (cb['source'] === callback_table.graph_view_pieces.json_data.nodes[j]['id']) {
                        found_s = true;
                    }
                    if (cb['target'] === callback_table.graph_view_pieces.json_data.nodes[j]['id']) {
                        found_t = true;
                    }
                }
                if (!found_s) {
                    console.log("adding source");
                    callback_table.graph_view_pieces.json_data.nodes.push({
                        id: cb['source'],
                        user: "removed",
                        integrity_level: -1,
                        payload_type: "mythic",
                        host: "removed",
                        description: "User removed from callbacks"
                    });
                }
                if (!found_t) {
                    console.log("adding target");
                    callback_table.graph_view_pieces.json_data.nodes.push({
                        id: cb['target'],
                        user: "removed",
                        integrity_level: -1,
                        payload_type: "mythic",
                        host: "removed",
                        description: "User removed from callbacks",
                    });
                }
                callback_table.graph_view_pieces.json_data['links'][i] = cb;
            } else {
                // remove the link
                console.log("removing link");
                callback_table.graph_view_pieces.json_data['links'].splice(i, 1);
            }
            if (callback_table.view_selection === "graph view") {
                callback_table.graph_node_update();
            }
            return;
        }
    }
    // if we get here, we don't have the link currently in the graph, so add it
    if (!found_link) {
        let found_s = false;
        let found_d = false;
        for (let i = 0; i < callback_table.graph_view_pieces.json_data.nodes.length; i++) {
            if (callback_table.graph_view_pieces.json_data.nodes[i]['id'] === cb['target']) {
                found_d = true;
            } else if (callback_table.graph_view_pieces.json_data.nodes[i]['id'] === cb['source']) {
                found_s = true;
            }
        }
        if (!found_d) {
            // we need to add the Mythic node
            callback_table.graph_view_pieces.json_data.nodes.push(JSON.parse(cb['destination']));
        }
        if (!found_s) {
            callback_table.graph_view_pieces.json_data.nodes.push(cb['tmp_src']);
        }
    }
    if (cb['direction'] === 2) {
        let temp = cb['source'];
        cb['source'] = cb['target'];
        cb['target'] = temp;
    }
    callback_table.graph_view_pieces.json_data['links'].push(cb);
    if (callback_table.view_selection === "graph view") {
        callback_table.graph_node_update();
    }
}

function add_edge_for_tree_view(event) {
    let cb = JSON.parse(event.data);
    //console.log(cb);
    // tree edges need an id and parent
    cb['source'] = JSON.parse(cb['source']);
    cb['destination'] = JSON.parse(cb['destination']);
    //console.log(cb);
    let found_s = false;
    let found_t = false;
    for (let i = 0; i < callback_table.tree_view_pieces.elements.length; i++) {
        if (cb['source'] === callback_table.tree_view_pieces.elements[i]['id']) {
            found_s = true;
        }
        if (cb['destination'] === callback_table.tree_view_pieces.elements[i]['id']) {
            found_t = true;
        }
    }
    for (let i = 0; i < callback_table.tree_view_pieces.edges.length; i++) {
        if (cb['id'] === callback_table.tree_view_pieces.edges[i]['id']) {
            if (cb['end_timestamp'] !== null) {
                //this means we need to remove an edge
                callback_table.tree_view_pieces.edges.splice(i, 1);
                //console.log('found link and removing it');
                if (callback_table.view_selection === 'tree view') {
                    callback_table.tree_node_update();
                }
            } else {
                callback_table.tree_view_pieces.edges[i] = cb;
            }
            return;
        }
    }
    if (!found_s) {
        callback_table.tree_view_pieces.elements.push(cb['source']);
    }
    if (!found_t) {
        callback_table.tree_view_pieces.elements.push(cb['destination']);
    }
    callback_table.tree_view_pieces.edges.push(cb);
    if (callback_table.view_selection === 'tree view') {
        callback_table.tree_node_update();
    }
}

var group_modify = new Vue({
    el: '#group_modify',
    delimiters: ['[[', ']]'],
    data: {
        callbacks: []
    }
});

function toggle_lock_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            //console.log(data);
            alertTop("success", "Successfully updated", 1);
        } else {
            alertTop("warning", data['error']);
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }
}
function get_all_tasking_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            //this has [callback_info, "tasks": [ {task_info, "responses": [ {response_info} ] } ] ]
            for (let i = 0; i < data['tasks'].length; i++) {
                //want to indicate if we've fetched
                data['tasks'][i]['expanded'] = false;
                add_new_task(data['tasks'][i], false);
            }
            setTimeout(() => { // setTimeout to put this into event queue
                $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
            }, 0);
            setTimeout(() => { // setTimeout to put this into event queue
                // executed after render
                Vue.nextTick().then(function () {
                    $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
                });
            }, 0);
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }
}

var callback_info_modal = new Vue({
    el: '#CallbackInfoModal',
    data: {
        info: []
    },
    delimiters: ['[[', ']]']
});

function view_callback_info(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'success') {
            delete data['status'];
            if (data['path'].length > 0) {
                let min = [];
                for (let i = 0; i < data['path'].length; i++) {
                    if (data['path'][i] === "Mythic") {
                        min.push({"component": "Mythic", "value": "Mythic"});
                        continue
                    }
                    if(data['path'][i].length > 0){
                        let info = JSON.parse(data['path'][i]);
                        if ("name" in info) {
                            min.push({"component": "C2 Profile", "value": info.name});
                        } else {
                            min.push({"component": "Callback", "value": info.id});
                        }
                    }

                }
                data['path'] = min;
            }
            data["loaded_commands"].sort((a, b) => (a.command > b.command) ? 1 : ((b.command > a.command) ? -1 : 0));
            for(const [k,v] of Object.entries(data["c2_profiles"])){
                data["c2_profiles"][k].sort((a, b) => (a.description > b.description) ? 1 : ((b.description > a.description) ? -1 : 0));
            }
            callback_info_modal.info = data;
            $('#CallbackInfoModal').modal('show');
            callback_info_modal.$forceUpdate();
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        console.log(response);
        console.log(error.toString());
        alertTop("danger", "session expired, refresh please");
    }
}

function stop_getting_callback_updates(id, remove_from_view) {
    //make sure we stop getting updates from the websockets
    try {
        if (remove_from_view) {
            remove_callback_from_view(id);
        }
        remove_from_storage("tasks", id);
        remove_from_storage("screencaptures", id);
        remove_from_storage("keylogs", id);
        remove_from_storage("process_list", id);
        if (id in websockets) {
            if (websockets[id] !== undefined) {
                websockets[id].close();
                delete websockets[id];
            }
        }
    } catch (error) {
        console.log(error.toString());
        console.log(error.stack);
    }
}

function edit_description_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] !== 'success') {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }

}
var tag_info = new Vue({
    el: '#addTagModalData',
    data: {
        tags: [],
        selected_tag: "Select One...",
        current_tags: ""
    },
    delimiters: ['[[',']]']
})
var task_data = new Vue({
    el: '#bottom-data',
    data: {
        tasks,
        input_field: "",
        callback_tokens: [],
        selected_token: 0,
        task_filters: {
            "task": {"active": false, "range_low": 0, "range_high": 1000000},
            "operator": {"active": false, "username": ""},
            "command": {"active": false, "cmd": ""},
            "comment": {"active": false}
        },
        input_field_placeholder: {"data": "", "cid": -1},
        meta: meta,
        all_tasks,
        ptype_cmd_params, // list of transforms for the currently typed command and their 'active' status
        // info for our browser table
        folder: {"data": {}, "children": [], "parent": undefined},
        host: "",
        path: "",
        manually_edit_file_browser_callback: false,
        manual_file_browser_callback_num: -1,
        callback: -1,
        file_browser_permissions: {},
        file_browser_history_files: [],
        size: 50
    },
    methods: {
        task_button: function (data) {
            //submit the input_field data as a task, need to know the current callback id though
            //first check if there are any active auto-complete tabs. If there are, we won't submit.
            let autocomplete_list = document.getElementById('commandlineautocomplete-list');
            if (autocomplete_list !== null && autocomplete_list.hasChildNodes()) {
                return;
            }
            let task = this.input_field.trim().split(" ");
            let command = task[0].trim();
            let params = "";
            if (task.length > 1) {
                params = task.slice(1,).join(' '); //join index 1 to the end back into a string of params
            }
            // first check to see if we have any information about this payload time to leverage
            if (callbacks[data['cid']]['payload_type'] in this.ptype_cmd_params) {

                //now loop through all of the commands we have to see if any of them match what was typed

                for (let i = 0; i < this.ptype_cmd_params[callbacks[data['cid']]['payload_type']].length; i++) {
                    //special category of trying to do a local help
                    if (command === "help") {
                        if (this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] === params) {
                            alertTop("info", "<b>Usage: </b>" + this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['help_cmd'] +
                                "<br><b>Description:</b><pre style=\"word-wrap:break-word;white-space:pre-wrap\">" + this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['description'] +
                                "</pre><br><b>Note: </b>Documentation for " + callbacks[data['cid']]['payload_type'] +
                                " can be found in the <a target='_blank' href=\"/docs/agents/" + this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['payload_type'] + "/commands/" + this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] + "\" style='color:darkblue'> Help Container</a>", 0,
                                "Command Help", false);
                            return;
                        } else if (params.length === 0) {
                            alertTop("info", "<b>Usage: </b> help {command_name}" +
                                "<br><b>Note: </b>All commands for " + callbacks[data['cid']]['payload_type'] +
                                " can be found in the <a target='_blank' href=\"/docs/agents/" + callbacks[data['cid']]['payload_type'] + "\" style='color:darkblue'> Help Container</a>", 0,
                                "Command Help", false);
                            return;
                        }
                    }
                    //special category of trying to do a local set command
                    else if (command === "set") {
                        if (task.length >= 3) {
                            let set_value = task.slice(2,).join(' ');
                            let set_data = {};
                            set_data[task[1]] = set_value;
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + this.input_field_placeholder['cid'],
                                function (response) {
                                    try {
                                        let rdata = JSON.parse(response);
                                        if (rdata['status'] === 'success') {
                                            alertTop("success", "Successfully modified current callback's metadata", 1);
                                            task_data.input_field = "";
                                        } else {
                                            alertTop("danger", "Failed to set current callback's metadata: " + rdata['error']);
                                        }
                                    } catch (error) {
                                        alertTop("danger", "Session expired, please refresh");
                                    }
                                }, "PUT", set_data);
                        } else {
                            alertTop("danger", "Wrong number of params for set. Should be set {field} {value}");
                            return;
                        }
                        return;
                    }
                    //if we find our command that was typed
                    else if (this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['cmd'] === command){
                        if(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]["attributes"]["supported_os"].length > 0  &&
                !this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]["attributes"]["supported_os"].includes(callbacks[data['cid']]["payload_os"])){
                            alertTop("warning", "That command isn't supported by this OS type");
                            return;
                        }
                        let command_in_callback = false;
                        for(let j = 0; j < meta[task_data.input_field_placeholder['cid']]["commands"].length; j++){
                            if(meta[task_data.input_field_placeholder['cid']]["commands"][j]["name"] === command){
                                command_in_callback = true;
                            }
                        }
                        if(command === "clear") { command_in_callback = true}
                        if(!command_in_callback){
                            alertTop("warning", command + " isn't in the current callback");
                            return;
                        }
                        // if they didn't type any parameters, but we have some registered for this command, display a GUI for them
                        if (params.length === 0 && this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length !== 0) {
                            //if somebody specified command arguments on the commandline without going through the GUI, by all means, let them
                            //  This is for if they want the GUI to auto populate for them
                            //  Also make sure that there are actually parameters for them to fill out
                            params_table.command_params = [];
                            params_table.cmd = this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i];
                            //check if this user has typed this command before, if so, auto populate with those old values to help out
                            let last_vals = undefined;
                            for (let j = meta[data['cid']]['history'].length - 1; j >= 0; j--) {
                                // just look back through  the current callback and only look for this user
                                if (meta[data['cid']]['history'][j]['command'] === command) {
                                    if (meta[data['cid']]['history'][j]['operator'] === "{{name}}") {
                                        try {
                                            last_vals = JSON.parse(meta[data['cid']]['history'][j]['params']);
                                        } catch (error) {
                                            console.log(error.toString());
                                            console.log("error in parsing last_vals");
                                            last_vals = {};
                                        }
                                        break;
                                    }
                                }
                            }
                            if (last_vals === undefined || last_vals.constructor !== Object) {
                                last_vals = {}
                            }
                            for (let j = 0; j < this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length; j++) {
                                let blank_vals = {
                                    "string_value": "",
                                    "credential_value": "",
                                    "credential_id": 0,
                                    "number_value": -1,
                                    "choice_value": "",
                                    "choicemultiple_value": [],
                                    "boolean_value": false,
                                    "array_value": [],
                                    'payloadlist_value': "",
                                    'agentconnect_c2profile': -1,
                                    'agentconnect_host': "",
                                    "agentconnect_payload": "",
                                    "payloads": [],
                                    "links": []
                                };
                                if (params_table.payloads.length > 0) {
                                    blank_vals['payloadlist_value'] = params_table.payloads[0].uuid
                                }
                                let param = Object.assign({}, blank_vals, this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'][j]);
                                if(param.type === "Choice" || param.type === "ChoiceMultiple"){
                                    console.log(param.dynamic_query_function);
                                    if(param.dynamic_query_function !== undefined){
                                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/dynamic_query", (response) => {
                                            try {
                                                param.choices = JSON.parse(response);
                                                if(param.choices.length > 0){
                                                    param.choice_value = param.choices[0];
                                                    param.choicemultiple_value = [param.choices[0]];
                                                }
                                                params_table.command_params.push(param);
                                                params_table.command_params.sort((a, b) => (b.ui_position > a.ui_position) ? -1 : ((a.ui_position > b.ui_position) ? 1 : 0));
                                            } catch (error) {
                                                console.log(error.toString());
                                                alertTop("danger", "Session expired, please refresh");
                                            }
                                        }, "POST", {
                                            "callback": data["cid"],
                                            "command": command,
                                            "parameter_name": param.name,
                                            "payload_type": callbacks[data['cid']]['payload_type']
                                        });
                                        continue;
                                    }
                                    if(param.choices.length > 0){
                                        param.choices = param.choices.split("\n");
                                        param.choice_value = param.choices[0];
                                        param.choicemultiple_value = [param.choices[0]];
                                    }
                                    else{
                                        let filter = JSON.parse(param.choice_filter_by_command_attributes);
                                        function intersect(a, b) {
                                          let setB = new Set(b);
                                          return [...new Set(a)].filter(x => setB.has(x));
                                        }
                                        if(param.choices_are_all_commands){
                                            let choices = [];
                                            for(let c = 0; c < this.ptype_cmd_params[callbacks[data['cid']]['payload_type']].length; c++){
                                                if(!(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][c]["cmd"] === "help" ||
                                                    this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][c]["cmd"] === "clear")){
                                                    let match = true;
                                                    let cmd_attributes = this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][c]["attributes"];
                                                    for(const [key, value] of Object.entries(filter)){
                                                        if(key === "spawn_and_injectable"){
                                                            if(value !== cmd_attributes[key]){
                                                                match = false;
                                                            }
                                                        }else if(key === "supported_os" && value.length >0){
                                                            if(intersect(value, cmd_attributes[key]).length === 0){
                                                                match = false;
                                                            }
                                                        }
                                                    }
                                                    if(match){
                                                        choices.push(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][c]["cmd"]);
                                                    }
                                                }
                                            }
                                            param.choices = choices;
                                        }
                                        else if(param.choices_are_loaded_commands){
                                            let choices = [];
                                            for(let c = 0; c < meta[data['cid']]['commands'].length; c++){
                                                if(!(meta[data['cid']]['commands'][c]["name"] === "help" || meta[data['cid']]['commands'][c]["name"] === "clear")){
                                                    let match = true;
                                                    let cmd_attributes = meta[data['cid']]['commands'][c]["attributes"];
                                                    for(const [key, value] of Object.entries(filter)){
                                                        if(key === "spawn_and_injectable"){
                                                            if(value !== cmd_attributes[key]){
                                                                match = false;
                                                            }
                                                        }else if(key === "supported_os" && value.length >0){
                                                            if(intersect(value, cmd_attributes[key]).length === 0){
                                                                match = false;
                                                            }
                                                        }
                                                    }
                                                    if(match){
                                                        choices.push(meta[data['cid']]['commands'][c]["name"]);
                                                    }
                                                }
                                            }
                                            param.choices = choices;
                                        }
                                        if(param.choices.length > 0){
                                            param.choice_value = param.choices[0];
                                        }
                                    }
                                }
                                if(param.type === "Array"){
                                    if(param.default_value.length > 0){
                                        param.array_value = JSON.parse(param.default_value);
                                    }
                                }
                                else if(param.type === "String"){
                                    param.string_value = param.default_value;
                                }else if(param.type === "Number") {
                                    param.number_value = param.default_value;
                                }
                                else if(param.type === "File"){
                                    try {
                                        //if there is a file param
                                        $('#fileparam' + param.id).val('');
                                    } catch (error) {
                                        console.log(error.toString());
                                        // if this is the first time the parameter is created, it'll error out which is expected
                                    }
                                }
                                else if(param.type === "Boolean"){
                                    if(typeof param.default_value === "string"){
                                        try{
                                            param.boolean_value = JSON.parse(param.default_value.toLowerCase());
                                        }catch(error){
                                            console.log(error);
                                            param.boolean_value = false;
                                        }
                                    }
                                	else{param.boolean_value = param.default_value;}
                                }
                                else if(param.type === "LinkInfo"){
                                    param.links = [];
                                    param.links_value = undefined;
                                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/callbacks/" + data['cid'] + "/edges", (response) => {
                                        try {
                                            let data = JSON.parse(response);
                                            console.log(data);
                                            for(let i = 0; i < data.length; i++){
                                                data[i]['source'] = JSON.parse(data[i]['source']);
                                                data[i]['destination'] = JSON.parse(data[i]['destination']);
                                            }
                                            param.links = data;
                                            if(data.length > 0){
                                                param.links_value = param.links[0];
                                            }
                                            if (data['status'] === 'error') {
                                                alertTop("warning", data['error']);
                                            }
                                        } catch (error) {
                                            console.log(error.toString());
                                            alertTop("danger", "Session expired, please refresh");
                                        }
                                    }, "GET", null);
                                }
                                //console.log(param);
                                if (param.name in last_vals) {
                                    //lets set the appropriate param value to the old value
                                    switch (param.type) {
                                        case "String": {
                                            param['string_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "Credential-JSON": {
                                            for (let k = 0; k < params_table.credentials.length; k++) {
                                                if (params_table.credentials[k]['account'] === last_vals[param.name]['account'] &&
                                                    params_table.credentials[k]['realm'] === last_vals[param.name]['realm'] &&
                                                    params_table.credentials[k]['credential'] === last_vals[param.name]['credential'] &&
                                                    params_table.credentials[k]['type'] === last_vals[param.name]['credential_type']) {
                                                    param['credential_id'] = params_table.credentials[k]['id'];
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                        case "Credential-Account": {
                                            for (let k = 0; k < params_table.credentials.length; k++) {
                                                if (params_table.credentials[k]['account'] === last_vals[param.name]) {
                                                    param['credential_id'] = params_table.credentials[k]['id'];
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                        case "Credential-Realm": {
                                            for (let k = 0; k < params_table.credentials.length; k++) {
                                                if (params_table.credentials[k]['realm'] === last_vals[param.name]) {
                                                    param['credential_id'] = params_table.credentials[k]['id'];
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                        case "Credential-Type": {
                                            for (let k = 0; k < params_table.credentials.length; k++) {
                                                if (params_table.credentials[k]['type'] === last_vals[param.name]) {
                                                    param['credential_id'] = params_table.credentials[k]['id'];
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                        case "Credential-Credential": {
                                            for (let k = 0; k < params_table.credentials.length; k++) {
                                                if (params_table.credentials[k]['credential'] === last_vals[param.name]) {
                                                    param['credential_id'] = params_table.credentials[k]['id'];
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                        case "Number": {
                                            param['number_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "Choice": {
                                            param['choice_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "ChoiceMultiple": {
                                            param['choicemultiple_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "Boolean": {
                                            param['boolean_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "Array": {
                                            param['array_value'] = last_vals[param.name];
                                            break;
                                        }
                                        case "File": {
                                            try {
                                                //if there is a file param
                                                $('#fileparam' + param.id).val('');
                                            } catch (error) {
                                                console.log(error.toString());
                                                // if this is the first time the parameter is created, it'll error out which is expected
                                            }
                                        }
                                    }
                                }
                                if (param.type === 'PayloadList') {
                                    // we only want to add to param.payloads things from params_table.payloads that match the supported_agent types listed
                                    let supported_agents = param.supported_agents.split(",");
                                    if (supported_agents.indexOf("") !== -1) {
                                        supported_agents.splice(supported_agents.indexOf(""), 1);
                                    }
                                    if (supported_agents.length === 0) {
                                        param.payloads = params_table.payloads.reduce( (total, cur) => {
                                            if(cur["auto_generated"] === false){
                                                return [...total, cur];
                                            }
                                            return [...total];
                                        }, []);
                                    } else {
                                        for (let m= 0; m < params_table.payloads.length; m++) {
                                            if (supported_agents.includes(params_table.payloads[m]['payload_type'])) {
                                                // now that we see it as a supported agent, check that it matches the supported build parameters
                                                let build_reqs = JSON.parse(param.supported_agent_build_parameters);
                                                let matched = true;
                                                if(params_table.payloads[m]['payload_type'] in build_reqs){
                                                    for (const [key, value] of Object.entries(build_reqs[params_table.payloads[m]['payload_type']])) {
                                                       for(let b = 0; b < params_table.payloads[m]["build_parameters"].length; b++){
                                                           if(params_table.payloads[m]["build_parameters"][b]["name"] === key){
                                                               if (params_table.payloads[m]["build_parameters"][b]["value"] !== value){
                                                                   matched = false;
                                                               }
                                                           }
                                                       }
                                                    }
                                                }
                                                if(matched && !params_table.payloads[m]["auto_generated"]){
                                                    param.payloads.push(params_table.payloads[m]);
                                                }

                                            }
                                        }
                                    }
                                    param.payloads.sort((a, b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
                                    param['payloadlist_value'] = param.payloads.length > 0 ? param.payloads[0].uuid : "";
                                }
                                params_table.command_params.push(param);
                            }
                            params_table.command_params.sort((a, b) => (b.ui_position > a.ui_position) ? -1 : ((a.ui_position > b.ui_position) ? 1 : 0));
                            $('#paramsModal').modal('show');
                            $('#paramsModal').on('shown.bs.modal', function () {
                                $('#paramindex0').focus();
                                $("#paramsModal").unbind('keyup').on('keyup', function (e) {
                                    if (e.keyCode === 13 && e.ctrlKey) {
                                        $('#paramsSubmit').click();
                                    }
                                });
                            });
                            $('#paramsSubmit').unbind('click').click(function () {
                                let param_data = {};
                                let file_data = {};  //mapping of param_name to uploaded file data
                                for (let k = 0; k < params_table.command_params.length; k++) {
                                    if (params_table.command_params[k]['type'] === "String") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['string_value'];
                                    } else if (params_table.command_params[k]['type'] === "Credential-JSON") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = {
                                                    'account': x['account'],
                                                    'realm': x['realm'],
                                                    'credential': x['credential'],
                                                    'credential_type': x['type']
                                                };
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Credential-Account") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = x['account'];
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Credential-Realm") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = x['realm'];
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Credential-Type") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = x['type'];
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Credential-Credential") {
                                        params_table.credentials.forEach(function (x) {
                                            if (x['id'] === params_table.command_params[k]['credential_id']) {
                                                param_data[params_table.command_params[k]['name']] = x['credential'];
                                            }
                                        });
                                    } else if (params_table.command_params[k]['type'] === "Number") {
                                        param_data[params_table.command_params[k]['name']] = parseInt(params_table.command_params[k]['number_value']);
                                    } else if (params_table.command_params[k]['type'] === "Choice") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['choice_value'];
                                    } else if (params_table.command_params[k]['type'] === "ChoiceMultiple") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['choicemultiple_value'];
                                    } else if (params_table.command_params[k]['type'] === "Boolean") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['boolean_value'];
                                    } else if (params_table.command_params[k]['type'] === "Array") {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['array_value'];
                                    } else if (params_table.command_params[k]['type'] === "File") {
                                        let param_name = params_table.command_params[k]['name'];
                                        file_data[param_name] = document.getElementById('fileparam' + params_table.command_params[k]["id"]).files[0];
                                        param_data[param_name] = "FILEUPLOAD";
                                    } else if (params_table.command_params[k]['type'] === 'PayloadList') {
                                        param_data[params_table.command_params[k]['name']] = params_table.command_params[k]['payloadlist_value'];
                                    } else if (params_table.command_params[k]['type'] === 'AgentConnect') {
                                        param_data[params_table.command_params[k]['name']] = {
                                            "host": params_table.command_params[k]['agentconnect_host']
                                        };
                                        //console.log( params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]);
                                        if(params_table.command_params[k]['agentconnect_payload'] === ""){param_data[params_table.command_params[k]['name']] = {}}
                                        else if (params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]['type'] === 'payload') {
                                            //param_data[params_table.command_params[k]['name']]['agent_uuid'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['payload']['uuid'];
                                            param_data[params_table.command_params[k]['name']]['agent_uuid'] = params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]['payload']['uuid'];
                                            param_data[params_table.command_params[k]['name']]['callback_uuid'] = "";
                                        } else {
                                            //param_data[params_table.command_params[k]['name']]['agent_uuid'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['agent_callback_id'];
                                            param_data[params_table.command_params[k]['name']]['callback_uuid'] = params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]['agent_callback_id'];
                                            param_data[params_table.command_params[k]['name']]['agent_uuid'] = params_table.command_params[k]['payloads'][params_table.command_params[k]['agentconnect_payload']]['registered_payload'];
                                        }
                                        if (params_table.command_params[k]['agentconnect_c2profile'] === -1) {
                                            // they didn't select a specific c2 profile, so send the list
                                            param_data[params_table.command_params[k]['name']]['c2_profile'] = {};
                                        } else {
                                            // param_data[params_table.command_params[k]['name']]['c2_profile'] = params_table.payloadonhost[params_table.command_params[k]['agentconnect_host']][params_table.command_params[k]['agentconnect_payload']]['supported_profiles'][params_table.command_params[k]['agentconnect_c2profile']];
                                            //console.log()
                                            param_data[params_table.command_params[k]['name']]['c2_profile'] = params_table.command_params[k]['c2profiles'][params_table.command_params[k]['agentconnect_c2profile']];

                                        }
                                    } else if(params_table.command_params[k]['type'] === 'LinkInfo'){
                                        //console.log(params_table.command_params[k]["links_value"]);
                                        if( params_table.command_params[k]["links_value"] !== undefined) {
                                            param_data[params_table.command_params[k]['name']] = {
                                                "host": params_table.command_params[k]["links_value"]["destination"]["host"],
                                                "agent_uuid": params_table.command_params[k]["links_value"]["destination"]["registered_payload"],
                                                "callback_uuid": params_table.command_params[k]["links_value"]["destination"]["agent_callback_id"],
                                                "c2_profile": {
                                                    "name": params_table.command_params[k]["links_value"]["c2_profile"],
                                                    "parameters": params_table.command_params[k]["links_value"]["c2_parameters"]
                                                }
                                            };
                                        }else{
                                            param_data[params_table.command_params[k]['name']] = {};

                                        }
                                    }
                                }
                                uploadCommandFilesAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'], post_task_callback_func, file_data,
                                    {"command": command, "params": JSON.stringify(param_data), "token": task_data.selected_token});
                                //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                                task_data.input_field = "";
                                $('#commandline').focus();
                            });
                        } else {
                            //somebody knows what they're doing or a command just doesn't have parameters, send it off
                            // first check to make sure we're not trying to submit text in place of required file parameter
                            if(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length !== 0){
                                for (let j = 0; j < this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'].length; j++) {
                                    if(this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'][j]["type"] === "File" && this.ptype_cmd_params[callbacks[data['cid']]['payload_type']][i]['params'][j]["required"]){
                                        alertTop("warning", "This command requires files to be uploaded through a dialog box.", 6);
                                        task_data.input_field = command;
                                        task_data.task_button(task_data.input_field_placeholder);
                                        return;
                                    }
                                }
                            }
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'], post_task_callback_func, "POST",
                                {"command": command, "params": params, "token": task_data.selected_token});

                            //httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + data['cid'],post_task_callback_func, "POST", {"command":command,"params": JSON.stringify(param_data)});
                            task_data.input_field = "";
                            $('#commandline').focus();
                        }
                        return;
                    }
                }
                //If we got here, that means we're looking at an unknown command
                if (command === "help") {
                    // just means we never found the param command to help out with
                    alertTop("warning", "Unknown command: " + params, 2);
                } else {
                    //don't bother alerting for them just accidentally hitting enter
                    if (command !== "") {
                        alertTop("warning", "Unknown command: " + command, 2);
                    }
                }
            }
        },
        select_tab: function (metadata, selected_option) {
            task_data.input_field_placeholder['data'] = metadata.display;
            task_data.input_field_placeholder['cid'] = metadata.id;
            task_data.callback_tokens = metadata.tokens;
            if(task_data.callback_tokens.length > 0){
                task_data.selected_token = task_data.callback_tokens[0]["token"]["TokenId"];
            }else{task_data.selected_token = undefined;}

            Object.keys(task_data.meta).forEach(function (key) {
                if (key !== "file_browser") {
                    Vue.set(task_data.meta[key], 'console_selected', false);
                    Vue.set(task_data.meta[key], 'screencaptures_selected', false);
                    Vue.set(task_data.meta[key], 'keylogs_selected', false);
                    Vue.set(task_data.meta[key], 'process_list_selected', false);
                    Vue.set(task_data.meta[key], 'file_browser_selected', false);
                }
            });
            Object.keys(callback_table.callbacks).forEach(function (key) {
                Vue.set(callback_table.callbacks[key], 'selected', false);
            });
            Vue.set(metadata, selected_option, true);
            Vue.set(metadata, 'badges', 0);
            Vue.set(callback_table.callbacks[metadata['id']], 'selected', true);
            //set the autocomplete for the input field
            autocomplete(document.getElementById("commandline"), meta[metadata.id]['commands']);
            //console.log(meta[metadata.id]["commands"]);
            Vue.nextTick().then(function () {
                $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
                $('#commandline').focus();
            });
        },
        toggle_image: function (image) {
            //let panel = document.getElementById(image.remote_path).nextElementSibling;
            let panel = document.getElementById('image' + image.id).nextElementSibling;
            if (panel.style.display === "") {
                panel.style.display = "none";
                image.remote_path = "#";
            } else {
                panel.style.display = "";
                image.remote_path = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + image.agent_file_id + "?cache=" + String(image.chunks_received) + String(image.total_chunks);
                task_data.$forceUpdate();
            }
        },
        toggle_arrow: function (task) {
            $('#cardbody' + task.id).unbind('shown.bs.collapse').on('shown.bs.collapse', function () {
                all_tasks[task.callback][task.id]['expanded'] = true;
                task.badges = 0;
                get_all_responses(task.id);
                $('#color-arrow' + task.id).removeClass('fa-plus').addClass('fa-minus');
            });
            $('#cardbody' + task.id).unbind('hidden.bs.collapse').on('hidden.bs.collapse', function () {
                all_tasks[task.callback][task.id]['expanded'] = false;
                Vue.set(all_tasks[task.callback][task.id], "response", {});
                Vue.set(all_tasks[task.callback][task.id], "scripted", "");
                $('#color-arrow' + task.id).removeClass('fa-minus').addClass('fa-plus');
            });
        },
        toggle_comment: function (task) {
            if (task.comment_visible) {
                Vue.set(task, 'comment_visible', false);
            } else {
                Vue.set(task, 'comment_visible', true);
            }
        },
        toggle_show_params: function (task) {
            if (task.show_params) {
                Vue.set(task, 'show_params', false);
            } else {
                Vue.set(task, 'show_params', true);
            }
        },
        console_tab_close: function (metadata) {
            if (meta[metadata.id]['console_selected']) {
                move('left', true);
            }
            setTimeout(() => {
                meta[metadata.id]['tasks'] = false;
                remove_from_storage("tasks", metadata.id);
                stop_getting_callback_updates(metadata.id, false);

            }, 0);
            event.stopPropagation();
        },
        screencaptures_tab_close: function (metadata) {
            if (meta[metadata.id]['screencaptures_selected']) {
                move('left', true);
            }
            setTimeout(() => {
                meta[metadata.id]['screencaptures'] = false;
                remove_from_storage("screencaptures", metadata.id);
            }, 0);
            event.stopPropagation();
        },
        keylog_tab_close: function (metadata) {
            if (meta[metadata.id]['keylog_selected']) {
                move('left', true);
            }
            setTimeout(() => {
                meta[metadata.id]['keylogs'] = false;
                remove_from_storage("keylogs", metadata.id);
            }, 0);
            event.stopPropagation();
        },
        proxies_tab_close: function (metadata) {
            if (meta[metadata.id]['proxies_selected']) {
                move('left', true);
            }
            setTimeout(() => {
                meta[metadata.id]['proxies'] = false;
            }, 0);
            event.stopPropagation();
        },
        file_browser_tab_close: function (metadata) {
            if (meta[metadata.id]['file_browser_selected']) {
                move('left', true);
            }
            setTimeout(() => {
                meta[metadata.id]['file_browser'] = false;
            }, 0);
            event.stopPropagation();
        },
        process_list_tab_close: function (metadata) {
            if (meta[metadata.id]['process_list_selected']) {
                move('left', true);
            }
            setTimeout(() => {
                meta[metadata.id]['process_list'] = false;
                remove_from_storage("process_list", metadata.id);
            }, 0);
            event.stopPropagation();
        },
        task_list_processes: function (metadata) {
            let tasked = false;
            this.ptype_cmd_params[callbacks[metadata.id]['payload_type']].forEach(function (x) {
                if (x["supported_ui_features"].includes("process_browser:list") && !tasked) {
                    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + metadata.id, post_task_callback_func,
                        "POST", {"command": x['cmd'], "params": ""});
                    alertTop("info", "Tasked Callback " + metadata.id + " to list processes", 2);
                    tasked = true;
                }
            });
            if (!tasked) {
                alertTop("warning", "Failed to find associated command for " + callbacks[metadata.id]['payload_type'] + " to list processes", 2);
            }
        },
        get_previous_process_list: function (metadata) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/process_list/search/", function (response) {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        data['process_list']['diff'] = false;
                        Vue.set(metadata, 'process_list_data', data['process_list']);
                        Vue.set(metadata, 'process_list_tree', data['tree_list']);
                        task_data.$forceUpdate();
                    } else {
                        alertTop("warning", data['error'], 4);
                    }
                } catch (error) {
                    console.log(error);
                    alertTop("danger", "session expired, refresh");
                }
            }, "POST", {
                "host": metadata['process_list_data']['host'],
                "timestamp": metadata['process_list_data']['timestamp'],
                "adjacent": "prev"
            });
        },
        get_next_process_list: function (metadata) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/process_list/search/", function (response) {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        data['process_list']['diff'] = false;
                        Vue.set(metadata, 'process_list_data', data['process_list']);
                        Vue.set(metadata, 'process_list_tree', data['tree_list']);
                        task_data.$forceUpdate();
                    } else {
                        alertTop("warning", data['error'], 4);
                    }
                } catch (error) {
                    alertTop("danger", "session expired, refresh");
                }
            }, "POST", {
                "host": metadata['process_list_data']['host'],
                "timestamp": metadata['process_list_data']['timestamp'],
                "adjacent": "next"
            });
        },
        diff_process_list: function (metadata) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/process_list/search/", function (response) {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        try {
                            //metadata['process_list_data']['process_list'] is the current process list
                            //data['process_list']['process_list'] is the previous process list
                            // want to set the current process list to the diff of the two
                            let latest = metadata['process_list_data']['process_list'];
                            data['process_list']['process_list'].forEach(function (x) {
                                let match = latest.findIndex(function (l) {
                                    return (x['pid'] === l['pid']) &&
                                        (x['name'] === l['name']) && (x['ppid'] === l['ppid']) &&
                                        (x['bin_path'] === l['bin_path']) && (x['user'] === l['user']);
                                });
                                if (match === -1) {
                                    //old process isn't in the latest process, mark as removed
                                    x['diff'] = 'remove';
                                } else {
                                    //we did find it, mark it as the same and remove it from latest
                                    x['diff'] = 'same';
                                    latest.splice(match, 1);
                                }
                            });
                            //latest should now include all elements that are new
                            latest.forEach(function (x) {
                                x['diff'] = 'add';
                                data['process_list']['process_list'].push(x);
                            });
                            Vue.set(metadata['process_list_data'], 'process_list', data['process_list']['process_list']);
                            Vue.set(metadata['process_list_data'], 'diff', true);
                        } catch (error) {
                            alertTop("warning", "Failed to parse process list: " + error.toString());
                        }
                    } else {
                        alertTop("warning", data['error'], 4);
                    }
                } catch (error) {
                    alertTop("danger", "session expired, refresh");
                }
            }, "POST", {
                "host": metadata['process_list_data']['host'],
                "timestamp": metadata['process_list_data']['timestamp'],
                "adjacent": "prev"
            });
        },
        apply_process_filter: function (proc, metadata) {
            if (metadata.process_list_filter.includes(":")) {
                let pieces = metadata.process_list_filter.split(":");
                let field = pieces[0].toLowerCase();
                if (field === "pid") {
                    return proc['process_id'].toString().includes(pieces[1]);
                } else if (field === "ppid") {
                    return proc['parent_process_id'].toString().includes(pieces[1]);
                } else if (field === "arch") {
                    if ("arch" in proc) {
                        return proc['arch'].toString().includes(pieces[1]);
                    } else {
                        return proc['architecture'].toString().includes(pieces[1]);
                    }
                } else if (field === "user") {
                    return proc['user'].toString().includes(pieces[1]);
                } else if (field === "binpath") {
                    return proc['bin_path'].toString().includes(pieces[1]);
                } else if (field === "name") {
                    if ("name" in proc) {
                        return proc['name'].toString().includes(pieces[1]);
                    } else {
                        return proc['process_name'].toString().includes(pieces[1]);
                    }
                }
            }
            return true;
        },
        toggle_keylog_times: function (metadata) {
            Vue.set(metadata, 'keylog_time', !metadata['keylog_time']);
            task_data.$forceUpdate();
        },
        stop_proxy: function (entry) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/proxies/" + entry, (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'error') {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    console.log(error);
                    alertTop('danger', "Session expired, please refresh");
                }
            }, "DELETE", null);
        },
        cmd_history_up: function () {
            //check and see if there are any auto-complete windows open, if so, don't do this
            if ($('.autocomplete-items').children().length > 0) {
                return;
            }
            let cid = this.input_field_placeholder['cid'];
            if (meta[cid] !== undefined) {
                meta[cid]['history_index'] -= 1;
                if (meta[cid]['history_index'] < 0) {
                    meta[cid]['history_index'] = 0;
                }
                let index = meta[cid]['history_index'];
                this.input_field = meta[cid]['history'][index]['command'] + " " + meta[cid]['history'][index]['params'];
                $('#commandline').focus();
            }
        },
        cmd_history_down: function () {
            //check and see if there are any auto-complete windows open, if so, don't do this
            if ($('.autocomplete-items').children().length > 0) {
                return;
            }
            let cid = this.input_field_placeholder['cid'];
            if (meta[cid] !== undefined) {
                meta[cid]['history_index'] += 1;
                if (meta[cid]['history_index'] >= meta[cid]['history'].length) {
                    meta[cid]['history_index'] = meta[cid]['history'].length;
                    this.input_field = "";
                } else {
                    let index = meta[cid]['history_index'];
                    this.input_field = meta[cid]['history'][index]['command'] + " " + meta[cid]['history'][index]['params'];
                }
                $('#commandline').focus();
            }
        },
        add_comment: function (task) {
            $('#addCommentTextArea').val(task.comment);
            $('#addCommentModal').modal('show');
            $('#addCommentModal').on('shown.bs.modal', function () {
                $('#addCommentTextArea').focus();
                $("#addCommentTextArea").unbind('keyup').on('keyup', function (e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
                        $('#addCommentSubmit').click();
                    }
                });
            });
            $('#addCommentSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task.id, add_comment_callback, "POST", {"comment": $('#addCommentTextArea').val()});
            });
        },
        view_stdout_stderr: function(task){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/stdoutstderr/" + task.id, (response) => {
                try{
                    let data = JSON.parse(response);
                    if(data["status"] === "success"){
                        let text_msg = "stdout:\n" + data["stdout"] + "\n\nstderr:\n" + data["stderr"];
                        $('#addCommentTextArea').val(text_msg);
                        $('#commentModalTitle').text("Stdout/Stderr");
                        $('#addCommentModal').modal('show');
                        $('#addCommentModal').on('shown.bs.modal', function () {
                            $('#addCommentTextArea').focus();
                        });
                        $('#addCommentSubmit').unbind('click').click(function () {});
                    }else{
                        alertTop("error", data["error"]);
                    }
                }catch(error){
                    alertTop("error", "Failed to fetch stdout stderr for task");
                    console.log(error);
                }

            }, "GET", null);
        },
        view_all_parameters: function(task){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/all_params/" + task.id, (response) => {
                try{
                    let data = JSON.parse(response);
                    if(data["status"] === "success"){
                        let text_msg = "Display Parameters:\n" + data["display_params"] + "\n\nOriginal Parameters:\n" + data["original_params"];
                        text_msg += "\n\nFinal Params:\n" + data["params"];
                        $('#addCommentTextArea').val(text_msg);
                        $('#commentModalTitle').text("All Parameters");
                        $('#addCommentModal').modal('show');
                        $('#addCommentModal').on('shown.bs.modal', function () {
                            $('#addCommentTextArea').focus();
                        });
                        $('#addCommentSubmit').unbind('click').click(function () {});
                    }else{
                        alertTop("error", data["error"]);
                    }
                }catch(error){
                    console.log(error);
                }

            }, "GET", null);
        },
        add_tag: function(){
            tag_info.current_tags += "\n" + tag_info.selected_tag;
        },
        view_all_tags: function(task){
            tag_info.selected_tag = "Select One...";
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/tags/", (response) => {
                try{
                    let data = JSON.parse(response);
                    if( data["status"] === "success"){
                       tag_info.tags = data["tags"].sort();
                       tag_info.tags.unshift("Select One...");
                    }else{
                        alertTop("warning", data["error"]);
                    }
                }catch(error){
                    console.log(error);
                    alertTop("danger", "Failed to make web request: " + error.toString());
                }
            }, "GET",null);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/tags/" + task.id, (response) => {
                try{
                    let data = JSON.parse(response);
                    if( data["status"] === "success"){
                        tag_info.current_tags = data["tags"].join("\n");
                        $('#addTagModal').modal('show');
                        $('#addTagModal').on('shown.bs.modal', function () {
                            $('#addTagTextArea').focus();
                            $("#addTagTextArea").unbind('keyup').on('keyup', function (e) {
                                if (e.keyCode === 13 && !e.shiftKey) {
                                    $('#addTagSubmit').click();
                                }
                            });
                        });
                    }else{
                        alertTop("warning", data["error"]);
                    }
                }catch(error){
                    console.log(error);
                    alertTop("danger", "Failed to make web request: " + error.toString());
                }
            }, "GET",null);
            $('#addTagSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/tags/" + task.id, (response) => {
                    try{
                        let data = JSON.parse(response);
                        if( data["status"] === "success"){
                            alertTop("success","Successfully updated tags");
                        }else{
                            alertTop("warning", data["error"]);
                        }
                    }catch(error){
                        console.log(error);
                        alertTop("danger", "Failed to make web request: " + error.toString());
                    }
                }, "PUT", {"tags": tag_info.current_tags.split("\n")});
            });
        },
        view_opsec_block: function(task){
            let text_msg = "";
            if (task.opsec_pre_blocked !== null){
                text_msg += "OPSEC PreCheck Message";
                if (task.opsec_pre_bypassed){
                    text_msg += " ( bypassed by " + task.opsec_pre_bypass_user + " )";
                }
                text_msg += ":\n\n" + task.opsec_pre_message + "\n";
            }
            if (task.opsec_post_blocked !== null){
                text_msg += "OPSEC PostCheck Message";
                if (task.opsec_post_bypassed){
                    text_msg += " ( bypassed by " + task.opsec_post_bypass_user + " )";
                }
                text_msg += ":\n\n" + task.opsec_post_message + "\n";
            }

            $('#addCommentTextArea').val(text_msg);
            $('#commentModalTitle').text("OPSEC Messages");
            $('#addCommentModal').modal('show');
            $('#addCommentModal').on('shown.bs.modal', function () {
                $('#addCommentTextArea').focus();
            });
            $('#addCommentSubmit').unbind('click').click(function () {});
        },
        submit_opsec_bypass_request: function(task){
          httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + task.id + "/request_bypass/" , (response) => {

            }, "GET", null);
        },
        reissue_request: function(task){
          httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/reissue_task_webhook" , (response) => {
                try{
                    let data = JSON.parse(response);
                    if(data["status"] === "error"){
                        alertTop("warning", data["error"]);
                    }
                }catch(error){
                    console.log(error.toString());
                }
            }, "POST", {"input": {"task_id": task.id}});
        },
        remove_comment: function (id) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + id, remove_comment_callback, "DELETE", null);
        },
        copyStringToClipboard: function (str) {
            // Create new element
            let el = document.createElement('textarea');
            // Set value (string to be copied)
            el.value = str;
            // Set non-editable to avoid focus and move outside of view
            el.setAttribute('readonly', '');
            el.style = {position: 'absolute', left: '-9999px'};
            document.body.appendChild(el);
            // Select text inside element
            el.select();
            // Copy text to clipboard
            document.execCommand('copy');
            // Remove temporary element
            document.body.removeChild(el);
            alertTop("info", "Copied...", 1);
        },
        download_raw_output: function (taskid) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + taskid + "/raw_output", (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        download_from_memory("task_" + taskid + ".txt", data['output']);
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    alertTop("danger", "Session expired, please refresh");
                    console.log(error.toString());
                }
            }, "GET", null);
        },
        apply_filter: function (task) {
            // determine if the specified task should be displayed based on the task_filters set
            let status = true;
            if (this.task_filters['task']['active'] && task.id !== null) {
                status = status && task.id <= this.task_filters['task']['range_high'] && task.id >= this.task_filters['task']['range_low'];
            }
            if (this.task_filters['operator']['active'] && task.operator !== null) {
                status = status && task.operator.includes(this.task_filters['operator']['username']);
            }
            if (this.task_filters['command']['active']) {
                if (task.command === null) {
                    status = status && task.original_params.includes(this.task_filters['command']['cmd']);
                } else {
                    status = status && task.command.includes(this.task_filters['command']['cmd']);
                }
            }
            if (this.task_filters['comment']['active']){
                status = status && task.comment !== "";
            }
            // if nothing is active, default to true
            return status;
        },
        callback_total_badges: function (metadata) {
            if (all_tasks[metadata.id] === undefined) {
                return 0
            }
            let count = metadata.badges;
            Object.keys(all_tasks[metadata.id]).forEach(function (key) {
                count += all_tasks[metadata.id][key]['badges'];
            });
            return count;
        },
        setBrowserTableData: function (data, children, parent) {
            task_data.host = data['host'];
            task_data.callback = data['callback'];
            if (data['name'] === "/") {
                task_data.path = "/";
            } else if (data['parent_path'] === undefined || data['parent_path'] === "") {
                data['parent_path'] = "";
                task_data.path = data['name'];
            } else if (data['parent_path'][0] === "/") {
                if (data['parent_path'] === "/") {
                    task_data.path = data['parent_path'] + data['name'];
                } else {
                    task_data.path = data['parent_path'] + "/" + data['name'];
                }
            } else {
                if(data['parent_path'][data['parent_path'].length -1] === "\\"){
                    task_data.path = data['parent_path'] + data['name'];
                }else{
                    task_data.path = data['parent_path'] + "\\" + data['name'];
                }
            }
            Vue.set(task_data, "folder", {"data": data, "children": children, "parent": parent});
        },
        update_file_browser_comment_live: function (data) {
            $('#addCommentTextArea').val(data["comment"]);
            $('#addCommentModal').modal('show');
            $('#addCommentModal').on('shown.bs.modal', function () {
                $('#addCommentTextArea').focus();
                $("#addCommentTextArea").unbind('keyup').on('keyup', function (e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
                        $('#addCommentSubmit').click();
                    }
                });
            });
            $('#addCommentSubmit').unbind('click').click(function () {
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/filebrowserobj/" + data.id, (response) => {
                    try {
                        let newdata = JSON.parse(response);
                        if (newdata['status'] === 'error') {
                            alertTop("danger", data['error']);
                        }
                    } catch (error) {
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "PUT", {"comment": $('#addCommentTextArea').val()});
            });
        },
        get_latest_download_path: function (files) {
            if (files[files.length - 1]['total_chunks'] === files[files.length - 1]['chunks_received']) {
                return "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + files[files.length - 1]['agent_file_id'];
            } else {
                return ""
            }
        },
        get_latest_download_chunk_count: function (files) {
            if(files.length === 0){
                return "";
            }
            if (files[0]['total_chunks'] === files[0]['chunks_received']) {
                return "";
            } else {
                return files[0]['chunks_received'] + " of " + files[0]['total_chunks'] + " total chunks received";
            }
        },
        task_download_file: function (data) {
            let tasked = false;
            let used_callback_num = task_data.manually_edit_file_browser_callback ? task_data.manual_file_browser_callback_num : task_data.callback;
            if (!Object.prototype.hasOwnProperty.call(meta, used_callback_num)) {
                alertTop("warning", "No valid or active callback supplied");
                return;
            }
            meta[used_callback_num]['commands'].forEach(function (x) {

                if (x["supported_ui_features"].includes("file_browser:download") && !tasked) {
                    if(x["attributes"]["supported_os"].length > 0  && !x["attributes"]["supported_os"].includes(callbacks[used_callback_num]["payload_os"])){

                    }else{
                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + used_callback_num, post_task_callback_func, "POST",
                            {
                                "command": x['name'],
                                "params": JSON.stringify({
                                    "host": data['host'],
                                    "path": data['parent_path'],
                                    "file": data['name']
                                })
                            });
                        alertTop("info", "Tasked Callback " + used_callback_num + " to download file", 2);
                        tasked = true;
                    }

                }
            });
            if (!tasked) {
                alertTop("warning", "Failed to find associated command for file_browser:download in callback " + used_callback_num, 2);
            }
        },
        task_list_file: function (data) {
            let tasked = false;
            let used_callback_num = task_data.manually_edit_file_browser_callback ? task_data.manual_file_browser_callback_num : task_data.callback;
            if (!Object.prototype.hasOwnProperty.call(meta, used_callback_num)) {
                alertTop("warning", "No valid or active callback supplied");
                return;
            }
            meta[used_callback_num]['commands'].forEach(function (x) {
                if (x["supported_ui_features"].includes("file_browser:list") && !tasked) {
                    if(x["attributes"]["supported_os"].length > 0  && !x["attributes"]["supported_os"].includes(callbacks[used_callback_num]["payload_os"])){

                    }else {
                        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + used_callback_num, post_task_callback_func, "POST",
                            {
                                "command": x['name'],
                                "params": JSON.stringify({
                                    "host": data['host'],
                                    "path": data['parent_path'],
                                    "file": data['name']
                                })
                            });
                        alertTop("info", "Tasked Callback " + used_callback_num + " to list file system", 2);
                        tasked = true;
                    }
                }
            });
            if (!tasked) {
                alertTop("warning", "Failed to find associated command for file_browser:list in callback " + used_callback_num, 2);
            }
        },
        task_list_file_refresh: function () {
            if (this.path === "" || this.path === undefined) {
                alertTop("warning", "No valid path specified");
                return;
            }
            if (!Object.prototype.hasOwnProperty.call(meta, this.callback)) {
                alertTop("warning", "No valid or active callback supplied");
                return;
            }
            this.task_list_file({
                "host": this.host,
                "parent_path": this.path,
                "name": ""
            });
        },
        task_remove_file: function(data){
            let tasked = false;
            let used_callback_num = task_data.manually_edit_file_browser_callback ? task_data.manual_file_browser_callback_num : task_data.callback;
            if (!Object.prototype.hasOwnProperty.call(meta, used_callback_num)) {
                alertTop("warning", "No valid or active callback supplied");
                return;
            }
            meta[used_callback_num]['commands'].forEach(function (x) {
                if (x["supported_ui_features"].includes("file_browser:remove") && !tasked) {
                    if(x["attributes"]["supported_os"].length > 0  && !x["attributes"]["supported_os"].includes(callbacks[used_callback_num]["payload_os"])){

                    }else {
                        $('#fileDeleteTextArea').val("HOST:\n" + data["host"] + "\n\nFILE:\n" + data["full_path"]);
                        $('#fileDeleteModal').modal('show');
                        $('#fileDeleteSubmit').unbind('click').click(function () {
                            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/callback/" + used_callback_num, post_task_callback_func, "POST",
                                {
                                    "command": x['name'],
                                    "params": JSON.stringify({
                                        "host": data['host'],
                                        "path": data['parent_path'],
                                        "file": data['name']
                                    })
                                });
                            alertTop("info", "Tasked Callback " + used_callback_num + " to remove file", 2);

                        });
                        tasked = true;
                    }
                }
            });
            if (!tasked) {
                alertTop("warning", "Failed to find associated command for file_browser:remove in callback " + used_callback_num, 2);
            }

        },
        view_file_data: function (data) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/filebrowserobj/" + data['id'] + "/permissions", (response)=>{
                    try{
                        let perms = JSON.parse(response);
                        if(perms['status'] === "success"){
                            try {
                                this.file_browser_permissions = JSON.parse(perms['permissions']);
                            } catch (error) {
                                this.file_browser_permissions = {"Permissions": perms['permissions']};
                            }
                        }else{
                            alertTop("warning", "Failed to fetch permissions: " + perms['error']);
                        }
                    }catch(error){
                        console.log(error);
                        alertTop("danger", "Session expired, please refresh");
                    }
                }, "GET", null);

            $('#fileBrowserPermissions').modal('show');
        },
        view_download_history: function (data) {
            // display the history of files associated that the user can choose from and download
            this.file_browser_history_files = data['files'];
            $('#fileBrowserDownloadHistory').modal('show');
        },
        get_file_download_path: function (file) {
            return "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + file['agent_file_id'];
        },
        get_task_view_path: function (file) {
            return "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + file['task'];
        },
        update_comment_live: function (task, data) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/comments/" + task, (response) => {
                try {
                    let rdata = JSON.parse(response);
                    if (rdata['status'] === 'error') {
                        alertTop("warning", rdata['error']);
                    }
                } catch (error) {
                    alertTop("error", "Session expired, please refresh");
                }
            }, "POST", {"comment": data});

        },
        move_up_folder_ui: function(folder){
            if(folder.parent === undefined || (folder.parent.$parent === undefined && folder.parent.parent === undefined)){
                alertTop("info", "Can't go higher up the tree");
            }else{
                if(folder.parent.$parent !== undefined ) {
                    task_data.setBrowserTableData(folder.parent.data, folder.parent.children, folder.parent.$parent);
                }else {
                    task_data.setBrowserTableData(folder.parent.data, folder.parent.children, folder.parent.parent);
                }
            }
        },
        task_file_upload: function () {
            let tasked = false;
            let used_callback_num = task_data.manually_edit_file_browser_callback ? task_data.manual_file_browser_callback_num : task_data.callback;
            if (this.path === "" || this.path === undefined) {
                alertTop("warning", "No valid path specified");
                return;
            }
            if (!Object.prototype.hasOwnProperty.call(meta, used_callback_num)) {
                alertTop("warning", "No valid or active callback supplied");
                return;
            }
            meta[used_callback_num]['commands'].forEach(function (x) {
                if (x["supported_ui_features"].includes("file_browser:upload") && !tasked) {
                    if(x["attributes"]["supported_os"].length > 0  && !x["attributes"]["supported_os"].includes(callbacks[used_callback_num]["payload_os"])){

                    }else {
                        //console.log(x);
                        tasked = true;
                        task_data.input_field = x['name'];
                        task_data.task_button({"data": x['name'], "cid": used_callback_num});
                    }
                }
            });
            if (!tasked) {
                alertTop("warning", "Failed to find associated command for " + callbacks[used_callback_num]['payload_type'] + " to upload files", 2);
            }
        },
        double_click_row: function (data, folder) {
            if (data.hasOwnProperty("children") && data.children !== undefined) {
                task_data.setBrowserTableData(data['data'], data['children'], folder);
                task_data.$forceUpdate();
            } else {
                if(data.data.is_file){
                    alertTop("info", "Cannot view children of files, only folders.");
                }
            }
        },
        set_manually_change_file_browser_callback_num: function(evt){
            this.manual_file_browser_callback_num = evt.target.value;
            this.manually_edit_file_browser_callback = true;
        },
        reset_manually_change_file_browser_callback_num: function(){
            this.manually_edit_file_browser_callback = false;
        }
    },
    computed: {
        hasFiltersSet: function () {
            return this.task_filters['task']['active'] || this.task_filters['operator']['active'] || this.task_filters['command']['cmd'];
        },
        get_cmd_index: function () {
            let cmd = this.input_field.split(" ")[0];
            let cid = this.input_field_placeholder['cid'];
            if (cmd !== "") {
                for (let i = 0; i < this.ptype_cmd_params[callbacks[cid]['payload_type']].length; i++) {
                    if (cmd === this.ptype_cmd_params[callbacks[cid]['payload_type']][i]['cmd']) {
                        return i;
                    }
                }
            }
            return -1;
        },
        get_payload_type: function () {
            let cid = this.input_field_placeholder['cid'];
            if (cid !== -1) {
                return callbacks[cid]['payload_type'];
            }
            return null;
        },
        taskable: function () {
            let cid = this.input_field_placeholder['cid'];
            if (cid === -1) {
                return false;
            }
            if (callbacks[cid]['locked']) {
                if (callbacks[cid]['locked_operator'] === "{{username}}") {
                    return true;
                }
            } else {
                return true;
            }
        },
        get_proxies: function () {
            return Object.keys(callback_table.callbacks).filter(function (elem) {
                return callback_table.callbacks[elem].port > 0;
            });
        }
    },
    delimiters: ['[[', ']]'],
});
Vue.component('tree-menu', {
    template: '<div class="tree-menu bg-card-body-l2">\n' +
        '    <div class="label-wrapper" @click="toggleChildren">\n' +
        '      <div :style="indent" :class="labelClasses">\n' +
        '      <template v-for="n in depth" style="color:gray">&nbsp;&nbsp;|&nbsp;</template>' +
        '        <i v-if="children" class="fa" :class="iconClasses"></i>\n' +
        '        [[process_id]] [[name]]\n' +
        '      </div>\n' +
        '    </div>\n' +
        '    <tree-menu \n' +
        '      v-if="showChildren"\n' +
        '      v-for="node in children" \n' +
        '      :children="node.children" \n' +
        '      :process_id="node.process_id"\n' +
        "      :name='node.name'\n" +
        '      :depth="depth + 1"   \n' +
        '      :callback_pid="callback_pid" \n' +
        '    >\n' +
        '    </tree-menu>\n' +
        '  </div>',
    props: ['children', 'process_id', 'depth', 'name', 'callback_pid'],
    data() {
        return {
            showChildren: true
        }
    },
    computed: {
        iconClasses() {
            if (Object.keys(this.children).length === 0) {
                return '';
            } else {
                return {
                    'far fa-plus': !this.showChildren,
                    'far fa-minus': this.showChildren
                }
            }
        },
        labelClasses() {
            let cls = "";
            if (Object.keys(this.children).length > 0) {
                cls += 'has-children-process ';
            }
            if (this.process_id === this.callback_pid) {
                cls += "is-callback ";
            }
            return cls;
        },
        indent() {
            //rreturn { transform: `translate(${this.depth * 30}px)`}
        }
    },
    methods: {
        toggleChildren() {
            this.showChildren = !this.showChildren;
        }
    },
    delimiters: ['[[', ']]']
});
Vue.component('browser-menu', {
    template: '<div class="browser-menu bg-card-body-l2">\n' +
        '    <div class="label-wrapper">\n' +
        '      <div :style="indent" :class="labelClasses">\n' +
        '      <span v-for="n in depth" style="color:gray">&nbsp;&nbsp;|&nbsp;</span>' +
        '        <template> <i :class="iconClasses" @click="toggleChildren" ></i>\n' +
        "             <span  @click='test' class='browser-name' :style='data.deleted ? \"text-decoration:line-through\" : \"\" '> [[ data.name ]] </span>" +
        '              <template v-if="data.loading === true">' +
        '                     <div class="spinner-border text-info" style="width:1rem;height:1rem"  role="status"> </div> fetching...' +
        '                </template>' +
        '              <template v-else-if="data.success === true">' +
        '                     <i style="color:green" class="fas fa-check"></i>' +
        '                </template>' +
        '               <template v-else-if="data.success === false">' +
        '                   <i style="color:indianred" class="fas fa-exclamation-circle"></i>' +
        '              </template>' +
        "                     <template v-if='data.hasOwnProperty(\"files\") && data[\"files\"].length > 0'>" +
        "<a class=\"btn btn-sm\" :href='get_latest_download_path()' style=\"color:green;padding-bottom:0;padding-top:0\"><i class=\"fas fa-download\"></i></a>" +
        "                     </template>" +
        '      </template>' +
        '      </div>\n' +
        '    </div>\n' +
        '    <browser-menu \n' +
        '      v-show="showChildren"\n' +
        '      v-for="node in children" \n' +
        '      :key="Object.values(node)[0].data.id" \n' +
        '      :parent="this"\n' +
        '      :children="Object.values(node)[0].children" \n' +
        '      :data="Object.values(node)[0].data"\n' +
        '      :depth="depth + 1"   \n' +
        '      :host="Object.values(node)[0].data.host" \n' +
        '    >\n' +
        '    </browser-menu>\n' +
        '  </div>',
    props: ['children', 'depth', 'data', 'host', 'parent'],
    data() {
        return {
            showChildren: true,
        }
    },
    computed: {
        iconClasses() {
            return {
                'fas fa-desktop': this.depth === 0,
                'far fa-file': this.data.is_file,
                'fas fa-folder': !this.showChildren && !this.data.is_file && this.depth > 0,
                'fas fa-folder-open': this.showChildren && !this.data.is_file && this.depth > 0,
            }
        },
        labelClasses() {
            let cls = "";
            if (!this.data.is_file) {
                cls += ' has-children ';
            }
            return cls;
        },
        indent() {
            //return { transform: `translate(${this.depth * 30}px)`}
        }
    },
    methods: {
        toggleChildren() {
            this.showChildren = !this.showChildren;
            if(this.showChildren){
                this.test();
            }
        },
        test() {
            if(this.data.is_file){
                task_data.setBrowserTableData(this.$parent.data, this.$parent.children, this.$parent);
                task_data.$forceUpdate();
                return;
            }
            if(this.depth === 0){
                this.$forceUpdate();
                task_data.setBrowserTableData(this.data, this.children, undefined);
                task_data.$forceUpdate();
                return;
            }
            let me = this;
            me.data.loading = true;
            me.$forceUpdate();
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/filebrowserobj/" + this.data.id + "/files", (response) => {
                    try {
                        let info = JSON.parse(response);
                        if (info["status"] === "success") {
                            setTimeout(() => {
                                Vue.nextTick().then(function () {
                                    if(me.children === undefined){
                                        me.children = [];
                                    }
                                    for(let i = 0; i < info["files"].length; i++){
                                        let found = false;
                                        for(let j = 0; j < me.children.length; j++){
                                            if(Object.values(me.children[j])[0].data.id === Object.values(info["files"][i])[0].data.id){
                                                found = true;
                                                break;
                                            }
                                        }
                                        if(!found){
                                            me.children.push(info["files"][i]);
                                        }
                                    }
                                    task_data.setBrowserTableData(me.data, me.children, me.$parent);
                                    setTimeout(() => { // setTimeout to put this into event queue
                                        // executed after render
                                        Vue.nextTick().then(function () {
                                            me.data.loading = false;
                                            me.$forceUpdate();
                                        });
                                    }, 0);
                                });
                            });
                        } else {
                            alertTop("danger", info["error"]);
                            me.data.loading = false;
                            me.$forceUpdate();
                        }
                    } catch (error) {
                        me.data.loading = false;
                        console.log(error.toString());
                        me.$forceUpdate();
                        alertTop("danger", "error fetching files in that folder.");
                    }
                },
                "GET", null);
        },
        get_latest_download_path() {
            return "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/download/" + this.data['files'][0]['agent_file_id'];
        }
    },
    delimiters: ['[[', ']]']
});

function startwebsocket_processlist(cid) {
    var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/process_list/' + cid);
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            Object.keys(meta).forEach(function (key) {
                if (meta[key]['process_list'] && callback_table.callbacks[key]['host'] === data['process_list']['host']) {
                    if(meta[key]['process_list_data']["timestamp"] !== data["process_list"]["timestamp"]){
                        // we have a new set of stuff coming in, so wipe the current data and start anew
                        Vue.set(meta[key], "process_list_data", {"host": data["process_list"]["host"],
                        "task": data["process_list"]["task"], "callback": data["process_list"]["callback"],
                        "timestamp": data["process_list"]["timestamp"], "process_list": data["process_list"]["process_list"]})
                    }else{

                    }
                    //Vue.set(meta[key], 'process_list_data', data['process_list']);
                    Vue.set(meta[key], 'process_list_tree', data['tree_list']);
                    task_data.$forceUpdate();
                    //alertTop("success", "Updated process list on " + data['process_list']['host']);
                }
            });
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

function add_comment_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] !== 'success') {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}
function remove_comment_callback(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] !== 'success') {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "Session expired, please refresh");
    }
}

var command_params = [];
var params_table = new Vue({
    el: '#paramsModal',
    data: {
        command_params,
        credentials: [],
        cmd: {},
        payloads: [],
        payloadonhost: {},
    },
    methods: {
        restore_default_values: function(){
            for(let i = 0; i < this.command_params.length; i ++){
                if(this.command_params[i].type === "Array"){
                    if(this.command_params[i].default_value.length > 0){
                        this.command_params[i].array_value = JSON.parse(this.command_params[i].default_value);
                    }
                    else{
                        this.command_params[i].array_value = [];
                    }
                }else if(this.command_params[i].type === "String"){
                    this.command_params[i].string_value = this.command_params[i].default_value;
                }else if(this.command_params[i].type === "Number"){
                    this.command_params[i].number_value = this.command_params[i].default_value;
                }else if(this.command_params[i].type === "Boolean"){
                    if(typeof  this.command_params[i].default_value === "string"){
		                try{
		                    this.command_params[i].boolean_value = JSON.parse( this.command_params[i].default_value.toLowerCase());
		                }catch(error){
		                    console.log(error);
		                    this.command_params[i].boolean_value = false;
		                }
		            }
	        	else{this.command_params[i].boolean_value =  this.command_params[i].default_value;}
                }
            }
        },
        command_params_add_array_element: function (param) {
            param.array_value.push('');
        },
        command_params_remove_array_element: function (param, index) {
            param.array_value.splice(index, 1);
        },
        manually_add_payloadonhost: function (param) {
            Vue.set(param, "manually_add_payloadonhost", true);
            Vue.set(param, "manually_add_payloadonhost_hostname", "");
            Vue.set(param, "manually_add_payloadonhost_template", this.payloads[0].uuid);
        },
        cancel_manually_add_payloadonhost: function (param) {
            Vue.set(param, "manually_add_payloadonhost", false);
            Vue.set(param, "manually_add_payloadonhost_hostname", "");
            Vue.set(param, "manually_add_payloadonhost_template", "");
        },
        submit_manually_add_payloadonhost: function (param) {
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadonhost/", (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        //it should auto-populate in the rest of the dialog
                        Vue.set(param, "agentconnect_host", "");
                        Vue.set(param, "agentconnect_payload", "");
                        Vue.set(param, "c2profiles", []);
                        Vue.set(param, "agentconnect_c2profile", -1);
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    console.log(error.toString() + " in submit_manually_add_payloadonhost");
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "POST", {
                "host": param.manually_add_payloadonhost_hostname,
                "uuid": param.manually_add_payloadonhost_template
            });
            Vue.set(param, "manually_add_payloadonhost", false);
            Vue.set(param, "manually_add_payloadonhost_hostname", "");
            Vue.set(param, "manually_add_payloadonhost_template", "");
        },
        delete_host: function (param) {
            if (param.agentconnect_host === "") {
                return
            }
            let host = btoa(param.agentconnect_host);
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadonhost/host/" + host, (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        //it should auto-populate in the rest of the dialog
                        param.agentconnect_payload = "";
                        param.c2profiles = [];
                        param.agentconnect_c2profile = -1;
                        param.payloads = [];
                        param.agentconnect_host = "";
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    console.log(error.toString() + " in submit_manually_add_payloadonhost");
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "DELETE", null);
        },
        delete_payload_on_host: function (param) {
            if (param.agentconnect_host === "") {
                return
            }
            if (param.agentconnect_payload === "") {
                alertTop("warning", "Must select a payload to remove", 5, "Mythic");
                return;
            }
            if (params_table.payloadonhost[param.agentconnect_host][param.agentconnect_payload]['type'] === 'callback') {
                alertTop("info", "Can't delete a Callback here", 5, "Mythic");
                return;
            }
            let payload = params_table.payloadonhost[param.agentconnect_host][param.agentconnect_payload]['id'];
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadonhost/payload/" + payload, (response) => {
                try {
                    let data = JSON.parse(response);
                    if (data['status'] === 'success') {
                        //it should auto-populate in the rest of the dialog
                        param.agentconnect_payload = "";
                        param.c2profiles = [];
                        param.agentconnect_c2profile = -1;
                        let payloads = [];
                        //console.log(data);
                        params_table.payloadonhost[param.agentconnect_host].forEach((x) => {
                            //console.log(x);
                            for (let i = 0; i < x['supported_profiles'].length; i++) {
                                if (x['supported_profiles'][i]['is_p2p'] && x['id'] !== data['payload']['id']) {
                                    payloads.push(x);
                                    break;
                                }
                            }
                        });
                        param.payloads = payloads;
                        param.agentconnect_host = "";
                    } else {
                        alertTop("warning", data['error']);
                    }
                } catch (error) {
                    console.log(error.toString() + " in submit_manually_add_payloadonhost");
                    alertTop("danger", "Session expired, please refresh");
                }
            }, "DELETE", null);
        },
        select_specific_payload_on_host: function (param) {
            if (param.agentconnect_host !== "") {
                let payloads = [];
                params_table.payloadonhost[param.agentconnect_host].forEach((x) => {
                    if("supported_profiles" in x){
                        for (let i = 0; i < x['supported_profiles'].length; i++) {
                            if (x['supported_profiles'][i]['is_p2p']) {
                                payloads.push(x);
                                break;
                            }
                        }
                    }
                });
                param.payloads = payloads;
                param.agentconnect_c2profile = -1;
                param.agentconnect_payload = "";
                param.c2profiles = [];
            } else {
                param.payloads = [];
                param.c2profiles = [];
                param.agentconnect_c2profile = -1;
                param.agentconnect_payload = "";
            }
            params_table.$forceUpdate();
        },
        select_specific_c2profile_in_agent: function (param) {
            if (params_table.payloadonhost[param.agentconnect_host][param.agentconnect_payload] !== undefined) {
                param.c2profiles = param.payloads[param.agentconnect_payload]['supported_profiles'];
                param.agentconnect_c2profile = -1;
            } else {
                param.c2profiles = [];
                param.agentconnect_c2profile = -1;
            }
        },
        split_input_params: function (param, index) {
            if (param.array_value[index].includes("\n")) {
                let pieces = param.array_value[index].split("\n");
                for (let i = 1; i < pieces.length; i++) {
                    param.array_value.push(pieces[i]);
                }
                param.array_value[index] = pieces[0];
            }
        },
        credential_filter: function (component) {
            return this.credentials.filter(function (value, index, arr) {
                for (let i = 0; i < index; i++) {
                    if (value[component] === arr[i][component]) {
                        return false;
                    }
                }
                return true;
            });
        }
    },
    computed: {
        accounts: function () {
            return this.credential_filter('account');
        },
        realms: function () {
            return this.credential_filter('realm');
        },
        types: function () {
            return this.credential_filter('type');
        },
        credentials_unique: function () {
            return this.credential_filter('credential');
        }
    },
    delimiters: ['[[', ']]']
});

function view_callback_screenshots(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            if (!Object.prototype.hasOwnProperty.call(meta[data['callback']], 'images')) {
                meta[data['callback']]['images'] = [];
            }
            for (let i = 0; i < data['files'].length; i++) {
                data['files'][i]['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + data['files'][i]['agent_file_id'];
                let found = false;
                for (let j = 0; j < meta[data['callback']]['images'].length; j++) {
                    if (meta[data['callback']]['images'][j]['id'] === data['files'][i]['id']) {
                        // update the value
                        found = true;
                    }
                }
                if (!found) {
                    meta[data['callback']]['images'].push(data['files'][i]);
                }
            }
            task_data.$forceUpdate();
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }

}

function view_callback_keylogs(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            //meta[data['callback']]['keylog_data'] = [];
            //console.log(data['keylogs']);
            Vue.set(meta[data['callback']], 'keylog_time', false);
            Vue.set(meta[data['callback']], 'keylog_data', data['keylogs']);
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }
}

function post_task_callback_func(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === 'error') {
            alertTop("danger", data['error']);
            task_data.input_field = data['cmd'] + " " + data['params'];
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }
}

function startwebsocket_callbacks() {
    alertTop("info", "Loading callbacks...", 1);
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/callbacks/current_operation');
    //add in a symbol initial node in the graph view for the mythic server
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let cb = JSON.parse(event.data);
            if (!cb['active']) {
                return;
            }
            add_callback_to_view(cb);
        } else {
            if (finished_callbacks === false) {
                startwebsocket_commands();
                finished_callbacks = true;
            }
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

function remove_callback_from_view(id) {
    // clear out the data from memory
    task_data.$delete(task_data.meta, id);
    delete all_tasks[id];
    callback_table.$delete(callback_table.callbacks, id);
    for (let i = 0; i < callback_table.graph_view_pieces.json_data.nodes.length; i++) {
        if (callback_table.graph_view_pieces.json_data.nodes[i]['id'] === id) {
            //console.log("removing node: " + id);
            callback_table.graph_view_pieces.json_data.nodes.splice(i, 1);
            break;
        }
    }
    for (let i = 0; i < callback_table.tree_view_pieces.elements.length; i++) {
        if (callback_table.tree_view_pieces.elements[i]['id'] === id) {
            callback_table.tree_view_pieces.elements.splice(i, 1);
            break;
        }
    }
    if (callback_table.view_selection === 'graph view') {
        callback_table.graph_node_update();
    } else if (callback_table.view_selection === 'tree view') {
        callback_table.tree_node_update();
    }

}

function add_callback_to_view(cb) {
    //console.log(cb);
    if (callbacks[cb.id] !== undefined) {
        return
    }
    let color = generate_background_color(cb['id']);
    cb['real_time'] = "0:0:0:0";
    cb['bg_color'] = color;
    cb['selected'] = false;
    cb['personal_description'] = "";
    Vue.set(callbacks, cb['id'], cb);
    Vue.set(task_data.meta, cb['id'], {
        'id': cb['id'],
        'tasks': false,
        'console_selected': false,
        'data': task_data.tasks,
        'display': cb['user'] + "@" + cb['host'] + "(Callback: " + cb['id'] + ")",
        'screencaptures': false,
        'screencaptures_selected': false,
        'bg_color': color,
        'history': [],
        'history_index': 0,
        'keylogs': false,
        'keylogs_selected': false,
        'process_list': false,
        'process_list_selected': false,
        'proxies_selected': false,
        'file_browser_selected': false,
        'process_list_filter': "",
        'badges': 0,
        'description': cb['description'],
        'payload_description': cb['payload_description'],
        'tokens': cb['tokens']
    });
    // check to see if we have this payload type in our list, if not, request the commands for it
    if (!Object.prototype.hasOwnProperty.call(task_data.ptype_cmd_params, cb['payload_type'])) {
        task_data.ptype_cmd_params[cb['payload_type']] = [];
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/payloadtypes/" + cb['payload_type_id'] + "/commands", register_new_command_info, "GET", null);
    }
    let found = false;
    for (let i = 0; i < callback_table.graph_view_pieces.json_data.nodes.length; i++) {
        if (callback_table.graph_view_pieces.json_data.nodes[i]['id'] === cb['id']) {
            found = true;
            callback_table.graph_view_pieces.json_data.nodes[i] = cb;
            break;
        }
    }
    if (!found) {
        callback_table.graph_view_pieces.json_data.nodes.push(cb);
    }
    found = false;
    for (let i = 0; i < callback_table.tree_view_pieces.elements.length; i++) {
        if (callback_table.tree_view_pieces.elements[i]['id'] === cb['id']) {
            callback_table.tree_view_pieces.elements[i] = cb;
            found = true;
            break;
        }
    }
    if (!found) {
        callback_table.tree_view_pieces.elements.push(cb);
    }
    if (callback_table.view_selection === 'graph view') {
        callback_table.graph_node_update();
    } else if (callback_table.view_selection === 'tree view') {
        callback_table.tree_node_update();
    }
    cb['type'] = 'callback';
    if (cb['host'] in params_table.payloadonhost) {
        // just add to the list
        Vue.set(params_table.payloadonhost[cb['host']], params_table.payloadonhost[cb['host']].length, cb);
        //params_table.payloadonhost[cb['host']].push(cb);
    } else {
        Vue.set(params_table.payloadonhost, cb['host'], [cb]);
        //params_table.payloadonhost[cb['host']] = [cb];
    }
}

function update_callback_in_view(rsp) {
    if (callbacks[rsp.id] !== undefined) {
        //if the callback already exists in our view, update it
        //callbacks[rsp.id]['last_checkin'] = rsp['last_checkin'];
        if (rsp.id in meta) {
            meta[rsp.id]['description'] = rsp['description']; // this updates the tab name
            if (rsp['active'] === false) {
                task_data.meta[rsp.id]['tasks'] = false;
                task_data.meta[rsp.id]['screencaptures'] = false;
                task_data.meta[rsp.id]['keylogs'] = false;
                task_data.meta[rsp.id]['process_list'] = false;
                task_data.meta[rsp.id]['file_browser'] = false;
            }
            Vue.set(meta[rsp.id], 'tokens', rsp['tokens']);
            if(task_data.input_field_placeholder["cid"] === rsp.id){
                task_data.callback_tokens = rsp["tokens"];
                if(task_data.selected_token === undefined){
                    if(task_data.callback_tokens.length > 0){
                        task_data.selected_token = task_data.callback_tokens[0]["token"]["TokenId"];
                    }
                }
            }
        }
        Vue.set(callbacks, rsp.id, Object.assign(callbacks[rsp.id], rsp));
        //callbacks[rsp.id]['port'] = rsp['port'];
    } else {
        //callback isn't available in our view,  so load it up
        if (rsp.active) {
            add_callback_to_view(rsp);
        }
    }
}

//we will get back a series of commands and their parameters for a specific payload type, keep track of this in ptype_cmd_params so we can
//  respond to help requests and build dynamic forms for getting command data
function register_new_command_info(response) {
    try {
        let data = JSON.parse(response);
        if (data['status'] === "success") {
            delete data['status'];
            if (data['commands'].length > 0) {
                for(let i = 0; i < data["commands"].length; i++){
                    data["commands"][i]["attributes"] = JSON.parse(data["commands"][i]["attributes"]);
                }
                data['commands'].push({
                    "cmd": "help",
                    "params": [],
                    "help_cmd": "help [command]",
                    "supported_ui_features": [],
                    "attributes": {"supported_os": []},
                    "description": "get the description and cmd  usage of a command"
                });
                data['commands'].push({
                    "cmd": "clear",
                    "params": [],
                    "help_cmd": "clear [all|task_num]",
                    "supported_ui_features": [],
                    "attributes": {"supported_os": []},
                    "description": "clear a task from the server before an agent has picked it up"
                });

                task_data.ptype_cmd_params[data['commands'][0]['payload_type']] = data['commands'];
            }
        } else {
            alertTop("danger", data['error']);
        }
    } catch (error) {
        alertTop("danger", "session expired, refresh please");
    }
}

function add_new_task(tsk, from_websocket) {
    try {
        if (callbacks[tsk['callback']]) {
            if (callbacks[tsk['callback']]['active'] === false) {
                return;
            }
        }
        if (!(tsk['callback'] in all_tasks)) {
            // if there is NOT this specific callback.id in the tasks dictionary
            // then create it as an empty dictionary
            Vue.set(all_tasks, tsk['callback'], {}); //create an empty dictionary
        }
        if (tsk.id in all_tasks[tsk['callback']]) {
            // we already have this task, so we're actually going to update it
            Vue.set(all_tasks[tsk['callback']], tsk['id'], Object.assign({}, all_tasks[tsk.callback][tsk.id], tsk));
        } else {
            tsk.href = "{{http}}://{{links.server_ip}}:{{links.server_port}}/tasks/" + tsk.id;
            tsk.use_scripted = true;
            if (tsk.badges === undefined) {
                tsk.badges = 0;
            }
            if (tsk.expanded === undefined) {
                tsk.expanded = false;
            }
            Vue.set(all_tasks[tsk['callback']], tsk['id'], tsk);
            if (tsk['command'] !== undefined) {
                task_data.meta[tsk['callback']]['history'].push({
                    "command": tsk['command'],
                    "params": tsk['original_params'],
                    "operator": tsk['operator']
                }); // set up our cmd history
            } else {
                task_data.meta[tsk['callback']]['history'].push({
                    "command": "",
                    "params": tsk['original_params'],
                    "operator": tsk['operator']
                }); // set up our cmd history
            }

            task_data.meta[tsk['callback']]['history_index'] = task_data.meta[tsk['callback']]['history'].length;
            // in case this is the first task and we're waiting for it to show up, reset this
            if (!Object.prototype.hasOwnProperty.call(task_data.meta, tsk['callback'])) {
                task_data.meta[tsk['callback']] = {};
            }
            //console.log(meta[tsk['callback']]);
            if (!meta[tsk['callback']]['console_selected'] && from_websocket) {
                meta[tsk['callback']]['badges'] += 1;
            }
            task_data.meta[tsk['callback']].data = all_tasks[tsk['callback']];
            if (Math.abs((Math.floor($('#bottom-tabs-content').scrollTop()) + $('#bottom-tabs-content').height() - $('#bottom-tabs-content')[0].scrollHeight)) < 40) {
                setTimeout(() => { // setTimeout to put this into event queue
                    // executed after render
                    Vue.nextTick().then(function () {
                        $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
                    });
                }, 0);
            }
        }
    } catch (e) {
        console.log("error in add_new_task");
        console.log(e.stack());
        console.log(e.toString());
    }
}

function add_new_response(rsp, from_websocket) {
    try {
        //console.log(rsp);
        //console.log(from_websocket);
        if (rsp['task']['callback'] in all_tasks) {
            //if we have that callback id in our all_tasks list
            if (!all_tasks[rsp['task']['callback']][rsp['task']['id']]) {
                //console.log("task not in callback");
                Vue.set(all_tasks[rsp['task']['callback']], rsp['task']['id'], {"expanded": false});
            }
            //if we get a response for a task that hasn't been expanded yet to see all prior output, do that instead
            //console.log("in add_new_response, expanded is: ");
            let first_response = false;
            if (!all_tasks[rsp['task']['callback']][rsp['task']['id']]['response']) {
                //but we haven't received any responses for the specified task_id
                Vue.set(all_tasks[rsp['task']['callback']] [rsp['task']['id']], 'response', {});
                first_response = true;
            }
            if (all_tasks[rsp['task']['callback']][rsp['task']['id']]['expanded'] === false && !first_response && from_websocket) {
                all_tasks[rsp['task']['callback']][rsp['task']['id']]['badges'] += 1;
                return;
            }
            if (!meta[rsp['task']['callback']]['console_selected'] && from_websocket) {
                meta[rsp['task']['callback']]['badges'] += 1;
            }
            // all_tasks->callback->task->response->id = timestamp, responsevalue
            Vue.set(all_tasks[rsp['task']['callback']] [rsp['task']['id']] ['response'], rsp['id'], rsp);
            all_tasks[rsp['task']['callback']][rsp['task']['id']]['expanded'] = true;
            //now that the new response has been added, potentially update the scripted version
            if (Object.prototype.hasOwnProperty.call(browser_scripts, rsp['task']['command_id']) && all_tasks[rsp['task']['callback']][rsp['task']['id']]['use_scripted']) {
                try {
                    Vue.set(all_tasks[rsp['task']['callback']][rsp['task']['id']], 'scripted', browser_scripts[rsp['task']['command_id']](rsp['task'], Object.values(all_tasks[rsp['task']['callback']][rsp['task']['id']]['response'])));
                }catch(error){
                    Vue.set(all_tasks[rsp['task']['callback']][rsp['task']['id']], "use_scripted", false);
                    console.log(error.toString());
                    alertTop("warning", rsp['task']["command"] + " hit a browserscript exception");
                }
            }
            if (from_websocket) {
                //we want to make sure we have this expanded by default
                let el = document.getElementById("bottom-tabs-content");
                // console.log(el.scrollHeight - el.scrollTop - el.clientHeight);
                $('#cardbody' + rsp['task']['id']).collapse('show');
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) {
                    $('#cardbody' + rsp['task']['id']).on('shown.bs.collapse', function () {
                        $('#bottom-tabs-content').scrollTop($('#bottom-tabs-content')[0].scrollHeight);
                        task_data.$forceUpdate();
                        $('#color-arrow' + rsp['task']['id']).removeClass('fa-plus').addClass('fa-minus');
                    });
                } else {
                    $('#cardbody' + rsp['task']['id']).on('shown.bs.collapse', function () {
                        task_data.$forceUpdate();
                        $('#color-arrow' + rsp['task']['id']).removeClass('fa-plus').addClass('fa-minus');
                    });
                }
            }
        }
    } catch (error) {
        console.log(error.toString());
    }
}

function get_all_responses(taskid) {
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/tasks/" + taskid, (response) => {
        try {
            let data = JSON.parse(response);
            for (let resp in data['responses']) {
                add_new_response(data['responses'][resp], false);
            }
            task_data.$forceUpdate();
        } catch (error) {
            alertTop("danger", "Session expired, please refresh");
        }
    }, "GET", null);
}

function startwebsocket_updatedcallbacks() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/updatedcallbacks/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let rsp = JSON.parse(event.data);
            if (rsp['channel'] === 'updatedcallback') {
                update_callback_in_view(rsp);
            }
        }
    }
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

function startwebsocket_newkeylogs() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/keylogs/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let rsp = JSON.parse(event.data);
            //console.log(rsp);
            let key_stroke_alert = rsp['keystrokes'];
            //alertTop("success", key_stroke_alert, 2, "New Keylog from " + rsp['task']);
            //console.log(rsp);
            if (task_data.meta[rsp['callback']['id']]['keylogs'] === true) {
                //only try to update a view if the view is actually open
                let added = false;
                for (let w in task_data.meta[rsp['callback']['id']]['keylog_data']) {
                    //console.log(w);
                    if (w === rsp['window']) {
                        task_data.meta[rsp['callback']['id']]['keylog_data'][w].push(rsp);
                        added = true;
                        break;
                    }
                }
                if (!added) {
                    Vue.set(task_data.meta[rsp['callback']['id']]['keylog_data'], rsp['window'], [rsp]);
                }
                task_data.$forceUpdate();
            }
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_newkeylogs();

function startwebsocket_commands() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/all_command_info');
    let got_all_commands = false;
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            // first determine if we're dealing with command, parameter
            if (task_data.ptype_cmd_params[data['payload_type']] === undefined) {
                return
            }
            if (data['notify'].includes("parameters")) {
                // we're dealing with new/update/delete for a command parameter
                for (let i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++) {
                    if (task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']) {
                        // now we need to do something with a param in task_data.ptype_cmd_params[data['payload_type']][i]['params']
                        if (data['notify'] === "newcommandparameters") {
                            // we got a new parameter, so just push it
                            task_data.ptype_cmd_params[data['payload_type']][i]['params'].push(data);
                            return;
                        }
                        for (let j = 0; j < task_data.ptype_cmd_params[data['payload_type']][i]['params'].length; j++) {
                            // now we're either updating or deleting, so we need to find that param
                            if (data['name'] === task_data.ptype_cmd_params[data['payload_type']][i]['params'][j]['name']) {
                                if (data['notify'] === "deletedcommandparameters") {
                                    // now we found the parameter to remove
                                    task_data.ptype_cmd_params[data['payload_type']][i]['params'].splice(j, 1);
                                    return;
                                } else {
                                    // we're editing the parameter and found the one to edit
                                    Vue.set(task_data.ptype_cmd_params[data['payload_type']][i]['params'], j, data);
                                    return;
                                }
                            }
                        }
                    }
                }
            } else {
                // we're dealing with new/update/delete for a command
                if (data['notify'] === "newcommand") {
                    data['params'] = [];
                    data["attributes"] = JSON.parse(data["attributes"]);
                    task_data.ptype_cmd_params[data['payload_type']].push(data);
                } else if (data['notify'] === "deletedcommand") {
                    // we don't get 'payload_type' like normal, instead, we get payload_type_id which doesn't help
                    for (const [key, value] of Object.entries(task_data.ptype_cmd_params)) {
                        for (let i = 0; i < value.length; i++) {
                            if (value[i]['id'] === data['id']) {
                                // we found the value to remove
                                task_data.ptype_cmd_params[key].splice(i, 1);
                                return;
                            }
                        }
                    }
                } else {
                    for (let i = 0; i < task_data.ptype_cmd_params[data['payload_type']].length; i++) {
                        if (task_data.ptype_cmd_params[data['payload_type']][i]['cmd'] === data['cmd']) {
                            data["attributes"] = JSON.parse(data["attributes"]);
                            Vue.set(task_data.ptype_cmd_params[data['payload_type']], i, Object.assign({}, task_data.ptype_cmd_params[data['payload_type']][i], data));
                        }
                    }
                }
            }
        } else if (got_all_commands === false) {
            got_all_commands = true;
            // executed after render
            Vue.nextTick().then(function () {
                setTimeout(() => { // setTimeout to put this into event queue
                    let current_tabs = localStorage.getItem("tasks");
                    if (current_tabs !== null) {
                        current_tabs = JSON.parse(current_tabs);
                        for (let i in current_tabs) {
                            if (i in callback_table.callbacks) {
                                callback_table.interact_button(callback_table.callbacks[i]);
                            } else {
                                delete current_tabs[i];
                            }
                        }
                        //localStorage.setItem("tasks", JSON.stringify(current_tabs));
                    }
                    current_tabs = localStorage.getItem("screencaptures");
                    if (current_tabs !== null) {
                        current_tabs = JSON.parse(current_tabs);
                        for (let i in current_tabs) {
                            if (i in callback_table.callbacks) {
                                callback_table.show_screencaptures(callback_table.callbacks[i]);
                            } else {
                                delete current_tabs[i];
                            }
                        }
                        //localStorage.setItem("tasks", JSON.stringify(current_tabs));
                    }
                    current_tabs = localStorage.getItem("keylogs");
                    if (current_tabs !== null) {
                        current_tabs = JSON.parse(current_tabs);
                        for (let i in current_tabs) {
                            if (i in callback_table.callbacks) {
                                callback_table.show_keylogs(callback_table.callbacks[i]);
                            } else {
                                delete current_tabs[i];
                            }
                        }
                        //localStorage.setItem("tasks", JSON.stringify(current_tabs));
                    }
                    current_tabs = localStorage.getItem("process_list");
                    if (current_tabs !== null) {
                        current_tabs = JSON.parse(current_tabs);
                        for (let i in current_tabs) {
                            if (i in callback_table.callbacks) {
                                callback_table.show_process_list(callback_table.callbacks[i]);
                            } else {
                                delete current_tabs[i];
                            }
                        }
                        //localStorage.setItem("tasks", JSON.stringify(current_tabs));
                    }
                }, 0);
            });
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_callbacks();  // get new callbacks brought into the UI
setInterval(updateClocks, 500); // update every 50 ms

startwebsocket_updatedcallbacks();  // update  callback  views in the UI
startwebsocket_callback_graphedges();

function startwebsocket_callback(cid) {
    // get updated information about our callback
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/unified_callback/' + cid);
    meta[cid]['commands'] = [];
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            //console.log("got new message through websocket: " + data['channel']);
            if (data['channel'] === "updatedcallback") {
                update_callback_in_view(data);
            } else if (data['channel'].includes("task")) {
                add_new_task(data, true);
            } else if (data['channel'].includes("response")) {
                add_new_response(data, true);
            } else if (data['channel'].includes("filemeta")) {
                add_new_filemeta(data);
            } else if (data['channel'].includes("loadedcommand")){
                update_loaded_commands(data);
            } else{
                console.log("Unknown message from server: " + event.data);
            }
        }
    };
    return ws;
}
function update_loaded_commands(data){
    if (!Object.prototype.hasOwnProperty.call(meta[data['callback']], 'commands')) {
        meta[data['callback']]['commands'] = [];
    }
    if(data['channel'].includes("new")){
        meta[data['callback']]['commands'].push({"name": data['command'],
            "version": data["version"],
            "attributes": JSON.parse(data["attributes"]),
            "supported_ui_features": data["supported_ui_features"]});
        meta[data['callback']]['commands'].sort((a, b) => (b.name > a.name) ? -1 : ((a.name > b.name) ? 1 : 0));
    }else if(data['channel'].includes("updated")){
        for(let i = 0; i < meta[data['callback']]['commands'].length; i++){
            if(meta[data['callback']]['commands'][i]["name"] === data["command"]){
                meta[data['callback']]['commands'][i]["version"] = data["version"];
                 meta[data['callback']]['commands'][i]["attributes"] = JSON.parse(data["attributes"]);
                 meta[data['callback']]['commands'][i]["supported_ui_features"] = data["supported_ui_features"];
                return;
            }
        }
    } else{
        for(let i = 0; i < meta[data['callback']]['commands'].length; i++){
            if(meta[data['callback']]['commands'][i]["name"] === data["command"]){
                delete meta[data['callback']]['commands'][i];
                return;
            }
        }
    }
}
function add_new_filemeta(data) {
    if (data['is_screenshot']) {
        if (!Object.prototype.hasOwnProperty.call(meta[data['callback_id']], 'images')) {
            meta[data['callback_id']]['images'] = [];
        }
        for (let i = 0; i < meta[data['callback_id']]['images'].length; i++) {
            if (meta[data['callback_id']]['images'][i]['id'] === data['id']) {
                Vue.set(meta[data['callback_id']]['images'], i, Object.assign({}, meta[data['callback_id']]['images'][i], data));
                return;
            }
        }
        data['remote_path'] = "{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/files/screencaptures/" + data['agent_file_id'];
        meta[data['callback_id']]['images'].push(data);
    }
}

//autocomplete function taken from w3schools: https://www.w3schools.com/howto/howto_js_autocomplete.asp
function autocomplete(inp, arr) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    let currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function () {
        let a, b, i, val = task_data.input_field;
        let longest = 0;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) {
            return false;
        }
        currentFocus = 0;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        a.setAttribute("style", "max-height:calc(40vh);overflow-y:auto");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        let element_count = 0;
        for (i = 0; i < meta[task_data.input_field_placeholder['cid']]["commands"].length; i++) {
            /*check if the item starts with the same letters as the text field value:*/
            if (meta[task_data.input_field_placeholder['cid']]["commands"][i]["name"].toUpperCase().includes(val.toUpperCase()) &&
                (meta[task_data.input_field_placeholder['cid']]["commands"][i]["attributes"]["supported_os"].length === 0  ||
                meta[task_data.input_field_placeholder['cid']]["commands"][i]["attributes"]["supported_os"].includes(callbacks[task_data.input_field_placeholder['cid']]["payload_os"])
        )
            ) {
                /*create a DIV element for each matching element:*/
                if (meta[task_data.input_field_placeholder['cid']]["commands"][i]["name"].length > longest) {
                    longest = meta[task_data.input_field_placeholder['cid']]["commands"][i]["name"].length;
                }
                b = document.createElement("DIV");
                if(element_count === 0){
                    //b.style = "background-color:{{ config['highlight'] }};"
                    b.classList.add("autocomplete-active");
                }
                /*make the matching letters bold:*/
                let start = meta[task_data.input_field_placeholder['cid']]["commands"][i]["name"].toUpperCase().indexOf(val.toUpperCase());
                b.innerHTML = meta[task_data.input_field_placeholder['cid']]["commands"][i]["name"].substr(0, start);
                b.innerHTML += "<strong><span class='matching'>" + meta[task_data.input_field_placeholder['cid']]["commands"][i]["name"].substr(start, val.length) + "</span></strong>";
                b.innerHTML += meta[task_data.input_field_placeholder['cid']]["commands"][i]["name"].substr(val.length + start);
                /*insert a input field that will hold the current array item's value:*/
                b.innerHTML += "<input type='hidden' value='" + meta[task_data.input_field_placeholder['cid']]["commands"][i]["name"] + "'>";
                /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function () {
                    /*insert the value for the autocomplete text field:*/
                    task_data.input_field = this.getElementsByTagName("input")[0].value;
                    /*close the list of autocompleted values,
                    (or any other open lists of autocompleted values:*/
                    closeAllLists();
                });
                a.appendChild(b);
                element_count += 1;
            }
            a.style.width = longest + 2 + "em";
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function (e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode === 9) {
            try {
                //we want to close the autocomplete menu and fill in with the top-most element
                if (currentFocus === -1) {
                    let val = "";
                    for(let j = 0; j < x.length; j++){
                        if(task_data.input_field.toLowerCase() === x[j].textContent.toLowerCase()){
                            val = x[j].textContent;
                            break;
                        }
                    }
                    if(val === ""){
                        val = x[0].textContent;
                    }
                    task_data.input_field = val;
                } else {
                    task_data.input_field = x[currentFocus].textContent;
                }
                e.preventDefault();
                closeAllLists("");
            } catch (error) {
                //there must not be any autocomplete stuff, so just let it go on
            }
        } else if (e.keyCode === 38 && x !== null) {
            //keycode UP arrow
            if (x.length > 0) {
                currentFocus--;
                addActive(x);
                e.stopImmediatePropagation();
            }
        } else if (e.keyCode === 40 && x !== null) {
            //keycode DOWN arrow
            if (x.length > 0) {
                currentFocus++;
                addActive(x);
                e.stopImmediatePropagation();
            }
        } else if (e.keyCode === 27 && x !== null) {
            closeAllLists();
        } else if (e.keyCode === 13 && x !== null && x.length > 0) {
            //user hit enter
            if (currentFocus === -1) {
                let val = "";
                for(let j = 0; j < x.length; j++){
                    if(task_data.input_field.toLowerCase() === x[j].textContent.toLowerCase()){
                        val = x[j].textContent;
                        break;
                    }
                }
                if(val === ""){
                    val = x[0].textContent;
                }
                task_data.input_field = val;
                e.preventDefault();
                closeAllLists("");
                e.stopImmediatePropagation();
            } else {
                task_data.input_field = x[currentFocus].textContent;
                e.preventDefault();
                closeAllLists("");
                e.stopImmediatePropagation();
            }
        }
    });

    function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
        task_data.input_field = x[currentFocus].getElementsByTagName("input")[0].value;
    }

    function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        let x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt !== x[i] && elmnt !== inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

(function () {
    // hold onto the drop down menu
    let dropdownMenu;

    // and when you show it, move it to the body
    $(window).on('show.bs.dropdown', function (e) {

        // grab the menu
        dropdownMenu = $(e.target).find('.dropdown-menu');

        // detach it and append it to the body
        $('body').append(dropdownMenu.detach());

        // grab the new offset position
        let eOffset = $(e.target).offset();

        // make sure to place it where it would normally go (this could be improved)
        dropdownMenu.css({
            'display': 'block',
            'top': eOffset.top + $(e.target).outerHeight(),
            'left': eOffset.left
        });
    });

    // and when you hide it, reattach the drop down, and hide it normally
    $(window).on('hide.bs.dropdown', function (e) {
        $(e.target).append(dropdownMenu.detach());
        dropdownMenu.hide();
    });
})();

function updateClocks() {
    let date = new Date();
    let now = date.getTime() + date.getTimezoneOffset() * 60000;
    for (let key in callbacks) {
        // update each 'last_checkin' time to be now - that value
        let checkin_time = new Date(callbacks[key]['last_checkin']);
        //callbacks[key]['real_time'] = timeConversion(now - checkin_time);
        //callbacks[key]['real_time'] = now - checkin_time;
        Vue.set(callbacks[key], 'real_time', now - checkin_time);
    }
}

//we want to allow some keyboard shortcuts throughout the main interface
document.onkeydown = function (e) {
    let key = e.which || e.keyCode;
    //console.log(key);
    if (e.ctrlKey && key === 221) {
        // this is ctrl + [
        move('right');
    } else if (e.ctrlKey && key === 219) {
        // this is ctrl + ]
        move('left');
    }
};

function move(to) {

    let index = -1;
    let all = $('#bottom-tabs .nav-item');
    let total = all.length;
    if (total === 0) {
        return;
    }
    for (let i = 0; i < total; i++) {
        if (all[i].children[0].style['font-weight'] === "bold") {
            index = i;
            break;
        }
    }
    //console.log(current);
    if (index === -1) {
        return;
    }
    let add;
    switch (to) {
        case 'left':
            add = -1;
            break;
        case 'right':
            add = 1;
            break;
    }
    let new_index = index + add;
    if (new_index < 0) {
        new_index = total - 1;
    } else {
        new_index = new_index % total;
    }
    let new_tab = all[new_index];
    //task_data.select_tab(meta[new_id]);
    setTimeout(() => { // setTimeout to put this into event queue
        // executed after render
        new_tab.children[0].click();
    }, 0);

    //new_tab.children[0].click();
}
/* eslint-disable no-unused-vars */
// this is called via Vue from the HTML code
function timeConversion(millisec) {
    let seconds = Math.trunc(((millisec / 1000)) % 60);
    let minutes = Math.trunc(((millisec / (1000 * 60))) % 60);
    let hours = Math.trunc(((millisec / (1000 * 60 * 60))) % 24);
    let days = Math.trunc(((millisec / (1000 * 60 * 60 * 24))) % 365);
    let output = "";
    if(days !== 0){ output += days + "d";}
    if(hours !== 0){ output += hours + "h";}
    if(minutes !== 0){ output += minutes + "m";}
    output += seconds + "s";
    return output;
    //return days + ":" + hours + ":" + minutes + ":" + seconds;
}
/* eslint-enable no-unused-vars */
function generate_background_color() {
    return '{{ config["new-callback-color"] }}';

}

function remove_from_storage(group, id) {
    let current_tabs = localStorage.getItem(group);
    if (current_tabs === null) {
        current_tabs = {};
    } else {
        current_tabs = JSON.parse(current_tabs);
    }
    if (id in current_tabs) {
        delete current_tabs[id];
    }
    localStorage.setItem(group, JSON.stringify(current_tabs));
}

function add_to_storage(group, id) {
    let current_tabs = localStorage.getItem(group);
    //console.log(current_tabs);
    if (current_tabs === null) {
        current_tabs = {};
    } else {
        current_tabs = JSON.parse(current_tabs);
    }
    if (!(id in current_tabs)) {
        if (callback_table.callbacks[id] !== undefined) {
            current_tabs[id] = callback_table.callbacks[id]['personal_description'];
        }
    }
    localStorage.setItem(group, JSON.stringify(current_tabs));
}

function startwebsocket_parameter_hints() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/parameter_hints/current_operation');
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            //console.log(event.data);
            try {
                let data = JSON.parse(event.data);
                if (data['channel'] === 'newpayload') {
                    let payload_list_selection = "";
                    data['location'] = data['file']['filename'];
                    payload_list_selection += data.location + " - ";
                    let profiles = new Set();
                    for (let i = 0; i < data.supported_profiles.length; i++) {
                        profiles.add(data.supported_profiles[i]['name']);
                    }
                    payload_list_selection += Array.from(profiles);
                    payload_list_selection += " - " + data.tag;
                    if (payload_list_selection.length > 90) {
                        payload_list_selection = payload_list_selection.substring(0, 90) + "...";
                    }
                    data['payload_list_selection'] = payload_list_selection;
                    params_table.payloads.push(data);
                } else if (data['channel'] === 'updatedpayload') {
                    if (data['tag'].includes("Autogenerated from task")) {
                        return;
                    }
                    for (let i = 0; i < params_table.payloads.length; i++) {
                        if (params_table.payloads[i]['id'] === data['id']) {
                            if (data['deleted'] === true) {
                                params_table.payloads.splice(i, 1);
                                return;
                            }
                            let payload_list_selection = "";
                            data['location'] = data['file']['filename'];
                            payload_list_selection += data.location + " - ";
                            let profiles = new Set();
                            for (let j = 0; j < data.supported_profiles.length; j++) {
                                profiles.add(data.supported_profiles[j]['name']);
                            }
                            payload_list_selection += Array.from(profiles);
                            //payload_list_selection += profiles.values().toString();
                            payload_list_selection += " - " + data.payload_type + " - " + data.tag;
                            data['payload_list_selection'] = payload_list_selection;
                            params_table.payloads[i] = data;
                            break;
                        }
                    }
                } else if (data['channel'] === 'newcredential') {
                    params_table.credentials.push(data);
                    params_table.credentials.sort((a, b) => (b.account > a.account) ? -1 : ((a.account > b.account) ? 1 : 0));
                } else if (data['channel'] === 'updatedcredential') {
                    for (let i = 0; i < params_table.credentials.length; i++) {
                        if (params_table.credentials[i]['id'] === data['id']) {
                            if (data['deleted'] === true) {
                                params_table.credentials.splice(i, 1);
                                params_table.credentials.sort((a, b) => (b.account > a.account) ? -1 : ((a.account > b.account) ? 1 : 0));
                                return;
                            }
                            params_table.credentials[i] = data;
                            break;
                        }
                    }
                } else if (data['channel'] === 'newpayloadonhost') {
                    //console.log(data);
                    data['type'] = 'payload';
                    if (data['host'] === undefined) {
                        return
                    }
                    if (data['host'] in params_table.payloadonhost) {
                        Vue.set(params_table.payloadonhost[data['host']], params_table.payloadonhost[data['host']].length, data);
                        //params_table.payloadonhost[data['host']].push(data);
                    } else {
                        Vue.set(params_table.payloadonhost, data['host'], [data]);
                        //params_table.payloadonhost[data['host']] = [data];
                    }
                } else if (data['channel'] === 'updatedpayloadonhost') {
                    //console.log(data);
                    data['type'] = 'payload';
                    for (let i = 0; i < params_table.payloadonhost[data['host']].length; i++) {
                        if (params_table.payloadonhost[data['host']][i]['id'] === data['id']) {
                            if (data['deleted'] === true) {
                                //params_table.payloadonhost[data['host']].splice(i, 1);
                                Vue.delete(params_table.payloadonhost[data['host']], i);
                                if (params_table.payloadonhost[data['host']].length === 0) {
                                    delete params_table.payloadonhost[data['host']];
                                }
                                params_table.$forceUpdate();
                                return;
                            }
                            Vue.set(params_table.payloadonhost[data['host']], i, data);
                            //params_table.payloadonhost[data['host']][i] = data;
                            break;
                        }
                    }
                }
                params_table.$forceUpdate();
            } catch (error) {
                console.log("websocket for parameter hints error", error.toString());
            }
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

startwebsocket_parameter_hints();

function startwebsocket_filebrowser() {
    let ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/file_browser/current_operation');
    let initial_group_done = false;
    ws.onmessage = function (event) {
        if (event.data === "no_operation") {
            alertTop("warning", "No operation selected");
        } else if (event.data !== "") {
            let data = JSON.parse(event.data);
            if (!initial_group_done) {
                for(const [key, value] of Object.entries(data)){
                    for(let i = 0; i < value.length; i++){
                        process_file_browser_data(value[i]);
                    }
                }
                initial_group_done = true;
            } else {
                // now we have streaming updates and need to merge them in
                process_file_browser_data(data);
            }
        } else {
            initial_group_done = true;
        }
    };
    ws.onclose = function (event) {
        wsonclose(event);
    };
    ws.onerror = function (event) {
        wsonerror(event);
    };
}

function process_file_browser_data(data){
    // first step is to find the right host
    if (data['host'] === undefined || data['host'].length === 0) {
        setTimeout(() => { // setTimeout to put this into event queue
            // executed after render
            task_data.$forceUpdate();
        }, 0);
        return
    }
    if (!Object.prototype.hasOwnProperty.call(meta['file_browser'], data['host'])) {
        Vue.set(meta["file_browser"], data["host"], {
            "data": {
                "name": data['host'],
                "host": data['host']
            }, "children": []
        });
    }
    // what if we're adding a new top level root
    if (data["file_browser"] === undefined && data['parent'] === null) {
        for (let i = 0; i < meta['file_browser'][data['host']]['children'].length; i++) {
            if (data['name'] in meta['file_browser'][data['host']]['children'][i]) {
                Object.assign(meta['file_browser'][data['host']]['children'][i][data['name']]['data'],
                    meta['file_browser'][data['host']]['children'][i]['data'],
                    data);
                task_data.$forceUpdate();
                return;
            }
        }
        // if we get here, we have a root element that's new, so add it
        let new_data = {};
        new_data[data['name']] = {"data": data, "children": []};
        meta['file_browser'][data['host']]['children'].push(new_data);
        task_data.$forceUpdate();
    } else {
        add_update_file_browser(data, meta['file_browser'][data['host']]);
        task_data.$forceUpdate();
    }
    setTimeout(() => { // setTimeout to put this into event queue
        // executed after render
        task_data.$forceUpdate();
    }, 0);
}


function add_update_file_browser(search, element) {
    //recursive base case
    //ust check to see if it's the one we're looking for otherwise return up
    if (search["file_browser"] !== undefined){
        //we're looking at a file_meta object that's downloading
        if(search["file_browser"] === element["data"]["id"]) {
            delete search["id"]
            Object.assign(element['data'],
                element['data'], search);
            task_data.$forceUpdate();
            return true;
        }
    }else{
        //we're looking at file browsing data
        if(search["id"] === element["data"]["id"]){
            Object.assign(element['data'],
                element['data'],
                search);
            task_data.$forceUpdate();
            return true;
        }
    }
    if(element["data"]["is_file"]){return false;}
    //we aren't in the base case, so let's iterate through the current item's children
    if (element['children'] !== undefined) {
        for (let i = 0; i < element['children'].length; i++) {
            let result = add_update_file_browser(search, Object.values(element['children'][i])[0]);
            if (result) {
                //short circuit the path here, if we found it and added/updated, just exit all the recursion
                return true;
            }
        }
    }
    //if we get here, and parent is true, then we are the parent and failed to find the child, so we need to add it
    if (search["file_browser"] === undefined && element["data"]['id'] === search['parent']) {
        let new_data = {};
        new_data[search['name']] = {"data": search, "children": []};
        if(element['children'] === undefined){
            Vue.set(element, "children", []);
        }
        element['children'].push(new_data);
        task_data.$forceUpdate();
        return true;
    } else {
        return false;
    }
}