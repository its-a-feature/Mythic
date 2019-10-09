// +build darwin
package shinject

import "errors"

type DarwinInjection struct {
	Target     int
	Successful bool
	Payload    []byte
	Method     string
}

func injectShellcode(pid uint32, arch string, shellcode []byte) (DarwinInjection, error) {
	return DarwinInjection{}, errors.New("Not implemented for darwin.")
}
