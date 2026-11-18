import boto3
import json

def auditar_infraestructura():
    ec2 = boto3.client("ec2", region_name="us-east-1")
    reporte = {"instancias_running": [], "alertas_seguridad": [], "puerto_api_8000_activo": False}

    respuesta_ec2 = ec2.describe_instances(
        Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
    )

    sg_ids_en_uso = set()
    for res in respuesta_ec2.get("Reservations", []):
        for inst in res.get("Instances", []):
            inst_id = inst.get("InstanceId")
            ip_pub = inst.get("PublicIpAddress", "N/A")
            iam_profile = inst.get("IamInstanceProfile", {}).get("Arn", None)

            reporte["instancias_running"].append({
                "instance_id": inst_id,
                "public_ip": ip_pub,
                "iam_instance_profile": iam_profile if iam_profile else "[WARN] SIN IAM ROLE ADJUNTO"
            })

            for sg in inst.get("SecurityGroups", []):
                sg_ids_en_uso.add(sg["GroupId"])

    if sg_ids_en_uso:
        respuesta_sgs = ec2.describe_security_groups(GroupIds=list(sg_ids_en_uso))
        for sg in respuesta_sgs.get("SecurityGroups", []):
            sg_name = sg.get("GroupName")
            for perm in sg.get("IpPermissions", []):
                puerto = perm.get("FromPort")
                for ip_range in perm.get("IpRanges", []):
                    cidr = ip_range.get("CidrIp")

                    if puerto in [22, 5432] and cidr == "0.0.0.0/0":
                        reporte["alertas_seguridad"].append(
                            f"[WARN] Security Group '{sg_name}' tiene el puerto crítico {puerto} expuesto a 0.0.0.0/0"
                        )
                    if puerto == 8000:
                        reporte["puerto_api_8000_activo"] = True

    print(json.dumps(reporte, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    auditar_infraestructura()