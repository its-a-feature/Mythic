// +build windows

package winapi

import (
	"fmt"
	"log"
	"os"
	"strings"
	"syscall"
	"unicode/utf16"
	"unsafe"
)

// https://github.com/lesnuages/go-execute-assembly/blob/d1df0532f4082de482670aee23ec5c03f2f49f62/assembly/assembly_windows.go

type TTokenType uint32

const (
	TokenTPad TTokenType = iota + 0
	TokenPrimary
	TokenImpersonation
)

type TTokenInformationClass uint32

const (
	TokenUser TTokenInformationClass = iota + 1
	TokenGroups
	TokenPrivileges
	TokenOwner
	TokenPrimaryGroup
	TokenDefaultDacl
	TokenSource
	TokenType
	TokenImpersonationLevel
	TokenStatistics
	TokenRestrictedSids
	TokenSessionId
	TokenGroupsAndPrivileges
	TokenSessionReference
	TokenSandBoxInert
	TokenAuditPolicy
	TokenOrigin
	TokenElevationType
	TokenLinkedToken
	TokenElevation
	TokenHasRestrictions
	TokenAccessInformation
	TokenVirtualizationAllowed
	TokenVirtualizationEnabled
	TokenIntegrityLevel
	TokenUIAccess
	TokenMandatoryPolicy
	TokenLogonSid
	VMaxTokenInfoClass
)

// type TokenType uint32

type DWORD uint32

type LUID struct {
	LowPart  uint32
	HighPart int32
}

type LUID_AND_ATTRIBUTES struct {
	Luid       LUID
	Attributes uint32
}

type BOOL int

type PRIVILEGE_SET struct {
	PrivilegeCount DWORD
	Control        DWORD
	Privilege      []LUID_AND_ATTRIBUTES
}

type TOKEN_PRIVILEGES struct {
	PrivilegeCount uint32
	Privileges     [1]LUID_AND_ATTRIBUTES
}

const (
	// http://www.delphigroups.info/2/0e/484036.html
	MAX_BUFFER_LENGTH                       = 32767
	ERROR_moreData            syscall.Errno = 234
	MAX_PATH                                = 260
	PROCESS_ALL_ACCESS                      = syscall.STANDARD_RIGHTS_REQUIRED | syscall.SYNCHRONIZE | 0xfff
	MEM_COMMIT                              = 0x001000
	MEM_RESERVE                             = 0x002000
	PROCESS_QUERY_INFORMATION               = 0x0400
	SecurityAnonymous                       = 0
	SecurityIdentification                  = 1
	SecurityImpersonation                   = 2
	SecurityDelegation                      = 3
	// TokenPrimary              TokenType = 1
	// TokenImpersonation        TokenType = 2
	STANDARD_RIGHTS_REQUIRED = 0x000F
	SYNCHRONIZE              = 0x00100000
	THREAD_ALL_ACCESS        = STANDARD_RIGHTS_REQUIRED | SYNCHRONIZE | 0xffff
	TOKEN_ADJUST_PRIVILEGES  = 0x0020
	SE_PRIVILEGE_ENABLED     = 0x00000002
	// MEM_RELEASE is a Windows constant used with Windows API calls
	MEM_RELEASE = 0x8000
	// PAGE_EXECUTE is a Windows constant used with Windows API calls
	PAGE_EXECUTE = 0x10
	// PAGE_EXECUTE_READWRITE is a Windows constant used with Windows API calls
	PAGE_EXECUTE_READWRITE = 0x40
	// PAGE_READWRITE is a Windows constant used with Windows API calls
	PAGE_READWRITE = 0x04
	// PROCESS_CREATE_THREAD is a Windows constant used with Windows API calls
	PROCESS_CREATE_THREAD = 0x0002
	// PROCESS_VM_READ is a Windows constant used with Windows API calls
	PROCESS_VM_READ = 0x0010
	//PROCESS_VM_WRITE is a Windows constant used with Windows API calls
	PROCESS_VM_WRITE = 0x0020
	// PROCESS_VM_OPERATION is a Windows constant used with Windows API calls
	PROCESS_VM_OPERATION = 0x0008
	// TH32CS_SNAPHEAPLIST is a Windows constant used with Windows API calls
	TH32CS_SNAPHEAPLIST = 0x00000001
	// TH32CS_SNAPMODULE is a Windows constant used with Windows API calls
	TH32CS_SNAPMODULE = 0x00000008
	// TH32CS_SNAPPROCESS is a Windows constant used with Windows API calls
	TH32CS_SNAPPROCESS = 0x00000002
	// TH32CS_SNAPTHREAD is a Windows constant used with Windows API calls
	TH32CS_SNAPTHREAD = 0x00000004
	// THREAD_SET_CONTEXT is a Windows constant used with Windows API calls
	THREAD_SET_CONTEXT = 0x0010
)

