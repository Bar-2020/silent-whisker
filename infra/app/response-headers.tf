# The security headers CloudFront adds to every answer (D-59, D-104). The ordered behaviors in
# hosting.tf do not inherit from the default one, so each behavior sets one of these policies. They
# differ only in the Content-Security-Policy (and the app's Cache-Control); `override` makes CloudFront's value win over the origin's.

locals {
  security_headers = jsondecode(file("${path.module}/../../shared/constants/security-headers.json"))

  # Everything loads from the answer's own address. A third party is added here by name, in the
  # change that first needs it: the sign-in host (D-59), the geocoder (D-88), Google's photo host
  # for `avatar_url` (D-21) and the map tiles of the real app.
  # The app's token request goes to Cognito's own address (D-107); the redirects are navigations, which this does not limit.
  cognito_origin = "https://${local.auth.domain_prefix}.auth.${local.constants.selected_region}.amazoncognito.com"

  content_security_policy = {
    app = "default-src 'self'; connect-src 'self' ${local.cognito_origin}; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
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

  # The app's files carry no cache lifetime of their own, so a browser kept an old `/locales/he.json`
  # beside a new page and showed raw keys. `no-cache` makes it ask on every visit; the answer is a
  # cheap "not changed" (ETag). The edge keeps its copy and each deploy invalidates it (D-113).
  dynamic "custom_headers_config" {
    for_each = each.key == "app" ? [1] : []

    content {
      items {
        header   = "Cache-Control"
        value    = "no-cache"
        override = true
      }
    }
  }
}
