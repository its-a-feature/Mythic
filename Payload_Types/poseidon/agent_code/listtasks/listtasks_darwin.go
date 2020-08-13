// +build darwin

package listtasks

/*
#cgo CFLAGS: -x objective-c -fmacro-backtrace-limit=0 -std=gnu11 -Wobjc-property-no-attribute -Wunguarded-availability-new
#cgo LDFLAGS: -framework Foundation
#include "listtasks_darwin.h"
*/
import "C"
import "encoding/json"

type ListtasksDarwin struct {
	Results map[string]interface{}
}

func (l *ListtasksDarwin) Result() map[string]interface{} {
	return l.Results
}

func getAvailableTasks() (ListtasksDarwin, error) {
	cresult := C.listtasks()
	var resultJson map[string]interface{}
	raw := C.GoString(cresult)
	r := []byte(raw)
	err := json.Unmarshal(r, &resultJson)

	if err != nil {
		empty := ListtasksDarwin{}
		return empty, err
	}

	darwinTasks := ListtasksDarwin{}
	darwinTasks.Results = resultJson

	return darwinTasks, nil
}