var (
	kernel32                   = syscall.MustLoadDLL("kernel32.dll")
	procVirtualAllocEx         = kernel32.MustFindProc("VirtualAllocEx")
	procVirtualProtectEx       = kernel32.MustFindProc("VirtualProtectEx")
	procWriteProcessMemory     = kernel32.MustFindProc("WriteProcessMemory")
	procCreateRemoteThread     = kernel32.MustFindProc("CreateRemoteThread")
	procGetExitCodeThread      = kernel32.MustFindProc("GetExitCodeThread")
	procIsWow64Process         = kernel32.MustFindProc("IsWow64Process")
	procGetLogicalDriveStrings = kernel32.MustFindProc("GetLogicalDriveStringsW")
	procGetVolumeInformation   = kernel32.MustFindProc("GetVolumeInformationW")
	procGetDiskFreeSpaceEx     = kernel32.MustFindProc("GetDiskFreeSpaceExW")
)

func GetExitCodeThread(threadHandle syscall.Handle) (uint32, error) {
	var exitCode uint32
	r1, _, e1 := procGetExitCodeThread.Call(uintptr(threadHandle), uintptr(unsafe.Pointer(&exitCode)))
	// log.Println("r1:", r1)
	// log.Println("Thread State:", exitCode)
	if r1 == 0 {
		// log.Println("r1 was zero:", e1.Error())
		return exitCode, e1
	}
	return exitCode, nil
}

func VirtualAllocEx(process syscall.Handle, addr uintptr, size, allocType, protect uint32) (uintptr, error) {
	r1, _, e1 := procVirtualAllocEx.Call(
		uintptr(process),
		addr,
		uintptr(size),
		uintptr(allocType),
		uintptr(protect))

	log.Println("VirtualAllocEx:", e1.Error())
	if int(r1) == 0 {
		return r1, os.NewSyscallError("VirtualAllocEx", e1)
	}
	return r1, nil
}

func VirtualProtectEx(process syscall.Handle, addr uintptr, size, newProtect uint32, oldProtect uintptr) error {
	r1, _, e1 := procVirtualProtectEx.Call(
		uintptr(process),
		addr,
		uintptr(size),
		uintptr(newProtect),
		oldProtect)

	log.Println("VirtualProtectEx:", e1.Error())
	if int(r1) == 0 {
		return os.NewSyscallError("VirtualProtectEx", e1)
	}
	return nil
}

func WriteProcessMemory(process syscall.Handle, addr uintptr, buf unsafe.Pointer, size uint32) (uint32, error) {
	var nLength uint32
	r1, _, e1 := procWriteProcessMemory.Call(
		uintptr(process),
		addr,
		uintptr(buf),
		uintptr(size),
		uintptr(unsafe.Pointer(&nLength)))

	log.Println("WriteProcessMemory:", e1.Error())
	if int(r1) == 0 {
		return nLength, os.NewSyscallError("WriteProcessMemory", e1)
	}
	return nLength, nil
}

