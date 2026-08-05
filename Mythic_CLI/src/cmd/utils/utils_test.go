package utils

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func TestEnsureFileExistsDoesNotTruncateExistingFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	want := []byte("EXISTING=value\n")
	if err := os.WriteFile(path, want, 0600); err != nil {
		t.Fatal(err)
	}

	if err := EnsureFileExists(path, 0666); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("existing file was changed: got %q, want %q", got, want)
	}
}

func TestAtomicWriteFileConcurrentWritersProduceCompleteFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "docker-compose.yml")
	payloads := make([][]byte, 6)
	validPayloads := make(map[string]struct{}, len(payloads))
	for i := range payloads {
		payloads[i] = bytes.Repeat([]byte(fmt.Sprintf("writer-%d\n", i)), 8192)
		validPayloads[string(payloads[i])] = struct{}{}
	}
	if err := AtomicWriteFile(path, payloads[0], 0644); err != nil {
		t.Fatal(err)
	}

	var writers sync.WaitGroup
	writerErrors := make(chan error, len(payloads))
	for i := range payloads {
		writers.Add(1)
		go func(payload []byte) {
			defer writers.Done()
			for range 20 {
				if err := AtomicWriteFile(path, payload, 0644); err != nil {
					writerErrors <- err
					return
				}
			}
		}(payloads[i])
	}

	writersDone := make(chan struct{})
	go func() {
		writers.Wait()
		close(writersDone)
	}()

	for {
		contents, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if _, ok := validPayloads[string(contents)]; !ok {
			t.Fatalf("observed partial or mixed file with %d bytes", len(contents))
		}

		select {
		case <-writersDone:
			close(writerErrors)
			for err := range writerErrors {
				t.Errorf("concurrent writer failed: %v", err)
			}
			return
		default:
		}
	}
}
