function(fileSize){
    var thresh = 1024;
    if(Math.abs(fileSize) < thresh) {
        return fileSize + ' B';
    }
    var units = ['KB','MB','GB','TB','PB','EB','ZB','YB'];
    var u = -1;
    do {
        fileSize /= thresh;
        ++u;
    } while(Math.abs(fileSize) >= thresh && u < units.length - 1);
    return fileSize.toFixed(1)+' '+units[u];
  return output;
}