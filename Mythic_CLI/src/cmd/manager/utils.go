package manager

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/creack/pty"
)

func RunCommand(binary string, args []string) (err error) {
	lookPath, err := exec.LookPath(binary)
	if err != nil {
		log.Fatalf("[-] %s is not installed or available in the current PATH\n", binary)
	}
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get lookPath to current executable\n%v", err)
	}
	exePath := filepath.Dir(exe)
	command := exec.Command(lookPath, args...)
	command.Dir = exePath
	command.Env = os.Environ()
	f, err := pty.Start(command)
	if err != nil {
		if f != nil {
			defer f.Close()
		}

		stdout, err := command.StdoutPipe()
		if err != nil {
			log.Fatalf("[-] Failed to get stdout pipe for running %s\n%v", binary, err)
		}
		stderr, err := command.StderrPipe()
		if err != nil {
			log.Fatalf("[-] Failed to get stderr pipe for running %s\n%v", binary, err)
		}

		stdoutScanner := bufio.NewScanner(stdout)
		stderrScanner := bufio.NewScanner(stderr)
		go func() {
			for stdoutScanner.Scan() {
				fmt.Printf("%s\n", stdoutScanner.Text())
			}
		}()
		go func() {
			for stderrScanner.Scan() {
				fmt.Printf("%s\n", stderrScanner.Text())
			}
		}()
		err = command.Start()
		if err != nil {
			log.Fatalf("[-] Error trying to start %s: %v\n", binary, err)
		}
		err = command.Wait()
		if err != nil {
			log.Printf("[-] Error from %s: %v\n", binary, err)
			log.Printf("[*] %s command: %v\n", binary, args)
			return err
		}
		if command.ProcessState.ExitCode() != 0 {
			log.Fatalf("[-] Error from %s: %v\n", binary, command.ProcessState.ExitCode())
		}
	} else {
		io.Copy(os.Stdout, f)
		processState, err := command.Process.Wait()
		if err != nil {
			log.Printf("[-] Error from %s: %v\n", binary, err)
			return err
		}
		if processState.ExitCode() != 0 {
			return fmt.Errorf("%s %v exited with code %d", binary, args, processState.ExitCode())
		}
	}
	return nil
}