func CreateRemoteThread(process syscall.Handle, sa uintptr, stackSize uint32, startAddress, parameter uintptr, creationFlags uint32, threadId uintptr) (syscall.Handle, error) {
	r1, _, e1 := procCreateRemoteThread.Call(
		uintptr(process),
		sa,
		uintptr(stackSize),
		startAddress,
		parameter,
		uintptr(creationFlags),
		threadId)
	log.Println("Called CreateRemoteThread:", e1.Error())
	// runtime.KeepAlive(sa)
	if int(r1) == 0 {
		return syscall.InvalidHandle, os.NewSyscallError("CreateRemoteThread", e1)
	}
	return syscall.Handle(r1), nil
}

func IsWow64Process(process syscall.Handle) (bool, error) {
	res := false
	resPtr := unsafe.Pointer(&res)
	_, _, e1 := procIsWow64Process.Call(
		uintptr(process),
		uintptr(resPtr))
	log.Println("IsWow64Process res:", res)
	return !res, e1
}

func DuplicateTokenEx(hExistingToken syscall.Token, dwDesiredAccess uint32, lpTokenAttributes *syscall.SecurityAttributes, impersonationLevel uint32, tokenType TTokenType, phNewToken *syscall.Token) (err error) {
	modadvapi32 := syscall.MustLoadDLL("advapi32.dll")
	defer modadvapi32.Release()
	procDuplicateTokenEx := modadvapi32.MustFindProc("DuplicateTokenEx")
	r1, _, err := procDuplicateTokenEx.Call(uintptr(hExistingToken), uintptr(dwDesiredAccess), uintptr(unsafe.Pointer(lpTokenAttributes)), uintptr(impersonationLevel), uintptr(tokenType), uintptr(unsafe.Pointer(phNewToken)))
	if r1 != 0 {
		return nil
	}
	return
}

func AdjustTokenPrivileges(token syscall.Token, disableAllPrivileges bool, newstate *TOKEN_PRIVILEGES, buflen uint32, prevstate *TOKEN_PRIVILEGES, returnlen *uint32) error {
	modadvapi32 := syscall.MustLoadDLL("advapi32.dll")
	procAdjustTokenPrivileges := modadvapi32.MustFindProc("AdjustTokenPrivileges")
	var _p0 uint32
	if disableAllPrivileges {
		_p0 = 1
	} else {
		_p0 = 0
	}
	_, _, e1 := procAdjustTokenPrivileges.Call(uintptr(token), uintptr(_p0), uintptr(unsafe.Pointer(newstate)), uintptr(buflen), uintptr(unsafe.Pointer(prevstate)), uintptr(unsafe.Pointer(returnlen)))
	// if r0 == 0 {
	// 	err = e1
	// }
	return e1
}

func LookupPrivilegeValue(systemname *uint16, name *uint16, luid *LUID) (err error) {
	modadvapi32 := syscall.MustLoadDLL("advapi32.dll")
	procLookupPrivilegeValueW := modadvapi32.MustFindProc("LookupPrivilegeValueW")
	r1, _, e1 := procLookupPrivilegeValueW.Call(uintptr(unsafe.Pointer(systemname)), uintptr(unsafe.Pointer(name)), uintptr(unsafe.Pointer(luid)))
	if r1 == 0 {
		err = e1
	}
	return
}

func GetCurrentThread() (pseudoHandle syscall.Handle, err error) {
	modkernel32 := syscall.MustLoadDLL("kernel32.dll")
	procGetCurrentThread := modkernel32.MustFindProc("GetCurrentThread")
	r0, _, e1 := procGetCurrentThread.Call(0, 0, 0)
	pseudoHandle = syscall.Handle(r0)
	if pseudoHandle == 0 {
		err = e1
	}
	return
}

