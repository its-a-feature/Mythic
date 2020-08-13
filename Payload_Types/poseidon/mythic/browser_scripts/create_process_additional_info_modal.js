function(uniqueName){
    let html = `
    <!-- THIS IS OUR MODAL FOR ADDING A COMMENT -->
<div class="modal fade bs-example-modal-lg" id="` + uniqueName + `" role="dialog" >
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
            Additional Process Details
            </div>
              <div class="modal-body" id="` + uniqueName + `_body">
              </div>
              <div class="modal-footer">
                <button class="btn btn-success" data-dismiss="modal" aria-hidden="true">OK</button>
              </div>
        </div>
    </div>
</div>
<!-- END MODAL FOR ADDING A COMMENT -->`;
    return html;
}