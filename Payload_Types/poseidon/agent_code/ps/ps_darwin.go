// +build darwin

package ps

/*
#cgo LDFLAGS: -framework AppKit -framework Foundation -framework ApplicationServices
#cgo CFLAGS: -x objective-c
#include "rdprocess_darwin.h"

char* GetProcInfo(int pid) {
	RDProcess *p = [[RDProcess alloc] initWithPID:pid];
    NSMutableDictionary *proc_details = [@{
        @"bundleID":p.bundleID ? : @"",
        @"args":p.launchArguments ? : @"",
        @"path":p.executablePath ? : @"",
        @"user":p.ownerUserName ? : @"",
        @"full_username":p.ownerFullUserName ? : @"",
        @"env":p.environmentVariables ? : @"",
        @"sandboxcontainer":p.sandboxContainerPath ? : @"",
		@"pid":[NSNumber numberWithInt:p.pid],
		@"scripting_properties":p.scriptingProperties ? : @"",
		@"name":p.processName ? : @""
	}mutableCopy];

	NSError *error = nil;
    if ([NSJSONSerialization isValidJSONObject:proc_details]) {
        NSData* jsonData = [NSJSONSerialization dataWithJSONObject:proc_details options:NSJSONWritingPrettyPrinted error:&error];

        if (jsonData != nil && error == nil)
        {
        	NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];

        	return [jsonString UTF8String];
        }
	}

	return "";
}

*/
import "C"
import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"syscall"
	"unsafe"
)

type ProcDetails struct {
	BundleID            string          `json:"bundleID,omitempty"`
	Args                []string        `json:"args,omitempty"`
	Path                string          `json:"path,omitempty"`
	User                string          `json:"user,omitempty"`
	FullUsername        string          `json:"full_username,omitempty"`
	Env                 json.RawMessage `json:"env,omitempty"`
	SandboxPath         string          `json:"sandboxcontainer,omitempty"`
	Pid                 int             `json:"pid,omitempty"`
	ScriptingProperties json.RawMessage `json:"scripting_properties,omitempty"`
	Name                string          `json:"name,omitempty"`
}

type DarwinProcess struct {
	pid                 int
	ppid                int
	binary              string
	architecture        string
	owner               string
	args                []string
	env                 map[string]interface{}
	sandboxpath         string
	scriptingproperties map[string]interface{}
	name                string
	bundleid            string
}

func (p *DarwinProcess) Pid() int {
	return p.pid
}

func (p *DarwinProcess) PPid() int {
	return p.ppid
}

func (p *DarwinProcess) Executable() string {
	return p.name
}

func (p *DarwinProcess) Arch() string {
	return p.architecture
}

func (p *DarwinProcess) Owner() string {
	return p.owner
}

func (p *DarwinProcess) BinPath() string {
	return p.binary
}

func (p *DarwinProcess) ProcessArguments() []string {
	return p.args
}

func (p *DarwinProcess) ProcessEnvironment() map[string]interface{} {
	return p.env
}

func (p *DarwinProcess) SandboxPath() string {
	return p.sandboxpath
}

func (p *DarwinProcess) ScriptingProperties() map[string]interface{} {
	return p.scriptingproperties
}

func (p *DarwinProcess) Name() string {
	return p.name
}

func (p *DarwinProcess) BundleID() string {
	return p.bundleid
}

func findProcess(pid int) (Process, error) {
	ps, err := Processes()
	if err != nil {
		return nil, err
	}

	for _, p := range ps {
		if p.Pid() == pid {
			return p, nil
		}
	}

	return nil, nil
}

func Processes() ([]Process, error) {
	buf, err := darwinSyscall()
	if err != nil {
		return nil, err
	}

	procs := make([]*kinfoProc, 0, 50)
	k := 0
	for i := _KINFO_STRUCT_SIZE; i < buf.Len(); i += _KINFO_STRUCT_SIZE {
		proc := &kinfoProc{}
		err = binary.Read(bytes.NewBuffer(buf.Bytes()[k:i]), binary.LittleEndian, proc)
		if err != nil {
			return nil, err
		}

		k = i
		procs = append(procs, proc)
	}

	darwinProcs := make([]Process, len(procs))
	for i, p := range procs {
		cpid := C.int(p.Pid)
		cresult := C.GetProcInfo(cpid)
		raw := C.GoString(cresult)
		r := []byte(raw)
		pinfo := ProcDetails{}
		var envJson map[string]interface{}
		var scrptProps map[string]interface{}
		_ = json.Unmarshal(r, &pinfo)
		_ = json.Unmarshal([]byte(pinfo.Env), &envJson)
		_ = json.Unmarshal([]byte(pinfo.ScriptingProperties), &scrptProps)
		darwinProcs[i] = &DarwinProcess{
			pid:                 int(p.Pid),
			ppid:                int(p.PPid),
			binary:              pinfo.Path,
			owner:               pinfo.User,
			args:                pinfo.Args,
			env:                 envJson,
			sandboxpath:         pinfo.SandboxPath,
			scriptingproperties: scrptProps,
			name:                pinfo.Name,
			bundleid:            pinfo.BundleID,
		}

	}

	return darwinProcs, nil
}

func darwinCstring(s [16]byte) string {
	i := 0
	for _, b := range s {
		if b != 0 {
			i++
		} else {
			break
		}
	}

	return string(s[:i])
}

func darwinSyscall() (*bytes.Buffer, error) {
	mib := [4]int32{_CTRL_KERN, _KERN_PROC, _KERN_PROC_ALL, 0}
	size := uintptr(0)

	_, _, errno := syscall.Syscall6(
		syscall.SYS___SYSCTL,
		uintptr(unsafe.Pointer(&mib[0])),
		4,
		0,
		uintptr(unsafe.Pointer(&size)),
		0,
		0)

	if errno != 0 {
		return nil, errno
	}

	bs := make([]byte, size)
	_, _, errno = syscall.Syscall6(
		syscall.SYS___SYSCTL,
		uintptr(unsafe.Pointer(&mib[0])),
		4,
		uintptr(unsafe.Pointer(&bs[0])),
		uintptr(unsafe.Pointer(&size)),
		0,
		0)

	if errno != 0 {
		return nil, errno
	}

	return bytes.NewBuffer(bs[0:size]), nil
}

const (
	_CTRL_KERN         = 1
	_KERN_PROC         = 14
	_KERN_PROC_ALL     = 0
	_KINFO_STRUCT_SIZE = 648
)

type kinfoProc struct {
	_    [40]byte
	Pid  int32
	_    [199]byte
	Comm [16]byte
	_    [301]byte
	PPid int32
	_    [84]byte
}
