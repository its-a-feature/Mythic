using System.Collections.Generic;
namespace Atlas
{
    public class Config
    {
        public static List<string> CallbackHosts = new List<string> { "callback_host:callback_port" };
        public static List<Utils.Server> Servers = new List<Utils.Server> { };
        public static string PayloadUUID = "%UUID%";
        public static string UUID = "";
        public static string UserAgent = "USER_AGENT";
        public static string HostHeader = "domain_front";
        public static int Sleep = callback_interval;
        public static int Jitter = callback_jitter;
        public static string KillDate = "killdate";
        public static string Param = "%PARAM%";
        public const int ChunkSize = %CHUNK_SIZE%;
        public static bool DefaultProxy = %DEFAULT_PROXY%;
        public static string ProxyAddress = "%PROXY_ADDRESS%";
        public static string ProxyUser = "%PROXY_USER%";
        public static string ProxyPassword = "%PROXY_PASSWORD%";
#if (DEFAULT || DEFULAT_PSK || DEFAULT_EKE)
        public static string Url = "/api/v1.4/agent_message";
#endif
#if (Default_PSK || DEFAULT_EKE)
        public static string Psk = "AESPSK";
#endif
#if DEFAULT_EKE
        public static string SessionId = "";
        public static string tempUUID = "";
        public static System.Security.Cryptography.RSACryptoServiceProvider Rsa;
#endif
        public static Dictionary<string, string> Modules = new Dictionary<string, string>();
    }
}