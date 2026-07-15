terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "visitor-analytics"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "api_keys" {
  type        = list(string)
  description = "Valid API keys clients use to authenticate."
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "backend_image" {
  type        = string
  description = "Docker image for the backend (e.g. your-registry/visitor-analytics-backend:1.0.0)."
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ---- Networking ----
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Allow inbound traffic to the analytics backend from the ALB."
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Public-facing load balancer."
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---- Database ----
resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_security_group" "db" {
  name        = "${var.project_name}-db-sg"
  vpc_id      = data.aws_vpc.default.id
  description = "PostgreSQL access from the backend only."

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }
}

resource "aws_db_instance" "this" {
  identifier             = "${var.project_name}-db"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  storage_encrypted      = true
  db_name                = "visitor_analytics"
  username               = "visitor"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  skip_final_snapshot    = true
  backup_retention_period = 7
}

# ---- ECS ----
resource "aws_ecs_cluster" "this" {
  name = "${var.project_name}-cluster"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.backend_image
      essential = true
      portMappings = [{ containerPort = 3000 }]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "STORAGE", value = "postgres" },
        { name = "DATABASE_URL", value = "postgresql://visitor:${var.db_password}@${aws_db_instance.this.address}:5432/visitor_analytics" },
        { name = "API_KEYS", value = join(",", var.api_keys) },
        { name = "RETENTION_DAYS", value = "365" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "backend"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "backend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]
}

# ---- Load balancer ----
resource "aws_lb" "this" {
  name               = "${var.project_name}-alb"
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_target_group" "this" {
  name        = "${var.project_name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"
  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

# ---- IAM ----
resource "aws_iam_role" "execution" {
  name = "${var.project_name}-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name = "${var.project_name}-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = 30
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "database_endpoint" {
  value = aws_db_instance.this.address
}
