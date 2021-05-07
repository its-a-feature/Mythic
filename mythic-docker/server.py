from app import (
    mythic,
    listen_ip,
    listen_port,
    keep_logs
)
import traceback
import multiprocessing


if __name__ == "__main__":
    try:
        try:
            workers = multiprocessing.cpu_count()
            mythic.run(host=listen_ip, port=int(listen_port),
                       debug=False, access_log=keep_logs, workers=workers + 1)
        except Exception as e:
            print(str(e))
    except Exception as e:
        traceback.print_exc()
