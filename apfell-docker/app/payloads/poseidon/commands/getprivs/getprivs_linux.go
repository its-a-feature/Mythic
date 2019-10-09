// +build linux

package getprivs

import "errors"

func getprivs() ([]string, error) {
	return nil, errors.New("Not implemented in Linux agent, use the Windows agent.")
}