func OpenThreadToken(h syscall.Handle, access uint32, openasself bool, token *syscall.Token) (err error) {
	modadvapi32 := syscall.MustLoadDLL("advapi32.dll")
	procOpenThreadToken := modadvapi32.MustFindProc("OpenThreadToken")
	var _p0 uint32
	if openasself {
		_p0 = 1
	} else {
		_p0 = 0
	}
	r1, _, e1 := procOpenThreadToken.Call(uintptr(h), uintptr(access), uintptr(_p0), uintptr(unsafe.Pointer(token)), 0, 0)
	if r1 == 0 {
		err = e1
	}
	return
}

func ImpersonateLoggedOnUser(hToken syscall.Token) (err error) {
	modadvapi32 := syscall.MustLoadDLL("advapi32.dll")
	procImpersonateLoggedOnUser := modadvapi32.MustFindProc("ImpersonateLoggedOnUser")
	r1, _, err := procImpersonateLoggedOnUser.Call(uintptr(hToken))
	if r1 != 0 {
		return nil
	}
	return
}

func RevertToSelf() error {
	modadvapi32 := syscall.MustLoadDLL("advapi32.dll")
	procRevertToSelf := modadvapi32.MustFindProc("RevertToSelf")
	r1, _, err := procRevertToSelf.Call()
	if r1 != 0 {
		return nil
	}
	return err
}

func SePrivEnable(s string) error {
	var tokenHandle syscall.Token
	thsHandle, err := syscall.GetCurrentProcess()
	if err != nil {
		return err
	}
	syscall.OpenProcessToken(
		//r, a, e := procOpenProcessToken.Call(
		thsHandle,                       //  HANDLE  ProcessHandle,
		syscall.TOKEN_ADJUST_PRIVILEGES, //	DWORD   DesiredAccess,
		&tokenHandle,                    //	PHANDLE TokenHandle
	)
	var luid LUID
	err = LookupPrivilegeValue(nil, syscall.StringToUTF16Ptr(s), &luid)
	if err != nil {
		// {{if .Debug}}
		log.Printf("LookupPrivilegeValueW failed for %s. Error: %s\n", s, err)
		// {{end}}
		return err
	}
	privs := TOKEN_PRIVILEGES{}
	privs.PrivilegeCount = 1
	privs.Privileges[0].Luid = luid
	privs.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED
	err = AdjustTokenPrivileges(tokenHandle, false, &privs, 0, nil, nil)
	if !strings.Contains(err.Error(), "completed successfully") {
		// {{if .Debug}}
		log.Println("AdjustTokenPrivileges failed", err)
		// {{end}}
		return err
	}
	return nil
	// success := false
	// _, _ = PrivilegeCheck(tokenHandle, &privs, &success)
	// log.Println("PrivilegeCheck result:", success)
	// if !success {
	// 	return errors.New("Failed to set required privilege.")
	// } else {
	// 	return nil
	// }
}

func GetPrimaryToken(pid uint32) (*syscall.Token, error) {
	handle, err := syscall.OpenProcess(syscall.PROCESS_QUERY_INFORMATION, true, pid)
	if err != nil {
		// {{if .Debug}}
		log.Println("OpenProcess failed")
		// {{end}}
		return nil, err
	}
	defer syscall.CloseHandle(handle)
	var token syscall.Token
	if err = syscall.OpenProcessToken(handle, syscall.TOKEN_DUPLICATE|syscall.TOKEN_ASSIGN_PRIMARY|syscall.TOKEN_QUERY, &token); err != nil {
		// {{if .Debug}}
		log.Println("OpenProcessToken failed")
		// {{end}}
		return nil, err
	}
	return &token, err
}

