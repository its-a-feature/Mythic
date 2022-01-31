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
            from app.api.rabbitmq_api import subprocess_listen_for_background_processing

            try:
                p = multiprocessing.Process(target=subprocess_listen_for_background_processing)
                p.start()
            except Exception as d:
                print("Exception in trying to start process: " + str(d))
            mythic.run(host=listen_ip, port=int(listen_port),
                       debug=keep_logs, access_log=False, workers=1)

        except Exception as e:
            print(str(e))
    except Exception as e:
        traceback.print_exc()
