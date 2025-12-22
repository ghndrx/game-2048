terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "gregh-terraform-state"
    key            = "game-2048/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    use_lockfile   = true
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = "production"
}

# S3 bucket for 2048 game
resource "aws_s3_bucket" "game" {
  bucket = "2048.gregh.dev"

  tags = {
    Name        = "2048.gregh.dev"
    Environment = "production"
  }
}

resource "aws_s3_bucket_public_access_block" "game" {
  bucket = aws_s3_bucket.game.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "game" {
  bucket = aws_s3_bucket.game.id

  versioning_configuration {
    status = "Enabled"
  }
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "game" {
  name                              = "game-2048-oac"
  description                       = "OAC for 2048.gregh.dev"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "game" {
  bucket = aws_s3_bucket.game.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.game.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.game.arn
          }
        }
      }
    ]
  })
}

# ACM Certificate for CloudFront
resource "aws_acm_certificate" "game" {
  domain_name       = "2048.gregh.dev"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "2048.gregh.dev"
  }
}

# Data source for existing hosted zone
data "aws_route53_zone" "main" {
  name = "gregh.dev."
}

# Route53 records for ACM validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.game.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# ACM certificate validation
resource "aws_acm_certificate_validation" "game" {
  certificate_arn         = aws_acm_certificate.game.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "game" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "2048.gregh.dev game"
  price_class         = "PriceClass_100"
  aliases             = ["2048.gregh.dev"]
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.game.bucket_regional_domain_name
    origin_id                = "S3-2048.gregh.dev"
    origin_access_control_id = aws_cloudfront_origin_access_control.game.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-2048.gregh.dev"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # SPA Routing Support
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.game.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "2048.gregh.dev"
    Environment = "production"
  }
}

# Route53 A record for game subdomain
resource "aws_route53_record" "game" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "2048.gregh.dev"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.game.domain_name
    zone_id                = aws_cloudfront_distribution.game.hosted_zone_id
    evaluate_target_health = false
  }
}

# Outputs
output "s3_bucket_name" {
  value = aws_s3_bucket.game.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.game.id
}

output "game_url" {
  value = "https://${aws_route53_record.game.name}"
}
