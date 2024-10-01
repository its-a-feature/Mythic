export function copyStringToClipboard(str) {
    let el = document.createElement('textarea');
    try {
        // Create new element

        // Set value (string to be copied)
        el.value = str;
        if(el.value === ""){
            el.value = " ";
        }
        // Set non-editable to avoid focus and move outside of view
        el.setAttribute('readonly', '');
        el.style = {position: 'absolute', left: '-9999px'};
        document.body.appendChild(el);
        // Select text inside element
        el.select();
        // Copy text to clipboard
        let success = document.execCommand('copy');
        if(!success){
            console.log("failed to copy data");
        }
        success = document.execCommand('cut');
        if(!success){
            console.log("failed to cut data");
        }
        navigator?.clipboard?.writeText(el.value);
        // Remove temporary element
        document.body.removeChild(el);
        return true;
    } catch (error) {
        document.body.removeChild(el);
        console.log("warning", "Failed to copy to clipboard: " + error.toString());
        return false;
    }
}

export function downloadFileFromMemory(output, filename){
    const dataBlob = new Blob([output], {type: 'application/octet-stream'});
    const ele = document.getElementById("download_config");
    if(ele !== null){
      ele.href = URL.createObjectURL(dataBlob);
      ele.download = filename;
      ele.click();
    }else{
      const element = document.createElement("a");
      element.id = "download_config";
      element.href = URL.createObjectURL(dataBlob);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
    }
}
