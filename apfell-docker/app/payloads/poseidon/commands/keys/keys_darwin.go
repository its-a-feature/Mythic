// +build darwin

package keys

type DarwinKeyOperation struct {
	KeyType string
	KeyData []byte
}

// TODO: Implement function to enumerate macos keychain
func (d *DarwinKeyOperation) Type() string {
	return d.KeyType
}

func (d *DarwinKeyOperation) Data() []byte {
	return d.KeyData
}

func getkeydata(opt Options) (DarwinKeyOperation, error) {
	d := DarwinKeyOperation{}
	return d, nil
}
