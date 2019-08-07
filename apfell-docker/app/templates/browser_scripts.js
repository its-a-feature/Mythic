
var scripts = new Vue({
    el: '#browser_scripts_table',
    data:{
        bscripts: [],
        user: "{{name}}"
    },
    methods: {
        new_script: function(){
            commands.current_command = -1;
            commands.current_payload_type = commands.payload_types[0];
            commands.script = "";
            $( '#createBrowserScriptModal' ).modal('show');
            $( '#createBrowserScriptSubmit' ).unbind('click').click(function(){
                data = {"script": btoa(commands.script)};
                if(commands.current_command != -1){
                    data['command'] = commands.current_command;
                }else{
                    data['name'] = commands.name;

                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/" , register_script_callback, "POST", data);
            });
        },
        edit_button: function(s){
            if(s.payload_type == "Support Script"){
                commands.current_command = -1;
                commands.name = s.name;
            }else{
                commands.current_payload_type = s['payload_type'];
                commands.current_command = s['command_id'];
            }
            commands.script = s.script;
            $( '#createBrowserScriptModal' ).modal('show');

            $( '#createBrowserScriptSubmit' ).unbind('click').click(function(){
                data = {"script": btoa(commands.script)};
                if(commands.current_command != -1){
                    data['command'] = commands.current_command;
                }else{
                    data['name'] = commands.name;
                }
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/" + s['id'], register_script_callback, "PUT", data);
            });

        },
        view_code: function(s){
            commands.script = s.script;
            $( '#viewBrowserScriptModal' ).modal('show');
        },
        delete_button: function(s, index){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/" + s.id, function(response){
                try{
                    data = JSON.parse(response);
                   }catch(error){
                    alertTop("danger", "Session expired, please refresh or login again");
                   }
                if(data['status'] == 'success'){
                    scripts.bscripts.splice(index, 1);
                }
                else{
                    alertTop("danger", "Failed to remove: " + data['error']);
                }

            }, "DELETE", null);
        },
        toggle_active: function(s){
            httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/" + s['id'], register_script_callback, "PUT", {"active": !s['active']});
        },
        toggle_operation: function(s){
            if(s.operation == 'null'){
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/" + s['id'], register_script_callback, "PUT", {"operation": "{{current_operation}}"});
            }
            else{
                httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/" + s['id'], register_script_callback, "PUT", {"operation": ""});
            }
        },
        in_effect: function(s){
            if(!s.active){return "NO"}
            else if(s['command'].includes("support_scripts['")){
                return "YES, Globally Accessible";
            }
            else if(s['operation'] != "null"){
                return "YES, Operation Wide";
            }
            else{
                //it is active, to find out if it is actually in effect or overridden
                for(i = 0; i < this.bscripts.length; i++){
                    if( (this.bscripts[i]['command_id'] == s['command_id']) && (this.bscripts[i]['id'] != s['id'])){
                        //there's one other script also tied to this command
                        if(s['operation'] != "null"){
                            return "YES, Operation Wide";
                        }
                        else if(s['operation'] == 'null' && !this.bscripts[i]['active']){
                            return "YES, Personally";
                        }
                        else {
                            return "NO, Overridden";
                        }
                    }
                }
                return "YES, Personally";
            }
        },
        import_scripts: function(){
            $( '#scriptImportModal' ).modal('show');
            $( '#scriptImportSubmit' ).unbind('click').click(function(){
                var file = document.getElementById('scriptImportFile');
                var filedata = file.files[0];
                uploadFile("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/import", import_script_button_callback, filedata);
            });
        },
        export_scripts: function(){
            payload = httpGetSync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/export");
            download_from_memory("browser_scripts.json", btoa(payload));
        }
    },
    delimiters: ['[[', ']]']
});
function import_script_button_callback(response){
    //var new_window = window.open("", "_blank");
    //new_window.document.write(response);
    //new_window.focus();
    alertTop("info", response, 0);
};
function register_script_callback(response){
    try{
        data = JSON.parse(response);
       }catch(error){
        alertTop("danger", "Session expired, please refresh or login again");
       }
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }
}
var commands = new Vue({
    el: '#modal_vues',
    data: {
        payload_types: [],
        commands: {},
        current_payload_type: "",
        current_command: "",
        script: "",
        name: "",
        theme_options: ["monokai", "ambiance", "chaos", "terminal", "xcode", "crimson_editor"],
        theme: "{{config['code-theme']}}"
    },

    delimiters: ['[[', ']]']
});
//httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/browser_scripts/" ,callback, "DELETE", null);
function startwebsocket_browserscripts(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/browser_scripts');
	ws.onmessage = function(event){
		if(event.data != ""){
			data = JSON.parse(event.data);
			data['script'] = atob(data['script']);
			if(data['command'] == undefined){
			    data['payload_type'] = "Support Script";
			    data['command'] = "support_scripts['" + data['name'] + "']";
			}
			for(i = 0; i < scripts.bscripts.length; i++){
			    if(scripts.bscripts[i]['id'] == data['id']){
			        Vue.set(scripts.bscripts, i, data);
			        alertTop("success", "Successfully updated...", 1);
			        return;
			    }
			}
			scripts.bscripts.push(data);
			scripts.bscripts.sort((a,b) =>(b.id > a.id) ? -1 : ((a.id > b.id) ? 1 : 0));
		}
	}
	ws.onclose = function(){
		//console.log("payloads socket closed");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
}startwebsocket_browserscripts();
function startwebsocket_commands(){
	var ws = new WebSocket('{{ws}}://{{links.server_ip}}:{{links.server_port}}/ws/commands');
	ws.onmessage = function(event){
		if(event.data != ""){
			data = JSON.parse(event.data);
			if(!commands.commands.hasOwnProperty(data['payload_type'])){
			    commands.commands[data['payload_type']] = [];
			    commands.payload_types.push(data['payload_type']);
			    commands.payload_types.sort((a,b) =>(b.cmd > a.cmd) ? -1 : ((a.cmd > b.cmd) ? 1 : 0));
			    commands.current_payload_type = commands.payload_types[0];
			}
			commands.commands[data['payload_type']].push(data);
			commands.commands[data['payload_type']].sort((a,b) =>(b.cmd > a.cmd) ? -1 : ((a.cmd > b.cmd) ? 1 : 0));
		}
	}
	ws.onclose = function(){
		//console.log("payloads socket closed");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onerror = function(){
		//console.log("payloads socket errored");
		alertTop("danger", "Session expired, please refresh");
	}
	ws.onopen = function(){
		//console.log("payloads socket opened");
	}
}startwebsocket_commands();
//ACE specific code from http://cwestblog.com/2018/08/04/ace-editor-vue-component/
/* START: <ace-editor> Vue component */
(function () {
  var PROPS = {
    selectionStyle: {},
    highlightActiveLine: { f: toBool },
    highlightSelectedWord: { f: toBool },
    readOnly: { f: toBool },
    cursorStyle: {},
    mergeUndoDeltas: { f: toBool },
    behavioursEnabled: { f: toBool },
    wrapBehavioursEnabled: { f: toBool },
    autoScrollEditorIntoView: { f: toBool, v: false },
    copyWithEmptySelection: { f: toBool },
    useSoftTabs: { f: toBool, v: false },
    navigateWithinSoftTabs: { f: toBool, v: false },
    hScrollBarAlwaysVisible: { f: toBool },
    vScrollBarAlwaysVisible: { f: toBool },
    highlightGutterLine: { f: toBool },
    animatedScroll: { f: toBool },
    showInvisibles: { f: toBool },
    showPrintMargin: { f: toBool },
    printMarginColumn: { f: toNum, v: 80 },
    // shortcut for showPrintMargin and printMarginColumn
    printMargin: { f: function (x) { return toBool(x, true) && toNum(x); } }, // false|number
    fadeFoldWidgets: { f: toBool },
    showFoldWidgets: { f: toBool, v: true },
    showLineNumbers: { f: toBool, v: true },
    showGutter: { f: toBool, v: true },
    displayIndentGuides: { f: toBool, v: true },
    fontSize: {},
    fontFamily: {},
    minLines: { f: toNum },
    maxLines: { f: toNum },
    scrollPastEnd: { f: toBoolOrNum },
    fixedWidthGutter: { f: toBool, v: false },
    theme: { v: 'monokai' },
    scrollSpeed: { f: toNum },
    dragDelay: { f: toNum },
    dragEnabled: { f: toBool, v: true },
    focusTimeout: { f: toNum },
    tooltipFollowsMouse: { f: toBool },
    firstLineNumber: { f: toNum, v: 1 },
    overwrite: { f: toBool },
    newLineMode: {},
    useWorker: { f: toBool },
    tabSize: { f: toNum, v: 2 },
    wrap: { f: toBoolOrNum },
    foldStyle: { v: 'markbegin' },
    mode: { v: 'javascript' },
    value: {},
  };

  var EDITOR_EVENTS = ['blur', 'change', 'changeSelectionStyle', 'changeSession', 'copy', 'focus', 'paste'];

  var INPUT_EVENTS = ['keydown', 'keypress', 'keyup'];

  function toBool(value, opt_ignoreNum) {
    var result = value;
    if (result != null) {
      (value + '').replace(
        /^(?:|0|false|no|off|(1|true|yes|on))$/,
        function(m, isTrue) {
          result = (/01/.test(m) && opt_ignoreNum) ? result : !!isTrue;
        }
      );
    }
    return result;
  }

  function toNum(value) {
    return (value == null || isNaN(+value)) ? value : +value;
  }

  function toBoolOrNum(value) {
    var result = toBool(value, true);
    return 'boolean' === typeof result ? result : toNum(value);
  }

  function emit(component, name, event) {
    component.$emit(name.toLowerCase(), event);
    if (name !== name.toLowerCase()) {
      component.$emit(
        name.replace(/[A-Z]+/g, function(m) { return ('-' + m).toLowerCase(); }),
        event
      );
    }
  }

  // Defined for IE11 compatibility
  function entries(obj) {
    return Object.keys(obj).map(function(key) { return [key, obj[key]]; });
  }

  Vue.component('aceEditor', {
    template: '<div ref="root"></div>',
    props: Object.keys(PROPS),
    data: function() {
      return {
        editor: null,
        isShowingError: false,
        isShowingWarning: false,
        allowInputEvent: true,
        // NOTE:  "lastValue" is needed to prevent cursor from always going to
        // the end after typing
        lastValue: ''
      };
    },
    methods: {
      setOption: function(key, value) {
        var func = PROPS[key].f;

        value = /^(theme|mode)$/.test(key)
          ? 'ace/' + key + '/' + value
          : func
            ? func(value)
            : value;

        this.editor.setOption(key, value);
      }
    },
    watch: (function () {
      var watch = {
        value: function(value) {
          if (this.lastValue !== value) {
            this.allowInputEvent = false;
            this.editor.setValue(value);
            this.allowInputEvent = true;
          }
        }
      };

      return entries(PROPS).reduce(
        function(watch, propPair) {
          var propName = propPair[0];
          if (propName !== 'value') {
            watch[propName] = function (newValue) {
              this.setOption(propName, newValue);
            };
          }
          return watch;
        },
        watch
      );
    })(),
    mounted: function() {
      var self = this;

      self.editor = window.ace.edit(self.$refs.root, { value: self.value });

      entries(PROPS).forEach(
        function(propPair) {
          var propName = propPair[0],
              prop = propPair[1],
              value = self.$props[propName];
          if (value !== undefined || prop.hasOwnProperty('v')) {
            self.setOption(propName, value === undefined ? prop.v : value);
          }
        }
      );

      self.editor.on('change', function(e) {
        self.lastValue = self.editor.getValue();
        if (self.allowInputEvent) {
          emit(self, 'input', self.lastValue);
        }
      });

      INPUT_EVENTS.forEach(
        function(eName) {
          self.editor.textInput.getElement().addEventListener(
            eName, function(e) { emit(self, eName, e); }
          );
        }
      );

      EDITOR_EVENTS.forEach(function(eName) {
        self.editor.on(eName, function(e) { emit(self, eName, e); });
      });

      var session = self.editor.getSession();
      session.on('changeAnnotation', function() {
        var annotations = session.getAnnotations(),
            errors = annotations.filter(function(a) { return a.type === 'error'; }),
            warnings = annotations.filter(function(a) { return a.type === 'warning'; });

        emit(self, 'changeAnnotation', {
          type: 'changeAnnotation',
          annotations: annotations,
          errors: errors,
          warnings: warnings
        });

        if (errors.length) {
          emit(self, 'error', { type: 'error', annotations: errors });
        }
        else if (self.isShowingError) {
          emit(self, 'errorsRemoved', { type: 'errorsRemoved' });
        }
        self.isShowingError = !!errors.length;

        if (warnings.length) {
          emit(self, 'warning', { type: 'warning', annotations: warnings });
        }
        else if (self.isShowingWarning) {
          emit(self, 'warningsRemoved', { type: 'warningsRemoved' });
        }
        self.isShowingWarning = !!warnings.length;
      });
    }
  });
})();
/* END: <ace-editor> Vue component */