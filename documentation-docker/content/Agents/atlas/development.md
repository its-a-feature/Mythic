+++
title = "Development"
chapter = false
weight = 20
pre = "<b>3. </b>"
+++

## Development Environment

`atlas` was intended to be used with Windows 10+ systems, therefore having a Windows 10 machine/VM would be the best operating environement for development. The agent code is associated with a Visual Studio project file, allowing development to be completed within Visual Studio. If not available, any text editor can modify the agent files.

## Adding Commands

There are two aspects to adding a new command to the `atlas` agent. The first part of a new command is to add a case within the agent's `ExecuteTasking` function in `Utils.cs`. This is the dispatch logic for selecting what function to execute for a given job. The second aspect is optionally if needed for the new command, which is that the command function can be created, these typically reside in the `Modules.cs` file as a `public static` function that will return a string value for the Mythic's `user_output`. Below is an example of the case statement used for the `cd` command, you cna see this command did not require a new function.

##### ExecuteTasking Case Statement
```
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
```

Each command sent to an `atlas` agent is parsed and put into a new `Job` object for `atlas` to track and execute a tasking. This `Job` object has several properties used by different commands as see in the structure below.

```
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
}
```

Not all properties for `Job`'s are required to be used, but can be useful depending on the task. The main properties that will _almost_ always be used are described below.

- `job_id` - this is given based on a count of taskings recieved by the agent. This is used with the `jobs` and `jobkill` commands to view running jobs and kill any long running jobs.
- `task_id` - this is the Mythic `task_id` used to identify that sopecific tasking.
- `completed` - this property must be set to `true` before `atlas` will attempt to send the task response back to Mythic.
- `success` - this property lets `atlas` know whether a task failed/errored during execution and properly send that info to Mythic.
- `command` - this property is the command for the job to execute.
- `parameters` - this property is the arguments to the command to be executed.
- `response` - this property is a string to send back to Mythic and display as `user_output`.

Taskings may also access global configuration data for the agent via the `Config` class. Data available is displayed below.

```
public class Config
{
    public static List<string> CallbackHosts = new List<string> { "callback_host:callback_port" };
    public static List<Utils.Server> Servers = new List<Utils.Server> { };
    public static string PayloadUUID = "%UUID%";
    public static string UUID = "";
    public static string UserAgent = "USER_AGENT";
    public static string HostHeader = "domain_front";
    public static int Sleep = Int32.Parse("callback_interval");
    public static int Jitter = Int32.Parse("callback_jitter");
    public static string KillDate = "killdate";
    public static string Param = "%PARAM%";
    public static int ChunkSize = Int32.Parse("%CHUNK_SIZE%");
    public static bool DefaultProxy = bool.Parse("%DEFAULT_PROXY%");
    public static string ProxyAddress = "%PROXY_ADDRESS%";
    public static string ProxyUser = "%PROXY_USER%";
    public static string ProxyPassword = "%PROXY_PASSWORD%";
    public static string Url = "/api/v1.4/agent_message";
    public static string Psk = "AESPSK";
    public static string SessionId = "";
    public static string tempUUID = "";
    public static System.Security.Cryptography.RSACryptoServiceProvider Rsa;
    public static Dictionary<string, string> Modules = new Dictionary<string, string>();
}
```

> Some of this data may or may not be available depending on agent build factors.