function(elem){
    var uniqueName = elem.getAttribute("modal-name");
    var content = elem.getAttribute("additional-info");
    var uniqueNameId = '#' + uniqueName;
    var modalBody = uniqueNameId + '_body';
    $(modalBody).html(content);
    $(modalBody + ' > pre:last').css("word-wrap", "break-word");
    $(modalBody + ' > pre:last').css("white-space", "pre-wrap");
    $(uniqueNameId).modal('show');
}