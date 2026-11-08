package guac

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

const (
	DefaultPort             = 4822
	defaultHandshakeTimeout = 10 * time.Second
	defaultMaxElementRunes  = 16 * 1024 * 1024
	protocolVersion         = "VERSION_1_5_0"
)

var ErrMalformedInstruction = errors.New("malformed Guacamole instruction")

var dialForTest = func(ctx context.Context, network string, address string, timeout time.Duration) (net.Conn, error) {
	dialer := net.Dialer{Timeout: timeout}
	return dialer.DialContext(ctx, network, address)
}

// Instruction is one complete Guacamole protocol instruction. Raw includes the
// terminating semicolon and can be forwarded without re-encoding.
type Instruction struct {
	Elements []string
	Raw      []byte
}

func (instruction Instruction) Opcode() string {
	if len(instruction.Elements) == 0 {
		return ""
	}
	return instruction.Elements[0]
}

// EncodeInstruction encodes elements using the Guacamole protocol's Unicode
// character length prefixes (which are rune counts, not UTF-8 byte counts).
func EncodeInstruction(elements ...string) []byte {
	var encoded strings.Builder
	for index, element := range elements {
		if index > 0 {
			encoded.WriteByte(',')
		}
		encoded.WriteString(strconv.Itoa(utf8.RuneCountInString(element)))
		encoded.WriteByte('.')
		encoded.WriteString(element)
	}
	encoded.WriteByte(';')
	return []byte(encoded.String())
}

// Reader incrementally parses Guacamole instructions without assuming that a
// TCP read aligns with an instruction or that element values are ASCII.
type Reader struct {
	reader          *bufio.Reader
	maxElementRunes int
}

func NewReader(reader io.Reader) *Reader {
	return &Reader{reader: bufio.NewReader(reader), maxElementRunes: defaultMaxElementRunes}
}

func (reader *Reader) ReadInstruction() (Instruction, error) {
	var raw []byte
	var elements []string
	for {
		lengthDigits := make([]byte, 0, 8)
		for {
			value, err := reader.reader.ReadByte()
			if err != nil {
				return Instruction{}, err
			}
			raw = append(raw, value)
			if value == '.' {
				break
			}
			if value < '0' || value > '9' || len(lengthDigits) >= 9 {
				return Instruction{}, ErrMalformedInstruction
			}
			lengthDigits = append(lengthDigits, value)
		}
		if len(lengthDigits) == 0 {
			return Instruction{}, ErrMalformedInstruction
		}
		length, err := strconv.Atoi(string(lengthDigits))
		if err != nil || length < 0 || length > reader.maxElementRunes {
			return Instruction{}, ErrMalformedInstruction
		}
		var element strings.Builder
		for runeIndex := 0; runeIndex < length; runeIndex++ {
			value, size, err := reader.reader.ReadRune()
			if err != nil {
				return Instruction{}, err
			}
			if value == utf8.RuneError && size == 1 {
				return Instruction{}, ErrMalformedInstruction
			}
			element.WriteRune(value)
			raw = utf8.AppendRune(raw, value)
		}
		delimiter, err := reader.reader.ReadByte()
		if err != nil {
			return Instruction{}, err
		}
		raw = append(raw, delimiter)
		elements = append(elements, element.String())
		switch delimiter {
		case ',':
			continue
		case ';':
			return Instruction{Elements: elements, Raw: raw}, nil
		default:
			return Instruction{}, ErrMalformedInstruction
		}
	}
}

type DialOptions struct {
	Address  string
	Protocol string
	Width    int
	Height   int
	DPI      int
	Timezone string
	Name     string
	Args     map[string]string
	Timeout  time.Duration
}

// Conn is a post-handshake connection to guacd.
type Conn struct {
	net.Conn
	reader       *Reader
	writeMu      sync.Mutex
	ConnectionID string
}

func (connection *Conn) ReadInstruction() (Instruction, error) {
	return connection.reader.ReadInstruction()
}

func (connection *Conn) WriteInstruction(elements ...string) error {
	return connection.WriteRaw(EncodeInstruction(elements...))
}

func (connection *Conn) WriteRaw(data []byte) error {
	connection.writeMu.Lock()
	defer connection.writeMu.Unlock()
	for len(data) > 0 {
		written, err := connection.Conn.Write(data)
		if err != nil {
			return err
		}
		if written <= 0 || written > len(data) {
			return io.ErrShortWrite
		}
		data = data[written:]
	}
	return nil
}

// Dial performs the Guacamole handshake. Protocol may be a protocol plugin
// name (for example, rdp or vnc) or an active guacd connection ID when joining.
func Dial(ctx context.Context, options DialOptions) (*Conn, error) {
	if options.Protocol == "" {
		return nil, errors.New("Guacamole protocol is required")
	}
	if options.Address == "" {
		options.Address = net.JoinHostPort("127.0.0.1", strconv.Itoa(DefaultPort))
	}
	if options.Width <= 0 {
		options.Width = 1024
	}
	if options.Height <= 0 {
		options.Height = 768
	}
	if options.DPI <= 0 {
		options.DPI = 96
	}
	if options.Timezone == "" {
		options.Timezone = "UTC"
	}
	if options.Name == "" {
		options.Name = "Mythic"
	}
	if options.Timeout <= 0 {
		options.Timeout = defaultHandshakeTimeout
	}

	rawConnection, err := dialForTest(ctx, "tcp", options.Address, options.Timeout)
	if err != nil {
		return nil, err
	}
	connection := &Conn{Conn: rawConnection, reader: NewReader(rawConnection)}
	failed := true
	defer func() {
		if failed {
			_ = connection.Close()
		}
	}()
	deadline := time.Now().Add(options.Timeout)
	_ = connection.SetDeadline(deadline)
	if err = connection.WriteInstruction("select", options.Protocol); err != nil {
		return nil, err
	}
	argsInstruction, err := connection.ReadInstruction()
	if err != nil {
		return nil, err
	}
	if argsInstruction.Opcode() != "args" {
		return nil, fmt.Errorf("guacd returned %q instead of args", argsInstruction.Opcode())
	}
	if err = connection.WriteInstruction("size", strconv.Itoa(options.Width), strconv.Itoa(options.Height),
		strconv.Itoa(options.DPI)); err != nil {
		return nil, err
	}
	for _, instruction := range [][]string{
		{"audio"},
		{"video"},
		{"image", "image/png", "image/jpeg", "image/webp"},
		{"timezone", options.Timezone},
		{"name", options.Name},
	} {
		if err = connection.WriteInstruction(instruction...); err != nil {
			return nil, err
		}
	}
	connect := []string{"connect"}
	for _, argument := range argsInstruction.Elements[1:] {
		if strings.HasPrefix(argument, "VERSION_") {
			connect = append(connect, protocolVersion)
		} else {
			connect = append(connect, options.Args[argument])
		}
	}
	if err = connection.WriteInstruction(connect...); err != nil {
		return nil, err
	}
	ready, err := connection.ReadInstruction()
	if err != nil {
		return nil, err
	}
	if ready.Opcode() != "ready" || len(ready.Elements) != 2 || ready.Elements[1] == "" {
		if ready.Opcode() == "error" && len(ready.Elements) > 1 {
			return nil, fmt.Errorf("guacd rejected connection: %s", ready.Elements[1])
		}
		return nil, fmt.Errorf("guacd returned %q instead of ready", ready.Opcode())
	}
	connection.ConnectionID = ready.Elements[1]
	_ = connection.SetDeadline(time.Time{})
	failed = false
	return connection, nil
}