func EnableCurrentThreadPrivilege(privilegeName string) error {
	ct, err := GetCurrentThread()
	if err != nil {
		// {{if .Debug}}
		log.Println("GetCurrentThread failed", err)
		// {{end}}
		return err
	}
	var t syscall.Token
	err = OpenThreadToken(ct, syscall.TOKEN_QUERY|TOKEN_ADJUST_PRIVILEGES, true, &t)
	if err != nil {
		// {{if .Debug}}
		log.Println("OpenThreadToken failed", err)
		// {{end}}
		return err
	}
	defer syscall.CloseHandle(syscall.Handle(t))

	var tp TOKEN_PRIVILEGES

	privStr, err := syscall.UTF16PtrFromString(privilegeName)
	if err != nil {
		return err
	}
	err = LookupPrivilegeValue(nil, privStr, &tp.Privileges[0].Luid)
	if err != nil {
		// {{if .Debug}}
		log.Println("LookupPrivilegeValue failed")
		// {{end}}
		return err
	}
	tp.PrivilegeCount = 1
	tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED
	return AdjustTokenPrivileges(t, false, &tp, 0, nil, nil)
}

func ImpersonateProcess(pid uint32) (newToken syscall.Token, err error) {
	var attr syscall.SecurityAttributes
	var requiredPrivileges = []string{"SeAssignPrimaryTokenPrivilege", "SeIncreaseQuotaPrivilege"}
	primaryToken, err := GetPrimaryToken(pid)

	if err != nil {
		// {{if .Debug}}
		log.Println("GetPrimaryToken failed:", err)
		// {{end}}
		return
	}
	defer primaryToken.Close()

	err = ImpersonateLoggedOnUser(*primaryToken)
	if err != nil {
		// {{if .Debug}}
		log.Println("ImpersonateLoggedOnUser failed:", err)
		// {{end}}
		return
	}
	err = DuplicateTokenEx(*primaryToken, syscall.TOKEN_ALL_ACCESS, &attr, SecurityDelegation, TokenPrimary, &newToken)
	if err != nil {
		// {{if .Debug}}
		log.Println("DuplicateTokenEx failed:", err)
		// {{end}}
		return
	}
	for _, priv := range requiredPrivileges {
		err = EnableCurrentThreadPrivilege(priv)
		if !strings.Contains(err.Error(), "completed successfully") {
			// {{if .Debug}}
			log.Println("Failed to set priv", priv)
			// {{end}}
			return
		}
	}
	return
}

// BEGIN CHINA

func OpenCurrentProcessToken() (syscall.Token, error) {
	p, e := syscall.GetCurrentProcess()
	if e != nil {
		return 0, e
	}
	var t syscall.Token
	e = syscall.OpenProcessToken(p, syscall.TOKEN_QUERY, &t)
	if e != nil {
		return 0, e
	}
	return t, nil
}

func GetTokenInformation(TokenHandle uintptr, TokenInformationClass TTokenInformationClass, TokenInformation uintptr, TokenInformationLength uint32,
	ReturnLength *uint32) bool {
	modadvapi32 := syscall.MustLoadDLL("advapi32.dll")
	defer modadvapi32.Release()
	_GetTokenInformation := modadvapi32.MustFindProc("GetTokenInformation")
	r, _, _ := _GetTokenInformation.Call(TokenHandle, uintptr(TokenInformationClass), TokenInformation, uintptr(TokenInformationLength), uintptr(unsafe.Pointer(ReturnLength)))
	return r != 0
}

func IsAdministrator() bool {
	token, err := OpenCurrentProcessToken()
	if err != nil {
		return false
	}
	defer token.Close()
	var TokenIsElevated uint32
	var ReturnLength uint32
	if GetTokenInformation(uintptr(token), TokenElevation, uintptr(unsafe.Pointer(&TokenIsElevated)), uint32(unsafe.Sizeof(TokenIsElevated)), &ReturnLength) {
		if ReturnLength == uint32(unsafe.Sizeof(TokenIsElevated)) {
			return TokenIsElevated > 0
		}
	}
	return false
}

