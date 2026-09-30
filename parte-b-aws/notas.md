# Parte B - Balanceo en AWS

Región: us-east-1

## Recursos

| Recurso            | Nombre           | Detalle                                        |
|--------------------|------------------|------------------------------------------------|
| VPC                | `vpc-lab-lb-vpc` | 2 subredes públicas (us-east-1a y us-east-1b)  |
| Grupo de seguridad | `web-lab-sg`     | Para las instancias web                        |
| Instancia EC2      | `web-server-1`   | us-east-1a, Amazon Linux 2023, t3.micro        |
| Instancia EC2      | `web-server-2`   | us-east-1b, Amazon Linux 2023, t3.micro        |
| Grupo de destino   | `tg-lab-web`     | Contiene web-server-1 y web-server-2           |
| Balanceador        | `alb-lab-web`    | Application Load Balancer                      |

## User Data de las instancias

Instala Apache y publica una página con el Instance ID y la zona de disponibilidad, para ver qué servidor responde en cada petición al ALB.

```bash
#!/bin/bash
dnf install -y httpd
systemctl enable --now httpd
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)
cat > /var/www/html/index.html <<EOF
<html><body style="font-family:Arial;text-align:center;">
<h1>Servidor Web en AWS</h1>
<p><b>Instance ID:</b> $INSTANCE_ID</p>
<p><b>Availability Zone:</b> $AZ</p>
</body></html>
EOF
```

## Prueba de tolerancia a fallos

Al detener `web-server-1`, el ALB respondió con error 504 durante 1 o 2 minutos, hasta que el health check lo sacó del grupo. Luego el destino quedó en estado Unused y todo el tráfico fue a `web-server-2`.
