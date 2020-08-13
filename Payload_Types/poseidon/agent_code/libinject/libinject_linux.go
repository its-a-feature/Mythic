// +build linux

package libinject

/*
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>

static FILE *cgo_get_stdin(void)  { return stdin;  }
static FILE *cgo_get_stdout(void) { return stdout; }
static FILE *cgo_get_stderr(void) { return stderr; }
*/

/*
Note: Because this is currently not-operational,
	  lines 21-26 and 51-70 have been commented out.
*/

// import (
// 	"C"
// 	"unsafe"
// )

// type File C.FILE

type LinuxInjection struct {
	Target      int
	Successful  bool
	Payload     []byte
	LibraryPath string
}

func (l *LinuxInjection) TargetPid() int {
	return l.Target
}

func (l *LinuxInjection) Success() bool {
	return l.Successful
}

func (l *LinuxInjection) Shellcode() []byte {
	return l.Payload
}

func (l *LinuxInjection) SharedLib() string {
	return l.LibraryPath
}

// func Open(path, mode string) *File {
// 	cpath, cmode := C.CString(path), C.CString(mode)
// 	defer C.free(unsafe.Pointer(cpath))
// 	defer C.free(unsafe.Pointer(cmode))

// 	return (*File)(C.fopen(cpath, cmode))
// }

// func (f *File) Put(str string) {
// 	cstr := C.CString(str)
// 	defer C.free(unsafe.Pointer(cstr))

// 	C.fputs(cstr, (*C.FILE)(f))
// 	return
// }

// func (f *File) Get(n int) string {
// 	cbuf := make([]C.char, n)
// 	return C.GoString(C.fgets(&cbuf[0], C.int(n), (*C.FILE)(f)))
// }

func injectLibrary(pid int, path string) (LinuxInjection, error) {
	res := LinuxInjection{}
	/*oldregs := syscall.PtraceRegs{}

	// Try to attach to the target process
	traceeHandle, err := ptrace.Attach(pid)

	if err != nil {
		return res, err
	}

	var w syscall.WaitStatus
	r := syscall.Rusage{}

	// wait for the target process to signal
	wpid, err := syscall.Wait4(pid, &w, 0, &r)
	log.Println("Pid ", wpid)
	if err != nil {
		return res, err
	}

	// Get the registers to save their state
	registers, err := traceeHandle.GetRegs()

	if err != nil {
		return res, err
	}

	oldregs = registers

	//oldcode := C.malloc(C.sizeof_char * 9076)
	*/
	res.Successful = false
	return res, nil
}
