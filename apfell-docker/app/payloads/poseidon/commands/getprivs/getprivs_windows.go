// +build windows

package getprivs

import (
	"runtime"

	"pkg/utils/winapi"
)

var allprivs = []string{"SeAssignPrimaryTokenPrivilege", "SeAuditPrivilege", "SeBackupPrivilege", "SeChangeNotifyPrivilege", "SeCreateGlobalPrivilege", "SeCreatePagefilePrivilege", "SeCreatePermanentPrivilege", "SeCreateSymbolicLinkPrivilege", "SeCreateTokenPrivilege", "SeDebugPrivilege", "SeDelegateSessionUserImpersonatePrivilege", "SeEnableDelegationPrivilege", "SeImpersonatePrivilege", "SeIncreaseBasePriorityPrivilege", "SeIncreaseQuotaPrivilege", "SeIncreaseWorkingSetPrivilege", "SeLoadDriverPrivilege", "SeLockMemoryPrivilege", "SeMachineAccountPrivilege", "SeManageVolumePrivilege", "SeProfileSingleProcessPrivilege", "SeRelabelPrivilege", "SeRemoteShutdownPrivilege", "SeRestorePrivilege", "SeSecurityPrivilege", "SeShutdownPrivilege", "SeSyncAgentPrivilege", "SeSystemEnvironmentPrivilege", "SeSystemProfilePrivilege", "SeSystemtimePrivilege", "SeTakeOwnershipPrivilege", "SeTcbPrivilege", "SeTimeZonePrivilege", "SeTrustedCredManAccessPrivilege", "SeUndockPrivilege", "SeUnsolicitedInputPrivilege"}

func getprivs() ([]string, error) {
	var curPrivs []string
	runtime.LockOSThread()
	for _, priv := range allprivs {
		err := winapi.SePrivEnable(priv)
		if err == nil {
			curPrivs = append(curPrivs, priv)
		}
	}
	runtime.UnlockOSThread()

	return curPrivs, nil
}
