variable "name" {
  description = "The handler's name: its function, role and log group, and its folder under backend/dist."
  type        = string
}

variable "built_dir" {
  description = "The folder `npm run build:backend` made for this handler; its zip is made beside it."
  type        = string
}

variable "memory_mb" {
  type = number
}

variable "timeout_seconds" {
  type = number
}

variable "log_retention_days" {
  type = number
}

variable "environment" {
  description = "The settings the handler reads from its environment."
  type        = map(string)
}

variable "policy_name" {
  type = string
}

variable "policy_statements" {
  description = "IAM statements for the role, besides writing its own log group."
  type        = any
}

variable "policy_arns" {
  description = "Policies made elsewhere that the role also gets."
  type        = list(string)
  default     = []
}
