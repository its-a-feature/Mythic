using System;
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
        public static int Sleep = Int32.Parse("callback_interval");
        public static int Jitter = Int32.Parse("callback_jitter");
        public static string KillDate = "killdate";
        public static string Param = "query_path_name";
        public static int ChunkSize = Int32.Parse("%CHUNK_SIZE%");
        public static bool DefaultProxy = bool.Parse("%DEFAULT_PROXY%");
        public static string ProxyAddress = "proxy_host:proxy_port";
        public static string ProxyUser = "proxy_user";
        public static string ProxyPassword = "proxy_pass";
        public static string GetUrl = "/get_uri";
        public static string PostUrl = "/post_uri";

#if (Default_PSK || DEFAULT_EKE)
        public static string Psk = "AESPSK";
#else
        public static string Psk = "";
#endif
#if DEFAULT_EKE
        public static string SessionId = "";
        public static string tempUUID = "";
        public static System.Security.Cryptography.RSACryptoServiceProvider Rsa;
#endif
        public static Dictionary<string, string> Modules = new Dictionary<string, string>();
    }
}