terraform {
  required_version = ">= 1.4.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.16"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

# Noch keine Ressourcen – das ist nur ein "Skeleton", damit init/validate/plan nicht abstürzen.
