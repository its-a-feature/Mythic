// +build windows
package functions

import (

    "pkg/utils/winapi"
    "os"
    "runtime"
)
func isElevated() bool {
	return winapi.IsAdministrator()
}
func getArchitecture() string{
    return os.Getenv("PROCESSOR_ARCHITECTURE")
}
func getDomain() string{
    return os.Getenv("USERDOMAIN")
}
func getOS() string{
    return runtime.GOOS
}
