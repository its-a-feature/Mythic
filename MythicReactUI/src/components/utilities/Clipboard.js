function copyStringToClipboardWithExecCommand(text) {
    let copyTarget = null;
    const selectedRanges = [];
    const selection = document.getSelection();
    const activeElement = document.activeElement;
    const onCopy = (event) => {
        if(event.clipboardData){
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            try {
                event.clipboardData.clearData();
            } catch {
                // Some browsers expose setData without allowing clearData during copy.
            }
            event.clipboardData.setData("text/plain", text);
        }
    };
    try {
        if(selection){
            for(let i = 0; i < selection.rangeCount; i++){
                selectedRanges.push(selection.getRangeAt(i).cloneRange());
            }
        }
        copyTarget = document.createElement('span');
        copyTarget.textContent = text;
        copyTarget.setAttribute('aria-hidden', 'true');
        copyTarget.style.position = 'fixed';
        copyTarget.style.top = '0';
        copyTarget.style.left = '0';
        copyTarget.style.width = '1px';
        copyTarget.style.height = '1px';
        copyTarget.style.margin = '-1px';
        copyTarget.style.padding = '0';
        copyTarget.style.border = '0';
        copyTarget.style.overflow = 'hidden';
        copyTarget.style.clip = 'rect(0, 0, 0, 0)';
        copyTarget.style.whiteSpace = 'pre';
        copyTarget.style.userSelect = 'text';
        copyTarget.style.webkitUserSelect = 'text';
        copyTarget.style.MozUserSelect = 'text';
        document.body.appendChild(copyTarget);
        if(selection){
            const copyRange = document.createRange();
            copyRange.selectNodeContents(copyTarget);
            selection.removeAllRanges();
            selection.addRange(copyRange);
        }
        document.addEventListener("copy", onCopy, true);
        return document.execCommand('copy');
    } catch (error) {
        console.log("warning", "Failed to copy to clipboard with fallback: " + error.toString());
        return false;
    } finally {
        document.removeEventListener("copy", onCopy, true);
        if(copyTarget?.parentNode){
            copyTarget.parentNode.removeChild(copyTarget);
        }
        if(selection){
            try {
                selection.removeAllRanges();
                selectedRanges.forEach((range) => selection.addRange(range));
            } catch (error) {
                console.log("warning", "Failed to restore selection after clipboard copy: " + error.toString());
            }
        }
        if(activeElement?.focus){
            try {
                activeElement.focus({preventScroll: true});
            } catch (error) {
                activeElement.focus();
            }
        }
    }
}

export function copyStringToClipboard(str) {
    const text = str === undefined || str === null || String(str) === "" ? " " : String(str);
    let clipboardApiStarted = false;
    try {
        if(navigator?.clipboard?.writeText){
            clipboardApiStarted = true;
            navigator.clipboard.writeText(text).catch((error) => {
                console.log("warning", "Failed to copy to clipboard with Clipboard API: " + error.toString());
            });
        }
    } catch (error) {
        console.log("warning", "Failed to start Clipboard API copy: " + error.toString());
    }
    const fallbackSuccess = copyStringToClipboardWithExecCommand(text);
    if(clipboardApiStarted || fallbackSuccess){
        return true;
    }
    console.log("failed to copy data");
    return false;
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
