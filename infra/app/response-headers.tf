# The security headers CloudFront adds to every answer (D-59, D-103). The ordered behaviors in
# hosting.tf do not inherit from the default one, so each behavior sets one of these policies. They
# differ only in the Content-Security-Policy; `override` makes CloudFront's value win over the origin's.

locals {
  security_headers = jsondecode(file("${path.module}/../../shared/constants/security-headers.json"))

  # Everything loads from the answer's own address. A third party is added here by name, in the
  # change that first needs it (the sign-in host of D-59, the geocoder of D-88).
  content_security_policy = {
    app = "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    # The mocks load Leaflet from cdnjs and map tiles from OpenStreetMap, and the viewer frames its own pages (D-89).
    design = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: https://cdnjs.cloudflare.com https://tile.openstreetmap.org; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
    api    = "default-src 'none'; frame-ancestors 'none'"
  }
}

resource "aws_cloudfront_response_headers_policy" "security" {
  for_each = local.content_security_policy

  name = "silent-whisker-${each.key}"

  security_headers_config {
    content_security_policy {
      content_security_policy = each.value
      override                = true
    }

    content_type_options {
      override = true
    }

    # Not "no-referrer": OpenStreetMap's tile policy requires web pages to send a Referer.
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    # No includeSubDomains or preload while the address is the shared `*.cloudfront.net` (D-36).
    strict_transport_security {
      access_control_max_age_sec = local.security_headers.hsts_max_age_seconds
      include_subdomains         = false
      preload                    = false
      override                   = true
    }
  }
}
