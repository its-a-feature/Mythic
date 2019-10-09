// +build darwin

package getprivs

import "errors"

func getprivs() ([]string, error) {
	return nil, errors.New("Not implemented in the Darwin agent, use the Windows agent.")
}
