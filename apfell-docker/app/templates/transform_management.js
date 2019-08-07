var transform_code = new Vue({
    el: '#transform_code',
    data:{
        code: "",
        theme_options: ["monokai", "ambiance", "chaos", "terminal", "xcode", "crimson_editor"],
        theme: "{{config['code-theme']}}"
    },
    delimiters: ['[[', ']]']
});
httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/view", initialize_code, "GET", null);
function initialize_code(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        transform_code.code = atob(data['code']);
    }else{
        alertTop("danger", data['error']);
    }
}

function download_code_button(){
    window.open("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/download", "_blank").focus();
}
function upload_code_button(){
    $( '#FileModal').modal('show');
    $( '#FileSubmit').unbind('click').click(function(){
        //uploadFileAndJSON(url, callback, file, data, method)
        var file = document.getElementById('FileUpload');
        var filedata = file.files;
        uploadFileAndJSON("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/upload/",
        file_upload_callback, filedata, data, "POST");
        file.value = file.defaultValue;
        alertTop("info", "Submitted updates...");
    });
}
function file_upload_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] == 'success'){
        alertTop("success", "Successfully uploaded");
        httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/view", initialize_code, "GET", null);
    }else{
        alertTop("danger", data['error']);
    }
}
function update_code_button(){
    var code = btoa(transform_code.code);
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/transforms/code/upload", update_code_callback, "POST", {"code": code});
    alertTop("info", "Submitted updates...");
}
function update_code_callback(response){
    try{
        data = JSON.parse(response);
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
        return;
    }
    if(data['status'] != 'success'){
        alertTop("danger", data['error']);
    }else{
        alertTop("success", "Successfully updated");
    }
}
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
    printMarginColumn: { f: toNum, v: 800 },
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
    mode: { v: 'python' },
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