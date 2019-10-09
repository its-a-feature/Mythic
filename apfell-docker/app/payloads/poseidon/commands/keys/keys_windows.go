// +build windows

package keys

import "errors"

type WindowsKeyOperation struct {
	KeyType string
	KeyData []byte
}

// TODO: Implement function to enumerate macos keychain
func (d *WindowsKeyOperation) Type() string {
	return d.KeyType
}

func (d *WindowsKeyOperation) Data() []byte {
	return d.KeyData
}

func getkeydata(opt Options) (WindowsKeyOperation, error) {
	d := WindowsKeyOperation{}
	// return d, nil
	return d, errors.New("getkeydata() not implemented.")
}
