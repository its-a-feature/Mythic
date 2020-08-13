// +build darwin

package jxa

/*
#cgo CFLAGS: -x objective-c -fmacro-backtrace-limit=0 -std=gnu11 -Wobjc-property-no-attribute -Wunguarded-availability-new
#cgo LDFLAGS: -framework Foundation -framework OSAKit
#include "jxa_wrapper_darwin.h"
*/
import "C"

import (
	"encoding/base64"
)

type JxaRunDarwin struct {
	Successful bool
	Results    string
}

func (j *JxaRunDarwin) Success() bool {
	return j.Successful
}

func (j *JxaRunDarwin) Result() string {
	return j.Results
}

func runCommand(encpayload string) (JxaRunDarwin, error) {
	rawpayload, err := base64.StdEncoding.DecodeString(encpayload)
	if err != nil {
		empty := JxaRunDarwin{}
		return empty, err
	}

	cpayload := C.CString(string(rawpayload))
	cresult := C.runjs(cpayload)
	result := C.GoString(cresult)

	r := JxaRunDarwin{}
	r.Successful = true
	r.Results = result
	return r, nil
}