/*
DWORD GetLogicalDriveStringsW(
  DWORD  nBufferLength,
  LPWSTR lpBuffer
);
*/
func GetLogicalDriveStrings() ([]string, error) {
	lpBuffer := new([MAX_PATH + 1]uint16)
	lpBufferPtr := unsafe.Pointer(lpBuffer)
	r1, _, e1 := procGetLogicalDriveStrings.Call(MAX_PATH, uintptr(lpBufferPtr))
	if r1 == 0 {
		log.Println(e1.Error())
		return []string{}, nil
	}
	drives := UTF16ToString(lpBuffer[:])
	return drives, nil
}

/*
BOOL GetVolumeInformationW(
  LPCWSTR lpRootPathName,
  LPWSTR  lpVolumeNameBuffer,
  DWORD   nVolumeNameSize,
  LPDWORD lpVolumeSerialNumber,
  LPDWORD lpMaximumComponentLength,
  LPDWORD lpFileSystemFlags,
  LPWSTR  lpFileSystemNameBuffer,
  DWORD   nFileSystemNameSize
);*/
func GetVolumeInformation(drive string) ([]string, error) {
	drivePtr := unsafe.Pointer(syscall.StringToUTF16Ptr(drive))
	volName := new([MAX_PATH]uint16)
	volNamePtr := unsafe.Pointer(volName)
	r1, _, e1 := procGetVolumeInformation.Call(
		uintptr(drivePtr),
		uintptr(volNamePtr),
		MAX_PATH,
		0,
		0,
		0,
		0,
		0,
	)
	if r1 == 0 {
		return []string{}, e1
	}
	return UTF16ToString(volName[:]), nil
}

/*
BOOL GetDiskFreeSpaceExW(
	LPCWSTR         lpDirectoryName,
	PULARGE_INTEGER lpFreeBytesAvailableToCaller,
	PULARGE_INTEGER lpTotalNumberOfBytes,
	PULARGE_INTEGER lpTotalNumberOfFreeBytes
  );
*/
func GetDiskFreeSpaceEx(disk string) (uint64, uint64, uint64, error) {
	freeBytesAvailableToCaller := new(uint64)
	totalNumberOfBytes := new(uint64)
	totalNumberOfFreeBytes := new(uint64)

	lpDirectoryName := unsafe.Pointer(syscall.StringToUTF16Ptr(disk))
	lpFreeBytesAvailableToCaller := unsafe.Pointer(freeBytesAvailableToCaller)
	lpTotalNumberOfBytes := unsafe.Pointer(totalNumberOfBytes)
	lpTotalNumberOfFreeBytes := unsafe.Pointer(totalNumberOfFreeBytes)
	r1, _, e1 := procGetDiskFreeSpaceEx.Call(
		uintptr(lpDirectoryName),
		uintptr(lpFreeBytesAvailableToCaller),
		uintptr(lpTotalNumberOfBytes),
		uintptr(lpTotalNumberOfFreeBytes),
	)
	if r1 == 0 {
		return 0, 0, 0, e1
	}
	return *freeBytesAvailableToCaller, *totalNumberOfBytes, *totalNumberOfFreeBytes, nil
}

// Helper function to convert DWORD byte counts to
// human readable sizes.
func UINT32ByteCountDecimal(b uint32) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := uint32(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float32(b)/float32(div), "kMGTPE"[exp])
}

// Helper function to convert LARGE_INTEGER byte
//  counts to human readable sizes.
func UINT64ByteCountDecimal(b uint64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := uint64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "kMGTPE"[exp])
}

// Helper function to build a string from a WCHAR string
func UTF16ToString(s []uint16) []string {
	var results []string
	cut := 0
	for i, v := range s {
		if v == 0 {
			if i-cut > 0 {
				results = append(results, string(utf16.Decode(s[cut:i])))
			}
			cut = i + 1
		}
	}
	if cut < len(s) {
		results = append(results, string(utf16.Decode(s[cut:])))
	}
	return results
}
