// +build darwin

package libinject

/*
#cgo LDFLAGS: -lm -framework Foundation
#cgo CFLAGS: -Wno-error=implicit-function-declaration
#include "libinject_darwin.h"
*/
import "C"

type DarwinInjection struct {
	Target      int
	Successful  bool
	Payload     []byte
	LibraryPath string
}

func (l *DarwinInjection) TargetPid() int {
	return l.Target
}

func (l *DarwinInjection) Success() bool {
	return l.Successful
}

func (l *DarwinInjection) Shellcode() []byte {
	return l.Payload
}

func (l *DarwinInjection) SharedLib() string {
	return l.LibraryPath
}

func injectLibrary(pid int, path string) (DarwinInjection, error) {
	res := DarwinInjection{}
	i := C.int(pid)
	cpath := C.CString(path)

	r := C.inject(i, cpath)
	res.Successful = true
	if r != 0 {
		res.Successful = false
	}
	return res, nil
}
