from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
import datetime

# ---- CONFIG ----
url = "http://localhost:8086"
token = "SdNnjDZQtmC3NqcvExpqSugL2DOjMUzjqzPYVhJn0c8Njpa86MbglD85ccNOdRRjMv2FA7OCgIt64Eo7uLW1EQ=="
org = "my-org"   # must exactly match your org name in $
bucket = "iot_data"
# ----------------

client = InfluxDBClient(url=url, token=token, org=org)
write_api = client.write_api(write_options=SYNCHRONOUS)


point = (
    Point("test_measurement")
    .tag("device_id", "demo")
    .field("temperature", 72.5)
    .time(datetime.datetime.utcnow(), WritePrecision.NS)
)

write_api.write(bucket=bucket, org=org, record=point)
print("✅ Test point written to InfluxDB")

client.close()
