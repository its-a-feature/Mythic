// +build linux
package shinject

import "errors"

type LinuxInjection struct {
	Target     int
	Successful bool
	Payload    []byte
	Method     string
}

func injectShellcode(pid uint32, arch string, shellcode []byte) (LinuxInjection, error) {
	return LinuxInjection{}, errors.New("Not implemented for linux.")
}
