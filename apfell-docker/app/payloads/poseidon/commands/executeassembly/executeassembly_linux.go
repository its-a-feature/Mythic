// +build linux
package executeassembly

import (
	"errors"

	"pkg/utils/structs"
)

func executeassembly(assembly *[]byte, params *string, job *structs.Job) (AssemblyOutput, error) {
	return AssemblyOutput{}, errors.New("Not implemented for linux.")
}
